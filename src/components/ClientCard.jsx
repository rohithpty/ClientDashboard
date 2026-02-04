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
  const cardScores = client.cardScores ?? {
    tickets: { status: "Green", reason: "No data", counts: {} },
    incidents: { status: "Green", reason: "No data", counts: {} },
    jiras: { status: "Green", reason: "No data", counts: {} },
    requests: { status: "Green", reason: "No data", counts: {} },
  };
  const totalTickets = cardScores.tickets.counts?.openCount ?? 0;
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
  const requestCounts = {
    over7: cardScores.requests.counts?.over7 ?? 0,
    over30: cardScores.requests.counts?.over30 ?? 0,
    over60: cardScores.requests.counts?.over60 ?? 0,
  };
  const displayStatus = client.displayStatus ?? client.currentStatus;
  const statusTone =
    displayStatus === "Red"
      ? "risk"
      : displayStatus === "Amber"
        ? "watch"
        : "healthy";
  const statusLabel =
    displayStatus === "Red"
      ? "At Risk"
      : displayStatus === "Amber"
        ? "Watch"
        : "Healthy";
  const incidentOver30Class = incidentSummary.over30 > 0 ? "text-danger" : "text-muted";
  const statusOptions = ["Red", "Amber", "Green"];
  const cardTone = (status) =>
    status === "Red" ? "risk" : status === "Amber" ? "watch" : "healthy";
  const ticketCounts = {
    over7: cardScores.tickets.counts?.over7 ?? 0,
    over30: cardScores.tickets.counts?.over30 ?? 0,
    over60: cardScores.tickets.counts?.over60 ?? 0,
  };
  const ticketSummary = `>7d: ${ticketCounts.over7}, >30d: ${ticketCounts.over30}, >60d: ${ticketCounts.over60}`;
  const incidentCounts = {
    over7: cardScores.incidents.counts?.over7 ?? 0,
    over30: cardScores.incidents.counts?.over30 ?? 0,
    over60: cardScores.incidents.counts?.over60 ?? 0,
  };

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
            <span className={`card-status status-${cardTone(cardScores.tickets.status)}`}>
              {cardScores.tickets.status}
            </span>
          </div>
          <div className="tile-stat" title={ticketSummary}>
            {totalTickets} total
          </div>
          <div className="tile-driver">{cardScores.tickets.reason}</div>
          <div className="tile-list">
            <div>
              <span>RCA</span>
              <strong>{supportSummary.rca}</strong>
            </div>
            <div>
              <span>&gt;7 days</span>
              <strong>{ticketCounts.over7}</strong>
            </div>
            <div>
              <span>&gt;30 days</span>
              <strong>{ticketCounts.over30}</strong>
            </div>
            <div>
              <span>&gt;60 days</span>
              <strong>{ticketCounts.over60}</strong>
            </div>
          </div>
        </section>
        <section className="client-card__tile">
          <div className="tile-header">
            <i className="bi bi-kanban" aria-hidden="true"></i>
            JIRAs
            <span className={`card-status status-${cardTone(cardScores.jiras.status)}`}>
              {cardScores.jiras.status}
            </span>
          </div>
          <div className="tile-stat">{cardScores.jiras.counts?.openCount ?? 0} open</div>
          <div className="tile-driver">{cardScores.jiras.reason}</div>
          <div className="tile-subtext">
            Avg age: <strong>{client.metrics.jiras.avgAgeDays} days</strong>
          </div>
        </section>
        <section className="client-card__tile">
          <div className="tile-header">
            <i className="bi bi-inbox" aria-hidden="true"></i>
            Requests
            <span className={`card-status status-${cardTone(cardScores.requests.status)}`}>
              {cardScores.requests.status}
            </span>
          </div>
          <div className="tile-stat">{cardScores.requests.counts?.openCount ?? 0} active</div>
          <div className="tile-driver">{cardScores.requests.reason}</div>
          <div className="tile-list compact">
            <div>
              <span>&gt;7 days</span>
              <strong>{requestCounts.over7}</strong>
            </div>
            <div>
              <span>&gt;30 days</span>
              <strong>{requestCounts.over30}</strong>
            </div>
            <div>
              <span>&gt;60 days</span>
              <strong>{requestCounts.over60}</strong>
            </div>
          </div>
        </section>
        <section className="client-card__tile">
          <div className="tile-header">
            <i className="bi bi-exclamation-triangle" aria-hidden="true"></i>
            Incidents
            <span className={`card-status status-${cardTone(cardScores.incidents.status)}`}>
              {cardScores.incidents.status}
            </span>
          </div>
          <div className="tile-driver">{cardScores.incidents.reason}</div>
          <div className="tile-list compact">
            <div>
              <span>RCA</span>
              <strong className="text-danger">{incidentSummary.rca}</strong>
            </div>
            <div className={incidentOver30Class}>
              <span>&gt;7 days</span>
              <strong>{incidentCounts.over7}</strong>
            </div>
            <div className={incidentOver30Class}>
              <span>&gt;30 days</span>
              <strong>{incidentCounts.over30}</strong>
            </div>
            <div className={incidentOver30Class}>
              <span>&gt;60 days</span>
              <strong>{incidentCounts.over60}</strong>
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
