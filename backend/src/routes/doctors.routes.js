const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");

// GET doctors (optional filter by polyclinic_id)
router.get("/", async (req, res) => {
  try {
    const { polyclinic_id } = req.query;

    let sql = "SELECT * FROM doctors";
    const params = [];

    if (polyclinic_id) {
      sql += " WHERE polyclinic_id=?";
      params.push(Number(polyclinic_id));
    }

    sql += " ORDER BY id DESC";

    const [rows] = await db.query(sql, params);
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST doctor (admin)
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { polyclinic_id, name, schedule_info } = req.body;
    if (!polyclinic_id || !name?.trim()) {
      return res.status(400).json({ ok: false, message: "polyclinic_id dan name wajib diisi" });
    }

    const [poly] = await db.query("SELECT id FROM polyclinics WHERE id=?", [polyclinic_id]);
    if (!poly.length) {
      return res.status(404).json({ ok: false, message: "Poli tidak ditemukan" });
    }

    const [result] = await db.query(
      `INSERT INTO doctors (polyclinic_id, name, schedule_info) VALUES (?, ?, ?)`,
      [polyclinic_id, name.trim(), schedule_info || null]
    );
    res.status(201).json({ ok: true, message: "Dokter ditambahkan", id: result.insertId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT doctor (admin)
router.put("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { polyclinic_id, name, schedule_info } = req.body;
    if (!polyclinic_id || !name?.trim()) {
      return res.status(400).json({ ok: false, message: "polyclinic_id dan name wajib diisi" });
    }

    const [doc] = await db.query("SELECT id FROM doctors WHERE id=?", [id]);
    if (!doc.length) {
      return res.status(404).json({ ok: false, message: "Dokter tidak ditemukan" });
    }

    await db.query(
      `UPDATE doctors SET polyclinic_id=?, name=?, schedule_info=? WHERE id=?`,
      [polyclinic_id, name.trim(), schedule_info || null, id]
    );
    res.json({ ok: true, message: "Dokter diperbarui" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE doctor (admin)
router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [result] = await db.query("DELETE FROM doctors WHERE id=?", [id]);
    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, message: "Dokter tidak ditemukan" });
    }
    res.json({ ok: true, message: "Dokter dihapus" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
