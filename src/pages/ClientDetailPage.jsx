import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useClients } from "../state/ClientsContext.jsx";
import { getReportData } from "../data/reportRepository.js";

const STATUS_OPTIONS = ["Red", "Amber", "Green"];
const formatWeek = () => new Date().toISOString().slice(0, 10);

const normalizeName = (value) => value?.trim().toLowerCase() ?? "";

const parseCsvDate = (value) => {
  if (!value) {
    return null;
  }
  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const parsed = parseCsvDate(value);
  if (!parsed) {
    return "N/A";
  }
  return parsed.toLocaleDateString();
};

const buildTicketSummary = (records) => {
  const counts = {
    total: records.length,
    rca: 0,
    over7: 0,
    over30: 0,
    over60: 0,
    over90: 0,
  };

  records.forEach((record) => {
    const status = record.ticketStatus ?? "";
    if (status.toLowerCase().includes("rca")) {
      counts.rca += 1;
    }
    const requested = parseCsvDate(record.requested);
    if (!requested) {
      return;
    }
    const ageInDays = Math.floor((Date.now() - requested.getTime()) / 86400000);
    if (ageInDays > 7) {
      counts.over7 += 1;
    }
    if (ageInDays > 30) {
      counts.over30 += 1;
    }
    if (ageInDays > 60) {
      counts.over60 += 1;
    }
    if (ageInDays > 90) {
      counts.over90 += 1;
    }
  });

  return counts;
};

