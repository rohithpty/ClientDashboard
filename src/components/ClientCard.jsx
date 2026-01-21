import { Link } from "react-router-dom";

const statusBadgeClass = (status) => {
  if (status === "Red") {
    return "badge rounded-pill text-bg-danger";
  }
  if (status === "Amber") {
    return "badge rounded-pill text-bg-warning";
  }
  return "badge rounded-pill text-bg-success";
};

export default function ClientCard({ client }) {
  const ticketSummary = `L1: ${client.metrics.tickets.L1}, L2: ${client.metrics.tickets.L2}, L3: ${client.metrics.tickets.L3} | >30d: ${client.metrics.tickets.olderThan30}, >60d: ${client.metrics.tickets.olderThan60}`;
  const totalTickets =
    client.metrics.tickets.L1 + client.metrics.tickets.L2 + client.metrics.tickets.L3;

  return (
    <article className="card h-100 shadow-sm">
      <div className="card-body d-flex flex-column gap-3">
        <div className="d-flex align-items-start justify-content-between gap-2">
          <div>
            <h3 className="h5 mb-1">{client.name}</h3>
            <p className="text-body-secondary small mb-0">
              {client.region} · {client.product} · {client.tier}
            </p>
          </div>
          <span className={statusBadgeClass(client.currentStatus)}>
            {client.currentStatus}
          </span>
        </div>
        <p className="card-text mb-0">{client.summary}</p>
        <div className="row text-center g-2">
          <div className="col-6 col-lg-3">
            <div className="border rounded-3 py-2 h-100">
              <div className="text-body-secondary small">Tickets</div>
              <div className="fw-semibold" title={ticketSummary}>
                {totalTickets}
              </div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="border rounded-3 py-2 h-100">
              <div className="text-body-secondary small">JIRA</div>
              <div className="fw-semibold">{client.metrics.jiras.openCount}</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="border rounded-3 py-2 h-100">
              <div className="text-body-secondary small">Requests</div>
              <div className="fw-semibold">{client.metrics.requests}</div>
            </div>
          </div>
          <div className="col-6 col-lg-3">
            <div className="border rounded-3 py-2 h-100">
              <div className="text-body-secondary small">Incidents</div>
              <div className="fw-semibold">{client.metrics.incidents}</div>
            </div>
          </div>
        </div>
      </div>
      <div className="card-footer bg-white border-0 pt-0">
        <Link className="btn btn-outline-primary btn-sm" to={`/clients/${client.id}`}>
          View details →
        </Link>
      </div>
    </article>
  );
}
