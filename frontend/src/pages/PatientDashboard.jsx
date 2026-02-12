import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";

export default function PatientDashboard() {
  const { user } = useAuth();

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="cta">
        <div>
          <p style={{ margin: 0, opacity: 0.7 }}>Selamat datang</p>
          <h2 style={{ margin: "4px 0" }}>{user?.name || "Pasien"}</h2>
          <p style={{ margin: 0, opacity: 0.8 }}>
            Mulai dari booking sesuai jadwal praktik dokter, lalu check-in saat tiba di rumah sakit.
          </p>
        </div>
        <div className="inline">
          <Link className="btn" to="/patient/booking">
            Buat Booking
          </Link>
          <Link className="ghost" to="/patient/checkin">
            Check-in
          </Link>
        </div>
      </div>

      <div className="card-grid">
        <div className="card">
          <h3>Booking Sesuai Jadwal</h3>
          <p>
            Pilih poli dan dokter, sistem akan menampilkan hari & jam praktik yang tersedia. Booking hanya
            bisa dibuat pada tanggal yang cocok dengan jadwal tersebut.
          </p>
          <Link className="btn" to="/patient/booking">
            Buat Booking
          </Link>
        </div>

        <div className="card">
          <h3>Check-in Cepat</h3>
          <p>
            Input kode booking ketika sudah sampai. Check-in akan divalidasi dengan jadwal praktik dokter
            hari itu supaya antrian sesuai.
          </p>
          <Link className="ghost" to="/patient/checkin">
            Masuk Antrian
          </Link>
        </div>

        <div className="card">
          <h3>Layar Antrian</h3>
          <p>Lihat panggilan terbaru dari petugas untuk poli yang dituju.</p>
          <Link className="ghost" to="/display">
            Buka Display
          </Link>
        </div>
      </div>
    </div>
  );
}
