const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

function validateDay(day) {
  const n = Number(day);
  if (!Number.isInteger(n) || n < 0 || n > 6) {
    return null;
  }
  return n;
}

function ensureTimeOrder(start, end) {
  if (!start || !end) return false;
  return start < end;
}

// GET /api/doctor-schedules?doctor_id=1&polyclinic_id=2
router.get("/", async (req, res) => {
  try {
    const { doctor_id, polyclinic_id } = req.query;
    const params = [];
    let sql = `
      SELECT ds.id, ds.doctor_id, ds.day_of_week, ds.start_time, ds.end_time, ds.quota,
             d.name AS doctor_name, d.polyclinic_id, p.name AS polyclinic_name
      FROM doctor_schedules ds
      JOIN doctors d ON d.id = ds.doctor_id
      JOIN polyclinics p ON p.id = d.polyclinic_id
      WHERE 1=1
    `;

    if (doctor_id) {
      sql += " AND ds.doctor_id = ?";
      params.push(Number(doctor_id));
    }
    if (polyclinic_id) {
      sql += " AND d.polyclinic_id = ?";
      params.push(Number(polyclinic_id));
    }

    sql += " ORDER BY p.name ASC, d.name ASC, ds.day_of_week ASC, ds.start_time ASC";

    const [rows] = await db.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/doctor-schedules
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { doctor_id, day_of_week, start_time, end_time, quota } = req.body;

    const day = validateDay(day_of_week);
    if (!doctor_id || day === null || !start_time || !end_time) {
      return res.status(400).json({
        ok: false,
        message: "doctor_id, day_of_week (0-6), start_time, end_time wajib diisi",
      });
    }

    if (!ensureTimeOrder(start_time, end_time)) {
      return res.status(400).json({ ok: false, message: "Jam mulai harus lebih kecil dari jam selesai" });
    }

    const [doc] = await db.query("SELECT id FROM doctors WHERE id=?", [doctor_id]);
    if (!doc.length) {
      return res.status(404).json({ ok: false, message: "Dokter tidak ditemukan" });
    }

    const [result] = await db.query(
      `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, quota)
       VALUES (?, ?, ?, ?, ?)`,
      [doctor_id, day, start_time, end_time, quota ?? null]
    );

    res.status(201).json({ ok: true, message: "Jadwal ditambahkan", id: result.insertId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT /api/doctor-schedules/:id
router.put("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { doctor_id, day_of_week, start_time, end_time, quota } = req.body;

    const [existing] = await db.query("SELECT id FROM doctor_schedules WHERE id=?", [id]);
    if (!existing.length) {
      return res.status(404).json({ ok: false, message: "Jadwal tidak ditemukan" });
    }

    const day = validateDay(day_of_week);
    if (!doctor_id || day === null || !start_time || !end_time) {
      return res.status(400).json({
        ok: false,
        message: "doctor_id, day_of_week (0-6), start_time, end_time wajib diisi",
      });
    }
    if (!ensureTimeOrder(start_time, end_time)) {
      return res.status(400).json({ ok: false, message: "Jam mulai harus lebih kecil dari jam selesai" });
    }

    const [doc] = await db.query("SELECT id FROM doctors WHERE id=?", [doctor_id]);
    if (!doc.length) {
      return res.status(404).json({ ok: false, message: "Dokter tidak ditemukan" });
    }

    await db.query(
      `UPDATE doctor_schedules
       SET doctor_id=?, day_of_week=?, start_time=?, end_time=?, quota=?
       WHERE id=?`,
      [doctor_id, day, start_time, end_time, quota ?? null, id]
    );

    res.json({ ok: true, message: "Jadwal diperbarui" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE /api/doctor-schedules/:id
router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [result] = await db.query("DELETE FROM doctor_schedules WHERE id=?", [id]);
    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, message: "Jadwal tidak ditemukan" });
    }
    res.json({ ok: true, message: "Jadwal dihapus" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
