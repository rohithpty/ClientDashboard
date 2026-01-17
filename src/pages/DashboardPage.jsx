import { Link } from "react-router-dom";
import ClientCard from "../components/ClientCard.jsx";
import { useClients } from "../state/ClientsContext.jsx";

const STATUS_ORDER = ["Red", "Amber", "Green"];

const sortByStatus = (clients) => {
  const priority = Object.fromEntries(STATUS_ORDER.map((status, index) => [status, index]));
  return [...clients].sort((a, b) => priority[a.currentStatus] - priority[b.currentStatus]);
};

export default function DashboardPage() {
  const { clients } = useClients();
  const sortedClients = sortByStatus(clients);

  return (
    <section className="dashboard">
      <div className="dashboard__header">
        <div>
          <h2>Client Overview</h2>
          <p className="muted">
            Sorted by health status so critical accounts surface first.
          </p>
        </div>
        <Link className="primary-button" to="/config">
          Add client
        </Link>
      </div>
      <div className="status-groups">
        {STATUS_ORDER.map((status) => {
          const group = sortedClients.filter((client) => client.currentStatus === status);
          if (group.length === 0) {
            return null;
          }
          return (
            <div key={status} className="status-group">
              <h3 className={`status-title status-title--${status.toLowerCase()}`}>
                {status} status
              </h3>
              <div className="client-grid">
                {group.map((client) => (
                  <ClientCard key={client.id} client={client} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
