import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="cta">
        <div>
          <p style={{ margin: 0, opacity: 0.7 }}>Dashboard Admin</p>
          <h2 style={{ margin: "4px 0" }}>{user?.name || "Administrator"}</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>
            Kelola antrian dan jadwal dokter.
          </p>
        </div>
        <div className="inline">
          <Link className="btn" to="/admin/queues">
            Kelola Antrian
          </Link>
          <Link className="ghost" to="/admin/schedules">
            Atur Jadwal Dokter
          </Link>
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <h3>Antrian Poli</h3>
          <p>Panggil nomor berikutnya atau tandai selesai. Display akan mengikuti secara real-time.</p>
          <Link className="btn" to="/admin/queues">
            Buka Dashboard Antrian
          </Link>
        </div>

        <div className="card">
          <h3>Jadwal Dokter</h3>
          <p>
            CRUD jadwal praktik per dokter: hari, jam mulai, jam selesai, dan kuota opsional. Jadwal ini
            menjadi dasar booking & check-in pasien.
          </p>
          <Link className="ghost" to="/admin/schedules">
            Kelola Jadwal
          </Link>
        </div>

        <div className="card">
          <h3>Display Antrian</h3>
          <p>Buka layar publik untuk poli tertentu dari browser TV/monitor.</p>
          <Link className="ghost" to="/display">
            Buka Display
          </Link>
        </div>
      </div>
    </div>
  );
}
