import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useClients } from "../state/ClientsContext.jsx";

const STATUS_OPTIONS = ["Red", "Amber", "Green"];
const formatWeek = () => new Date().toISOString().slice(0, 10);

const statusBadgeClass = (status) => {
  if (status === "Red") {
    return "badge rounded-pill text-bg-danger";
  }
  if (status === "Amber") {
    return "badge rounded-pill text-bg-warning";
  }
  return "badge rounded-pill text-bg-success";
};

export default function ClientDetailPage() {
  const { id } = useParams();
  const { clients, addStatusUpdate } = useClients();
  const client = useMemo(() => clients.find((item) => item.id === id), [clients, id]);
  const [status, setStatus] = useState("Green");
  const [note, setNote] = useState("");

  if (!client) {
    return (
      <section className="d-grid gap-3">
        <p>Client not found.</p>
        <Link className="link-primary" to="/">
          Return to dashboard
        </Link>
      </section>
    );
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!note.trim()) {
      return;
    }
    addStatusUpdate(client.id, {
      week: formatWeek(),
      status,
      note: note.trim(),
    });
    setNote("");
  };

  return (
    <section className="d-grid gap-4">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
        <div>
          <Link className="link-primary" to="/">
            ← Back to dashboard
          </Link>
          <h2 className="mt-2 mb-1">{client.name}</h2>
          <p className="text-body-secondary mb-0">
            {client.region} · {client.product} · {client.tier}
          </p>
        </div>
        <span className={statusBadgeClass(client.currentStatus)}>
          {client.currentStatus}
        </span>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <h3 className="h5">Latest summary</h3>
          <p className="mb-0">{client.summary}</p>
        </div>
      </div>

      <div className="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-3">
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h4 className="h6">Support tickets</h4>
              <p className="mb-1">
                L1: {client.metrics.tickets.L1} · L2: {client.metrics.tickets.L2} · L3:
                {client.metrics.tickets.L3}
              </p>
              <p className="text-body-secondary small mb-0">
                Aging: {client.metrics.tickets.olderThan30} &gt;30d ·{" "}
                {client.metrics.tickets.olderThan60} &gt;60d
              </p>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h4 className="h6">JIRA issues</h4>
              <p className="mb-1">Open: {client.metrics.jiras.openCount}</p>
              <p className="text-body-secondary small mb-0">
                Critical: {client.metrics.jiras.critical}
              </p>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h4 className="h6">Product requests</h4>
              <p className="mb-0">Open requests: {client.metrics.requests}</p>
            </div>
          </div>
        </div>
        <div className="col">
          <div className="card h-100 shadow-sm">
            <div className="card-body">
              <h4 className="h6">Incidents</h4>
              <p className="mb-0">Recent incidents: {client.metrics.incidents}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between gap-2">
            <div>
              <h3 className="h5 mb-1">Weekly status timeline</h3>
              <p className="text-body-secondary mb-0">
                Chronological history of weekly health updates.
              </p>
            </div>
          </div>
        </div>
        <ul className="list-group list-group-flush">
          {client.history.map((entry) => (
            <li
              key={`${entry.week}-${entry.status}`}
              className="list-group-item d-flex flex-column flex-md-row gap-3"
            >
              <span className={statusBadgeClass(entry.status)}>{entry.status}</span>
              <div>
                <p className="fw-semibold mb-1">{entry.week}</p>
                <p className="mb-0">{entry.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <form className="card shadow-sm" onSubmit={handleSubmit}>
        <div className="card-body">
          <h3 className="h5">Log weekly update</h3>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label" htmlFor="status-select">
                Status
              </label>
              <select
                id="status-select"
                className="form-select"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-8">
              <label className="form-label" htmlFor="summary-note">
                Summary note
              </label>
              <textarea
                id="summary-note"
                className="form-control"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Describe the weekly update..."
              />
            </div>
          </div>
        </div>
        <div className="card-footer bg-white border-0">
          <button className="btn btn-primary" type="submit">
            Add update
          </button>
        </div>
      </form>
    </section>
  );
}
