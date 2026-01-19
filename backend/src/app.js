require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// test server
app.get("/", (req, res) => {
  res.json({ ok: true, message: "Hospiline API running" });
});

// test database connection
app.get("/db-test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT DATABASE() AS db, 1 + 1 AS result");
    res.json({ ok: true, rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const port = process.env.PORT || 5000;
app.listen(port, "0.0.0.0", () => {
  console.log(`API: http://localhost:${port}`);
});

