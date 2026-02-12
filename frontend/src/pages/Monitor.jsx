import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Monitor() {
  const [queues, setQueues] = useState([]);
  const [polyclinicId, setPolyclinicId] = useState(1);

  const fetchQueues = async () => {
    const res = await api.get(`/queues/today`, { params: { polyclinic_id: polyclinicId } });
    setQueues(res.data.data || []);
  };

  useEffect(() => {
    fetchQueues();
    const t = setInterval(fetchQueues, 3000); // auto refresh tiap 3 detik (simple realtime)
    return () => clearInterval(t);
  }, [polyclinicId]);

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h2>Monitoring Antrian (Real-Time)</h2>

      <label>
        Polyclinic ID:{" "}
        <input
          type="number"
          value={polyclinicId}
          onChange={(e) => setPolyclinicId(Number(e.target.value))}
          style={{ width: 80 }}
        />
      </label>

      <hr />

      {queues.length === 0 ? (
        <p>Belum ada antrian hari ini</p>
      ) : (
        <ul>
          {queues.map((q) => (
            <li key={q.id}>
              <b>No {q.queue_number}</b> — {q.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
