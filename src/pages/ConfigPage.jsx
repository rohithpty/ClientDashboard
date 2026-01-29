import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients } from "../state/ClientsContext.jsx";
import { localConfigRepository } from "../data/configRepository.js";
import { getReportData, importReportCsv } from "../data/reportRepository.js";

const TIERS = ["Gold", "Silver", "Tier 1", "Tier 2", "Tier 3"];
const STATUS_OPTIONS = ["Green", "Amber", "Red"];
const SCHEME_OPTIONS = [
  "Mastercard",
  "Visa",
  "UAE",
  "Jonet/Cortex",
  "MADA",
  "AFS",
  "Jetco",
];

const defaultMetrics = {
  tickets: {
    L1: 0,
    L2: 0,
    L3: 0,
    olderThan30: 0,
    olderThan60: 0,
  },
  jiras: {
    openCount: 0,
    critical: 0,
  },
  requests: 0,
  incidents: 0,
};

const toggleScheme = (selected, scheme) =>
  selected.includes(scheme)
    ? selected.filter((item) => item !== scheme)
    : [...selected, scheme];

const buildEmptyForm = (config) => ({
  name: "",
  aliases: [],
  region: config.regions[0] ?? "",
  product: config.products[0] ?? "",
  environment: config.environments[0] ?? "",
  tier: TIERS[0],
  technicalAccountManager: config.technicalAccountManagers[0] ?? "",
  accountManager: config.accountManagers[0] ?? "",
  status: "",
  summary: "",
  schemes: [],
  customSchemeLogo: "",
  clientLogo: "",
});

const REPORT_IMPORTS = [
  { type: "incidents", label: "Incidents" },
  { type: "support-tickets", label: "Support Tickets" },
  { type: "jiras", label: "JIRAs" },
  { type: "product-requests", label: "Product Requests" },
  { type: "implementation-requests", label: "Implementation Requests" },
];

const REPORT_TABLE_COLUMNS = {
  incidents: [
    { key: "id", label: "ID" },
    { key: "ticketStatus", label: "Status" },
    { key: "organization", label: "Organization" },
    { key: "requester", label: "Requester" },
    { key: "subject", label: "Subject" },
    { key: "priority", label: "Priority" },
    { key: "sla", label: "SLA" },
    { key: "requested", label: "Requested" },
    { key: "updated", label: "Updated" },
    { key: "ticketForm", label: "Ticket form" },
    { key: "orgTier", label: "Org tier" },
  ],
  "support-tickets": [
    { key: "id", label: "ID" },
    { key: "ticketStatus", label: "Status" },
    { key: "organization", label: "Organization" },
    { key: "subject", label: "Subject" },
    { key: "group", label: "Group" },
    { key: "assignee", label: "Assignee" },
    { key: "priority", label: "Priority" },
    { key: "sla", label: "SLA" },
    { key: "requested", label: "Requested" },
    { key: "associatedJira", label: "Associated Jira" },
  ],
};

const RECORDS_PER_PAGE = 10;
const AGE_BUCKETS = [
  { label: "0-7 days", min: 0, max: 7 },
  { label: "8-30 days", min: 8, max: 30 },
  { label: "31-90 days", min: 31, max: 90 },
  { label: "91+ days", min: 91, max: Number.POSITIVE_INFINITY },
];

