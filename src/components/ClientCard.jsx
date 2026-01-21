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

  return (
    <article className={statusCardClass(client.currentStatus)}>
      <div className="card-body d-flex flex-column gap-3">
        <div className="d-flex justify-content-between gap-2">
          <div>
            <h3 className="h5 mb-1">{client.name}</h3>
            <p className="small mb-0">
              {client.region} · {client.product} · {client.tier}
            </p>
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
              <div className="small">Tickets</div>
              <div className="fw-semibold" title={ticketSummary}>
                {totalTickets}
              </div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="border border-opacity-25 rounded-3 py-2 h-100">
              <div className="small">JIRA</div>
              <div className="fw-semibold">{client.metrics.jiras.openCount}</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="border border-opacity-25 rounded-3 py-2 h-100">
              <div className="small">Requests</div>
              <div className="fw-semibold">{client.metrics.requests}</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="border border-opacity-25 rounded-3 py-2 h-100">
              <div className="small">Incidents</div>
              <div className="fw-semibold">{client.metrics.incidents}</div>
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
