import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext.jsx";

const STORAGE_KEY = "booking:last";

export default function BookingPage() {
  const [polyclinics, setPolyclinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [clinicSchedules, setClinicSchedules] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [polyclinicId, setPolyclinicId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [bookingDate, setBookingDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  const [lastBooking, setLastBooking] = useState(null);
  const [showSavedCode, setShowSavedCode] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const allowedDays = useMemo(
    () => new Set(schedules.map((s) => Number(s.day_of_week))),
    [schedules]
  );
  const allowedDaysList = useMemo(() => [...allowedDays].sort(), [allowedDays]);
  const storageKey = useMemo(
    () => (user?.id ? `${STORAGE_KEY}:${user.id}` : null),
    [user?.id]
  );
  const doctorsFiltered = useMemo(
    () => doctors.filter((d) => (polyclinicId ? d.polyclinic_id == polyclinicId : true)),
    [doctors, polyclinicId]
  );
  const selectedPolyclinic = useMemo(
    () => polyclinics.find((p) => String(p.id) === String(polyclinicId)),
    [polyclinics, polyclinicId]
  );
  const selectedDoctor = useMemo(
    () => doctors.find((d) => String(d.id) === String(doctorId)),
    [doctors, doctorId]
  );
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const nextAvailableDate = useMemo(
    () => (doctorId && allowedDays.size ? findNextAvailableDate(allowedDays) : null),
    [doctorId, allowedDays]
  );

  async function loadPolyclinics() {
    const res = await api.get(`/polyclinics`);
    const data = res.data?.data ?? [];
    setPolyclinics(data);
    if (!polyclinicId && data.length) {
      setPolyclinicId(String(data[0].id));
    }
  }

  async function loadDoctors() {
    const res = await api.get(`/doctors`);
    setDoctors(res.data?.data ?? []);
  }

  async function loadSchedulesForPolyclinic(poliId) {
    try {
      const res = await api.get(`/doctor-schedules`, {
        params: { polyclinic_id: poliId || undefined },
      });
      setClinicSchedules(res.data?.data ?? []);
    } catch (e) {
      setClinicSchedules([]);
    }
  }

  useEffect(() => {
    loadPolyclinics();
    loadDoctors();
  }, []);

  useEffect(() => {
    loadSchedulesForPolyclinic(polyclinicId);
  }, [polyclinicId]);

  useEffect(() => {
    if (!doctorId) {
      setSchedules([]);
      return;
    }
    const filtered = clinicSchedules.filter((s) => String(s.doctor_id) === String(doctorId));
    setSchedules(filtered);
  }, [clinicSchedules, doctorId]);

  useEffect(() => {
    if (doctorId && !doctorsFiltered.find((d) => String(d.id) === String(doctorId))) {
      setDoctorId("");
      setSchedules([]);
    }
  }, [polyclinicId, doctorId, doctorsFiltered]);

  useEffect(() => {
    if (!doctorId || !schedules.length) return;
    const next = findNextAvailableDate(allowedDays);
    if (next) setBookingDate(next);
  }, [doctorId, schedules, allowedDays]);

  useEffect(() => {
    setCopied(false);
    setShowSavedCode(false);

    if (!storageKey) {
      setLastBooking(null);
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data?.booking_code) {
          setLastBooking(parsed);
        } else {
          setLastBooking(null);
        }
      } else {
        setLastBooking(null);
      }
    } catch {
      setLastBooking(null);
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  async function submitBooking(e) {
    e.preventDefault();
    setErr("");

    if (!bookingDate || !allowedDays.has(new Date(bookingDate).getDay())) {
      setErr("Tanggal tidak sesuai dengan jadwal praktik dokter yang dipilih.");
      return;
    }

    try {
      const res = await api.post(`/bookings`, {
        polyclinic_id: Number(polyclinicId),
        doctor_id: Number(doctorId),
        booking_date: bookingDate,
      });
      setLastBooking(res.data);
      setShowSavedCode(false);
      alert("Booking berhasil. Kode booking tersimpan di tombol BK (lingkaran) pada panel langkah booking.");
      try {
        if (storageKey) {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              ...res.data,
              user_id: user?.id || null,
            })
          );
        }
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      setCopied(false);
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.response?.data?.error || e2.message);
    }
  }

  const schedulesByDay = useMemo(() => {
    const grouped = new Map();
    clinicSchedules.forEach((s) => {
      const day = Number(s.day_of_week);
      if (!grouped.has(day)) grouped.set(day, []);
      grouped.get(day).push(s);
    });
    return grouped;
  }, [clinicSchedules]);

  function findNextAvailableDate(daysSet) {
    const today = new Date();
    for (let i = 0; i < 14; i += 1) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      if (daysSet.has(d.getDay())) {
        return d.toISOString().slice(0, 10);
      }
    }
    return today.toISOString().slice(0, 10);
  }

  function formatDay(idx) {
    const map = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return map[idx] || idx;
  }

  function formatTime(val) {
    if (!val) return "-";
    if (typeof val === "string") return val.slice(0, 5);
    if (val instanceof Date) return val.toTimeString().slice(0, 5);
    return String(val);
  }

  function formatDateVerbose(val) {
    if (!val) return "-";
    const d = new Date(val);
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  }

  async function handleCopy(code) {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="booking-page">
      <div className="hero booking-hero">
        <div className="stack" style={{ gap: 12 }}>
          <p className="eyebrow">Pendaftaran Janji Online</p>
          <h2 style={{ margin: 0 }}>Booking Pasien</h2>
          <p style={{ margin: 0, maxWidth: 640 }}>
            Pilih poli, dokter, dan tanggal praktik tanpa halaman kosong. Jadwal tampil jelas agar pasien
            yakin sebelum submit.
          </p>
          <div className="hero-meta">
            <div className="stat-card">
              <p className="muted">Poliklinik aktif</p>
              <strong>{polyclinics.length || "-"}</strong>
              <span>{selectedPolyclinic ? `Dipilih: ${selectedPolyclinic.name}` : "Silakan pilih poli"}</span>
            </div>
            <div className="stat-card">
              <p className="muted">Dokter</p>
              <strong>{selectedDoctor ? selectedDoctor.name : "Belum dipilih"}</strong>
              <span>{selectedDoctor ? "Jadwal otomatis terbuka" : "Filter berdasarkan poli"}</span>
            </div>
            <div className="stat-card accent">
              <p className="muted">Jadwal terdekat</p>
              <strong>{nextAvailableDate ? formatDateVerbose(nextAvailableDate) : "Tunggu pilihan dokter"}</strong>
              <span>Dipilihkan sesuai hari praktik</span>
            </div>
          </div>
        </div>
        <div className="card patient-card">
          <p className="eyebrow">Identitas pasien</p>
          <h3 style={{ margin: "4px 0" }}>{user?.name || "-"}</h3>
          <p style={{ margin: 0, color: "#475569" }}>{user?.email || "Email belum tersedia"}</p>
         
          <p className="hint" style={{ marginTop: 12 }}>
            Simpan kode booking untuk verifikasi di loket. Data aman karena langsung tersimpan di sistem.
          </p>
        </div>
      </div>

      {user?.role !== "PATIENT" ? (
        <div className="card warning-card">
          <h3 style={{ marginTop: 0 }}>Akses terbatas</h3>
          <p style={{ marginBottom: 0 }}>Halaman booking hanya bisa digunakan oleh akun pasien.</p>
        </div>
      ) : (
        <div className="booking-grid">
          <div className="card booking-panel">
            <div className="section-title">
              <div className="stack" style={{ gap: 4 }}>
                <p className="eyebrow">Langkah booking</p>
                <h3 style={{ margin: 0 }}>Lengkapi data janji temu</h3>
              </div>
              <div className="chip-group">
                <span className="chip">Tanpa antre di loket</span>
                <span className="chip">Konfirmasi instan</span>
              </div>
            </div>

            <div className="progress-steps">
              <div className="step">
                <div className="step-bullet">1</div>
                <div className="step-body">
                  <p className="step-title">Pilih poli</p>
                  <p className="hint">Sistem memfilter dokter sesuai poli.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-bullet">2</div>
                <div className="step-body">
                  <p className="step-title">Pilih dokter</p>
                  <p className="hint">Jadwal praktik otomatis ditampilkan.</p>
                </div>
              </div>
              <div className="step">
                <div className="step-bullet">3</div>
                <div className="step-body">
                  <p className="step-title">Kunci tanggal</p>
                  <p className="hint">Tanggal dikunci pada hari praktik yang tersedia.</p>
                </div>
              </div>
            </div>

            <div className="saved-booking">
              <div className="saved-booking-action">
                <button
                  type="button"
                  className="circle-button"
                  disabled={!lastBooking?.data?.booking_code}
                  onClick={() => {
                    if (!lastBooking?.data?.booking_code) return;
                    setShowSavedCode((prev) => !prev);
                    setCopied(false);
                  }}
                  aria-label="Tampilkan kode booking tersimpan"
                >
                  BK
                </button>
                <div className="saved-booking-copy">
                  <p className="step-title" style={{ margin: 0 }}>
                    Kode booking terakhir
                  </p>
                  <p className="hint" style={{ marginBottom: 0 }}>
                    Klik tombol lingkaran untuk menampilkan kode booking terakhir yang tersimpan untuk akun ini.
                  </p>
                </div>
              </div>
              <span className={`chip ${lastBooking?.data?.booking_code ? "success" : "muted"}`}>
                {lastBooking?.data?.booking_code ? "Siap ditampilkan" : "Belum ada kode"}
              </span>
            </div>

            {showSavedCode && lastBooking?.data?.booking_code && (
              <div className="saved-booking-display">
                <div>
                  <p className="muted" style={{ margin: 0 }}>
                    Kode booking tersimpan
                  </p>
                  <h3 style={{ margin: "6px 0" }}>{lastBooking.data.booking_code}</h3>
                  <p style={{ margin: 0 }}>Tanggal: {lastBooking.data.booking_date}</p>
                </div>
                <div className="inline" style={{ alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => handleCopy(lastBooking.data.booking_code)}
                  >
                    Salin kode
                  </button>
                  <span className="pill">{copied ? "Kode tersalin" : "Tap untuk salin"}</span>
                </div>
              </div>
            )}

            <form onSubmit={submitBooking} className="form">
              <label>
                Pilih Poli
                <select value={polyclinicId} onChange={(e) => setPolyclinicId(e.target.value)} required>
                  <option value="">-- pilih poli --</option>
                  {polyclinics.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <span className="hint">Hanya dokter pada poli ini yang akan muncul.</span>
              </label>

              <label>
                Pilih Dokter
                <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
                  <option value="">-- pilih dokter --</option>
                  {doctorsFiltered.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <span className="hint">Jadwal praktik dan kuota akan disesuaikan.</span>
              </label>

              <label>
                Tanggal Booking (otomatis mengikuti jadwal praktik)
                <input
                  type="date"
                  value={bookingDate}
                  min={todayIso}
                  onChange={(e) => setBookingDate(e.target.value)}
                  required
                />
                <span className="hint">
                  {doctorId && schedules.length
                    ? `Hari praktik: ${allowedDaysList.map((d) => formatDay(Number(d))).join(", ")}`
                    : "Pilih dokter untuk melihat hari praktik yang tersedia."}
                </span>
              </label>

              {err && <div className="error-banner">Error: {err}</div>}

              <button className="primary" type="submit">
                Booking Sekarang
              </button>
            </form>
          </div>

          <div className="booking-side">
            <div className="card schedule-card">
              <div className="section-title">
                <div className="stack" style={{ gap: 4 }}>
                  <p className="eyebrow">Jadwal & kuota</p>
                  <h3 style={{ margin: 0 }}>Availability dokter</h3>
                </div>
                <div className="chip-group">
                  {allowedDaysList.length === 0 ? (
                    <span className="chip muted">Pilih dokter</span>
                  ) : (
                    allowedDaysList.map((d) => (
                      <span key={d} className="chip success">
                        {formatDay(Number(d))}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="schedule-summary">
                <div>
                  <p className="muted">Tanggal yang akan diproses</p>
                  <strong>{bookingDate ? formatDateVerbose(bookingDate) : "-"}</strong>
                </div>
                <div>
                  <p className="muted">Jadwal terdekat</p>
                  <strong>{nextAvailableDate ? formatDateVerbose(nextAvailableDate) : "Menunggu jadwal"}</strong>
                </div>
              </div>

              {polyclinicId && clinicSchedules.length === 0 && (
                <div className="empty-state">
                  <p>Belum ada jadwal untuk poli ini. Pilih poli lain atau hubungi admin.</p>
                </div>
              )}
              {!polyclinicId && (
                <div className="empty-state">
                  <p>Pilih poli dulu untuk menampilkan jadwal praktik.</p>
                </div>
              )}

              <div className="schedule-grid">
                {Array.from({ length: 7 }).map((_, idx) => {
                  const items = schedulesByDay.get(idx) || [];
                  const isActive = allowedDaysList.includes(idx);
                  return (
                    <div key={idx} className={`schedule-day ${isActive ? "active" : ""}`}>
                      <div className="day-header">
                        <strong>{formatDay(idx)}</strong>
                        <span className={`chip ${isActive ? "success" : "muted"}`}>
                          {isActive ? "Terbuka" : "Tutup"}
                        </span>
                      </div>
                      {items.length === 0 ? (
                        <p className="hint">Tidak ada jadwal.</p>
                      ) : (
                        <ul className="slot-list">
                          {items.map((s) => (
                            <li key={s.id} className="slot">
                              <div>
                                <p className="slot-title">{s.doctor_name}</p>
                                <p className="muted">
                                  {formatTime(s.start_time)} - {formatTime(s.end_time)}
                                </p>
                              </div>
                              <span className="chip">{s.quota ? `Kuota ${s.quota}` : "Tanpa kuota"}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            
          </div>
        </div>
      )}

    </div>
  );
}
