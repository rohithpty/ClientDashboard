import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ClientCard from "../components/ClientCard.jsx";
import { useClients } from "../state/ClientsContext.jsx";
import { getReportData } from "../data/reportRepository.js";
import { localConfigRepository } from "../data/configRepository.js";
import { computeClientScores, rollupClientStatus } from "../utils/scoring.js";

const STATUS_ORDER = ["Red", "Amber", "Green"];
const STATUS_LABELS = {
  Red: "At Risk",
  Amber: "Watch",
  Green: "Healthy",
};

const sortByStatus = (clients) => {
  const priority = Object.fromEntries(STATUS_ORDER.map((status, index) => [status, index]));
  return [...clients].sort((a, b) => {
    const left = a.displayStatus ?? a.currentStatus;
    const right = b.displayStatus ?? b.currentStatus;
    return priority[left] - priority[right];
  });
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
  const [statusFilter, setStatusFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");
  const [productFilter, setProductFilter] = useState("All");
  const [environmentFilter, setEnvironmentFilter] = useState("All");
  const [tamFilter, setTamFilter] = useState("All");
  const [accountManagerFilter, setAccountManagerFilter] = useState("All");
  const { clients } = useClients();
  const incidentRecords = getReportData("incidents").records;
  const supportRecords = getReportData("support-tickets").records;
  const jiraRecords = getReportData("jiras").records;
  const requestRecords = [
    ...getReportData("product-requests").records,
    ...getReportData("implementation-requests").records,
  ];
  const scoringConfig = localConfigRepository.getConfig().scoringConfig;
  const clientsWithSummaries = useMemo(
    () =>
      clients.map((client) => {
        const cardScores = computeClientScores({
          client,
          tickets: supportRecords,
          incidents: incidentRecords,
          jiras: jiraRecords,
          requests: requestRecords,
          config: scoringConfig,
        });
        return {
          ...client,
          cardScores,
          incidentSummary: buildTicketSummary(incidentRecords, client),
          supportSummary: buildTicketSummary(supportRecords, client),
          displayStatus: rollupClientStatus(cardScores, scoringConfig),
        };
      }),
    [clients, incidentRecords, supportRecords, jiraRecords, requestRecords, scoringConfig],
  );
  const sortedClients = useMemo(() => sortByStatus(clientsWithSummaries), [clientsWithSummaries]);

  const statusCounts = useMemo(() => {
    const counts = { Red: 0, Amber: 0, Green: 0 };
    clientsWithSummaries.forEach((client) => {
      if (counts[client.displayStatus] !== undefined) {
        counts[client.displayStatus] += 1;
      }
    });
    return counts;
  }, [clientsWithSummaries]);

  const regions = useMemo(
    () => Array.from(new Set(clientsWithSummaries.map((client) => client.region))).sort(),
    [clientsWithSummaries],
  );
  const products = useMemo(
    () => Array.from(new Set(clientsWithSummaries.map((client) => client.product))).sort(),
    [clientsWithSummaries],
  );
  const environments = useMemo(
    () =>
      Array.from(
        new Set(clientsWithSummaries.map((client) => client.environment ?? "Unknown")),
      ).sort(),
    [clientsWithSummaries],
  );
  const technicalAccountManagers = useMemo(
    () =>
      Array.from(
        new Set(
          clientsWithSummaries.map(
            (client) => client.technicalAccountManager ?? "Unassigned",
          ),
        ),
      ).sort(),
    [clientsWithSummaries],
  );
  const accountManagers = useMemo(
    () =>
      Array.from(
        new Set(clientsWithSummaries.map((client) => client.accountManager ?? "Unassigned")),
      ).sort(),
    [clientsWithSummaries],
  );

  const filteredClients = useMemo(() => {
    return sortedClients.filter((client) => {
      if (statusFilter !== "All" && client.displayStatus !== statusFilter) {
        return false;
      }
      if (regionFilter !== "All" && client.region !== regionFilter) {
        return false;
      }
      if (productFilter !== "All" && client.product !== productFilter) {
        return false;
      }
      if (
        environmentFilter !== "All" &&
        (client.environment ?? "Unknown") !== environmentFilter
      ) {
        return false;
      }
      if (
        tamFilter !== "All" &&
        (client.technicalAccountManager ?? "Unassigned") !== tamFilter
      ) {
        return false;
      }
      if (
        accountManagerFilter !== "All" &&
        (client.accountManager ?? "Unassigned") !== accountManagerFilter
      ) {
        return false;
      }
      return true;
    });
  }, [
    sortedClients,
    statusFilter,
    regionFilter,
    productFilter,
    environmentFilter,
    tamFilter,
    accountManagerFilter,
  ]);

  return (
    <section className="d-grid gap-4">
      <div className="dashboard-toolbar navbar">
        <div className="dashboard-status">
          <span className="dashboard-status__label">Status overview</span>
          <div className="dashboard-status__list">
            <button
              className={`status-chip ${statusFilter === "All" ? "is-active" : ""}`}
              type="button"
              onClick={() => setStatusFilter("All")}
            >
              All <strong>{clientsWithSummaries.length}</strong>
            </button>
            {STATUS_ORDER.map((status) => (
              <button
                key={status}
                className={`status-chip status-${status.toLowerCase()} ${
                  statusFilter === status ? "is-active" : ""
                }`}
                type="button"
                onClick={() => setStatusFilter(status)}
              >
                {STATUS_LABELS[status]} <strong>{statusCounts[status]}</strong>
              </button>
            ))}
          </div>
        </div>
        <div className="dashboard-filters">
          <div className="filter-group">
            <label className="filter-label" htmlFor="region-filter">
              Region
            </label>
            <select
              id="region-filter"
              className="form-select form-select-sm"
              value={regionFilter}
              onChange={(event) => setRegionFilter(event.target.value)}
            >
              <option value="All">All regions</option>
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="product-filter">
              Product
            </label>
            <select
              id="product-filter"
              className="form-select form-select-sm"
              value={productFilter}
              onChange={(event) => setProductFilter(event.target.value)}
            >
              <option value="All">All products</option>
              {products.map((product) => (
                <option key={product} value={product}>
                  {product}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="environment-filter">
              Environment
            </label>
            <select
              id="environment-filter"
              className="form-select form-select-sm"
              value={environmentFilter}
              onChange={(event) => setEnvironmentFilter(event.target.value)}
            >
              <option value="All">All environments</option>
              {environments.map((environment) => (
                <option key={environment} value={environment}>
                  {environment}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="tam-filter">
              Technical AM
            </label>
            <select
              id="tam-filter"
              className="form-select form-select-sm"
              value={tamFilter}
              onChange={(event) => setTamFilter(event.target.value)}
            >
              <option value="All">All TAMs</option>
              {technicalAccountManagers.map((manager) => (
                <option key={manager} value={manager}>
                  {manager}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label" htmlFor="account-manager-filter">
              Account manager
            </label>
            <select
              id="account-manager-filter"
              className="form-select form-select-sm"
              value={accountManagerFilter}
              onChange={(event) => setAccountManagerFilter(event.target.value)}
            >
              <option value="All">All AMs</option>
              {accountManagers.map((manager) => (
                <option key={manager} value={manager}>
                  {manager}
                </option>
              ))}
            </select>
          </div>
          <button
            className="btn btn-sm btn-outline-light filter-reset"
            type="button"
            onClick={() => {
              setRegionFilter("All");
              setProductFilter("All");
              setEnvironmentFilter("All");
              setTamFilter("All");
              setAccountManagerFilter("All");
            }}
          >
            Reset filters
          </button>
        </div>
      </div>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 dashboard-header">
        <div>
          <h2 className="mb-1">Client Overview</h2>
          <p className="dashboard-subtitle mb-0">
            Sorted by health status so critical accounts surface first.
          </p>
        </div>
        <Link
          className="btn btn-amber"
          to="/config#clientForm"
          state={{ openCard: "clientForm" }}
        >
          Add client
        </Link>
      </div>
      <div className="client-grid">
        {filteredClients.map((client) => (
          <ClientCard key={client.id} client={client} />
        ))}
      </div>
    </section>
  );
}
