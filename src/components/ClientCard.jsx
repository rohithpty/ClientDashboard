import { Link } from "react-router-dom";
import afsLogo from "../assets/schemes/afs.svg";
import jetcoLogo from "../assets/schemes/jetco.svg";
import jonetCortexLogo from "../assets/schemes/jonet-cortex.svg";
import madaLogo from "../assets/schemes/mada.svg";
import mastercardLogo from "../assets/schemes/mastercard.svg";
import uaeLogo from "../assets/schemes/uae.svg";
import visaLogo from "../assets/schemes/visa.svg";

const schemeLogoMap = {
  Mastercard: mastercardLogo,
  Visa: visaLogo,
  UAE: uaeLogo,
  "Jonet/Cortex": jonetCortexLogo,
  MADA: madaLogo,
  AFS: afsLogo,
  Jetco: jetcoLogo,
};

const statusCardClass = (status) => {
  if (status === "Red") {
    return "card h-100 shadow-sm border border-2 border-danger";
  }
  if (status === "Amber") {
    return "card h-100 shadow-sm border border-2 border-warning";
  }
  return "card h-100 shadow-sm border border-2 border-success";
};

const statusButtonClass = (status) => {
  if (status === "Amber") {
    return "btn btn-dark btn-sm";
  }
  return "btn btn-light btn-sm";
};

export default function ClientCard({ client }) {
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
  const summaryTextClass =
    client.currentStatus === "Red"
      ? "text-danger"
      : client.currentStatus === "Amber"
        ? "text-warning"
        : "text-success";
  const incidentOver30Class = incidentSummary.over30 > 0 ? "text-warning" : "text-muted";

  return (
    <article className={statusCardClass(client.currentStatus)}>
      <div className="card-body d-flex flex-column gap-3">
        <div className="d-flex justify-content-between gap-2">
          <div className="d-flex gap-2 align-items-start">
            {client.clientLogo ? (
              <img src={client.clientLogo} alt={`${client.name} logo`} className="client-logo" />
            ) : null}
            <div>
              <h3 className="h5 mb-1">{client.name}</h3>
              <p className="small mb-0">
                {client.region} · {client.product} · {client.tier}
              </p>
            </div>
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
        <p className={`card-text mb-0 ${summaryTextClass}`}>{client.summary}</p>
        <div className="row text-center g-2">
          <div className="col-6 col-lg-3">
            <button
              className="btn w-100 h-100 border border-opacity-25 rounded-3 py-2 shadow-sm bg-primary-subtle text-start"
              type="button"
            >
              <div className="small d-flex align-items-center justify-content-center gap-1">
                <i className="bi bi-ticket-perforated" aria-hidden="true"></i>
                Tickets
              </div>
              <div className="fw-semibold text-center mb-2" title={ticketSummary}>
                {totalTickets}
              </div>
              <div className="d-grid gap-1 small text-start">
                <div className="d-flex align-items-center justify-content-between text-info">
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-alarm" aria-hidden="true"></i>
                    RCA
                  </span>
                  <span className="fw-semibold">{supportSummary.rca}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between text-info">
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-calendar2" aria-hidden="true"></i>
                    &gt;7
                  </span>
                  <span className="fw-semibold">{supportSummary.over7}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between text-info">
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-calendar2" aria-hidden="true"></i>
                    &gt;30
                  </span>
                  <span className="fw-semibold">{supportSummary.over30}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between text-info">
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-calendar2" aria-hidden="true"></i>
                    &gt;60
                  </span>
                  <span className="fw-semibold">{supportSummary.over60}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between text-info">
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-calendar2" aria-hidden="true"></i>
                    &gt;90
                  </span>
                  <span className="fw-semibold">{supportSummary.over90}</span>
                </div>
              </div>
            </button>
          </div>
          <div className="col-6 col-lg-3">
            <button
              className="btn w-100 h-100 border border-opacity-25 rounded-3 py-2 shadow-sm bg-info-subtle text-center"
              type="button"
            >
              <div className="small d-flex align-items-center justify-content-center gap-1">
                <i className="bi bi-kanban" aria-hidden="true"></i>
                JIRA
              </div>
              <div className="fw-semibold">{client.metrics.jiras.openCount}</div>
            </button>
          </div>
          <div className="col-6 col-lg-3">
            <button
              className="btn w-100 h-100 border border-opacity-25 rounded-3 py-2 shadow-sm bg-secondary-subtle text-center"
              type="button"
            >
              <div className="small d-flex align-items-center justify-content-center gap-1">
                <i className="bi bi-inbox" aria-hidden="true"></i>
                Requests
              </div>
              <div className="fw-semibold">{client.metrics.requests}</div>
            </button>
          </div>
          <div className="col-12 col-lg-3">
            <button
              className="btn w-100 h-100 border border-opacity-25 rounded-3 py-2 shadow-sm bg-light text-start"
              type="button"
            >
              <div className="small d-flex align-items-center justify-content-center gap-1 mb-2">
                <i className="bi bi-exclamation-triangle" aria-hidden="true"></i>
                Incidents
              </div>
              <div className="d-grid gap-1 small">
                <div className="d-flex align-items-center justify-content-between text-danger">
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-alarm" aria-hidden="true"></i>
                    RCA
                  </span>
                  <span className="fw-semibold">{incidentSummary.rca}</span>
                </div>
                <div className={`d-flex align-items-center justify-content-between ${incidentOver30Class}`}>
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-calendar2" aria-hidden="true"></i>
                    &gt;7
                  </span>
                  <span className="fw-semibold">{incidentSummary.over7}</span>
                </div>
                <div className={`d-flex align-items-center justify-content-between ${incidentOver30Class}`}>
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-calendar2" aria-hidden="true"></i>
                    &gt;30
                  </span>
                  <span className="fw-semibold">{incidentSummary.over30}</span>
                </div>
                <div className={`d-flex align-items-center justify-content-between ${incidentOver30Class}`}>
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-calendar2" aria-hidden="true"></i>
                    &gt;60
                  </span>
                  <span className="fw-semibold">{incidentSummary.over60}</span>
                </div>
                <div className={`d-flex align-items-center justify-content-between ${incidentOver30Class}`}>
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-calendar2" aria-hidden="true"></i>
                    &gt;90
                  </span>
                  <span className="fw-semibold">{incidentSummary.over90}</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
      <div className="card-footer bg-transparent border-0 pt-0">
        <Link className={statusButtonClass(client.currentStatus)} to={`/clients/${client.id}`}>
          View details →
        </Link>
      </div>
    </article>
  );
}
