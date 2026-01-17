import { Link } from "react-router-dom";

const statusClass = (status) => `status-pill status-pill--${status.toLowerCase()}`;

export default function ClientCard({ client }) {
  const ticketSummary = `L1: ${client.metrics.tickets.L1}, L2: ${client.metrics.tickets.L2}, L3: ${client.metrics.tickets.L3} | >30d: ${client.metrics.tickets.olderThan30}, >60d: ${client.metrics.tickets.olderThan60}`;

  return (
    <article className="client-card">
      <div className="client-card__header">
        <div>
          <h3>{client.name}</h3>
          <p className="muted">
            {client.region} · {client.product} · {client.tier}
          </p>
        </div>
        <span className={statusClass(client.currentStatus)}>
          {client.currentStatus}
        </span>
      </div>
      <p className="client-card__summary">{client.summary}</p>
      <div className="client-card__metrics">
        <div>
          <span className="metric-label">Tickets</span>
          <span className="metric-value" title={ticketSummary}>
            {client.metrics.tickets.L1 +
              client.metrics.tickets.L2 +
              client.metrics.tickets.L3}
          </span>
        </div>
        <div>
          <span className="metric-label">JIRA</span>
          <span className="metric-value">{client.metrics.jiras.openCount}</span>
        </div>
        <div>
          <span className="metric-label">Requests</span>
          <span className="metric-value">{client.metrics.requests}</span>
        </div>
        <div>
          <span className="metric-label">Incidents</span>
          <span className="metric-value">{client.metrics.incidents}</span>
        </div>
      </div>
      <Link className="details-link" to={`/clients/${client.id}`}>
        View details →
      </Link>
    </article>
  );
}
