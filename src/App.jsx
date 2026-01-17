import { NavLink, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage.jsx";
import ClientDetailPage from "./pages/ClientDetailPage.jsx";
import ConfigPage from "./pages/ConfigPage.jsx";

const getNavClass = ({ isActive }) =>
  isActive ? "nav-link nav-link--active" : "nav-link";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Client Health</p>
          <h1>RAG Status Dashboard</h1>
        </div>
        <nav className="nav">
          <NavLink className={getNavClass} to="/">
            Dashboard
          </NavLink>
          <NavLink className={getNavClass} to="/config">
            Manage Clients
          </NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/config" element={<ConfigPage />} />
        </Routes>
      </main>
    </div>
  );
}
