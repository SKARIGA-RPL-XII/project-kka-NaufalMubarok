const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

// ✅ GET untuk test di browser (terbuka)
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, booking_code, booking_date, patient_id, polyclinic_id, doctor_id, status, created_at FROM bookings ORDER BY id DESC LIMIT 50"
    );
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// helper
function generateBookingCode() {
  const rnd = Math.random().toString(36).slice(-4).toUpperCase();
  return "BK" + Date.now().toString().slice(-5) + rnd;
}

async function ensureDoctorBelongs(polyclinic_id, doctor_id) {
  const [rows] = await db.query(
    "SELECT id FROM doctors WHERE id=? AND polyclinic_id=?",
    [doctor_id, polyclinic_id]
  );
  return rows.length > 0;
}

async function getScheduleForDay(doctor_id, dayOfWeek) {
  const [rows] = await db.query(
    `SELECT id, start_time, end_time, quota
     FROM doctor_schedules
     WHERE doctor_id = ? AND day_of_week = ?
     ORDER BY start_time ASC`,
    [doctor_id, dayOfWeek]
  );
  return rows;
}

// ✅ POST booking (pasien login)
router.post("/", requireAuth, requireRole("PATIENT"), async (req, res) => {
  try {
    const { polyclinic_id, doctor_id, booking_date } = req.body;
    const patient_id = req.user.patient_id;

    if (!polyclinic_id || !doctor_id || !booking_date) {
      return res.status(400).json({
        ok: false,
        message: "polyclinic_id, doctor_id, booking_date wajib diisi",
      });
    }

    const dateObj = new Date(booking_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(dateObj.getTime()) || dateObj < today) {
      return res.status(400).json({ ok: false, message: "Tanggal booking tidak valid" });
    }

    const bookingDay = dateObj.getDay();
    const polyId = Number(polyclinic_id);
    const docId = Number(doctor_id);
    if (Number.isNaN(polyId) || Number.isNaN(docId)) {
      return res.status(400).json({ ok: false, message: "polyclinic_id dan doctor_id tidak valid" });
    }

    // validasi dokter & poli
    const doctorOk = await ensureDoctorBelongs(polyId, docId);
    if (!doctorOk) {
      return res.status(400).json({ ok: false, message: "Dokter tidak sesuai dengan poli" });
    }

    const schedules = await getScheduleForDay(docId, bookingDay);
    if (!schedules.length) {
      return res.status(400).json({
        ok: false,
        message: "Dokter tidak praktik pada hari yang dipilih. Silakan pilih tanggal sesuai jadwal.",
      });
    }

    const selectedSchedule = schedules[0];

    // periksa pasien ada
    const [patientRows] = await db.query("SELECT id FROM patients WHERE id=?", [patient_id]);
    if (!patientRows.length) {
      return res.status(400).json({ ok: false, message: "Pasien tidak ditemukan" });
    }

    let bookingCode = generateBookingCode();
    let insertId;
    let tries = 0;
    while (tries < 3) {
      try {
        const [result] = await db.query(
          `INSERT INTO bookings
           (booking_code, booking_date, patient_id, polyclinic_id, doctor_id)
           VALUES (?, ?, ?, ?, ?)`,
          [bookingCode, booking_date, patient_id, polyId, docId]
        );
        insertId = result.insertId;
        break;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
          bookingCode = generateBookingCode();
          tries += 1;
          continue;
        }
        throw err;
      }
    }

    if (!insertId) {
      return res.status(409).json({ ok: false, message: "Gagal membuat booking, coba lagi" });
    }

    return res.status(201).json({
      ok: true,
      message: "Booking berhasil",
      data: {
        booking_id: insertId,
        booking_code: bookingCode,
        booking_date,
        schedule: selectedSchedule
      },
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        ok: false,
        message: "Pasien sudah melakukan booking pada tanggal dan poli yang sama",
      });
    }

    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