const parseCsvDate = (value) => {
  if (!value) {
    return null;
  }
  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getAgeBucket = (days) =>
  AGE_BUCKETS.find((bucket) => days >= bucket.min && days <= bucket.max)?.label ??
  "Unknown";

const buildSummary = (records) => {
  const statusCounts = records.reduce((acc, record) => {
    const status = record.ticketStatus || "Unknown";
    acc[status] = (acc[status] ?? 0) + 1;
    return acc;
  }, {});

  const ageCounts = records.reduce((acc, record) => {
    const requested = parseCsvDate(record.requested);
    if (!requested) {
      acc.Unknown = (acc.Unknown ?? 0) + 1;
      return acc;
    }
    const ageInDays = Math.floor((Date.now() - requested.getTime()) / 86400000);
    const bucket = getAgeBucket(ageInDays);
    acc[bucket] = (acc[bucket] ?? 0) + 1;
    return acc;
  }, {});

  return { statusCounts, ageCounts };
};

export default function ConfigPage() {
  const navigate = useNavigate();
  const { clients, addClient, updateClient, removeClient, replaceClients } = useClients();
  const [config, setConfig] = useState(() => localConfigRepository.getConfig());
  const [formState, setFormState] = useState(() => buildEmptyForm(config));
  const [aliasInput, setAliasInput] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [importError, setImportError] = useState("");
  const importInputRef = useRef(null);
  const [reportError, setReportError] = useState("");
  const [reportData, setReportData] = useState(() =>
    REPORT_IMPORTS.reduce((acc, report) => {
      acc[report.type] = getReportData(report.type);
      return acc;
    }, {})
  );
  const [activeReportType, setActiveReportType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [clientSearch, setClientSearch] = useState("");
  const [clientRegionFilter, setClientRegionFilter] = useState("All");
  const [clientProductFilter, setClientProductFilter] = useState("All");
  const [clientEnvironmentFilter, setClientEnvironmentFilter] = useState("All");
  const [listInputs, setListInputs] = useState({
    regions: "",
    environments: "",
    technicalAccountManagers: "",
    accountManagers: "",
  });

  useEffect(() => {
    localConfigRepository.saveConfig(config);
  }, [config]);

  useEffect(() => {
    if (!editingId) {
      setFormState(buildEmptyForm(config));
    }
  }, [config, editingId]);

  const reportSummary = useMemo(
    () =>
      REPORT_IMPORTS.map((report) => ({
        ...report,
        records: reportData[report.type]?.records ?? [],
        lastImportedAt: reportData[report.type]?.lastImportedAt ?? null,
      })),
    [reportData]
  );

  const activeReport = reportSummary.find((report) => report.type === activeReportType) ?? null;
  const activeColumns = activeReport ? REPORT_TABLE_COLUMNS[activeReport.type] ?? [] : [];
  const filteredRecords = useMemo(() => {
    if (!activeReport) {
      return [];
    }
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return activeReport.records;
    }
    return activeReport.records.filter((record) =>
      Object.entries(record)
        .filter(([key]) => key !== "history")
        .some(([, value]) =>
          String(value ?? "")
            .toLowerCase()
            .includes(normalizedSearch)
        )
    );
  }, [activeReport, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / RECORDS_PER_PAGE));
  const pagedRecords = filteredRecords.slice(
    (page - 1) * RECORDS_PER_PAGE,
    page * RECORDS_PER_PAGE
  );

  const summaryData = useMemo(
    () => (activeReport ? buildSummary(activeReport.records) : null),
    [activeReport]
  );

  const summaryLabel = activeReport?.label ?? "Tickets";
  const searchPlaceholder =
    activeReport?.type === "support-tickets" ? "Search support tickets..." : "Search incidents...";

  const regionOptions = useMemo(
    () =>
      Array.from(new Set([...config.regions, formState.region].filter(Boolean))).sort(),
    [config.regions, formState.region],
  );
  const productOptions = useMemo(
    () =>
      Array.from(new Set([...config.products, formState.product].filter(Boolean))).sort(),
    [config.products, formState.product],
  );
  const environmentOptions = useMemo(
    () =>
      Array.from(
        new Set([...config.environments, formState.environment].filter(Boolean)),
      ).sort(),
    [config.environments, formState.environment],
  );
  const technicalAccountManagerOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [...config.technicalAccountManagers, formState.technicalAccountManager].filter(
            Boolean,
          ),
        ),
      ).sort(),
    [config.technicalAccountManagers, formState.technicalAccountManager],
  );
  const accountManagerOptions = useMemo(
    () =>
      Array.from(
        new Set([...config.accountManagers, formState.accountManager].filter(Boolean)),
      ).sort(),
    [config.accountManagers, formState.accountManager],
  );

  const clientRegionOptions = useMemo(
    () =>
      Array.from(
        new Set([...config.regions, ...clients.map((client) => client.region)].filter(Boolean)),
      ).sort(),
    [config.regions, clients],
  );
  const clientProductOptions = useMemo(
    () =>
      Array.from(
        new Set([...config.products, ...clients.map((client) => client.product)].filter(Boolean)),
      ).sort(),
    [config.products, clients],
  );
  const clientEnvironmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...config.environments,
            ...clients.map((client) => client.environment ?? "Unknown"),
          ].filter(Boolean),
        ),
      ).sort(),
    [config.environments, clients],
  );

  const filteredClients = useMemo(() => {
    const normalizedSearch = clientSearch.trim().toLowerCase();
    return clients.filter((client) => {
      if (clientRegionFilter !== "All" && client.region !== clientRegionFilter) {
        return false;
      }
      if (clientProductFilter !== "All" && client.product !== clientProductFilter) {
        return false;
      }
      if (
        clientEnvironmentFilter !== "All" &&
        (client.environment ?? "Unknown") !== clientEnvironmentFilter
      ) {
        return false;
      }
      if (!normalizedSearch) {
        return true;
      }
      const haystack = [
        client.name,
        ...(client.aliases ?? []),
        client.region,
        client.product,
        client.tier,
        client.environment ?? "Unknown",
        client.technicalAccountManager ?? "Unassigned",
        client.accountManager ?? "Unassigned",
        client.currentStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [
    clients,
    clientSearch,
    clientRegionFilter,
    clientProductFilter,
    clientEnvironmentFilter,
  ]);

  const handleAddConfigItem = (key) => {
    const value = listInputs[key].trim();
    if (!value) {
      return;
    }
    setConfig((prev) => {
      const list = prev[key] ?? [];
      if (list.some((item) => item.toLowerCase() === value.toLowerCase())) {
        return prev;
      }
      return { ...prev, [key]: [...list, value] };
    });
    setListInputs((prev) => ({ ...prev, [key]: "" }));
  };

  const handleRemoveConfigItem = (key, value) => {
    setConfig((prev) => ({
      ...prev,
      [key]: prev[key].filter((item) => item !== value),
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      return;
    }
    const trimmedName = formState.name.trim();
    const today = new Date().toISOString().slice(0, 10);
    const statusValue = formState.status?.trim();
    const payload = {
      name: trimmedName,
      aliases: formState.aliases,
      region: formState.region,
      product: formState.product,
      environment: formState.environment,
      tier: formState.tier,
      technicalAccountManager: formState.technicalAccountManager.trim() || "Unassigned",
      accountManager: formState.accountManager.trim() || "Unassigned",
      schemes: formState.schemes,
      customSchemeLogo: formState.customSchemeLogo,
      clientLogo: formState.clientLogo,
      summary: formState.summary.trim() || "New client added.",
    };

    if (editingId) {
      updateClient(editingId, {
        ...payload,
        ...(statusValue ? { currentStatus: statusValue } : {}),
      });
      setEditingId(null);
      setFormState(buildEmptyForm(config));
      setAliasInput("");
      return;
    }

    const newStatus = statusValue || "Green";
    addClient({
      id: `client-${Date.now()}`,
      ...payload,
      currentStatus: newStatus,
      metrics: defaultMetrics,
      history: [
        {
          week: today,
          status: newStatus,
          note: formState.summary.trim() || "Initial onboarding update.",
        },
      ],
    });
    setAliasInput("");
    navigate("/");
  };

  const handleLogoUpload = (event, field) => {
    const [file] = event.target.files || [];
    if (!file) {
      setFormState((prev) => ({ ...prev, [field]: "" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormState((prev) => ({ ...prev, [field]: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditClient = (client) => {
    setEditingId(client.id);
    setFormState({
      name: client.name ?? "",
      aliases: client.aliases ?? [],
      region: client.region ?? config.regions[0] ?? "",
      product: client.product ?? config.products[0] ?? "",
      environment: client.environment ?? config.environments[0] ?? "",
      tier: client.tier ?? TIERS[0],
      technicalAccountManager: client.technicalAccountManager ?? "Unassigned",
      accountManager: client.accountManager ?? "Unassigned",
      status: "",
      summary: client.summary ?? "",
      schemes: client.schemes ?? [],
      customSchemeLogo: client.customSchemeLogo ?? "",
      clientLogo: client.clientLogo ?? "",
    });
    setAliasInput("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormState(buildEmptyForm(config));
    setAliasInput("");
  };

  const handleDeleteClient = (clientId) => {
    removeClient(clientId);
    if (editingId === clientId) {
      handleCancelEdit();
    }
  };

  const handleAddAlias = () => {
    const trimmedAlias = aliasInput.trim();
    if (!trimmedAlias) {
      return;
    }
    const exists = formState.aliases.some(
      (alias) => alias.toLowerCase() === trimmedAlias.toLowerCase()
    );
    if (exists) {
      setAliasInput("");
      return;
    }
    setFormState((prev) => ({
      ...prev,
      aliases: [...prev.aliases, trimmedAlias],
    }));
    setAliasInput("");
  };

  const handleRemoveAlias = (aliasToRemove) => {
    setFormState((prev) => ({
      ...prev,
      aliases: prev.aliases.filter((alias) => alias !== aliasToRemove),
    }));
  };

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      config,
      clients,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "admin-center-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        return;
      }
      try {
        const parsed = JSON.parse(reader.result);
        if (Array.isArray(parsed)) {
          replaceClients(parsed);
          setImportError("");
          return;
        }
        if (!parsed || typeof parsed !== "object") {
          throw new Error("Import file must be an object with config and clients.");
        }
        if (Array.isArray(parsed.config)) {
          throw new Error("Config should be an object, not a list.");
        }
        if (!Array.isArray(parsed.clients)) {
          throw new Error("Import file must include a clients list.");
        }
        if (parsed.config) {
          setConfig((prev) => ({
            ...prev,
            ...parsed.config,
          }));
        }
        replaceClients(parsed.clients);
        setImportError("");
      } catch (error) {
        setImportError(error.message || "Unable to import data.");
      }
    };
    reader.readAsText(file);
  };

  const handleReportImport = (type, file) => {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        return;
      }
      try {
        const payload = importReportCsv(type, reader.result);
        setReportData((prev) => ({ ...prev, [type]: payload }));
        setReportError("");
      } catch (error) {
        setReportError(error.message || "Unable to import CSV report.");
      }
    };
    reader.readAsText(file);
  };

  const handleOpenReport = (type) => {
    setActiveReportType(type);
    setSearchTerm("");
    setPage(1);
  };

  const handleCloseReport = () => {
    setActiveReportType(null);
  };

  return (
    <section className="d-grid gap-4">
      <div>
        <h2 className="mb-1">Admin center</h2>
        <p className="text-body-secondary mb-0">
          Manage client profiles and import operational reports.
        </p>
      </div>
      <div className="card shadow-sm admin-card">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div>
              <h3 className="h5">Import data</h3>
              <p className="text-body-secondary mb-0">
                Upload CSV reports by category to keep incident and support data in sync.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {REPORT_IMPORTS.map((report) => (
                <label
                  key={report.type}
                  className="btn btn-outline-primary btn-sm mb-0"
                >
                  {report.label}
                  <input
                    className="d-none"
                    type="file"
                    accept=".csv"
                    onChange={(event) =>
                      handleReportImport(report.type, event.target.files?.[0])
                    }
                  />
                </label>
              ))}
            </div>
          </div>
          {reportError ? (
            <p className="text-danger small mt-2 mb-0">{reportError}</p>
          ) : null}
          <div className="table-responsive mt-3">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Report type</th>
                  <th scope="col">Records</th>
                  <th scope="col">Last imported</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reportSummary.map((report) => (
                  <tr key={report.type}>
                    <td>{report.label}</td>
                    <td>{report.records.length}</td>
                    <td>{report.lastImportedAt || "Not imported yet"}</td>
                    <td>
                      {["incidents", "support-tickets"].includes(report.type) ? (
                        <button
                          className="btn btn-link btn-sm px-0"
                          type="button"
                          onClick={() => handleOpenReport(report.type)}
                          disabled={report.records.length === 0}
                        >
                          View data
                        </button>
                      ) : (
                        <span className="text-body-secondary small">Coming soon</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="card shadow-sm admin-card">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
            <div>
              <h3 className="h5">Master lists</h3>
              <p className="text-body-secondary mb-0">
                Maintain the region, environment, and account owner configuration lists.
              </p>
            </div>
          </div>
          <div className="row g-3 mt-1">
            <div className="col-lg-6">
              <div className="admin-list-card">
                <div className="d-flex justify-content-between align-items-center">
                  <h4 className="h6 mb-0">Regions</h4>
                  <span className="text-body-secondary small">
                    {config.regions.length} total
                  </span>
                </div>
                <p className="text-body-secondary small mb-2">
                  Used for client routing, reporting, and filtering.
                </p>
                <div className="input-group input-group-sm">
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Add region"
                    value={listInputs.regions}
                    onChange={(event) =>
                      setListInputs((prev) => ({
                        ...prev,
                        regions: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddConfigItem("regions");
                      }
                    }}
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => handleAddConfigItem("regions")}
                  >
                    Add
                  </button>
                </div>
                <div className="admin-list-chips">
                  {config.regions.map((region) => (
                    <span key={region} className="badge text-bg-light border">
                      {region}
                      <button
                        className="btn btn-sm btn-link text-danger ms-1 p-0"
                        type="button"
                        onClick={() => handleRemoveConfigItem("regions", region)}
                        aria-label={`Remove region ${region}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="admin-list-card">
                <div className="d-flex justify-content-between align-items-center">
                  <h4 className="h6 mb-0">Environments</h4>
                  <span className="text-body-secondary small">
                    {config.environments.length} total
                  </span>
                </div>
                <p className="text-body-secondary small mb-2">
                  Align client entries with standardized deployment environments.
                </p>
                <div className="input-group input-group-sm">
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Add environment"
                    value={listInputs.environments}
                    onChange={(event) =>
                      setListInputs((prev) => ({
                        ...prev,
                        environments: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddConfigItem("environments");
                      }
                    }}
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => handleAddConfigItem("environments")}
                  >
                    Add
                  </button>
                </div>
                <div className="admin-list-chips">
                  {config.environments.map((environment) => (
                    <span key={environment} className="badge text-bg-light border">
                      {environment}
                      <button
                        className="btn btn-sm btn-link text-danger ms-1 p-0"
                        type="button"
                        onClick={() =>
                          handleRemoveConfigItem("environments", environment)
                        }
                        aria-label={`Remove environment ${environment}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="admin-list-card">
                <div className="d-flex justify-content-between align-items-center">
                  <h4 className="h6 mb-0">Technical account managers</h4>
                  <span className="text-body-secondary small">
                    {config.technicalAccountManagers.length} total
                  </span>
                </div>
                <p className="text-body-secondary small mb-2">
                  Curate the list of TAMs available in client profiles.
                </p>
                <div className="input-group input-group-sm">
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Add TAM"
                    value={listInputs.technicalAccountManagers}
                    onChange={(event) =>
                      setListInputs((prev) => ({
                        ...prev,
                        technicalAccountManagers: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddConfigItem("technicalAccountManagers");
                      }
                    }}
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => handleAddConfigItem("technicalAccountManagers")}
                  >
                    Add
                  </button>
                </div>
                <div className="admin-list-chips">
                  {config.technicalAccountManagers.map((manager) => (
                    <span key={manager} className="badge text-bg-light border">
                      {manager}
                      <button
                        className="btn btn-sm btn-link text-danger ms-1 p-0"
                        type="button"
                        onClick={() =>
                          handleRemoveConfigItem("technicalAccountManagers", manager)
                        }
                        aria-label={`Remove technical account manager ${manager}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="admin-list-card">
                <div className="d-flex justify-content-between align-items-center">
                  <h4 className="h6 mb-0">Account managers</h4>
                  <span className="text-body-secondary small">
                    {config.accountManagers.length} total
                  </span>
                </div>
                <p className="text-body-secondary small mb-2">
                  Assign primary account managers from the approved list.
                </p>
                <div className="input-group input-group-sm">
                  <input
                    className="form-control"
                    type="text"
                    placeholder="Add account manager"
                    value={listInputs.accountManagers}
                    onChange={(event) =>
                      setListInputs((prev) => ({
                        ...prev,
                        accountManagers: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddConfigItem("accountManagers");
                      }
                    }}
                  />
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => handleAddConfigItem("accountManagers")}
                  >
                    Add
                  </button>
                </div>
                <div className="admin-list-chips">
                  {config.accountManagers.map((manager) => (
                    <span key={manager} className="badge text-bg-light border">
                      {manager}
                      <button
                        className="btn btn-sm btn-link text-danger ms-1 p-0"
                        type="button"
                        onClick={() =>
                          handleRemoveConfigItem("accountManagers", manager)
                        }
                        aria-label={`Remove account manager ${manager}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <form className="card shadow-sm admin-card" onSubmit={handleSubmit}>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="client-name">
                Client name
              </label>
              <input
                id="client-name"
                className="form-control"
                type="text"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Client name"
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="client-aliases">
                Client aliases
              </label>
              <div className="input-group">
                <input
                  id="client-aliases"
                  className="form-control"
                  type="text"
                  value={aliasInput}
                  onChange={(event) => setAliasInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddAlias();
                    }
                  }}
                  placeholder="Add an alias and press Enter"
                />
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={handleAddAlias}
                >
                  Add alias
                </button>
              </div>
              {formState.aliases.length > 0 ? (
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {formState.aliases.map((alias) => (
                    <span key={alias} className="badge text-bg-light border">
                      {alias}
                      <button
                        className="btn btn-sm btn-link text-danger ms-1 p-0"
                        type="button"
                        onClick={() => handleRemoveAlias(alias)}
                        aria-label={`Remove alias ${alias}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="client-region">
                Region
              </label>
              <select
                id="client-region"
                className="form-select"
                value={formState.region}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, region: event.target.value }))
                }
              >
                {regionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="client-product">
                Product
              </label>
              <select
                id="client-product"
                className="form-select"
                value={formState.product}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, product: event.target.value }))
                }
              >
                {productOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="client-environment">
                Environment
              </label>
              <select
                id="client-environment"
                className="form-select"
                value={formState.environment}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    environment: event.target.value,
                  }))
                }
              >
                {environmentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="client-tier">
                Tier
              </label>
              <select
                id="client-tier"
                className="form-select"
                value={formState.tier}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, tier: event.target.value }))
                }
              >
                {TIERS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="client-tam">
                Technical Account Manager
              </label>
              <select
                id="client-tam"
                className="form-select"
                value={formState.technicalAccountManager || "Unassigned"}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    technicalAccountManager: event.target.value,
                  }))
                }
              >
                <option value="Unassigned">Unassigned</option>
                {technicalAccountManagerOptions
                  .filter((option) => option !== "Unassigned")
                  .map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="client-am">
                Account Manager
              </label>
              <select
                id="client-am"
                className="form-select"
                value={formState.accountManager || "Unassigned"}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    accountManager: event.target.value,
                  }))
                }
              >
                <option value="Unassigned">Unassigned</option>
                {accountManagerOptions
                  .filter((option) => option !== "Unassigned")
                  .map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="client-status">
                Status (optional)
              </label>
              <select
                id="client-status"
                className="form-select"
                value={formState.status}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                <option value="">Select status</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="client-summary">
                Weekly summary
              </label>
              <textarea
                id="client-summary"
                className="form-control"
                rows={3}
                value={formState.summary}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, summary: event.target.value }))
                }
                placeholder="Short weekly note..."
              />
            </div>
            <div className="col-12">
              <label className="form-label mb-2">Schemes</label>
              <div className="row row-cols-2 row-cols-md-4 g-2">
                {SCHEME_OPTIONS.map((scheme) => (
                  <div key={scheme} className="col">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`scheme-${scheme}`}
                        checked={formState.schemes.includes(scheme)}
                        onChange={() =>
                          setFormState((prev) => ({
                            ...prev,
                            schemes: toggleScheme(prev.schemes, scheme),
                          }))
                        }
                      />
                      <label className="form-check-label" htmlFor={`scheme-${scheme}`}>
                        {scheme}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="client-logo">
                Client logo (optional)
              </label>
              <input
                id="client-logo"
                className="form-control"
                type="file"
                accept="image/*"
                onChange={(event) => handleLogoUpload(event, "clientLogo")}
              />
              {formState.clientLogo ? (
                <div className="mt-2 d-flex align-items-center gap-2">
                  <img src={formState.clientLogo} alt="Client logo" className="client-logo" />
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    type="button"
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev,
                        clientLogo: "",
                      }))
                    }
                  >
                    Remove logo
                  </button>
                </div>
              ) : null}
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="scheme-logo">
                Upload scheme logo (optional)
              </label>
              <input
                id="scheme-logo"
                className="form-control"
                type="file"
                accept="image/*"
                onChange={(event) => handleLogoUpload(event, "customSchemeLogo")}
              />
              {formState.customSchemeLogo ? (
                <p className="text-body-secondary small mb-0 mt-2">
                  Custom logo will be saved with this client.
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="card-footer bg-white border-0 d-flex flex-wrap gap-2">
          <button className="btn btn-primary" type="submit">
            {editingId ? "Save changes" : "Save client"}
          </button>
          {editingId ? (
            <button className="btn btn-outline-secondary" type="button" onClick={handleCancelEdit}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="card shadow-sm admin-card">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
            <div>
              <h3 className="h5">Client management</h3>
              <p className="text-body-secondary mb-0">
                Edit client details or remove inactive accounts.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-outline-primary btn-sm" type="button" onClick={handleExport}>
                Export data
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                type="button"
                onClick={() => importInputRef.current?.click()}
              >
                Import data
              </button>
              <input
                ref={importInputRef}
                className="d-none"
                type="file"
                accept="application/json"
                onChange={handleImport}
              />
            </div>
          </div>
          {importError ? (
            <p className="text-danger small mt-2 mb-0">{importError}</p>
          ) : null}
          <div className="admin-client-controls mt-3">
            <div className="admin-client-search">
              <label className="form-label small mb-1" htmlFor="client-search">
                Search clients
              </label>
              <input
                id="client-search"
                className="form-control"
                type="search"
                placeholder="Search by name, alias, manager, or status"
                value={clientSearch}
                onChange={(event) => setClientSearch(event.target.value)}
              />
            </div>
            <div className="admin-client-filters">
              <div className="filter-group">
                <label className="filter-label" htmlFor="client-region-filter">
                  Region
                </label>
                <select
                  id="client-region-filter"
                  className="form-select form-select-sm"
                  value={clientRegionFilter}
                  onChange={(event) => setClientRegionFilter(event.target.value)}
                >
                  <option value="All">All regions</option>
                  {clientRegionOptions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label" htmlFor="client-product-filter">
                  Product
                </label>
                <select
                  id="client-product-filter"
                  className="form-select form-select-sm"
                  value={clientProductFilter}
                  onChange={(event) => setClientProductFilter(event.target.value)}
                >
                  <option value="All">All products</option>
                  {clientProductOptions.map((product) => (
                    <option key={product} value={product}>
                      {product}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label" htmlFor="client-environment-filter">
                  Environment
                </label>
                <select
                  id="client-environment-filter"
                  className="form-select form-select-sm"
                  value={clientEnvironmentFilter}
                  onChange={(event) => setClientEnvironmentFilter(event.target.value)}
                >
                  <option value="All">All environments</option>
                  {clientEnvironmentOptions.map((environment) => (
                    <option key={environment} value={environment}>
                      {environment}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-sm btn-outline-secondary filter-reset"
                type="button"
                onClick={() => {
                  setClientSearch("");
                  setClientRegionFilter("All");
                  setClientProductFilter("All");
                  setClientEnvironmentFilter("All");
                }}
              >
                Reset filters
              </button>
            </div>
          </div>
          <div className="admin-client-grid">
            {filteredClients.map((client) => (
              <div key={client.id} className="admin-client-card">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div className="d-flex gap-2 align-items-start">
                    {client.clientLogo ? (
                      <img
                        src={client.clientLogo}
                        alt={`${client.name} logo`}
                        className="client-logo"
                      />
                    ) : null}
                    <div>
                      <h4 className="h6 mb-1">{client.name}</h4>
                      <p className="text-body-secondary small mb-0">
                        {client.region} · {client.product} · {client.environment ?? "Unknown"} ·{" "}
                        {client.tier}
                      </p>
                    </div>
                  </div>
                  <span className="badge text-bg-light border">{client.currentStatus}</span>
                </div>
                <div className="d-flex flex-wrap gap-2 mt-3">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    type="button"
                    onClick={() => handleEditClient(client)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-outline-danger btn-sm"
                    type="button"
                    onClick={() => handleDeleteClient(client.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          {filteredClients.length === 0 ? (
            <p className="text-body-secondary small mt-3 mb-0">
              No clients match the current search and filters.
            </p>
          ) : null}
        </div>
      </div>
      {activeReport ? (
        <div className="modal d-block" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title mb-1">{activeReport.label} data</h5>
                  <p className="text-body-secondary small mb-0">
                    Showing {filteredRecords.length} records
                  </p>
                </div>
                <button className="btn-close" type="button" onClick={handleCloseReport} />
              </div>
              <div className="modal-body">
                {summaryData ? (
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <div className="border rounded-3 p-3 h-100">
                        <h6 className="mb-2">{summaryLabel} by status</h6>
                        <ul className="list-unstyled mb-0">
                          {Object.entries(summaryData.statusCounts).map(([status, count]) => (
                            <li key={status} className="d-flex justify-content-between">
                              <span>{status}</span>
                              <span className="fw-semibold">{count}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="border rounded-3 p-3 h-100">
                        <h6 className="mb-2">{summaryLabel} by age</h6>
                        <ul className="list-unstyled mb-0">
                          {Object.entries(summaryData.ageCounts).map(([bucket, count]) => (
                            <li key={bucket} className="d-flex justify-content-between">
                              <span>{bucket}</span>
                              <span className="fw-semibold">{count}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <input
                    className="form-control w-auto flex-grow-1"
                    type="search"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setPage(1);
                    }}
                  />
                  <div className="text-body-secondary small">
                    Page {page} of {totalPages}
                  </div>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        {activeColumns.map((column) => (
                          <th key={column.key} scope="col">
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRecords.map((record) => (
                        <tr key={record.id}>
                          {activeColumns.map((column) => (
                            <td key={column.key}>{record[column.key]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredRecords.length === 0 ? (
                  <p className="text-body-secondary small mb-0">No records found.</p>
                ) : null}
              </div>
              <div className="modal-footer">
                <div className="d-flex flex-wrap gap-2 w-100 justify-content-between align-items-center">
                  <div className="btn-group" role="group">
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      type="button"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </button>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      type="button"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </button>
                  </div>
                  <button className="btn btn-primary btn-sm" type="button" onClick={handleCloseReport}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
