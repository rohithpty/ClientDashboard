import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Chart as ChartJS,
  ArcElement,
  Legend,
  Tooltip,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

const statusClass = (status) => `status-pill status-pill--${status.toLowerCase()}`;
const cardStatusClass = (status) =>
  `client-card client-card--${status.toLowerCase()}`;

const statusLabel = (status) => {
  if (status === "Green") return "Healthy";
  if (status === "Amber") return "At Risk";
  return "Critical";
};

const getInitials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

export default function ClientCard({ client, loading = false }) {
  const [showAllRollouts, setShowAllRollouts] = useState(false);
  const totalTickets =
    client?.metrics?.tickets?.L1 +
    client?.metrics?.tickets?.L2 +
    client?.metrics?.tickets?.L3;
  const ticketWarning =
    client?.metrics?.tickets?.olderThan30 >= 3 ||
    client?.metrics?.tickets?.olderThan60 >= 2;
  const rollouts = client?.rollouts || [];
  const visibleRollouts = showAllRollouts ? rollouts : rollouts.slice(0, 3);
  const incidents = client?.incidents || {};
  const jiraAge = client?.metrics?.jiras?.averageAge;
  const jiraOldest = client?.metrics?.jiras?.oldestAge;
  const p1 = incidents.p1 ?? 0;
  const p2 = incidents.p2 ?? 0;
  const p3p4 = incidents.p3p4 ?? 0;
  const last30d = incidents.last30d || { current: 0, prior: 0 };

  const incidentData = useMemo(
    () => ({
      labels: ["P1", "P2", "P3/P4"],
      datasets: [
        {
          data: [p1, p2, p3p4],
          backgroundColor: ["#ef4444", "#f59e0b", "#fcd34d"],
          borderWidth: 0,
        },
      ],
    }),
    [p1, p2, p3p4],
  );

  const last30dData = useMemo(
    () => ({
      labels: ["Last 30d", "Prior 30d"],
      datasets: [
        {
          data: [last30d.current, last30d.prior],
          backgroundColor: ["#60a5fa", "#1e293b"],
          borderWidth: 0,
        },
      ],
    }),
    [last30d],
  );

  if (loading) {
    return (
      <article className={`${cardStatusClass("Green")} client-card--loading`}>
        <div className="skeleton skeleton--header" />
        <div className="skeleton skeleton--body" />
        <div className="skeleton skeleton--body" />
      </article>
    );
  }

  if (!client) {
    return (
      <article className="client-card client-card--empty">
        <p>No data available.</p>
      </article>
    );
  }

  return (
    <article className={cardStatusClass(client.currentStatus)}>
      <div className="health-card__header">
        <div className="health-card__identity">
          <div className="health-card__logo" aria-label={`${client.name} logo`}>
            {getInitials(client.name)}
          </div>
          <div>
            <div className="health-card__name-row">
              <h3>{client.name}</h3>
              <div className="health-card__schemes" aria-label="Scheme logos">
                {(client.schemeLogos || []).map((scheme) => (
                  <span
                    key={scheme}
                    className={`scheme-icon scheme-icon--${scheme}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
            <p className="muted">
              {client.region} · {client.country} · {client.product}
            </p>
          </div>
        </div>
        <span className={statusClass(client.currentStatus)}>
          Status: {statusLabel(client.currentStatus)}
        </span>
      </div>

      <div className="health-card__grid">
        <section className="health-card__section">
          <h4>Tickets</h4>
          <div className="health-card__row">
            <span className="metric-value">{totalTickets}</span>
            <span className="metric-label">Open</span>
          </div>
          <div className={`ticket-badges ${ticketWarning ? "ticket-badges--warn" : ""}`}>
            <span className="ticket-badge ticket-badge--red" aria-label="Tickets older than 30 days">
              📅 {client.metrics.tickets.olderThan30} &gt; 30 days
            </span>
            <span className="ticket-badge ticket-badge--yellow" aria-label="Tickets older than 60 days">
              📅 {client.metrics.tickets.olderThan60} &gt; 60 days
            </span>
          </div>
        </section>

        <section className="health-card__section">
          <h4>JIRAs</h4>
          <div className="health-card__row">
            <span className="metric-value">{client.metrics.jiras.openCount}</span>
            <span className="metric-label">Open JIRAs</span>
          </div>
          <p className="muted">
            Age: {jiraAge ?? "N/A"} days AVG
          </p>
          {jiraOldest ? <p className="muted">Oldest: {jiraOldest} days</p> : null}
        </section>

        <section className="health-card__section health-card__section--wide">
          <h4>Product Rollouts</h4>
          {rollouts.length === 0 ? (
            <p className="muted">No data</p>
          ) : (
            <ul className="rollouts">
              {visibleRollouts.map((rollout) => (
                <li key={rollout.name}>
                  <div className="rollout-row">
                    <span>{rollout.name}</span>
                    <strong>{rollout.progress}%</strong>
                  </div>
                  <div className="progress-bar" aria-label={`${rollout.name} progress`}>
                    <span style={{ width: `${rollout.progress}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {rollouts.length > 3 ? (
            <button
              type="button"
              className="text-link"
              onClick={() => setShowAllRollouts((prev) => !prev)}
            >
              {showAllRollouts
                ? "Show less"
                : `+${rollouts.length - 3} more`}
            </button>
          ) : null}
        </section>

        <section className="health-card__section">
          <h4>Production Incidents</h4>
          <div className="health-card__charts">
            <div role="img" aria-label="Incident severity distribution chart">
              <Doughnut
                data={incidentData}
                options={{ plugins: { legend: { display: false } } }}
              />
              <p className="muted">P1 / P2 / P3-P4</p>
            </div>
            <div role="img" aria-label="Incident volume last 30 days chart">
              <Doughnut
                data={last30dData}
                options={{ plugins: { legend: { display: false } } }}
              />
              <p className="muted">
                Last 30d: {last30d.current} · Prior: {last30d.prior}
              </p>
            </div>
          </div>
          <div className="health-card__frequency">
            <span>Frequency: {incidents.frequencyPerWeek ?? 0}/week</span>
            <span className="trend-indicator">
              {incidents.trend === "down" ? "↓ Improving" : "↑ Increasing"}
            </span>
          </div>
        </section>
      </div>

      <Link className="details-link" to={`/clients/${client.id}`}>
        View details →
      </Link>
    </article>
  );
}
