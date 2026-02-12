import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function formatTime(val) {
  if (!val) return "-";
  if (typeof val === "string") return val.slice(0, 5);
  if (val instanceof Date) return val.toTimeString().slice(0, 5);
  return String(val);
}

function toTimeInput(val) {
  if (!val) return "";
  if (typeof val === "string") return val.slice(0, 5);
  if (val instanceof Date) return val.toTimeString().slice(0, 5);
  return String(val);
}

export default function DoctorSchedulesPage() {
  const [polyclinics, setPolyclinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [filters, setFilters] = useState({ polyclinicId: "", doctorId: "" });
  const [newPoli, setNewPoli] = useState({ name: "", description: "" });
  const [newDoctor, setNewDoctor] = useState({ name: "", polyclinic_id: "" });
  const [form, setForm] = useState({
    doctor_id: "",
    day_of_week: "",
    start_time: "",
    end_time: "",
    quota: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredDoctors = useMemo(() => {
    if (!filters.polyclinicId) return doctors;
    return doctors.filter((d) => String(d.polyclinic_id) === String(filters.polyclinicId));
  }, [doctors, filters.polyclinicId]);

  useEffect(() => {
    loadPolyclinics();
    loadDoctors();
  }, []);

  async function loadPolyclinics() {
    const res = await api.get("/polyclinics");
    setPolyclinics(res.data?.data ?? []);
  }

  async function loadDoctors() {
    const res = await api.get("/doctors");
    setDoctors(res.data?.data ?? []);
  }

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/doctor-schedules", {
        params: {
          polyclinic_id: filters.polyclinicId || undefined,
          doctor_id: filters.doctorId || undefined,
        },
      });
      setSchedules(res.data?.data ?? []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [filters.doctorId, filters.polyclinicId]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  function resetForm() {
    setForm({
      doctor_id: "",
      day_of_week: "",
      start_time: "",
      end_time: "",
      quota: "",
    });
    setEditingId(null);
  }

  function startEdit(sched) {
    setEditingId(sched.id);
    setForm({
      doctor_id: sched.doctor_id,
      day_of_week: sched.day_of_week,
      start_time: toTimeInput(sched.start_time),
      end_time: toTimeInput(sched.end_time),
      quota: sched.quota ?? "",
    });
    setInfo("");
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!form.doctor_id || form.day_of_week === "" || !form.start_time || !form.end_time) {
      setError("Lengkapi dokter, hari, dan jam praktik.");
      return;
    }

    const payload = {
      doctor_id: Number(form.doctor_id),
      day_of_week: Number(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
      quota: form.quota ? Number(form.quota) : null,
    };

    try {
      if (editingId) {
        await api.put(`/doctor-schedules/${editingId}`, payload);
        setInfo("Jadwal diperbarui.");
      } else {
        await api.post(`/doctor-schedules`, payload);
        setInfo("Jadwal ditambahkan.");
      }
      resetForm();
      loadSchedules();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.response?.data?.error || e2.message);
    }
  }

  async function createPolyclinic(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!newPoli.name.trim()) {
      setError("Nama poli wajib diisi.");
      return;
    }
    try {
      const res = await api.post("/polyclinics", {
        name: newPoli.name.trim(),
        description: newPoli.description || null,
      });
      setInfo("Poli ditambahkan.");
      setNewPoli({ name: "", description: "" });
      await loadPolyclinics();
      if (res.data?.id) {
        setFilters((f) => ({ ...f, polyclinicId: String(res.data.id) }));
      }
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.response?.data?.error || e2.message);
    }
  }

  async function createDoctor(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!newDoctor.name.trim() || !newDoctor.polyclinic_id) {
      setError("Nama dokter dan poli wajib diisi.");
      return;
    }
    try {
      const res = await api.post("/doctors", {
        name: newDoctor.name.trim(),
        polyclinic_id: Number(newDoctor.polyclinic_id),
      });
      setInfo("Dokter ditambahkan.");
      setNewDoctor({ name: "", polyclinic_id: "" });
      await loadDoctors();
      if (res.data?.id) {
        setFilters((f) => ({ ...f, doctorId: String(res.data.id), polyclinicId: String(newDoctor.polyclinic_id) }));
      }
      loadSchedules();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.response?.data?.error || e2.message);
    }
  }

  async function remove(id) {
    if (!window.confirm("Hapus jadwal ini?")) return;
    setError("");
    setInfo("");
    try {
      await api.delete(`/doctor-schedules/${id}`);
      setInfo("Jadwal dihapus.");
      if (editingId === id) resetForm();
      loadSchedules();
    } catch (e2) {
      setError(e2?.response?.data?.message || e2?.response?.data?.error || e2.message);
    }
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="cta">
        <div>
          <p style={{ margin: 0, opacity: 0.7 }}>Jadwal Dokter</p>
          <h2 style={{ margin: "4px 0" }}>Tambah / Edit / Hapus</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>
            Jadwal ini dipakai untuk validasi booking dan check-in pasien.
          </p>
        </div>
        <button className="ghost" onClick={resetForm} style={{ color: "#e2fbe8" }}>
          Jadwal Baru
        </button>
      </div>

      <div className="card">
        <h3>Tambah Poli & Dokter</h3>
        <div className="card-grid">
          <form className="form" onSubmit={createPolyclinic}>
            <h4 style={{ margin: 0 }}>Tambah Poli</h4>
            <label>
              Nama Poli
              <input
                value={newPoli.name}
                onChange={(e) => setNewPoli((p) => ({ ...p, name: e.target.value }))}
                placeholder="Contoh: Poli Umum"
                required
              />
            </label>
            <label>
              Deskripsi (opsional)
              <input
                value={newPoli.description}
                onChange={(e) => setNewPoli((p) => ({ ...p, description: e.target.value }))}
                placeholder="Keterangan singkat"
              />
            </label>
            <button className="primary" type="submit">
              Simpan Poli
            </button>
          </form>

          <form className="form" onSubmit={createDoctor}>
            <h4 style={{ margin: 0 }}>Tambah Dokter</h4>
            <label>
              Nama Dokter
              <input
                value={newDoctor.name}
                onChange={(e) => setNewDoctor((d) => ({ ...d, name: e.target.value }))}
                placeholder="Contoh: dr. Andi"
                required
              />
            </label>
            <label>
              Poli
              <select
                value={newDoctor.polyclinic_id}
                onChange={(e) => setNewDoctor((d) => ({ ...d, polyclinic_id: e.target.value }))}
                required
              >
                <option value="">-- pilih poli --</option>
                {polyclinics.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary" type="submit">
              Simpan Dokter
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="inline" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Filter Cepat</h3>
          <button
            className="ghost"
            type="button"
            onClick={() => setFilters({ polyclinicId: "", doctorId: "" })}
            style={{ padding: "8px 12px" }}
          >
            Reset
          </button>
        </div>
        <div className="inline" style={{ gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              background: "#f8fafc",
              borderRadius: 12,
              padding: "10px 12px",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <span style={{ fontWeight: 700 }}>Poli:</span>
            <button
              className={`ghost ${filters.polyclinicId === "" ? "active" : ""}`}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, polyclinicId: "" }))}
            >
              Semua
            </button>
            {polyclinics.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`ghost ${String(filters.polyclinicId) === String(p.id) ? "active" : ""}`}
                onClick={() => setFilters((f) => ({ ...f, polyclinicId: String(p.id), doctorId: "" }))}
              >
                {p.name}
              </button>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              background: "#f8fafc",
              borderRadius: 12,
              padding: "10px 12px",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <span style={{ fontWeight: 700 }}>Dokter:</span>
            <button
              className={`ghost ${filters.doctorId === "" ? "active" : ""}`}
              type="button"
              onClick={() => setFilters((f) => ({ ...f, doctorId: "" }))}
            >
              Semua
            </button>
            {filteredDoctors.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`ghost ${String(filters.doctorId) === String(d.id) ? "active" : ""}`}
                onClick={() => setFilters((f) => ({ ...f, doctorId: String(d.id) }))}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>{editingId ? "Edit Jadwal" : "Tambah Jadwal"}</h3>
        <form className="form" onSubmit={submit}>
          <label>
            Dokter
            <select
              value={form.doctor_id}
              onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value }))}
              required
            >
              <option value="">-- pilih dokter --</option>
              {filteredDoctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Hari
            <select
              value={form.day_of_week}
              onChange={(e) => setForm((f) => ({ ...f, day_of_week: e.target.value }))}
              required
            >
              <option value="">-- pilih hari --</option>
              {DAY_NAMES.map((name, idx) => (
                <option key={idx} value={idx}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <div className="inline" style={{ gap: 12 }}>
            <label style={{ flex: 1 }}>
              Jam Mulai
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                required
              />
            </label>
            <label style={{ flex: 1 }}>
              Jam Selesai
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                required
              />
            </label>
            <label style={{ width: 160 }}>
              Kuota (opsional)
              <input
                type="number"
                min="0"
                placeholder="Kosongkan bila bebas"
                value={form.quota}
                onChange={(e) => setForm((f) => ({ ...f, quota: e.target.value }))}
              />
            </label>
          </div>

          {error && <p style={{ color: "crimson" }}>{error}</p>}
          {info && <p style={{ color: "green" }}>{info}</p>}

          <div className="inline">
            <button className="primary" type="submit">
              {editingId ? "Simpan Perubahan" : "Tambah Jadwal"}
            </button>
            {editingId && (
              <button className="ghost" type="button" onClick={resetForm}>
                Batal Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="card">
        <div className="inline" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Daftar Jadwal</h3>
          {loading && <span style={{ fontSize: 14, opacity: 0.7 }}>Memuat...</span>}
        </div>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Dokter</th>
                <th>Poli</th>
                <th>Hari</th>
                <th>Jam</th>
                <th>Kuota</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan="6">Belum ada jadwal</td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id}>
                    <td>{s.doctor_name || s.doctor_id}</td>
                    <td>{s.polyclinic_name || s.polyclinic_id}</td>
                    <td>{DAY_NAMES[s.day_of_week] ?? s.day_of_week}</td>
                    <td>
                      {formatTime(s.start_time)} - {formatTime(s.end_time)}
                    </td>
                    <td>{s.quota || "-"}</td>
                    <td className="inline">
                      <button className="ghost" onClick={() => startEdit(s)}>
                        Edit
                      </button>
                      <button className="ghost" onClick={() => remove(s.id)}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
