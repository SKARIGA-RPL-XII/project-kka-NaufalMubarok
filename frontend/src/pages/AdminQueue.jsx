import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext.jsx";

export default function AdminQueue() {
  const { user } = useAuth();
  const [polyclinicId, setPolyclinicId] = useState("");
  const [polyclinics, setPolyclinics] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const streamBase = useMemo(
    () => (import.meta.env.VITE_API_URL || "http://localhost:5001/api") + "/queues/stream",
    []
  );
  const selectedPolyclinic = useMemo(
    () => polyclinics.find((p) => String(p.id) === String(polyclinicId)),
    [polyclinics, polyclinicId]
  );

  async function loadPolyclinics() {
    try {
      const res = await api.get(`/polyclinics`);
      const data = res.data?.data ?? [];
      setPolyclinics(data);
      if (!polyclinicId && data.length) {
        setPolyclinicId(String(data[0].id));
      }
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.error || e.message);
    }
  }

  async function fetchQueues(id) {
    if (!id) {
      setItems([]);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const res = await api.get(`/queues/today`, {
        params: { polyclinic_id: id },
      });
      setItems(res.data?.data ?? []);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  // Panggil: backend memanggil antrian WAITING TERKECIL berdasarkan polyclinic_id
  async function callNextQueue() {
    setInfo("");
    setErr("");
    if (!polyclinicId) {
      setErr("Pilih poliklinik terlebih dahulu.");
      return;
    }
    try {
      const res = await api.post(`/queues/call`, {
        polyclinic_id: Number(polyclinicId),
      });
      setInfo(`Dipanggil: No ${res.data?.data?.queue_number}`);
      fetchQueues(polyclinicId);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.error || e.message);
    }
  }

  async function recallQueue(queueId) {
    setInfo("");
    setErr("");
    if (!polyclinicId) {
      setErr("Pilih poliklinik terlebih dahulu.");
      return;
    }
    try {
      const res = await api.post(`/queues/recall`, { queue_id: queueId });
      setInfo(`Dipanggil ulang: No ${res.data?.data?.queue_number}`);
      fetchQueues(polyclinicId);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.error || e.message);
    }
  }

  async function serveQueue(queueId) {
    setInfo("");
    setErr("");
    try {
      await api.post(`/queues/serve`, { queue_id: queueId });
      setInfo(`Queue ${queueId} diselesaikan`);
      fetchQueues(polyclinicId);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.response?.data?.error || e.message);
    }
  }

  useEffect(() => {
    loadPolyclinics();
  }, []);

  useEffect(() => {
    fetchQueues(polyclinicId);
  }, [polyclinicId]);

  useEffect(() => {
    if (!user || user.role !== "ADMIN" || !polyclinicId) return undefined;
    const src = new EventSource(`${streamBase}?polyclinic_id=${polyclinicId}`);
    src.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        if (payload.queues) setItems(payload.queues);
      } catch {
        /* ignore */
      }
    };
    src.onerror = () => {
      src.close();
    };
    return () => src.close();
  }, [polyclinicId, streamBase, user]);

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="card">
        <h2>Admin Antrian</h2>
        <p>Anda perlu login sebagai admin untuk mengelola antrian.</p>
      </div>
    );
  }

  const currentCalled = items.find((q) => q.status === "CALLED");

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="cta">
        <div>
          <p style={{ margin: 0, opacity: 0.7 }}>Dashboard Admin</p>
          <h2 style={{ margin: "4px 0" }}>Kelola Antrian</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>
            Panggil nomor berikutnya, tandai selesai, dan layar display ikut update real-time.
          </p>
          <p style={{ margin: "8px 0 0", opacity: 0.8 }}>
            {selectedPolyclinic ? `Poliklinik: ${selectedPolyclinic.name}` : "Pilih poliklinik untuk melihat antrian."}
          </p>
        </div>
        <div className="inline">
          <label style={{ color: "#e2fbe8" }}>
            Pilih Poliklinik
            <select
              value={polyclinicId}
              onChange={(e) => setPolyclinicId(e.target.value)}
              style={{ marginLeft: 8, padding: "8px 10px", borderRadius: 10, border: "none" }}
            >
              {polyclinics.length === 0 && <option value="">Memuat...</option>}
              {polyclinics.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button className="ghost" onClick={() => fetchQueues(polyclinicId)}>
            Refresh
          </button>
          <button className="btn" onClick={callNextQueue}>
            Panggil
          </button>
        </div>
      </div>

      {currentCalled && (
        <div className="card">
          <p style={{ margin: 0, opacity: 0.6 }}>Sedang dipanggil</p>
          <h3 style={{ margin: "6px 0" }}>No {currentCalled.queue_number}</h3>
          <p style={{ margin: 0, color: "#334155" }}>Queue ID #{currentCalled.id}</p>
          <div className="inline" style={{ marginTop: 8 }}>
            <button className="ghost" onClick={() => recallQueue(currentCalled.id)}>
              Panggil ulang
            </button>
            <button className="btn" onClick={() => serveQueue(currentCalled.id)}>
              Tandai selesai
            </button>
          </div>
        </div>
      )}

      <div className="card">
        {loading && <p>Loading...</p>}
        {err && <p style={{ color: "crimson" }}>Error: {err}</p>}
        {info && <p style={{ color: "green" }}>{info}</p>}

        {!loading && !err && (
          <table className="table">
            <thead>
              <tr>
                <th>Pasien</th>
                <th>No</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="4">Belum ada antrian hari ini</td>
                </tr>
              ) : (
                items.map((q) => (
                  <tr key={q.id}>
                    <td>{q.patient_name || `ID ${q.patient_id}`}</td>
                    <td>{q.queue_number}</td>
                    <td>
                      <span className={`status ${q.status.toLowerCase()}`}>{q.status}</span>
                    </td>
                    <td className="inline">
                      {q.status === "WAITING" && (
                        <button className="ghost" onClick={callNextQueue}>
                          Panggil
                        </button>
                      )}
                      {q.status === "CALLED" && (
                        <>
                          <button className="ghost" onClick={() => recallQueue(q.id)}>
                            Panggil ulang
                          </button>
                          <button className="btn" onClick={() => serveQueue(q.id)}>
                            Selesai
                          </button>
                        </>
                      )}
                      {q.status === "SERVED" && <span style={{ opacity: 0.6 }}>Selesai</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
