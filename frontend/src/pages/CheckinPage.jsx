import { useState } from "react";
import { api } from "../lib/api";

export default function CheckinPage() {
  const [bookingCode, setBookingCode] = useState("");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitCheckin(e) {
    e.preventDefault();
    setErr("");
    setResult(null);
    setLoading(true);

    try {
      const res = await api.post(`/checkin`, {
        booking_code: bookingCode.trim(),
      });
      setResult(res.data);
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.response?.data?.error || e2.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 540 }}>
      <h2>Check-in di Rumah Sakit</h2>
      <p>
        Masukkan kode booking yang sudah dibuat. Check-in hanya bisa dilakukan pada hari dan jam praktik
        dokter sesuai jadwal yang dipilih saat booking.
      </p>

      <form onSubmit={submitCheckin} className="form">
        <label>
          Kode Booking
          <input
            value={bookingCode}
            onChange={(e) => setBookingCode(e.target.value)}
            placeholder="contoh: BK201688"
            required
          />
        </label>

        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Memproses..." : "Check-in & Ambil Nomor"}
        </button>
      </form>

      {err && <p style={{ color: "crimson" }}>Error: {err}</p>}

      {result?.ok && (
        <div className="cta" style={{ marginTop: 16 }}>
          <div>
            <p style={{ margin: 0, opacity: 0.8 }}>Check-in berhasil</p>
            <h3 style={{ margin: "4px 0" }}>Nomor: {result.data.queue_number}</h3>
            <p style={{ margin: 0 }}>Tanggal: {result.data.queue_date}</p>
          </div>
          <span className="pill">Tunggu panggilan</span>
        </div>
      )}
    </div>
  );
}
