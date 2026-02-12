import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import "./App.css";
import AdminQueue from "./pages/AdminQueue.jsx";
import DisplayQueue from "./pages/DisplayQueue.jsx";
import BookingPage from "./pages/BookingPage.jsx";
import CheckinPage from "./pages/CheckinPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import DoctorSchedulesPage from "./pages/DoctorSchedulesPage.jsx";
import { useAuth } from "./lib/AuthContext.jsx";

function NavBar() {
  const { user, logout, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  const handleLogout = () => {
    const confirmMsg =
      user?.role === "ADMIN"
        ? "Keluar dari akun admin? Pastikan perubahan data sudah tersimpan."
        : "Apakah Anda yakin ingin keluar? Pastikan sudah menyimpan kode booking atau data penting.";
    if (window.confirm(confirmMsg)) {
      logout();
    }
  };

  const navItems =
    user?.role === "ADMIN"
      ? [
          { to: "/admin", label: "Dashboard" },
          { to: "/admin/queues", label: "Antrian" },
          { to: "/admin/schedules", label: "Jadwal Dokter" },
          { to: "/display", label: "Display" },
        ]
      : user
        ? [
            { to: "/patient", label: "Dashboard" },
            { to: "/patient/booking", label: "Booking" },
            { to: "/patient/checkin", label: "Check-in" },
            { to: "/display", label: "Display" },
          ]
        : [];

  return (
    <header className="nav">
      <div className="logo">
        <Link to={user ? (user.role === "ADMIN" ? "/admin" : "/patient") : "/login"}>Hospiline</Link>
      </div>
      <nav className="nav-links">
        {navItems.map((item) => (
          <Link
            key={item.to}
            className={
              item.to === "/admin" || item.to === "/patient"
                ? location.pathname === item.to
                  ? "active"
                  : ""
                : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
                  ? "active"
                  : ""
            }
            to={item.to}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="nav-auth">
        {user ? (
          <>
            <span className="pill">
              {user.role === "ADMIN" ? "Admin" : "Pasien"} · {user.name}
            </span>
            <button className="ghost" onClick={handleLogout}>
              Keluar
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Masuk</Link>
            <Link className="btn" to="/register">
              Daftar
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (role && user.role !== role) {
    return <Navigate to={user.role === "ADMIN" ? "/admin" : "/patient"} replace />;
  }
  return children;
}

function LandingRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "ADMIN" ? "/admin" : "/patient"} replace />;
}

export default function App() {
  return (
    <div className="app-shell">
      <NavBar />
      <main className="page">
        <Routes>
          <Route path="/" element={<LandingRedirect />} />
          <Route
            path="/patient"
            element={
              <RequireAuth role="PATIENT">
                <PatientDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/patient/booking"
            element={
              <RequireAuth role="PATIENT">
                <BookingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/patient/checkin"
            element={
              <RequireAuth role="PATIENT">
                <CheckinPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth role="ADMIN">
                <AdminDashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/queues"
            element={
              <RequireAuth role="ADMIN">
                <AdminQueue />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/schedules"
            element={
              <RequireAuth role="ADMIN">
                <DoctorSchedulesPage />
              </RequireAuth>
            }
          />
          <Route path="/display" element={<DisplayQueue />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
