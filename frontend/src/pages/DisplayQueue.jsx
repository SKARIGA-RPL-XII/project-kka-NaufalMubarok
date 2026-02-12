import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";

export default function DisplayQueue() {
  const [polyclinics, setPolyclinics] = useState([]);
  const [queueMap, setQueueMap] = useState({});
  const [cardErrors, setCardErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const lastCalledRef = useRef({});
  const streamBase = useMemo(
    () => (import.meta.env.VITE_API_URL || "http://localhost:5001/api") + "/queues/stream",
    []
  );

  function speak(text) {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    // Prefer an Indonesian voice if available
    const voices = window.speechSynthesis.getVoices();
    const indoVoice = voices.find((v) => v.lang?.startsWith("id"));
    if (indoVoice) utterance.voice = indoVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  const hydrateQueues = useCallback(async (list) => {
    if (!list.length) {
      setQueueMap({});
      setCardErrors({});
      setErr("");
      return;
    }

    const snapshots = await Promise.all(
      list.map(async (p) => {
        try {
          const res = await api.get(`/queues/today`, {
            params: { polyclinic_id: p.id },
          });
          return { polyclinicId: p.id, queues: res.data?.data ?? [] };
        } catch (error) {
          return {
            polyclinicId: p.id,
            error: error?.response?.data?.message || error?.response?.data?.error || error.message,
          };
        }
      })
    );

    const nextMap = {};
    const nextErrMap = {};
    const aggregatedErrors = [];
    snapshots.forEach((snap) => {
      if (snap.error) {
        nextErrMap[snap.polyclinicId] = snap.error;
        aggregatedErrors.push(`Poli ${snap.polyclinicId}: ${snap.error}`);
      } else {
        nextMap[snap.polyclinicId] = snap.queues;
      }
    });

    setQueueMap(nextMap);
    setCardErrors(nextErrMap);
    setErr(aggregatedErrors.length ? aggregatedErrors.join(" | ") : "");
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get(`/polyclinics`);
      const list = res.data?.data ?? [];
      setPolyclinics(list);
      await hydrateQueues(list);
    } catch (error) {
      setPolyclinics([]);
      setQueueMap({});
      setCardErrors({});
      setErr(error?.response?.data?.message || error?.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  }, [hydrateQueues]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!polyclinics.length) return undefined;
    const sources = polyclinics.map((p) => {
      const src = new EventSource(`${streamBase}?polyclinic_id=${p.id}`);
      src.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload.queues) {
            setQueueMap((prev) => ({ ...prev, [p.id]: payload.queues }));
            setCardErrors((prev) => {
              const copy = { ...prev };
              delete copy[p.id];
              return copy;
            });
          }
        } catch {
          /* ignore parse errors */
        }
      };
      src.onerror = () => src.close();
      return src;
    });

    return () => {
      sources.forEach((src) => src.close());
    };
  }, [polyclinics, streamBase]);

  useEffect(() => {
    if (!Object.keys(queueMap).length) return;
    Object.entries(queueMap).forEach(([pid, queues]) => {
      const called = (queues || []).find((q) => q.status === "CALLED");
      const callKey = called ? `${called.id}-${called.called_at || "na"}` : null;
      const lastKey = lastCalledRef.current[pid];
      if (called && callKey !== lastKey) {
        const polyName = polyclinics.find((p) => String(p.id) === String(pid))?.name || `Poli ${pid}`;
        const patientName = called.patient_name || `Pasien ${called.patient_id}`;
        speak(`Pasien atas nama ${patientName}, nomor antrian ${called.queue_number}, silakan menuju ${polyName}.`);
        lastCalledRef.current[pid] = callKey;
      }
      if (!called) {
        delete lastCalledRef.current[pid];
      }
    });
  }, [queueMap, polyclinics]);

  const today = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="display-hero">
        <div>
          <p className="eyebrow" style={{ color: "#c7d2fe", margin: 0 }}>
            Display Antrian
          </p>
          <h2 style={{ margin: "6px 0 4px" }}>Pantau semua poli tanpa memilih satu per satu</h2>
          <p style={{ margin: 0, color: "#e2e8f0" }}>
            Setiap panggilan dari petugas akan langsung tampil real-time: nama pasien, nomor antrian, dan statusnya.
          </p>
        </div>
        <div className="display-actions">
          <div className="pill" style={{ background: "#0b1530", color: "#e2fbe8" }}>{today}</div>
          <button className="ghost" onClick={loadData} disabled={loading}>
            {loading ? "Menyegarkan..." : "Segarkan sekarang"}
          </button>
        </div>
      </div>

      {err && <div className="error-banner">Error: {err}</div>}

      {loading && <p>Memuat data antrian...</p>}

      {!loading && !polyclinics.length && (
        <div className="card">
          <h3 style={{ margin: "0 0 6px" }}>Belum ada poliklinik</h3>
          <p style={{ margin: 0, color: "#475569" }}>
            Tambahkan poliklinik terlebih dahulu agar layar display dapat menampilkan antrian.
          </p>
        </div>
      )}

      <div className="display-grid">
        {polyclinics.map((p) => {
          const queues = queueMap[p.id] || [];
          const called = queues.find((q) => q.status === "CALLED");
          const waiting = queues.filter((q) => q.status === "WAITING");
          const served = queues.filter((q) => q.status === "SERVED");
          const nextWaiting = waiting.slice(0, 4);
          const recentServed = served.slice(-2);

          return (
            <div key={p.id} className="display-card">
              <div className="display-card-header">
                <div>
                  <p className="eyebrow" style={{ margin: 0, color: "#a5b4fc" }}>Poliklinik</p>
                  <h3 style={{ margin: "4px 0 0" }}>{p.name}</h3>
                  <p className="muted" style={{ margin: "4px 0 0" }}>
                    Dipanggil & menunggu hari ini
                  </p>
                </div>
                <span className="pill soft">ID {p.id}</span>
              </div>

              {cardErrors[p.id] ? (
                <p className="error-banner" style={{ margin: "10px 0 0" }}>
                  Gagal memuat antrian: {cardErrors[p.id]}
                </p>
              ) : (
                <>
                  <div className="display-callout">
                    <p className="muted" style={{ margin: 0, color: "#cbd5e1" }}>
                      Sedang dipanggil / di ruang
                    </p>
                    <div className="display-call-number">
                      {called ? `No ${called.queue_number}` : "-"}
                    </div>
                    <p className="display-call-name">
                      {called ? called.patient_name || `Pasien #${called.patient_id}` : "Belum ada panggilan"}
                    </p>
                    {called && (
                      <span className="status called" style={{ alignSelf: "flex-start" }}>
                        {called.status}
                      </span>
                    )}
                  </div>

                  <div className="display-meta">
                    <span className="meta-chip">
                      Menunggu <strong>{waiting.length}</strong>
                    </span>
                    <span className="meta-chip alt">
                      Selesai <strong>{served.length}</strong>
                    </span>
                  </div>

                  <div className="display-columns">
                    <div>
                      <div className="display-column-title">Berikutnya</div>
                      <div className="display-list">
                        {nextWaiting.length === 0 ? (
                          <p className="muted" style={{ margin: 0 }}>Belum ada antrian menunggu.</p>
                        ) : (
                          nextWaiting.map((q) => (
                            <div key={q.id} className="display-row">
                              <div>
                                <div className="display-row-number">No {q.queue_number}</div>
                                <div className="display-row-name">{q.patient_name || `Pasien #${q.patient_id}`}</div>
                              </div>
                              <span className="status waiting">WAITING</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="display-column-title">Riwayat terbaru</div>
                      <div className="display-list subtle">
                        {recentServed.length === 0 && !called ? (
                          <p className="muted" style={{ margin: 0 }}>Belum ada aktivitas.</p>
                        ) : (
                          <>
                            {called && (
                              <div className="display-row">
                                <div>
                                  <div className="display-row-number">No {called.queue_number}</div>
                                  <div className="display-row-name">
                                    {called.patient_name || `Pasien #${called.patient_id}`}
                                  </div>
                                </div>
                                <span className="status called">CALLED</span>
                              </div>
                            )}
                            {recentServed.map((q) => (
                              <div key={q.id} className="display-row">
                                <div>
                                  <div className="display-row-number">No {q.queue_number}</div>
                                  <div className="display-row-name">
                                    {q.patient_name || `Pasien #${q.patient_id}`}
                                  </div>
                                </div>
                                <span className="status served">SERVED</span>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
