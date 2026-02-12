import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/";
  const registered = location.state?.registered;

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      navigate(redirectTo, { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.response?.data?.error || e2.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h2>Masuk</h2>
      {registered && (
        <p style={{ color: "green", fontWeight: 600 }}>
          Akun berhasil dibuat. Silakan login dengan email & password yang baru didaftarkan.
        </p>
      )}

      <form className="form" onSubmit={submit}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
          />
        </label>
        {err && <p style={{ color: "crimson" }}>{err}</p>}
        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Memproses..." : "Masuk"}
        </button>
        <p style={{ margin: 0 }}>
          Belum punya akun? <Link to="/register">Daftar</Link>
        </p>
      </form>
    </div>
  );
}
