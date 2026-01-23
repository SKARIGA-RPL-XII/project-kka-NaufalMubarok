const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all poli
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM polyclinics ORDER BY id DESC");
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// GET poli by id
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [rows] = await db.query("SELECT * FROM polyclinics WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ ok: false, message: "Poli tidak ditemukan" });
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// POST create poli
router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ ok: false, message: "name wajib diisi" });

    const [result] = await db.query(
      "INSERT INTO polyclinics (name, description) VALUES (?, ?)",
      [name.trim(), description || null]
    );

    res.status(201).json({ ok: true, message: "Poli berhasil ditambahkan", id: result.insertId });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// PUT update poli
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ ok: false, message: "name wajib diisi" });

    const [result] = await db.query(
      "UPDATE polyclinics SET name=?, description=? WHERE id=?",
      [name.trim(), description || null, id]
    );

    if (!result.affectedRows) return res.status(404).json({ ok: false, message: "Poli tidak ditemukan" });
    res.json({ ok: true, message: "Poli berhasil diupdate" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// DELETE poli
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [result] = await db.query("DELETE FROM polyclinics WHERE id=?", [id]);

    if (!result.affectedRows) return res.status(404).json({ ok: false, message: "Poli tidak ditemukan" });
    res.json({ ok: true, message: "Poli berhasil dihapus" });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message,
      hint: "Jika poli sudah dipakai dokter/antrian, hapus data terkait dulu."
    });
  }
});

module.exports = router;
