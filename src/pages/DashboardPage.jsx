import { Link } from "react-router-dom";
import ClientCard from "../components/ClientCard.jsx";
import { useClients } from "../state/ClientsContext.jsx";
import { getReportData } from "../data/reportRepository.js";

const STATUS_ORDER = ["Red", "Amber", "Green"];

const sortByStatus = (clients) => {
  const priority = Object.fromEntries(STATUS_ORDER.map((status, index) => [status, index]));
  return [...clients].sort((a, b) => priority[a.currentStatus] - priority[b.currentStatus]);
};

const normalizeName = (value) => value?.trim().toLowerCase() ?? "";

const parseCsvDate = (value) => {
  if (!value) {
    return null;
  }
  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildTicketSummary = (records, client) => {
  const aliases = client.aliases ?? [];
  const candidateNames = [client.name, ...aliases].map(normalizeName).filter(Boolean);
  const counts = {
    rca: 0,
    over7: 0,
    over30: 0,
    over60: 0,
    over90: 0,
  };

  records.forEach((record) => {
    const organization = normalizeName(record.organization);
    if (!candidateNames.includes(organization)) {
      return;
    }

    const status = record.ticketStatus ?? "";
    if (status.toLowerCase().includes("rca")) {
      counts.rca += 1;
    }

    const requested = parseCsvDate(record.requested);
    if (!requested) {
      return;
    }
    const ageInDays = Math.floor((Date.now() - requested.getTime()) / 86400000);
    if (ageInDays > 7) {
      counts.over7 += 1;
    }
    if (ageInDays > 30) {
      counts.over30 += 1;
    }
    if (ageInDays > 60) {
      counts.over60 += 1;
    }
    if (ageInDays > 90) {
      counts.over90 += 1;
    }
  });

  return counts;
};

export default function DashboardPage() {
  const { clients } = useClients();
  const incidentRecords = getReportData("incidents").records;
  const supportRecords = getReportData("support-tickets").records;
  const clientsWithSummaries = clients.map((client) => ({
    ...client,
    incidentSummary: buildTicketSummary(incidentRecords, client),
    supportSummary: buildTicketSummary(supportRecords, client),
  }));
  const sortedClients = sortByStatus(clientsWithSummaries);

  return (
    <section className="d-grid gap-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 dashboard-header">
        <div>
          <h2 className="mb-1">Client Overview</h2>
          <p className="dashboard-subtitle mb-0">
            Sorted by health status so critical accounts surface first.
          </p>
        </div>
        <Link className="btn btn-amber" to="/config">
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
