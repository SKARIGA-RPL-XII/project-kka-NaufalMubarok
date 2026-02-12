import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    nik: "",
    phone: "",
    address: "",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function setField(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await register(form);
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.response?.data?.error || e2.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 620, margin: "0 auto" }}>
      <h2>Daftar Pasien</h2>
      <p>Buat akun untuk booking dari rumah.</p>

      <form className="form" onSubmit={submit}>
        <label>
          Nama
          <input value={form.name} onChange={(e) => setField("name", e.target.value)} required />
        </label>
        <label>
          Email
          <input
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            type="email"
            required
          />
        </label>
        <label>
          Password
          <input
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            type="password"
            required
          />
        </label>
        <label>
          NIK (opsional)
          <input value={form.nik} onChange={(e) => setField("nik", e.target.value)} />
        </label>
        <label>
          No HP (opsional)
          <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
        </label>
        <label>
          Alamat (opsional)
          <textarea
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
            rows={3}
          />
        </label>
        {err && <p style={{ color: "crimson" }}>{err}</p>}
        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Memproses..." : "Daftar & Masuk"}
        </button>
        <p style={{ margin: 0 }}>
          Sudah punya akun? <Link to="/login">Masuk</Link>
        </p>
      </form>
    </div>
  );
}
