const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { addClient, broadcastSnapshot } = require("../utils/queueEvents");

// SSE: stream perubahan antrian per poli
router.get("/stream", (req, res) => {
  const { polyclinic_id } = req.query;
  if (!polyclinic_id) {
    return res.status(400).json({ ok: false, message: "polyclinic_id wajib" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(`event: connected\ndata: "ok"\n\n`);
  addClient(polyclinic_id, res);
  broadcastSnapshot(polyclinic_id).catch(() => {});
});

// GET /api/queues/today?polyclinic_id=1&date=2026-01-26
router.get("/today", async (req, res) => {
  const { polyclinic_id, date } = req.query;
  if (!polyclinic_id) {
    return res.status(400).json({ ok: false, message: "polyclinic_id wajib" });
  }

  const targetDate = date ? date : null;

  try {
    const [rows] = await db.query(
      `SELECT q.id, q.queue_date, q.polyclinic_id, q.patient_id, q.queue_number, q.status,
              q.called_at, q.served_at, q.created_at, u.name AS patient_name
       FROM queues q
       JOIN patients p ON p.id = q.patient_id
       JOIN users u ON u.id = p.user_id
       WHERE q.polyclinic_id = ?
         AND q.queue_date = ${targetDate ? "?" : "CURDATE()"}
       ORDER BY q.queue_number ASC`,
      targetDate ? [polyclinic_id, targetDate] : [polyclinic_id]
    );

    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});


// POST /api/queues/call  body: { polyclinic_id: 1 }
router.post("/call", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { polyclinic_id } = req.body;
  if (!polyclinic_id) {
    return res.status(400).json({ ok: false, message: "polyclinic_id wajib" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // cari antrian WAITING paling kecil
    const [waitRows] = await conn.query(
      `SELECT id, queue_number
       FROM queues
       WHERE queue_date = CURDATE()
         AND polyclinic_id = ?
         AND status = 'WAITING'
       ORDER BY queue_number ASC
       LIMIT 1
       FOR UPDATE`,
      [polyclinic_id]
    );

    if (waitRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "Tidak ada antrian WAITING" });
    }

    const target = waitRows[0];

    await conn.query(
      `UPDATE queues
       SET status = 'CALLED', called_at = NOW()
       WHERE id = ?`,
      [target.id]
    );

    await conn.commit();

    await broadcastSnapshot(polyclinic_id);

    res.json({
      ok: true,
      message: "Antrian dipanggil",
      data: { queue_id: target.id, queue_number: target.queue_number },
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    conn.release();
  }
});

// POST /api/queues/recall body: { queue_id: 1 }
router.post("/recall", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { queue_id } = req.body;
  if (!queue_id) {
    return res.status(400).json({ ok: false, message: "queue_id wajib" });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT id, polyclinic_id, queue_number, status
       FROM queues
       WHERE id = ?
         AND queue_date = CURDATE()
       FOR UPDATE`,
      [queue_id]
    );

    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ ok: false, message: "Antrian tidak ditemukan untuk hari ini" });
    }

    const queue = rows[0];

    if (queue.status !== "CALLED") {
      await conn.rollback();
      return res.status(400).json({ ok: false, message: "Hanya antrian yang sedang dipanggil yang bisa dipanggil ulang" });
    }

    await conn.query(
      `UPDATE queues
       SET called_at = NOW(), status = 'CALLED'
       WHERE id = ?`,
      [queue_id]
    );

    await conn.commit();
    await broadcastSnapshot(queue.polyclinic_id);

    res.json({
      ok: true,
      message: "Antrian dipanggil ulang",
      data: { queue_id: queue.id, queue_number: queue.queue_number },
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    conn.release();
  }
});

// POST /api/queues/serve body: { queue_id: 1 }
router.post("/serve", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { queue_id } = req.body;
  if (!queue_id) {
    return res.status(400).json({ ok: false, message: "queue_id wajib" });
  }

  try {
    const [result] = await db.query(
      `UPDATE queues
       SET status = 'SERVED', served_at = NOW()
       WHERE id = ?`,
      [queue_id]
    );

    // dapatkan polyclinic_id untuk broadcast
    const [row] = await db.query("SELECT polyclinic_id FROM queues WHERE id = ?", [queue_id]);
    if (row.length) {
      await broadcastSnapshot(row[0].polyclinic_id);
    }

    res.json({ ok: true, message: "Antrian diselesaikan", affected: result.affectedRows });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
