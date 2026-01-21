import { Link } from "react-router-dom";
import ClientCard from "../components/ClientCard.jsx";
import { useClients } from "../state/ClientsContext.jsx";

const STATUS_ORDER = ["Red", "Amber", "Green"];
const STATUS_TITLE_CLASS = {
  Red: "text-danger",
  Amber: "text-warning",
  Green: "text-success",
};

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
      <div className="d-grid gap-5">
        {STATUS_ORDER.map((status) => {
          const group = sortedClients.filter((client) => client.currentStatus === status);
          if (group.length === 0) {
            return null;
          }
          return (
            <div key={status} className="d-grid gap-3">
              <h3 className={`h5 mb-0 ${STATUS_TITLE_CLASS[status]}`}>
                {status} status
              </h3>
              <div className="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
                {group.map((client) => (
                  <div key={client.id} className="col">
                    <ClientCard client={client} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