const getStatusTone = (status) => {
  if (status === "Red") {
    return "risk";
  }
  if (status === "Amber") {
    return "watch";
  }
  return "healthy";
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

  const statusTone = getStatusTone(client.currentStatus);
  const candidateNames = useMemo(() => {
    const aliases = client.aliases ?? [];
    return [client.name, ...aliases].map(normalizeName).filter(Boolean);
  }, [client]);
  const incidentRecords = useMemo(() => {
    const records = getReportData("incidents").records;
    return records.filter((record) =>
      candidateNames.includes(normalizeName(record.organization)),
    );
  }, [candidateNames]);
  const supportRecords = useMemo(() => {
    const records = getReportData("support-tickets").records;
    return records.filter((record) =>
      candidateNames.includes(normalizeName(record.organization)),
    );
  }, [candidateNames]);
  const incidentSummary = useMemo(
    () => buildTicketSummary(incidentRecords),
    [incidentRecords],
  );
  const supportSummary = useMemo(() => buildTicketSummary(supportRecords), [supportRecords]);
  const recentIncidents = useMemo(
    () =>
      [...incidentRecords]
        .sort((a, b) => (parseCsvDate(b.requested)?.getTime() ?? 0) - (parseCsvDate(a.requested)?.getTime() ?? 0))
        .slice(0, 5),
    [incidentRecords],
  );
  const recentSupportTickets = useMemo(
    () =>
      [...supportRecords]
        .sort((a, b) => (parseCsvDate(b.requested)?.getTime() ?? 0) - (parseCsvDate(a.requested)?.getTime() ?? 0))
        .slice(0, 5),
    [supportRecords],
  );

  return (
    <section className={`d-grid gap-4 detail-shell status-${statusTone}`}>
      <header className={`detail-hero status-${statusTone}`}>
        <div>
          <Link className="detail-hero__link" to="/">
            ← Back to dashboard
          </Link>
          <h2 className="detail-hero__title">{client.name}</h2>
          <p className="detail-hero__meta">
            {client.region} · {client.product} · {client.tier} ·{" "}
            {client.environment ?? "Unknown"}
          </p>
        </div>
        <span className="detail-status-pill">Status: {client.currentStatus}</span>
      </header>

      <div className="detail-card">
        <h3 className="h5">Latest summary</h3>
        <p className="mb-0">{client.summary}</p>
      </div>

      <div className="detail-grid">
        <div className="detail-card">
          <h4 className="h6 d-flex align-items-center gap-2">
            <i className="bi bi-ticket-perforated" aria-hidden="true"></i>
            Support tickets (imported)
          </h4>
          <p className="detail-stat">{supportSummary.total} total</p>
          <div className="detail-list">
            <span>RCA: {supportSummary.rca}</span>
            <span>&gt;7d: {supportSummary.over7}</span>
            <span>&gt;30d: {supportSummary.over30}</span>
            <span>&gt;60d: {supportSummary.over60}</span>
          </div>
        </div>
        <div className="detail-card">
          <h4 className="h6 d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle" aria-hidden="true"></i>
            Incidents (imported)
          </h4>
          <p className="detail-stat">{incidentSummary.total} total</p>
          <div className="detail-list">
            <span>RCA: {incidentSummary.rca}</span>
            <span>&gt;7d: {incidentSummary.over7}</span>
            <span>&gt;30d: {incidentSummary.over30}</span>
            <span>&gt;60d: {incidentSummary.over60}</span>
          </div>
        </div>
        <div className="detail-card">
          <h4 className="h6 d-flex align-items-center gap-2">
            <i className="bi bi-kanban" aria-hidden="true"></i>
            JIRA issues
          </h4>
          <p className="detail-stat">Open: {client.metrics.jiras.openCount}</p>
          <p className="mb-0 text-body-secondary">
            Critical: {client.metrics.jiras.critical}
          </p>
        </div>
        <div className="detail-card">
          <h4 className="h6 d-flex align-items-center gap-2">
            <i className="bi bi-inbox" aria-hidden="true"></i>
            Product requests
          </h4>
          <p className="detail-stat">Open requests: {client.metrics.requests}</p>
        </div>
      </div>

      <div className="detail-split">
        <div className="detail-panel">
          <div className="detail-panel__header">
            <h3 className="h5 mb-1">Recent support tickets</h3>
            <span className="detail-panel__count">{supportRecords.length} total</span>
          </div>
          <div className="detail-table">
            {recentSupportTickets.length === 0 ? (
              <p className="mb-0 text-body-secondary">No imported support tickets.</p>
            ) : (
              <ul>
                {recentSupportTickets.map((record) => (
                  <li key={record.id}>
                    <div>
                      <strong>{record.subject || "Untitled ticket"}</strong>
                      <p className="mb-0">
                        {record.ticketStatus} · Priority {record.priority || "N/A"}
                      </p>
                    </div>
                    <span>{formatDate(record.requested)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="detail-panel">
          <div className="detail-panel__header">
            <h3 className="h5 mb-1">Recent incidents</h3>
            <span className="detail-panel__count">{incidentRecords.length} total</span>
          </div>
          <div className="detail-table">
            {recentIncidents.length === 0 ? (
              <p className="mb-0 text-body-secondary">No imported incidents.</p>
            ) : (
              <ul>
                {recentIncidents.map((record) => (
                  <li key={record.id}>
                    <div>
                      <strong>{record.subject || "Untitled incident"}</strong>
                      <p className="mb-0">
                        {record.ticketStatus} · Priority {record.priority || "N/A"}
                      </p>
                    </div>
                    <span>{formatDate(record.requested)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="detail-panel">
        <div className="detail-panel__header">
          <div>
            <h3 className="h5 mb-1">Weekly status timeline</h3>
            <p className="text-body-secondary mb-0">
              Chronological history of weekly health updates.
            </p>
          </div>
        </div>
        <ul className="detail-timeline">
          {client.history.map((entry) => (
            <li
              key={`${entry.week}-${entry.status}`}
              className="detail-timeline__item"
            >
              <span className={`detail-timeline__badge status-${getStatusTone(entry.status)}`}>
                {entry.status}
              </span>
              <div>
                <p className="fw-semibold mb-1">{entry.week}</p>
                <p className="mb-0">{entry.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <form className="detail-panel" onSubmit={handleSubmit}>
        <div className="detail-panel__header">
          <h3 className="h5 mb-0">Log weekly update</h3>
        </div>
        <div className="detail-form">
          <div>
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
          <div>
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
        <div className="detail-form__footer">
          <button className="btn btn-amber" type="submit">
            Add update
          </button>
        </div>
      </form>
    </section>
  );
}
