const express = require("express");
const router = express.Router();
const db = require("../db");
const { broadcastSnapshot } = require("../utils/queueEvents");

async function getSchedulesForDay(doctorId, dayOfWeek) {
  const [rows] = await db.query(
    `SELECT id, start_time, end_time
     FROM doctor_schedules
     WHERE doctor_id = ? AND day_of_week = ?
     ORDER BY start_time ASC`,
    [doctorId, dayOfWeek]
  );
  return rows;
}

function timeToMinutes(val) {
  if (!val) return null;
  if (typeof val === "string") {
    const [h, m] = val.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }
  if (val instanceof Date) {
    return val.getHours() * 60 + val.getMinutes();
  }
  return null;
}

function formatTimeLabel(val) {
  if (!val) return "-";
  if (typeof val === "string") return val.slice(0, 5);
  if (val instanceof Date) return val.toTimeString().slice(0, 5);
  return String(val);
}

function formatLocalDate(val) {
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// POST /api/checkin
// body: { booking_code: "BK201688" }
router.post("/", async (req, res) => {
  const { booking_code } = req.body;

  if (!booking_code) {
    return res.status(400).json({ ok: false, message: "booking_code wajib diisi" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1) ambil booking + lock row biar aman
    const [bRows] = await conn.query(
      `SELECT id, booking_code, booking_date, patient_id, polyclinic_id, doctor_id, status
       FROM bookings
       WHERE booking_code = ?
       FOR UPDATE`,
      [booking_code]
    );

    if (bRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "Booking tidak ditemukan" });
    }

    const booking = bRows[0];

    // optional: kalau kamu punya status booking
    // misal status: 'BOOKED' / 'CHECKED_IN'
    if (booking.status && booking.status !== "BOOKED") {
      await conn.rollback();
      return res.status(409).json({ ok: false, message: "Booking sudah check-in / tidak valid" });
    }

    // pastikan booking masih BOOKED dan untuk hari ini
    const today = new Date();
    const todayStr = formatLocalDate(today);
    const bookingDate =
      booking.booking_date instanceof Date ? booking.booking_date : new Date(booking.booking_date);
    const bookingStr = formatLocalDate(bookingDate);
    if (!bookingStr) {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: "Tanggal booking tidak valid" });
    }
    if (bookingStr !== todayStr) {
      await conn.rollback();
      return res.status(409).json({ ok: false, message: "Booking bukan untuk hari ini" });
    }

    const bookingDay = bookingDate.getDay();
    const schedules = await getSchedulesForDay(booking.doctor_id, bookingDay);
    if (!schedules.length) {
      await conn.rollback();
      return res.status(409).json({
        ok: false,
        message: "Dokter tidak memiliki jadwal praktik untuk hari ini",
      });
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const withinSchedule = schedules.some((s) => {
      const start = timeToMinutes(s.start_time);
      const end = timeToMinutes(s.end_time);
      if (start === null || end === null) return false;
      return nowMinutes >= start && nowMinutes <= end;
    });

    if (!withinSchedule) {
      await conn.rollback();
      const primary = schedules[0];
      return res.status(409).json({
        ok: false,
        message: primary
          ? `Check-in hanya dapat dilakukan pada jam praktik dokter: ${formatTimeLabel(primary.start_time)} - ${formatTimeLabel(primary.end_time)}`
          : "Check-in belum tersedia di luar jam praktik dokter",
      });
    }

    // ambil max queue_number untuk hari+polinya
    const [qRows] = await conn.query(
      `SELECT COALESCE(MAX(queue_number), 0) AS last_num
       FROM queues
       WHERE queue_date = CURDATE() AND polyclinic_id = ?`,
      [booking.polyclinic_id]
    );

    const nextNumber = (qRows[0].last_num || 0) + 1;

    // ambil estimasi per poli
    const [settings] = await conn.query(
      "SELECT avg_service_minutes FROM queue_settings WHERE polyclinic_id=?",
      [booking.polyclinic_id]
    );
    const estimated = settings.length ? settings[0].avg_service_minutes : null;

    // 3) insert queue record
    let queueId = null;
    try {
      const [insertQ] = await conn.query(
        `INSERT INTO queues
         (queue_date, polyclinic_id, patient_id, queue_number, status, estimated_minutes)
         VALUES (CURDATE(), ?, ?, ?, 'WAITING', ?)`,
        [booking.polyclinic_id, booking.patient_id, nextNumber, estimated]
      );
      queueId = insertQ.insertId;
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        await conn.rollback();
        return res
          .status(409)
          .json({ ok: false, message: "Pasien sudah memiliki antrian untuk hari ini" });
      }
      throw err;
    }

    // 4) update status booking jadi CHECKED_IN (kalau kolom status ada)
    // kalau kolom status di bookings tidak ada, skip bagian ini
    await conn.query(
      `UPDATE bookings SET status = 'CHECKED_IN' WHERE id = ?`,
      [booking.id]
    );

    await conn.commit();

    res.status(201).json({
      ok: true,
      message: "Check-in berhasil, nomor antrian dibuat",
      data: {
        queue_id: queueId,
        queue_number: nextNumber,
        queue_date: new Date().toISOString().slice(0, 10),
      },
    });
    broadcastSnapshot(booking.polyclinic_id).catch(() => {});
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
