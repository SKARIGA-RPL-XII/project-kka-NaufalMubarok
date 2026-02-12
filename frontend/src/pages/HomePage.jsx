import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="stack" style={{ gap: 24 }}>
      <section className="hero">
        <div className="stack">
          <p style={{ textTransform: "uppercase", letterSpacing: 2, color: "#0ea5e9", fontWeight: 700 }}>
            Sistem Antrian RS
          </p>
          <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.2 }}>
            Ambil nomor dari rumah, check-in di RS, pantau antrian real-time.
          </h1>
          <p style={{ maxWidth: 640, color: "#334155" }}>
            Hospiline membantu pasien booking poli & dokter lebih cepat, staf front-desk lebih tenang,
            dan layar display selalu update tanpa reload manual.
          </p>
          <div className="inline">
            <Link className="btn" to="/booking">
              Booking Pasien
            </Link>
            <Link className="ghost" to="/display">
              Lihat Display Antrian
            </Link>
          </div>
        </div>
      </section>

      <div className="card-grid">
        <div className="card">
          <h3>Booking Online</h3>
          <p>Pasien mendaftar dari rumah, memilih poli & dokter yang tersedia pada tanggal tertentu.</p>
        </div>
        <div className="card">
          <h3>Check-in Cepat</h3>
          <p>Datang ke RS, input kode booking, langsung dapat nomor antrian tanpa menulis ulang data.</p>
        </div>
        <div className="card">
          <h3>Monitor Real-Time</h3>
          <p>Petugas memanggil nomor via dashboard admin. Layar display otomatis mengikuti via stream SSE.</p>
        </div>
      </div>
    </div>
  );
}
