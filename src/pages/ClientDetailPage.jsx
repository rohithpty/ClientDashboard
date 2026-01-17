import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useClients } from "../state/ClientsContext.jsx";

const STATUS_OPTIONS = ["Red", "Amber", "Green"];
const statusClass = (status) => `status-pill status-pill--${status.toLowerCase()}`;

const formatWeek = () => new Date().toISOString().slice(0, 10);

export default function ClientDetailPage() {
  const { id } = useParams();
  const {
    clients,
    addStatusUpdate,
    updateClient,
    accountManagers,
    technicalAccountManagers,
  } = useClients();
  const client = useMemo(() => clients.find((item) => item.id === id), [clients, id]);
  const [status, setStatus] = useState("Green");
  const [note, setNote] = useState("");
  const [editForm, setEditForm] = useState({
    name: "",
    region: "",
    country: "",
    product: "",
    accountManager: "",
    technicalAccountManager: "",
    summary: "",
    status: "Green",
  });

  useEffect(() => {
    if (client) {
      setEditForm({
        name: client.name,
        region: client.region,
        country: client.country,
        product: client.product,
        accountManager: client.accountManager,
        technicalAccountManager: client.technicalAccountManager,
        summary: client.summary,
        status: client.currentStatus,
      });
    }
  }, [client]);

  if (!client) {
    return (
      <section className="detail">
        <p>Client not found.</p>
        <Link className="text-link" to="/">
          Return to dashboard
        </Link>
      </section>
    );
  }

  const handleDetailChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleDetailSave = (event) => {
    event.preventDefault();
    updateClient(client.id, {
      name: editForm.name,
      region: editForm.region,
      country: editForm.country,
      product: editForm.product,
      accountManager: editForm.accountManager,
      technicalAccountManager: editForm.technicalAccountManager,
      summary: editForm.summary,
      currentStatus: editForm.status,
    });
  };

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
    <section className="detail">
      <div className="detail__header">
        <div>
          <Link className="text-link" to="/">
            ← Back to dashboard
          </Link>
          <h2>{client.name}</h2>
          <p className="muted">
            {client.region} · {client.country} · {client.product}
          </p>
        </div>
        <span className={statusClass(client.currentStatus)}>
          {client.currentStatus}
        </span>
      </div>

      <div className="detail__summary">
        <h3>Latest summary</h3>
        <p>{client.summary}</p>
      </div>

      <form className="detail-card" onSubmit={handleDetailSave}>
        <h3>Edit client details</h3>
        <label>
          Client name
          <input
            type="text"
            value={editForm.name}
            onChange={(event) => handleDetailChange("name", event.target.value)}
          />
        </label>
        <label>
          Region
          <input
            type="text"
            value={editForm.region}
            onChange={(event) => handleDetailChange("region", event.target.value)}
          />
        </label>
        <label>
          Country
          <input
            type="text"
            value={editForm.country}
            onChange={(event) => handleDetailChange("country", event.target.value)}
          />
        </label>
        <label>
          Product
          <input
            type="text"
            value={editForm.product}
            onChange={(event) => handleDetailChange("product", event.target.value)}
          />
        </label>
        <label>
          AM
          <select
            value={editForm.accountManager}
            onChange={(event) => handleDetailChange("accountManager", event.target.value)}
          >
            {accountManagers.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          TAM
          <select
            value={editForm.technicalAccountManager}
            onChange={(event) =>
              handleDetailChange("technicalAccountManager", event.target.value)
            }
          >
            {technicalAccountManagers.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select
            value={editForm.status}
            onChange={(event) => handleDetailChange("status", event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Summary
          <textarea
            rows={3}
            value={editForm.summary}
            onChange={(event) => handleDetailChange("summary", event.target.value)}
          />
        </label>
        <button className="primary-button" type="submit">
          Save details
        </button>
      </form>

      <div className="detail__grid">
        <div className="detail-card">
          <h4>Support tickets</h4>
          <p>
            L1: {client.metrics.tickets.L1} · L2: {client.metrics.tickets.L2} ·
            L3: {client.metrics.tickets.L3}
          </p>
          <p className="muted">
            Aging: {client.metrics.tickets.olderThan30} &gt;30d ·{" "}
            {client.metrics.tickets.olderThan60} &gt;60d
          </p>
        </div>
        <div className="detail-card">
          <h4>JIRA issues</h4>
          <p>Open: {client.metrics.jiras.openCount}</p>
          <p className="muted">Critical: {client.metrics.jiras.critical}</p>
        </div>
        <div className="detail-card">
          <h4>Product requests</h4>
          <p>Open requests: {client.metrics.requests}</p>
        </div>
        <div className="detail-card">
          <h4>Incidents</h4>
          <p>Recent incidents: {client.metrics.incidents}</p>
        </div>
      </div>

      <div className="detail__timeline">
        <div className="timeline-header">
          <h3>Weekly status timeline</h3>
          <p className="muted">Chronological history of weekly health updates.</p>
        </div>
        <ol className="timeline">
          {client.history.map((entry) => (
            <li key={`${entry.week}-${entry.status}`} className="timeline__item">
              <span className={statusClass(entry.status)}>{entry.status}</span>
              <div>
                <p className="timeline__date">{entry.week}</p>
                <p>{entry.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <form className="status-form" onSubmit={handleSubmit}>
        <h3>Log weekly update</h3>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Summary note
          <textarea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Describe the weekly update..."
          />
        </label>
        <button className="primary-button" type="submit">
          Add update
        </button>
      </form>
    </section>
  );
}
