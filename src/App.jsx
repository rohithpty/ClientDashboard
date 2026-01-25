import { NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage.jsx";
import ClientDetailPage from "./pages/ClientDetailPage.jsx";
import ConfigPage from "./pages/ConfigPage.jsx";

const getNavClass = ({ isActive }) =>
  `nav-link fw-semibold ${isActive ? "active" : ""}`.trim();

export default function App() {
  return (
    <div className="app-shell bg-light min-vh-100">
      <header className="navbar navbar-expand-lg bg-white border-bottom sticky-top">
        <div className="container-fluid px-4">
          <div>
            <p className="text-uppercase text-secondary small mb-1">Client Health</p>
            <span className="navbar-brand mb-0 h1">RAG Status Dashboard</span>
          </div>
          <nav className="navbar-nav ms-auto flex-row gap-2">
            <NavLink className={getNavClass} to="/">
              Dashboard
            </NavLink>
            <NavLink className={getNavClass} to="/config">
              Manage Clients
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="container py-4">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/config" element={<ConfigPage />} />
        </Routes>
      </main>
    </div>
  );
}
