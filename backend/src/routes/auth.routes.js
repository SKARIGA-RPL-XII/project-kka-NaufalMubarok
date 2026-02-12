const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES = "7d";

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// Register pasien
router.post("/register", async (req, res) => {
  const { name, email, password, nik, phone, address, birth_date } = req.body;
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ ok: false, message: "name, email, password wajib diisi" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const passwordHash = await bcrypt.hash(password, 10);
    const [userResult] = await conn.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES (?, ?, ?, 'PATIENT')`,
      [name.trim(), email.trim().toLowerCase(), passwordHash]
    );

    const userId = userResult.insertId;
    const [patientResult] = await conn.query(
      `INSERT INTO patients (user_id, nik, phone, address, birth_date)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, nik || null, phone || null, address || null, birth_date || null]
    );
    const patientId = patientResult.insertId;

    await conn.commit();

    const token = signToken({ id: userId, role: "PATIENT", patient_id: patientId });
    res.status(201).json({
      ok: true,
      message: "Registrasi berhasil",
      token,
      user: {
        id: userId,
        name,
        email: email.trim().toLowerCase(),
        role: "PATIENT",
        patient_id: patientId,
      },
    });
  } catch (err) {
    await conn.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, message: "Email atau NIK sudah digunakan" });
    }
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    conn.release();
  }
});

// Login admin/pasien
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email?.trim() || !password) {
    return res.status(400).json({ ok: false, message: "email dan password wajib" });
  }

  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, p.id AS patient_id
       FROM users u
       LEFT JOIN patients p ON p.user_id = u.id
       WHERE u.email = ?`,
      [email.trim().toLowerCase()]
    );

    if (!rows.length) return res.status(401).json({ ok: false, message: "Email atau password salah" });
    const user = rows[0];

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ ok: false, message: "Email atau password salah" });

    const token = signToken({ id: user.id, role: user.role, patient_id: user.patient_id || null });
    res.json({
      ok: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        patient_id: user.patient_id || null,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Profil singkat user
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, p.id AS patient_id, p.nik, p.phone, p.address, p.birth_date
       FROM users u
       LEFT JOIN patients p ON p.user_id = u.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (!rows.length) return res.status(404).json({ ok: false, message: "User tidak ditemukan" });
    const u = rows[0];
    res.json({ ok: true, user: u });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
