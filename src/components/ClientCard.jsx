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
    return "card h-100 shadow-sm bg-danger text-white";
  }
  if (status === "Amber") {
    return "card h-100 shadow-sm bg-warning text-dark";
  }
  return "card h-100 shadow-sm bg-success text-white";
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
        <p className="card-text mb-0">{client.summary}</p>
        <div className="row text-center g-2">
          <div className="col-6 col-lg-3">
            <div className="border border-opacity-25 rounded-3 py-2 h-100">
              <div className="small d-flex align-items-center justify-content-center gap-1">
                <i className="bi bi-ticket-perforated" aria-hidden="true"></i>
                Tickets
              </div>
              <div className="fw-semibold" title={ticketSummary}>
                {totalTickets}
              </div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="border border-opacity-25 rounded-3 py-2 h-100">
              <div className="small d-flex align-items-center justify-content-center gap-1">
                <i className="bi bi-kanban" aria-hidden="true"></i>
                JIRA
              </div>
              <div className="fw-semibold">{client.metrics.jiras.openCount}</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="border border-opacity-25 rounded-3 py-2 h-100">
              <div className="small d-flex align-items-center justify-content-center gap-1">
                <i className="bi bi-inbox" aria-hidden="true"></i>
                Requests
              </div>
              <div className="fw-semibold">{client.metrics.requests}</div>
            </div>
          </div>
          <div className="col-12 col-lg-3">
            <div className="border border-opacity-25 rounded-3 py-2 h-100">
              <div className="small d-flex align-items-center justify-content-center gap-1 mb-2">
                <i className="bi bi-exclamation-triangle" aria-hidden="true"></i>
                Incidents
              </div>
              <div className="d-grid gap-1 small">
                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-alarm text-danger" aria-hidden="true"></i>
                    RCA
                  </span>
                  <span className="fw-semibold text-danger">{incidentSummary.rca}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-calendar2 text-warning" aria-hidden="true"></i>
                    &gt;7
                  </span>
                  <span className="fw-semibold text-warning">{incidentSummary.over7}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-calendar2 text-warning" aria-hidden="true"></i>
                    &gt;30
                  </span>
                  <span className="fw-semibold text-warning">{incidentSummary.over30}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-calendar2 text-warning" aria-hidden="true"></i>
                    &gt;60
                  </span>
                  <span className="fw-semibold text-warning">{incidentSummary.over60}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-calendar2 text-danger" aria-hidden="true"></i>
                    &gt;90
                  </span>
                  <span className="fw-semibold text-danger">{incidentSummary.over90}</span>
                </div>
              </div>
            </div>
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
