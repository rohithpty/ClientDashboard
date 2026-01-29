import { useState } from "react";
import { Link } from "react-router-dom";
import afsLogo from "../assets/schemes/afs.svg";
import jetcoLogo from "../assets/schemes/jetco.svg";
import jonetCortexLogo from "../assets/schemes/jonet-cortex.svg";
import madaLogo from "../assets/schemes/mada.svg";
import mastercardLogo from "../assets/schemes/mastercard.svg";
import uaeLogo from "../assets/schemes/uae.svg";
import visaLogo from "../assets/schemes/visa.svg";
import { useClients } from "../state/ClientsContext.jsx";

const schemeLogoMap = {
  Mastercard: mastercardLogo,
  Visa: visaLogo,
  UAE: uaeLogo,
  "Jonet/Cortex": jonetCortexLogo,
  MADA: madaLogo,
  AFS: afsLogo,
  Jetco: jetcoLogo,
};

export default function ClientCard({ client }) {
  const { addStatusUpdate } = useClients();
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [statusValue, setStatusValue] = useState(client.currentStatus ?? "Green");
  const [statusNote, setStatusNote] = useState("");
  const ticketSummary = `L1: ${client.metrics.tickets.L1}, L2: ${client.metrics.tickets.L2}, L3: ${client.metrics.tickets.L3} | >30d: ${client.metrics.tickets.olderThan30}, >60d: ${client.metrics.tickets.olderThan60}`;
  const totalTickets =
    client.metrics.tickets.L1 + client.metrics.tickets.L2 + client.metrics.tickets.L3;
  const schemes = client.schemes ?? [];
  const incidentSummary = client.incidentSummary ?? {
    rca: 0,
    over7: 0,
    over30: 0,
    over60: 0,
    over90: 0,
  };
  const supportSummary = client.supportSummary ?? {
    rca: 0,
    over7: 0,
    over30: 0,
    over60: 0,
    over90: 0,
  };
  const statusTone =
    client.currentStatus === "Red"
      ? "risk"
      : client.currentStatus === "Amber"
        ? "watch"
        : "healthy";
  const statusLabel =
    client.currentStatus === "Red"
      ? "At Risk"
      : client.currentStatus === "Amber"
        ? "Watch"
        : "Healthy";
  const incidentOver30Class = incidentSummary.over30 > 0 ? "text-danger" : "text-muted";
  const statusOptions = ["Red", "Amber", "Green"];

  const handleToggleStatus = () => {
    setIsStatusOpen((prev) => !prev);
    setStatusValue(client.currentStatus ?? "Green");
  };

  const handleSubmitStatus = () => {
    if (!statusNote.trim()) {
      return;
    }
    addStatusUpdate(client.id, {
      week: new Date().toISOString().slice(0, 10),
      status: statusValue,
      note: statusNote.trim(),
    });
    setStatusNote("");
    setIsStatusOpen(false);
  };

  return (
    <article className={`client-card status-${statusTone}`}>
      <header className="client-card__header">
        <div className="client-card__identity">
          {client.clientLogo ? (
            <img src={client.clientLogo} alt={`${client.name} logo`} className="client-logo" />
          ) : null}
          <div>
            <p className="client-card__eyebrow">Client</p>
            <h3 className="client-card__name">{client.name}</h3>
            <p className="client-card__meta">
              {client.region} · {client.product} · {client.tier}
            </p>
          </div>
        </div>
        <div className="client-card__status">
          <span className="status-pill">
            <i className="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
            Status: {statusLabel}
          </span>
          <div className="client-card__status-actions">
            <button
              className="btn btn-light btn-sm client-card__add-status"
              type="button"
              onClick={handleToggleStatus}
              aria-expanded={isStatusOpen}
            >
              +
            </button>
            {isStatusOpen ? (
              <div className="status-popover">
                <div className="status-popover__header">
                  <strong>Add latest status</strong>
                  <button
                    className="btn btn-sm btn-link text-danger"
                    type="button"
                    onClick={() => setIsStatusOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <label className="form-label small" htmlFor={`status-select-${client.id}`}>
                  Status
                </label>
                <select
                  id={`status-select-${client.id}`}
                  className="form-select form-select-sm mb-2"
                  value={statusValue}
                  onChange={(event) => setStatusValue(event.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <label className="form-label small" htmlFor={`status-note-${client.id}`}>
                  Update note
                </label>
                <textarea
                  id={`status-note-${client.id}`}
                  className="form-control status-popover__textarea"
                  rows={4}
                  value={statusNote}
                  onChange={(event) => setStatusNote(event.target.value)}
                  placeholder="Share the latest status update..."
                />
                <div className="status-popover__footer">
                  <button
                    className="btn btn-amber btn-sm"
                    type="button"
                    onClick={handleSubmitStatus}
                  >
                    Save update
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <div className="scheme-logos">
            {schemes.map((scheme) => (
              <img
                key={scheme}
                src={schemeLogoMap[scheme]}
                alt={`${scheme} logo`}
                className="scheme-logo"
              />
            ))}
            {client.customSchemeLogo ? (
              <img
                src={client.customSchemeLogo}
                alt="Custom scheme logo"
                className="scheme-logo"
              />
            ) : null}
          </div>
        </div>
      </header>
      <p className="client-card__summary">{client.summary}</p>
      <div className="client-card__grid">
        <section className="client-card__tile">
          <div className="tile-header">
            <i className="bi bi-ticket-perforated" aria-hidden="true"></i>
            Tickets
          </div>
          <div className="tile-stat" title={ticketSummary}>
            {totalTickets} total
          </div>
          <div className="tile-list">
            <div>
              <span>RCA</span>
              <strong>{supportSummary.rca}</strong>
            </div>
            <div>
              <span>&gt;7 days</span>
              <strong>{supportSummary.over7}</strong>
            </div>
            <div>
              <span>&gt;30 days</span>
              <strong>{supportSummary.over30}</strong>
            </div>
            <div>
              <span>&gt;60 days</span>
              <strong>{supportSummary.over60}</strong>
            </div>
          </div>
        </section>
        <section className="client-card__tile">
          <div className="tile-header">
            <i className="bi bi-kanban" aria-hidden="true"></i>
            JIRAs
          </div>
          <div className="tile-stat">{client.metrics.jiras.openCount} open</div>
          <div className="tile-subtext">
            Avg age: <strong>{client.metrics.jiras.avgAgeDays} days</strong>
          </div>
        </section>
        <section className="client-card__tile">
          <div className="tile-header">
            <i className="bi bi-inbox" aria-hidden="true"></i>
            Requests
          </div>
          <div className="tile-stat">{client.metrics.requests} active</div>
          <div className="tile-subtext">Response SLA tracking enabled.</div>
        </section>
        <section className="client-card__tile">
          <div className="tile-header">
            <i className="bi bi-exclamation-triangle" aria-hidden="true"></i>
            Incidents
          </div>
          <div className="tile-list compact">
            <div>
              <span>RCA</span>
              <strong className="text-danger">{incidentSummary.rca}</strong>
            </div>
            <div className={incidentOver30Class}>
              <span>&gt;7 days</span>
              <strong>{incidentSummary.over7}</strong>
            </div>
            <div className={incidentOver30Class}>
              <span>&gt;30 days</span>
              <strong>{incidentSummary.over30}</strong>
            </div>
            <div className={incidentOver30Class}>
              <span>&gt;60 days</span>
              <strong>{incidentSummary.over60}</strong>
            </div>
          </div>
        </section>
      </div>
      <footer className="client-card__footer">
        <Link className="client-card__link" to={`/clients/${client.id}`}>
          View details →
        </Link>
      </footer>
    </article>
  );
}
