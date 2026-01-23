const express = require("express");
const router = express.Router();
const db = require("../db");

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

module.exports = router;
