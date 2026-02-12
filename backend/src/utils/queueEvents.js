const db = require("../db");

// Map<polyclinicId, Set<res>>
const listeners = new Map();

function addClient(polyclinicId, res) {
  const idStr = String(polyclinicId);
  if (!listeners.has(idStr)) listeners.set(idStr, new Set());
  listeners.get(idStr).add(res);

  res.on("close", () => {
    const set = listeners.get(idStr);
    if (set) {
      set.delete(res);
      if (!set.size) listeners.delete(idStr);
    }
  });
}

function send(polyclinicId, payload) {
  const idStr = String(polyclinicId);
  const set = listeners.get(idStr);
  if (!set || !set.size) return;
  const chunk = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    res.write(chunk);
  }
}

async function broadcastSnapshot(polyclinicId) {
  const [rows] = await db.query(
    `SELECT q.id, q.queue_date, q.polyclinic_id, q.patient_id, q.queue_number, q.status,
            q.called_at, q.served_at, q.created_at, u.name AS patient_name
     FROM queues q
     JOIN patients p ON p.id = q.patient_id
     JOIN users u ON u.id = p.user_id
     WHERE queue_date = CURDATE() AND polyclinic_id = ?
     ORDER BY queue_number ASC`,
    [polyclinicId]
  );
  send(polyclinicId, { queues: rows });
}

module.exports = { addClient, broadcastSnapshot };
