import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import ClientCard from "../components/ClientCard.jsx";
import { useClients } from "../state/ClientsContext.jsx";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
);

const STATUS_ORDER = ["Red", "Amber", "Green"];

const sortByStatus = (clients) => {
  const priority = Object.fromEntries(
    STATUS_ORDER.map((status, index) => [status, index]),
  );
  return [...clients].sort(
    (a, b) => priority[a.currentStatus] - priority[b.currentStatus],
  );
};

const getCounts = (clients) => ({
  Green: clients.filter((client) => client.currentStatus === "Green").length,
  Amber: clients.filter((client) => client.currentStatus === "Amber").length,
  Red: clients.filter((client) => client.currentStatus === "Red").length,
});

export default function DashboardPage() {
  const { clients } = useClients();
  const sortedClients = sortByStatus(clients);
  const counts = getCounts(clients);
  const [activeTab, setActiveTab] = useState("clients");

  const healthTrend = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6"],
    datasets: [
      {
        label: "Healthy",
        data: [10, 12, 11, 14, 15, 16],
        borderColor: "#4ade80",
        backgroundColor: "rgba(74, 222, 128, 0.2)",
        tension: 0.35,
      },
      {
        label: "At Risk",
        data: [6, 7, 8, 7, 6, 5],
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.2)",
        tension: 0.35,
      },
      {
        label: "Critical",
        data: [3, 2, 4, 3, 4, 3],
        borderColor: "#f97316",
        backgroundColor: "rgba(249, 115, 22, 0.2)",
        tension: 0.35,
      },
    ],
  };

  const alertsData = {
    labels: ["Healthy", "At Risk", "Critical", "Weeks"],
    datasets: [
      {
        label: "Open",
        data: [12, 8, 5, 10],
        backgroundColor: "#38bdf8",
      },
      {
        label: "Pending",
        data: [6, 4, 3, 5],
        backgroundColor: "#f59e0b",
      },
      {
        label: "Resolved",
        data: [9, 6, 4, 7],
        backgroundColor: "#22c55e",
      },
    ],
  };

  const slaData = {
    labels: ["Met", "At Risk", "Breached"],
    datasets: [
      {
        data: [72, 18, 10],
        backgroundColor: ["#22c55e", "#f59e0b", "#ef4444"],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        labels: { color: "#d4d8e5" },
      },
    },
    scales: {
      x: { ticks: { color: "#cbd5f5" }, grid: { color: "#2a3448" } },
      y: { ticks: { color: "#cbd5f5" }, grid: { color: "#2a3448" } },
    },
  };

  return (
    <section className="dashboard">
      <div className="dashboard__header">
        <div>
          <h2>Client Health Dashboard</h2>
          <p className="muted">
            Leadership view of current status, alerts, and weekly trends.
          </p>
        </div>
        <Link className="primary-button" to="/config">
          Manage configuration
        </Link>
      </div>

      <div className="dashboard-tabs">
        <button
          type="button"
          className={`tab-button ${activeTab === "clients" ? "tab-button--active" : ""}`}
          onClick={() => setActiveTab("clients")}
        >
          Clients
        </button>
        <button
          type="button"
          className={`tab-button ${activeTab === "insights" ? "tab-button--active" : ""}`}
          onClick={() => setActiveTab("insights")}
        >
          Insights
        </button>
      </div>

      {activeTab === "clients" ? (
        <>
          <div className="summary-grid">
            <div className="summary-card summary-card--healthy">
              <div>
                <p>Healthy Clients</p>
                <h3>{counts.Green}</h3>
              </div>
              <span className="summary-icon">✓</span>
            </div>
            <div className="summary-card summary-card--risk">
              <div>
                <p>At Risk Clients</p>
                <h3>{counts.Amber}</h3>
              </div>
              <span className="summary-icon">!</span>
            </div>
            <div className="summary-card summary-card--critical">
              <div>
                <p>Critical Clients</p>
                <h3>{counts.Red}</h3>
              </div>
              <span className="summary-icon">!</span>
            </div>
          </div>
          <div className="status-group">
            <h3 className="status-title">Clients</h3>
            <div className="client-grid client-grid--dense">
              {sortedClients.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="dashboard-layout dashboard-layout--insights">
          <div className="panel">
            <h3>Overall Client Health</h3>
            <Line data={healthTrend} options={chartOptions} />
          </div>
          <div className="panel">
            <h3>Alerts &amp; Issues</h3>
            <Bar data={alertsData} options={chartOptions} />
          </div>
          <div className="panel panel--compact">
            <h3>SLA Compliance</h3>
            <div className="panel-sla">
              <Doughnut
                data={slaData}
                options={{ plugins: { legend: { display: false } } }}
              />
              <div>
                <p className="muted">Overall SLA score</p>
                <h2>72%</h2>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
