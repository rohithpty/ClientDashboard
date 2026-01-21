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
    <section className="d-grid gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <h2 className="mb-1">Client Overview</h2>
          <p className="text-body-secondary mb-0">
            Sorted by health status so critical accounts surface first.
          </p>
        </div>
        <Link className="btn btn-primary" to="/config">
          Add client
        </Link>
      </div>
      <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
        {sortedClients.map((client) => (
          <div key={client.id} className="col">
            <ClientCard client={client} />
          </div>
        ))}
      </div>
    </section>
  );
}
