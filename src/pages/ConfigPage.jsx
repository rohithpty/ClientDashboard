import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useClients } from "../state/ClientsContext.jsx";
import { DEFAULT_SCORING_CONFIG, localConfigRepository } from "../data/configRepository.js";
import { getReportData, importReportCsv } from "../data/reportRepository.js";
import { testConnection } from "../data/platformsRepository.js";
import { useToast, ToastContainer } from "../components/Toast.jsx";
import HelpTooltip from "../components/HelpTooltip.jsx";

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
  platformIdOverrides: {
    zendesk: "",
    jira: "",
    incidentIo: "",
    wrike: "",
  },
});

const REPORT_IMPORTS = [
  { type: "incidents", label: "Incidents" },
  { type: "support-tickets", label: "Support Tickets" },
  { type: "jiras", label: "JIRAs" },
  { type: "product-requests", label: "Product Requests" },
  { type: "implementation-requests", label: "Implementation Requests" },
];
const REPORT_HELP_KEYS = {
  incidents: "reportIncidents",
  "support-tickets": "reportSupportTickets",
  jiras: "reportJiras",
  "product-requests": "reportProductRequests",
  "implementation-requests": "reportImplementationRequests",
};

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
const SAMPLE_SCENARIO = {
  tickets: {
    criticalOpen: 1,
    highOpen: 2,
    over60d: 1,
    over30d: 2,
    over7d: 3,
  },
  incidents: {
    p1Count: 1,
    p2Count: 2,
    over60d: 1,
    over30d: 1,
    over7d: 2,
  },
  jiras: {
    criticalOver14d: 1,
    highOver30d: 1,
    over7d: 3,
  },
  requests: {
    over60d: 1,
    over30d: 2,
    over7d: 4,
  },
};
const ADMIN_CARD_IDS = [
  "importData",
  "scoring",
  "masterLists",
  "clientForm",
  "clientManagement",
  "platformIntegrations",
];
const HELP_TEXT = {
  reportIncidents:
    "Upload a CSV export of incidents. Records are used for the incident report table and scoring.",
  reportSupportTickets:
    "Upload a CSV export of support tickets. Records are used for the support report table and scoring.",
  reportJiras:
    "Upload a CSV export of JIRA issues. These are used for reporting and scoring when enabled.",
  reportProductRequests:
    "Upload a CSV export of product requests. This data is used for request scoring when enabled.",
  reportImplementationRequests:
    "Upload a CSV export of implementation requests. This data is used for request scoring when enabled.",
  scoringSummary:
    "Snapshot of the scoring model currently in use. Each card has its own rules and the client RAG is a weighted rollup.",
  enableTickets: "Include ticket data when calculating client RAG status.",
  enableJiras: "Include JIRA data when calculating client RAG status.",
  enableIncidents: "Include incident data when calculating client RAG status.",
  enableRequests: "Include request data when calculating client RAG status.",
  requestsOpen: "Statuses that count as open for requests scoring.",
  requestsClosed: "Statuses that count as closed for requests scoring.",
  scoringWeightTickets:
    "Share of the overall client score coming from Tickets. All weights should add up to 1.0.",
  scoringWeightIncidents:
    "Share of the overall client score coming from Incidents. All weights should add up to 1.0.",
  scoringWeightJiras:
    "Share of the overall client score coming from JIRAs. All weights should add up to 1.0.",
  scoringWeightRequests:
    "Share of the overall client score coming from Requests. All weights should add up to 1.0.",
  scoringRedBand:
    "Overall client score at or above this value is Red after weights are applied.",
  scoringAmberBand:
    "Overall client score at or above this value is Amber after weights are applied.",
  scoringCap:
    "Maximum count per factor used when scoring a single card (limits runaway scores).",
  incidentWindowDays: "Only incidents within this window are counted.",
  incidentsRedP1: "Red when P1 incidents meet or exceed this threshold.",
  incidentsAmberP2: "Amber when P2 incidents meet or exceed this threshold.",
  incidentsRedOver60: "Red when incidents older than 60 days meet this threshold.",
  incidentsAmberOver30: "Amber when incidents older than 30 days meet this threshold.",
  incidentsAmberOver7: "Amber when incidents older than 7 days meet this threshold.",
  requestsRedOver60: "Red when requests older than 60 days meet this threshold.",
  requestsAmberOver30: "Amber when requests older than 30 days meet this threshold.",
  requestsAmberOver7: "Amber when requests older than 7 days meet this threshold.",
  ticketsOpen:
    "Any ticket with a status in this list is treated as open. Open tickets are counted toward thresholds and can raise the client’s RAG.",
  ticketsClosed:
    "Tickets with these statuses are treated as closed and excluded from open‑ticket thresholds.",
  incidentsOpen:
    "Incidents with these statuses are considered active and will count toward incident thresholds.",
  incidentsClosed:
    "Incidents with these statuses are treated as resolved and won’t count as open.",
  jirasOpen:
    "JIRAs in these statuses are considered open for scoring and age‑based thresholds.",
  jirasClosed:
    "JIRAs in these statuses are treated as closed and excluded from open‑JIRA counts.",
  ticketsRedCritical:
    "If critical open tickets meet or exceed this number, the Tickets card becomes Red.",
  ticketsRedOver60:
    "If tickets older than 60 days meet or exceed this number, the Tickets card becomes Red.",
  ticketsAmberOver30:
    "If tickets older than 30 days meet or exceed this number, the Tickets card becomes Amber.",
  ticketsAmberOver7:
    "If tickets older than 7 days meet or exceed this number, the Tickets card becomes Amber.",
  ticketsAmberHigh:
    "If high‑priority open tickets meet or exceed this number, the Tickets card becomes Amber.",
  incidentsRedP1:
    "If open P1 incidents meet or exceed this number, the Incidents card becomes Red.",
  incidentsRedRca:
    "If incidents missing an RCA for 7+ days meet or exceed this number, the Incidents card becomes Red.",
  incidentsAmberOver7:
    "If incidents older than 7 days meet or exceed this number, the Incidents card becomes Amber.",
  incidentsAmberOver30:
    "If incidents older than 30 days meet or exceed this number, the Incidents card becomes Amber.",
  jirasRedCritical:
    "If critical JIRAs open longer than 14 days meet or exceed this number, the JIRAs card becomes Red.",
  jirasAmberHigh:
    "If high‑priority JIRAs open longer than 30 days meet or exceed this number, the JIRAs card becomes Amber.",
  jirasAmberOver7:
    "If JIRAs open longer than 7 days meet or exceed this number, the JIRAs card becomes Amber.",
  useTicketCriticality:
    "When enabled, ticket criticality is included in scoring and can move RAG faster.",
  useTicketScore:
    "When enabled, ticket score contributes to the Tickets card calculation.",
  useTicketSentiment:
    "When enabled, negative sentiment increases the Tickets card score.",
  useIncidentSeverity:
    "When enabled, incident severity affects the Incidents card score.",
  useIncidentRca:
    "When enabled, missing RCA flags add weight to incident scoring.",
  useJiraPriority:
    "When enabled, JIRA priority is used in the JIRAs card calculation.",
  scoringRedBand:
    "Overall score at or above this value sets the client RAG to Red.",
  scoringAmberBand:
    "Overall score at or above this value sets the client RAG to Amber.",
  scoringCap:
    "Limits how much a single factor can contribute to the total score.",
  regionsList: "Defines the list of regions available in client profiles and filters.",
  environmentsList:
    "Defines the list of environments available in client profiles and filters.",
  tamList: "Defines the list of technical account managers for client ownership.",
  amList: "Defines the list of account managers for client ownership.",
  clientName: "Official client name used across reports and dashboards.",
  clientAliases: "Alternate names that help match external data sources.",
  clientRegion: "Primary region used for routing and filtering.",
  clientProduct: "Primary product used for segmentation and reporting.",
  clientEnvironment: "Deployment environment used for filtering and context.",
  clientTier: "Tier used for priority and reporting.",
  clientTam: "Technical account manager responsible for the client.",
  clientAm: "Primary account manager responsible for the client.",
  clientStatus: "Optional status override when onboarding a new client.",
  clientSummary: "Weekly summary shown in the client detail view.",
  clientSchemes: "Card schemes associated with this client.",
  clientLogo: "Logo displayed on the dashboard and client detail page.",
  schemeLogo: "Optional custom scheme logo saved with the client.",
  platformIds: "Optional overrides to map this client to each platform.",
  platformZendesk: "Map this client to a Zendesk organization ID.",
  platformJira: "Map this client to a JIRA project key.",
  platformIncidentIo: "Map this client to an Incident.io workspace ID.",
  platformWrike: "Map this client to a Wrike account ID.",
  searchClients: "Search by name, alias, managers, or current status.",
  filterRegion: "Filter the client list by region.",
  filterProduct: "Filter the client list by product.",
  filterEnvironment: "Filter the client list by environment.",
  rateLimitRequests: "Maximum API requests per minute across integrations.",
  rateLimitEnabled: "Toggle rate limiting on or off.",
  platformEnabled: "Enable or disable this platform integration.",
  platformApiKey: "API key used to authenticate against the platform.",
  platformBaseUrl: "Base URL for the platform's API.",
  searchSettings: "Search for a setting to reveal the matching card.",
  theme: "Switch between light and dark interface themes.",
};
const AGE_BUCKETS = [
  { label: "0-7 days", min: 0, max: 7 },
  { label: "8-30 days", min: 8, max: 30 },
  { label: "31-90 days", min: 31, max: 90 },
  { label: "91+ days", min: 91, max: Number.POSITIVE_INFINITY },
];

const THEME_KEY = "rag-theme";

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
  const location = useLocation();
  const { clients, addClient, updateClient, removeClient, replaceClients } = useClients();
  const [config, setConfig] = useState(() => localConfigRepository.getConfig());
  const [formState, setFormState] = useState(() => buildEmptyForm(config));
  const [aliasInput, setAliasInput] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [importError, setImportError] = useState("");
  const importInputRef = useRef(null);
  const reportInputRefs = useRef({});
  const [reportError, setReportError] = useState("");
  const [reportData, setReportData] = useState(() =>
    REPORT_IMPORTS.reduce((acc, report) => {
      acc[report.type] = getReportData(report.type);
      return acc;
    }, {})
  );
  const [activeReportType, setActiveReportType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [adminSearch, setAdminSearch] = useState("");
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
  const [platformConfigs, setPlatformConfigs] = useState(() => config.platformIntegrations);
  const [rateLimitConfig, setRateLimitConfig] = useState(() => config.rateLimiting);
  const [scoringConfig, setScoringConfig] = useState(() => config.scoringConfig);
  const [activeScoringTab, setActiveScoringTab] = useState("tickets");
  const [scoringSectionsOpen, setScoringSectionsOpen] = useState({
    tickets: { status: true, thresholds: false, fields: false },
    jiras: { status: true, thresholds: false, fields: false },
    incidents: { status: true, thresholds: false, fields: false },
    requests: { status: true, thresholds: false },
  });
  const [testingPlatform, setTestingPlatform] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");
  const { toasts, addToast, removeToast } = useToast();
  const [statusDropdownOpen, setStatusDropdownOpen] = useState({});
  const [expandedCards, setExpandedCards] = useState({
    importData: false,
    scoring: false,
    masterLists: false,
    clientForm: false,
    clientManagement: false,
    platformIntegrations: false,
  });
  const scoringAutoExpandedRef = useRef(false);
  const pendingScrollRestore = useRef(null);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localConfigRepository.saveConfig(config);
  }, [config]);

  useEffect(() => {
    setConfig((prev) => ({
      ...prev,
      platformIntegrations: platformConfigs,
      rateLimiting: rateLimitConfig,
      scoringConfig,
    }));
  }, [platformConfigs, rateLimitConfig, scoringConfig]);

  useEffect(() => {
    if (!editingId) {
      setFormState(buildEmptyForm(config));
    }
  }, [config, editingId]);

  useEffect(() => {
    if (editingId) {
      setExpandedCards((prev) => ({ ...prev, clientForm: true }));
    }
  }, [editingId]);

  useEffect(() => {
    const hashTarget = location.hash ? location.hash.replace("#", "") : "";
    const stateTarget = location.state?.openCard || "";
    const target = stateTarget || hashTarget;
    if (!target || !ADMIN_CARD_IDS.includes(target)) {
      return;
    }
    setExpandedCards((prev) => ({ ...prev, [target]: true }));
    window.requestAnimationFrame(() => {
      document
        .getElementById(`admin-card-${target}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [location]);

  useEffect(() => {
    if (!expandedCards.scoring) {
      return;
    }
    if (scoringAutoExpandedRef.current) {
      return;
    }
    scoringAutoExpandedRef.current = true;
    setScoringSectionsOpen({
      tickets: { status: true, thresholds: true, fields: true },
      jiras: { status: true, thresholds: true, fields: true },
      incidents: { status: true, thresholds: true, fields: true },
      requests: { status: true, thresholds: true },
    });
  }, [expandedCards.scoring]);

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

  const adminSearchTerms = useMemo(
    () => adminSearch.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [adminSearch],
  );
  const isAdminSearchActive = adminSearchTerms.length > 0;
  const matchesAdminSearch = (haystack) => {
    if (!isAdminSearchActive) {
      return false;
    }
    const normalized = String(haystack ?? "").toLowerCase();
    return adminSearchTerms.every((term) => normalized.includes(term));
  };
  const isCardOpen = (id, searchText) =>
    isAdminSearchActive ? matchesAdminSearch(searchText) : expandedCards[id];
  const toggleCard = (id) => {
    if (isAdminSearchActive) {
      return;
    }
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCardPreserveScroll = (id, summaryEl) => {
    const y = window.scrollY;
    toggleCard(id);
    if (summaryEl) {
      summaryEl.blur();
    }
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.scrollTo({ top: y });
      }, 0);
    });
  };

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

  const requestScrollRestore = () => {
    pendingScrollRestore.current = window.scrollY;
  };

  useLayoutEffect(() => {
    if (pendingScrollRestore.current === null) {
      return;
    }
    window.scrollTo({ top: pendingScrollRestore.current });
    pendingScrollRestore.current = null;
  });

  const handleRemoveConfigItem = (key, value) => {
    setConfig((prev) => ({
      ...prev,
      [key]: prev[key].filter((item) => item !== value),
    }));
  };

  const parseListInput = (value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const toggleStatusValue = (path, value) => {
    const current = path.reduce((acc, key) => acc[key], scoringConfig) || [];
    const exists = current.some(
      (item) => item.toLowerCase() === value.toLowerCase(),
    );
    const next = exists
      ? current.filter((item) => item.toLowerCase() !== value.toLowerCase())
      : [...current, value];
    updateScoringConfig(path, next);
  };

  const updateStatusOptions = (path, value) => {
    setScoringConfig((prev) => {
      const next = structuredClone(prev);
      let target = next.statusOptions;
      for (let index = 1; index < path.length - 1; index += 1) {
        target = target[path[index]];
      }
      target[path[path.length - 1]] = value;
      return next;
    });
  };

  const addStatusValue = (path, value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    const current = path.reduce((acc, key) => acc[key], scoringConfig) || [];
    const optionsPath = ["statusOptions", ...path.slice(1)];
    const options = optionsPath.reduce((acc, key) => acc[key], scoringConfig) || [];
    const existsInOptions = options.some(
      (item) => item.toLowerCase() === trimmed.toLowerCase(),
    );
    const existsInSelected = current.some(
      (item) => item.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!existsInOptions) {
      updateStatusOptions(optionsPath, [...options, trimmed]);
    }
    if (!existsInSelected) {
      updateScoringConfig(path, [...current, trimmed]);
    }
  };

  const StatusChecklist = ({ id, label, path, helpKey }) => {
    const values = path.reduce((acc, key) => acc[key], scoringConfig) || [];
    const [draft, setDraft] = useState("");
    const isOpen = statusDropdownOpen[id] ?? false;
    const optionsPath = ["statusOptions", ...path.slice(1)];
    const options = optionsPath.reduce((acc, key) => acc[key], scoringConfig) || values;
    const normalizedQuery = draft.trim().toLowerCase();
    const filteredOptions = options.filter((option) =>
      normalizedQuery ? option.toLowerCase().includes(normalizedQuery) : true,
    );
    const setOpenPreserveScroll = (nextOpen) => {
      const y = window.scrollY;
      setStatusDropdownOpen((prev) => ({ ...prev, [id]: nextOpen }));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: y });
        });
      });
    };

    return (
      <div className="mb-3">
        <label className="form-label small d-inline-flex align-items-center gap-2" htmlFor={id}>
          <span>{label}</span>
          {helpKey ? (
            <HelpTooltip id={`help-${helpKey}`} text={HELP_TEXT[helpKey]} />
          ) : null}
        </label>
        <div className="status-dropdown" id={id}>
          <button
            className="status-dropdown__summary"
            type="button"
            aria-expanded={isOpen}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setOpenPreserveScroll(!isOpen)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpenPreserveScroll(false);
              }
            }}
          >
            <span className="status-dropdown__chevron" aria-hidden="true">
              {isOpen ? "▼" : "▶"}
            </span>
            <span>{values.length ? `${values.length} selected` : "No statuses selected"}</span>
          </button>
          {isOpen ? (
            <div className="status-dropdown__list">
            {filteredOptions.map((value) => (
              <label
                key={value}
                className="status-dropdown__item"
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={values.includes(value)}
                  onChange={() => toggleStatusValue(path, value)}
                  onClick={(event) => event.stopPropagation()}
                />
                <span>{value}</span>
              </label>
            ))}
            <div className="status-dropdown__add">
              <input
                className="form-control form-control-sm"
                type="text"
                placeholder="Search or add status"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addStatusValue(path, draft);
                    setDraft("");
                  }
                }}
              />
              <button
                className="btn btn-outline-secondary btn-sm"
                type="button"
                onClick={() => {
                  addStatusValue(path, draft);
                  setDraft("");
                }}
              >
                Add
              </button>
            </div>
          </div>
          ) : null}
        </div>
      </div>
    );
  };

  const HelpInline = ({ text, helpKey, idSuffix = "", className = "" }) => {
    const tooltipId = helpKey
      ? `help-${helpKey}${idSuffix ? `-${idSuffix}` : ""}`
      : "";
    return (
      <span className={`d-inline-flex align-items-center gap-2 ${className}`.trim()}>
        <span>{text}</span>
        {helpKey ? <HelpTooltip id={tooltipId} text={HELP_TEXT[helpKey]} /> : null}
      </span>
    );
  };

  const HelpLabel = ({ htmlFor, text, helpKey, className = "form-label" }) => {
    const tooltipId = helpKey && htmlFor ? `help-${helpKey}-${htmlFor}` : `help-${helpKey}`;
    return (
      <label
        className={`${className} d-inline-flex align-items-center gap-2`}
        htmlFor={htmlFor}
      >
        <span>{text}</span>
        {helpKey ? <HelpTooltip id={tooltipId} text={HELP_TEXT[helpKey]} /> : null}
      </label>
    );
  };

  const getScoringPreview = (config) => {
    const triggers = [];
    const cardStatuses = {};

    const resolveCardStatus = (cardKey, cardName, redRules, amberRules) => {
      if (!config.enabledCards?.[cardKey]) {
        return;
      }
      const cardTriggers = [];
      redRules.forEach(({ label, threshold, value }) => {
        if (threshold > 0 && value >= threshold) {
          cardTriggers.push(`${cardName}: ${label}`);
        }
      });
      if (cardTriggers.length) {
        cardStatuses[cardKey] = "Red";
        triggers.push(...cardTriggers);
        return;
      }
      amberRules.forEach(({ label, threshold, value }) => {
        if (threshold > 0 && value >= threshold) {
          cardTriggers.push(`${cardName}: ${label}`);
        }
      });
      if (cardTriggers.length) {
        cardStatuses[cardKey] = "Amber";
        triggers.push(...cardTriggers);
        return;
      }
      cardStatuses[cardKey] = "Green";
    };

    resolveCardStatus(
      "tickets",
      "Tickets",
      [
        {
          label: "critical open",
          threshold: config.thresholds.tickets.red.criticalOpen,
          value: SAMPLE_SCENARIO.tickets.criticalOpen,
        },
        {
          label: ">60d",
          threshold: config.thresholds.tickets.red.over60d,
          value: SAMPLE_SCENARIO.tickets.over60d,
        },
      ],
      [
        {
          label: ">30d",
          threshold: config.thresholds.tickets.amber.over30d,
          value: SAMPLE_SCENARIO.tickets.over30d,
        },
        {
          label: ">7d",
          threshold: config.thresholds.tickets.amber.over7d,
          value: SAMPLE_SCENARIO.tickets.over7d,
        },
        {
          label: "high open",
          threshold: config.thresholds.tickets.amber.highOpen,
          value: SAMPLE_SCENARIO.tickets.highOpen,
        },
      ],
    );

    resolveCardStatus(
      "incidents",
      "Incidents",
      [
        {
          label: "P1 count",
          threshold: config.incidents.priorityThresholds.red.p1Count,
          value: SAMPLE_SCENARIO.incidents.p1Count,
        },
        {
          label: ">60d",
          threshold: config.incidents.ageThresholds.red.over60d,
          value: SAMPLE_SCENARIO.incidents.over60d,
        },
      ],
      [
        {
          label: "P2 count",
          threshold: config.incidents.priorityThresholds.amber.p2Count,
          value: SAMPLE_SCENARIO.incidents.p2Count,
        },
        {
          label: ">30d",
          threshold: config.incidents.ageThresholds.amber.over30d,
          value: SAMPLE_SCENARIO.incidents.over30d,
        },
        {
          label: ">7d",
          threshold: config.incidents.ageThresholds.amber.over7d,
          value: SAMPLE_SCENARIO.incidents.over7d,
        },
      ],
    );

    resolveCardStatus(
      "jiras",
      "JIRAs",
      [
        {
          label: "critical >14d",
          threshold: config.thresholds.jiras.red.criticalOver14d,
          value: SAMPLE_SCENARIO.jiras.criticalOver14d,
        },
      ],
      [
        {
          label: "high >30d",
          threshold: config.thresholds.jiras.amber.highOver30d,
          value: SAMPLE_SCENARIO.jiras.highOver30d,
        },
        {
          label: ">7d",
          threshold: config.thresholds.jiras.amber.over7d,
          value: SAMPLE_SCENARIO.jiras.over7d,
        },
      ],
    );

    resolveCardStatus(
      "requests",
      "Requests",
      [
        {
          label: ">60d",
          threshold: config.thresholds.requests.red.over60d,
          value: SAMPLE_SCENARIO.requests.over60d,
        },
      ],
      [
        {
          label: ">30d",
          threshold: config.thresholds.requests.amber.over30d,
          value: SAMPLE_SCENARIO.requests.over30d,
        },
        {
          label: ">7d",
          threshold: config.thresholds.requests.amber.over7d,
          value: SAMPLE_SCENARIO.requests.over7d,
        },
      ],
    );

    const enabledKeys = Object.keys(config.enabledCards || {}).filter(
      (key) => config.enabledCards?.[key],
    );
    if (!enabledKeys.length) {
      return {
        result: "Unavailable",
        score: 0,
        triggers: [],
        message: "Preview unavailable — no cards enabled.",
      };
    }

    const scoreForStatus = (status) =>
      status === "Red" ? 100 : status === "Amber" ? 55 : 0;
    const totalScore = enabledKeys.reduce((acc, key) => {
      const weight = config.weights?.[key] ?? 0;
      return acc + weight * scoreForStatus(cardStatuses[key]);
    }, 0);

    const { red, amber } = config.scoringBands;
    const result = totalScore >= red ? "Red" : totalScore >= amber ? "Amber" : "Green";

    return {
      result,
      score: Math.round(totalScore),
      triggers,
      message: "",
    };
  };

  const scoringPreview = useMemo(
    () => getScoringPreview(scoringConfig),
    [scoringConfig],
  );

  const toggleScoringSection = (tabKey, sectionKey) => {
    setScoringSectionsOpen((prev) => ({
      ...prev,
      [tabKey]: {
        ...prev[tabKey],
        [sectionKey]: !prev[tabKey]?.[sectionKey],
      },
    }));
  };

  const ScoringSubcard = ({ tabKey, sectionKey, title, children }) => {
    const isOpen = scoringSectionsOpen[tabKey]?.[sectionKey];
    return (
      <div className="scoring-subcard">
        <button
          className="scoring-subcard__summary"
          type="button"
          aria-expanded={isOpen}
          onClick={() => toggleScoringSection(tabKey, sectionKey)}
        >
          <span className="scoring-subcard__chevron" aria-hidden="true">
            {isOpen ? "▼" : "▶"}
          </span>
          <span>{title}</span>
        </button>
        {isOpen ? <div className="scoring-subcard__body">{children}</div> : null}
      </div>
    );
  };

  const renderGlobalRulesCard = () => {
    const weightSum = Object.values(scoringConfig.weights || {}).reduce(
      (acc, value) => acc + (Number.isFinite(value) ? value : 0),
      0,
    );
    const showWeightWarning = Math.abs(weightSum - 1) > 0.01;

    return (
    <div className="admin-list-card scoring-global">
        <div className="row g-3 align-items-start">
          <div className="col-lg-7">
            <div className="scoring-summary-grid">
              <div>
                <h4 className="h6 mb-2">
                  <HelpInline text="Active formula (summary)" helpKey="scoringSummary" />
                </h4>
                <ul className="small text-body-secondary mb-0">
                  <li>Client RAG is computed from a weighted rollup of enabled cards.</li>
                  <li>Open/closed status mappings decide which records count.</li>
                  <li>Thresholds apply per platform card (Tickets, JIRAs, Incidents, Requests).</li>
                  <li>
                    Red ≥ {scoringConfig.scoringBands.red}, Amber ≥{" "}
                    {scoringConfig.scoringBands.amber}.
                  </li>
                  <li>Cap per factor: {scoringConfig.caps.perBucket}.</li>
                </ul>
                <p className="small text-body-secondary mb-0 mt-2">
                  Rollup: weighted score across enabled cards.
                </p>
              </div>
              <div className="scoring-preview">
                <h5 className="scoring-preview__title">Preview (sample scenario)</h5>
                {scoringPreview.message ? (
                  <p className="scoring-preview__note">{scoringPreview.message}</p>
                ) : (
                  <>
                    <p className="scoring-preview__result">
                      Result: <strong>{scoringPreview.result}</strong>{" "}
                      <span className="text-body-secondary">
                        (score {scoringPreview.score})
                      </span>
                    </p>
                    <div className="scoring-preview__chips">
                      {scoringPreview.triggers.length === 0 ? (
                        <span className="scoring-preview__chip">No triggers</span>
                      ) : (
                        scoringPreview.triggers.map((trigger) => (
                          <span key={trigger} className="scoring-preview__chip">
                            {trigger}
                          </span>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="col-lg-5">
            <h4 className="h6 mb-2">Enable cards</h4>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="score-tickets"
              checked={scoringConfig.enabledCards.tickets}
              onChange={(event) =>
                updateScoringConfig(["enabledCards", "tickets"], event.target.checked)
              }
            />
            <label className="form-check-label" htmlFor="score-tickets">
              <HelpInline text="Tickets (Zendesk)" helpKey="enableTickets" />
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="score-jiras"
              checked={scoringConfig.enabledCards.jiras}
              onChange={(event) =>
                updateScoringConfig(["enabledCards", "jiras"], event.target.checked)
              }
            />
            <label className="form-check-label" htmlFor="score-jiras">
              <HelpInline text="JIRAs" helpKey="enableJiras" />
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="score-incidents"
              checked={scoringConfig.enabledCards.incidents}
              onChange={(event) =>
                updateScoringConfig(["enabledCards", "incidents"], event.target.checked)
              }
            />
            <label className="form-check-label" htmlFor="score-incidents">
              <HelpInline text="Incidents" helpKey="enableIncidents" />
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="score-requests"
              checked={scoringConfig.enabledCards.requests}
              onChange={(event) =>
                updateScoringConfig(["enabledCards", "requests"], event.target.checked)
              }
            />
            <label className="form-check-label" htmlFor="score-requests">
              <HelpInline text="Requests" helpKey="enableRequests" />
            </label>
          </div>
          <div className="row g-2 mt-3">
            <div className="col-6">
              <HelpLabel
                className="form-label small"
                htmlFor="weight-tickets"
                text="Tickets weight"
                helpKey="scoringWeightTickets"
              />
              <input
                id="weight-tickets"
                className="form-control form-control-sm"
                type="number"
                step="0.05"
                value={scoringConfig.weights.tickets}
                onChange={(event) =>
                  updateScoringConfig(
                    ["weights", "tickets"],
                    parseFloat(event.target.value) || 0,
                  )
                }
              />
            </div>
            <div className="col-6">
              <HelpLabel
                className="form-label small"
                htmlFor="weight-incidents"
                text="Incidents weight"
                helpKey="scoringWeightIncidents"
              />
              <input
                id="weight-incidents"
                className="form-control form-control-sm"
                type="number"
                step="0.05"
                value={scoringConfig.weights.incidents}
                onChange={(event) =>
                  updateScoringConfig(
                    ["weights", "incidents"],
                    parseFloat(event.target.value) || 0,
                  )
                }
              />
            </div>
            <div className="col-6">
              <HelpLabel
                className="form-label small"
                htmlFor="weight-jiras"
                text="JIRAs weight"
                helpKey="scoringWeightJiras"
              />
              <input
                id="weight-jiras"
                className="form-control form-control-sm"
                type="number"
                step="0.05"
                value={scoringConfig.weights.jiras}
                onChange={(event) =>
                  updateScoringConfig(
                    ["weights", "jiras"],
                    parseFloat(event.target.value) || 0,
                  )
                }
              />
            </div>
            <div className="col-6">
              <HelpLabel
                className="form-label small"
                htmlFor="weight-requests"
                text="Requests weight"
                helpKey="scoringWeightRequests"
              />
              <input
                id="weight-requests"
                className="form-control form-control-sm"
                type="number"
                step="0.05"
                value={scoringConfig.weights.requests}
                onChange={(event) =>
                  updateScoringConfig(
                    ["weights", "requests"],
                    parseFloat(event.target.value) || 0,
                  )
                }
              />
            </div>
          </div>
          <div className="row g-2 mt-3">
            <div className="col-6">
              <HelpLabel
                className="form-label small"
                htmlFor="score-red-band"
                text="Score red band"
                helpKey="scoringRedBand"
              />
              <input
                id="score-red-band"
                className="form-control form-control-sm"
                type="number"
                value={scoringConfig.scoringBands.red}
                onChange={(event) =>
                  updateScoringConfig(
                    ["scoringBands", "red"],
                    parseInt(event.target.value, 10) || 0,
                  )
                }
              />
            </div>
            <div className="col-6">
              <HelpLabel
                className="form-label small"
                htmlFor="score-amber-band"
                text="Score amber band"
                helpKey="scoringAmberBand"
              />
              <input
                id="score-amber-band"
                className="form-control form-control-sm"
                type="number"
                value={scoringConfig.scoringBands.amber}
                onChange={(event) =>
                  updateScoringConfig(
                    ["scoringBands", "amber"],
                    parseInt(event.target.value, 10) || 0,
                  )
                }
              />
            </div>
            <div className="col-6">
              <HelpLabel
                className="form-label small"
                htmlFor="score-cap"
                text="Cap per bucket"
                helpKey="scoringCap"
              />
              <input
                id="score-cap"
                className="form-control form-control-sm"
                type="number"
                value={scoringConfig.caps.perBucket}
                onChange={(event) =>
                  updateScoringConfig(
                    ["caps", "perBucket"],
                    parseInt(event.target.value, 10) || 0,
                  )
                }
              />
            </div>
          </div>
          {showWeightWarning ? (
            <p className="text-danger small mt-2 mb-0">
              Weights must sum to 1.0 (current: {weightSum.toFixed(2)}).
            </p>
          ) : null}
          <div className="mt-3">
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={handleResetScoring}
            >
              Reset scoring defaults
            </button>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const renderTicketsTab = () => (
    <div className="scoring-tab-panel">
      <ScoringSubcard tabKey="tickets" sectionKey="status" title="Status mappings (open / closed)">
        <StatusChecklist
          id="tickets-open"
          label="Tickets open statuses"
          path={["statusMapping", "tickets", "open"]}
          helpKey="ticketsOpen"
        />
        <StatusChecklist
          id="tickets-closed"
          label="Tickets closed statuses"
          path={["statusMapping", "tickets", "closed"]}
          helpKey="ticketsClosed"
        />
      </ScoringSubcard>
      <ScoringSubcard tabKey="tickets" sectionKey="thresholds" title="Thresholds">
        <div className="row g-2">
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="tickets-red-critical"
              text="Tickets red: critical open"
              helpKey="ticketsRedCritical"
            />
            <input
              id="tickets-red-critical"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.thresholds.tickets.red.criticalOpen}
              onChange={(event) =>
                updateScoringConfig(
                  ["thresholds", "tickets", "red", "criticalOpen"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="tickets-red-over60"
              text="Tickets red: >60d"
              helpKey="ticketsRedOver60"
            />
            <input
              id="tickets-red-over60"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.thresholds.tickets.red.over60d}
              onChange={(event) =>
                updateScoringConfig(
                  ["thresholds", "tickets", "red", "over60d"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="tickets-amber-over30"
              text="Tickets amber: >30d"
              helpKey="ticketsAmberOver30"
            />
            <input
              id="tickets-amber-over30"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.thresholds.tickets.amber.over30d}
              onChange={(event) =>
                updateScoringConfig(
                  ["thresholds", "tickets", "amber", "over30d"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="tickets-amber-over7"
              text="Tickets amber: >7d"
              helpKey="ticketsAmberOver7"
            />
            <input
              id="tickets-amber-over7"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.thresholds.tickets.amber.over7d}
              onChange={(event) =>
                updateScoringConfig(
                  ["thresholds", "tickets", "amber", "over7d"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="tickets-amber-high"
              text="Tickets amber: high open"
              helpKey="ticketsAmberHigh"
            />
            <input
              id="tickets-amber-high"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.thresholds.tickets.amber.highOpen}
              onChange={(event) =>
                updateScoringConfig(
                  ["thresholds", "tickets", "amber", "highOpen"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
        </div>
      </ScoringSubcard>
      <ScoringSubcard tabKey="tickets" sectionKey="fields" title="Field usage">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="tickets-criticality"
            checked={scoringConfig.useFields.tickets.criticality}
            onChange={(event) =>
              updateScoringConfig(["useFields", "tickets", "criticality"], event.target.checked)
            }
          />
          <label className="form-check-label" htmlFor="tickets-criticality">
            <HelpInline text="Use ticket criticality" helpKey="useTicketCriticality" />
          </label>
        </div>
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="tickets-score"
            checked={scoringConfig.useFields.tickets.score}
            onChange={(event) =>
              updateScoringConfig(["useFields", "tickets", "score"], event.target.checked)
            }
          />
          <label className="form-check-label" htmlFor="tickets-score">
            <HelpInline text="Use ticket score" helpKey="useTicketScore" />
          </label>
        </div>
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="tickets-sentiment"
            checked={scoringConfig.useFields.tickets.sentiment}
            onChange={(event) =>
              updateScoringConfig(["useFields", "tickets", "sentiment"], event.target.checked)
            }
          />
          <label className="form-check-label" htmlFor="tickets-sentiment">
            <HelpInline text="Use sentiment" helpKey="useTicketSentiment" />
          </label>
        </div>
      </ScoringSubcard>
    </div>
  );

  const renderJirasTab = () => (
    <div className="scoring-tab-panel">
      <ScoringSubcard tabKey="jiras" sectionKey="status" title="Status mappings (open / closed)">
        <StatusChecklist
          id="jiras-open"
          label="JIRAs open statuses"
          path={["statusMapping", "jiras", "open"]}
          helpKey="jirasOpen"
        />
        <StatusChecklist
          id="jiras-closed"
          label="JIRAs closed statuses"
          path={["statusMapping", "jiras", "closed"]}
          helpKey="jirasClosed"
        />
      </ScoringSubcard>
      <ScoringSubcard tabKey="jiras" sectionKey="thresholds" title="Thresholds">
        <div className="row g-2">
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="jira-red-critical"
              text="JIRAs red: critical >14d"
              helpKey="jirasRedCritical"
            />
            <input
              id="jira-red-critical"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.thresholds.jiras.red.criticalOver14d}
              onChange={(event) =>
                updateScoringConfig(
                  ["thresholds", "jiras", "red", "criticalOver14d"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="jira-amber-high"
              text="JIRAs amber: high >30d"
              helpKey="jirasAmberHigh"
            />
            <input
              id="jira-amber-high"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.thresholds.jiras.amber.highOver30d}
              onChange={(event) =>
                updateScoringConfig(
                  ["thresholds", "jiras", "amber", "highOver30d"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="jira-amber-over7"
              text="JIRAs amber: >7d"
              helpKey="jirasAmberOver7"
            />
            <input
              id="jira-amber-over7"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.thresholds.jiras.amber.over7d}
              onChange={(event) =>
                updateScoringConfig(
                  ["thresholds", "jiras", "amber", "over7d"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
        </div>
      </ScoringSubcard>
      <ScoringSubcard tabKey="jiras" sectionKey="fields" title="Field usage">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="jiras-priority"
            checked={scoringConfig.useFields.jiras.priority}
            onChange={(event) =>
              updateScoringConfig(["useFields", "jiras", "priority"], event.target.checked)
            }
          />
          <label className="form-check-label" htmlFor="jiras-priority">
            <HelpInline text="Use JIRA priority" helpKey="useJiraPriority" />
          </label>
        </div>
      </ScoringSubcard>
    </div>
  );

  const renderIncidentsTab = () => (
    <div className="scoring-tab-panel">
      <ScoringSubcard tabKey="incidents" sectionKey="status" title="Status mappings (open / closed)">
        <StatusChecklist
          id="incidents-open"
          label="Incidents open statuses"
          path={["statusMapping", "incidents", "open"]}
          helpKey="incidentsOpen"
        />
        <StatusChecklist
          id="incidents-closed"
          label="Incidents closed statuses"
          path={["statusMapping", "incidents", "closed"]}
          helpKey="incidentsClosed"
        />
      </ScoringSubcard>
      <ScoringSubcard tabKey="incidents" sectionKey="thresholds" title="Thresholds">
        <div className="row g-2">
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="inc-window-days"
              text="Incident window (days)"
              helpKey="incidentWindowDays"
            />
            <input
              id="inc-window-days"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.incidents.windowDays}
              onChange={(event) =>
                updateScoringConfig(
                  ["incidents", "windowDays"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="inc-red-p1"
              text="Incidents red: P1 count"
              helpKey="incidentsRedP1"
            />
            <input
              id="inc-red-p1"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.incidents.priorityThresholds.red.p1Count}
              onChange={(event) =>
                updateScoringConfig(
                  ["incidents", "priorityThresholds", "red", "p1Count"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="inc-amber-p2"
              text="Incidents amber: P2 count"
              helpKey="incidentsAmberP2"
            />
            <input
              id="inc-amber-p2"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.incidents.priorityThresholds.amber.p2Count}
              onChange={(event) =>
                updateScoringConfig(
                  ["incidents", "priorityThresholds", "amber", "p2Count"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="inc-red-over60"
              text="Incidents red: >60d"
              helpKey="incidentsRedOver60"
            />
            <input
              id="inc-red-over60"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.incidents.ageThresholds.red.over60d}
              onChange={(event) =>
                updateScoringConfig(
                  ["incidents", "ageThresholds", "red", "over60d"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="inc-amber-over30"
              text="Incidents amber: >30d"
              helpKey="incidentsAmberOver30"
            />
            <input
              id="inc-amber-over30"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.incidents.ageThresholds.amber.over30d}
              onChange={(event) =>
                updateScoringConfig(
                  ["incidents", "ageThresholds", "amber", "over30d"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="inc-amber-over7"
              text="Incidents amber: >7d"
              helpKey="incidentsAmberOver7"
            />
            <input
              id="inc-amber-over7"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.incidents.ageThresholds.amber.over7d}
              onChange={(event) =>
                updateScoringConfig(
                  ["incidents", "ageThresholds", "amber", "over7d"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
        </div>
      </ScoringSubcard>
      <ScoringSubcard tabKey="incidents" sectionKey="fields" title="Field usage">
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="incidents-severity"
            checked={scoringConfig.useFields.incidents.severity}
            onChange={(event) =>
              updateScoringConfig(["useFields", "incidents", "severity"], event.target.checked)
            }
          />
          <label className="form-check-label" htmlFor="incidents-severity">
            <HelpInline text="Use incident severity" helpKey="useIncidentSeverity" />
          </label>
        </div>
        <div className="form-check">
          <input
            className="form-check-input"
            type="checkbox"
            id="incidents-rca"
            checked={scoringConfig.useFields.incidents.rca}
            onChange={(event) =>
              updateScoringConfig(["useFields", "incidents", "rca"], event.target.checked)
            }
          />
          <label className="form-check-label" htmlFor="incidents-rca">
            <HelpInline text="Use RCA missing flag" helpKey="useIncidentRca" />
          </label>
        </div>
      </ScoringSubcard>
    </div>
  );

  const renderRequestsTab = () => (
    <div className="scoring-tab-panel">
      <ScoringSubcard tabKey="requests" sectionKey="status" title="Status mappings (open / closed)">
        <StatusChecklist
          id="requests-open"
          label="Requests open statuses"
          path={["statusMapping", "requests", "open"]}
          helpKey="requestsOpen"
        />
        <StatusChecklist
          id="requests-closed"
          label="Requests closed statuses"
          path={["statusMapping", "requests", "closed"]}
          helpKey="requestsClosed"
        />
      </ScoringSubcard>
      <ScoringSubcard tabKey="requests" sectionKey="thresholds" title="Thresholds">
        <div className="row g-2">
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="req-red-over60"
              text="Requests red: >60d"
              helpKey="requestsRedOver60"
            />
            <input
              id="req-red-over60"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.thresholds.requests.red.over60d}
              onChange={(event) =>
                updateScoringConfig(
                  ["thresholds", "requests", "red", "over60d"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="req-amber-over30"
              text="Requests amber: >30d"
              helpKey="requestsAmberOver30"
            />
            <input
              id="req-amber-over30"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.thresholds.requests.amber.over30d}
              onChange={(event) =>
                updateScoringConfig(
                  ["thresholds", "requests", "amber", "over30d"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
          <div className="col-md-6">
            <HelpLabel
              className="form-label small"
              htmlFor="req-amber-over7"
              text="Requests amber: >7d"
              helpKey="requestsAmberOver7"
            />
            <input
              id="req-amber-over7"
              className="form-control form-control-sm"
              type="number"
              value={scoringConfig.thresholds.requests.amber.over7d}
              onChange={(event) =>
                updateScoringConfig(
                  ["thresholds", "requests", "amber", "over7d"],
                  parseInt(event.target.value, 10) || 0,
                )
              }
            />
          </div>
        </div>
      </ScoringSubcard>
    </div>
  );

  const AdminCard = ({
    id,
    title,
    description,
    searchText,
    children,
    footer,
    bodyAs = "div",
    bodyProps = {},
  }) => {
    const BodyTag = bodyAs;
    const bodyClassName = ["card-body", bodyProps.className].filter(Boolean).join(" ");
    const open = isCardOpen(id, searchText);
    const isVisible = !isAdminSearchActive || matchesAdminSearch(searchText);

    if (!isVisible) {
      return null;
    }

    return (
      <details
        id={`admin-card-${id}`}
        className="card shadow-sm admin-card admin-card--collapsible"
        open={open}
      >
        <summary
          className="admin-card__summary"
          onClick={(event) => {
            event.preventDefault();
            toggleCardPreserveScroll(id, event.currentTarget);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleCardPreserveScroll(id, event.currentTarget);
            }
          }}
        >
          <div>
            <h3 className="h5 mb-1">{title}</h3>
            {description ? (
              <p className="text-body-secondary mb-0">{description}</p>
            ) : null}
          </div>
          <span className="admin-card__chevron" aria-hidden="true" />
        </summary>
        <BodyTag {...bodyProps} className={bodyClassName}>
          {children}
          {bodyAs === "form" && footer ? (
            <div className="card-footer bg-white border-0 d-flex flex-wrap gap-2">
              {footer}
            </div>
          ) : null}
        </BodyTag>
        {bodyAs !== "form" && footer ? (
          <div className="card-footer bg-white border-0 d-flex flex-wrap gap-2">
            {footer}
          </div>
        ) : null}
      </details>
    );
  };

  const updateScoringConfig = (path, value) => {
    setScoringConfig((prev) => {
      const next = structuredClone(prev);
      let target = next;
      for (let index = 0; index < path.length - 1; index += 1) {
        target = target[path[index]];
      }
      target[path[path.length - 1]] = value;
      return next;
    });
  };

  const handleResetScoring = () => {
    setScoringConfig(structuredClone(DEFAULT_SCORING_CONFIG));
    addToast("Scoring settings reset to defaults.", "success");
  };

  const handleTestConnection = async (platform) => {
    requestScrollRestore();
    setTestingPlatform(platform);
    try {
      const result = await testConnection(platform);
      if (result.success) {
        addToast(result.message, "success");
      } else {
        addToast(result.message, "error");
      }
    } catch (error) {
      addToast(`Error testing connection: ${error.message}`, "error");
    } finally {
      setTestingPlatform(null);
      requestScrollRestore();
    }
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
      platformIdOverrides: formState.platformIdOverrides,
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
      platformIdOverrides: client.platformIdOverrides ?? {
        zendesk: "",
        jira: "",
        incidentIo: "",
        wrike: "",
      },
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
        if (["support-tickets", "incidents", "jiras"].includes(type)) {
          const normalizeKey = (value) => value?.toString().trim().toLowerCase();
          const splitOrganizations = (value) =>
            value
              ?.toString()
              .split(",")
              .map((entry) => entry.trim())
              .filter(Boolean) ?? [];
          const existingKeys = new Set();
          clients.forEach((client) => {
            [client.name, ...(client.aliases ?? [])]
              .map(normalizeKey)
              .filter(Boolean)
              .forEach((key) => existingKeys.add(key));
          });
          const newClients = [];
          payload.records.forEach((record) => {
            splitOrganizations(record.organization).forEach((orgName) => {
              const key = normalizeKey(orgName);
              if (!key || existingKeys.has(key)) {
                return;
              }
              existingKeys.add(key);
              newClients.push({
                id: `client-${Date.now()}-${newClients.length}`,
                name: orgName,
                region: "Unknown",
                product: "Unknown",
                tier: "Unassigned",
                currentStatus: "Green",
                summary: "Imported from report data.",
                metrics: {
                  tickets: { L1: 0, L2: 0, L3: 0, olderThan30: 0, olderThan60: 0 },
                  jiras: { openCount: 0, critical: 0 },
                  requests: 0,
                  incidents: 0,
                },
                history: [],
                schemes: [],
                customSchemeLogo: "",
                aliases: [],
                environment: "Unknown",
                technicalAccountManager: "Unassigned",
                accountManager: "Unassigned",
                clientLogo: "",
              });
            });
          });
          if (newClients.length) {
            replaceClients([...clients, ...newClients]);
          }
        }
        setReportError("");
      } catch (error) {
        setReportError(error.message || "Unable to import CSV report.");
      }
    };
    reader.readAsText(file);
  };

  const handleClearData = () => {
    const confirmed = window.confirm(
      "This will remove all client profiles and imported report data. This cannot be undone. Continue?",
    );
    if (!confirmed) {
      return;
    }

    localStorage.removeItem("rag-clients-v2");
    localStorage.removeItem("rag-clients");

    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith("csvReports:")) {
        localStorage.removeItem(key);
      }
    }

    replaceClients([]);
    setReportData(
      REPORT_IMPORTS.reduce((acc, report) => {
        acc[report.type] = { records: [], lastImportedAt: null };
        return acc;
      }, {}),
    );
    setReportError("");
    setImportError("");
    addToast("Data cleared.", "success");
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
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
        <div>
          <h2 className="mb-1">Admin center</h2>
          <p className="text-body-secondary mb-0">
            Manage client profiles and import operational reports.
          </p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div className="admin-settings-search">
            <HelpLabel
              className="form-label small mb-1"
              htmlFor="admin-search"
              text="Search settings"
              helpKey="searchSettings"
            />
            <input
              id="admin-search"
              className="form-control form-control-sm"
              type="search"
              placeholder="Search by setting or keyword"
              value={adminSearch}
              onChange={(event) => setAdminSearch(event.target.value)}
            />
          </div>
          <div className="d-flex align-items-center gap-2">
            <HelpLabel
              className="form-label small mb-0"
              htmlFor="theme-select"
              text="Theme"
              helpKey="theme"
            />
            <select
              id="theme-select"
              className="form-select form-select-sm"
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </div>
      <AdminCard
        id="importData"
        title="Import data"
        description="Upload CSV reports by category to keep incident and support data in sync."
        searchText="import data csv incidents support tickets jiras product requests implementation requests view data"
      >
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div className="d-flex flex-wrap gap-2">
            {REPORT_IMPORTS.map((report) => (
              <div key={report.type} className="d-inline-flex align-items-center gap-2">
                <button
                  className="btn btn-outline-primary btn-sm"
                  type="button"
                  onClick={() => reportInputRefs.current[report.type]?.click()}
                >
                  {report.label}
                </button>
                <HelpTooltip
                  id={`help-${REPORT_HELP_KEYS[report.type]}`}
                  text={HELP_TEXT[REPORT_HELP_KEYS[report.type]]}
                />
                <input
                  className="d-none"
                  type="file"
                  accept=".csv"
                  ref={(node) => {
                    if (node) {
                      reportInputRefs.current[report.type] = node;
                    }
                  }}
                  onChange={(event) => handleReportImport(report.type, event.target.files?.[0])}
                />
              </div>
            ))}
            <div className="d-inline-flex align-items-center gap-2">
              <button
                className="btn btn-outline-danger btn-sm"
                type="button"
                onClick={handleClearData}
              >
                Clear data
              </button>
              <HelpTooltip
                id="help-clear-data"
                text="Clears all client profiles and imported report data."
              />
            </div>
          </div>
        </div>
        {reportError ? <p className="text-danger small mt-2 mb-0">{reportError}</p> : null}
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
      </AdminCard>
      <AdminCard
        id="scoring"
        title="Scoring & RAG"
        description="Define how inline cards (Tickets, JIRAs, Incidents, Requests) calculate their RAG status."
        searchText="scoring rag thresholds status mappings tickets incidents jiras requests enable cards field usage bands caps"
      >
        <div className="scoring-layout">
          {renderGlobalRulesCard()}
          <div className="scoring-tabs" role="tablist" aria-label="Scoring categories">
            <button
              className={`scoring-tab ${activeScoringTab === "tickets" ? "is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeScoringTab === "tickets"}
              onClick={() => setActiveScoringTab("tickets")}
            >
              Zendesk tickets
            </button>
            <button
              className={`scoring-tab ${activeScoringTab === "jiras" ? "is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeScoringTab === "jiras"}
              onClick={() => setActiveScoringTab("jiras")}
            >
              JIRA issues
            </button>
            <button
              className={`scoring-tab ${activeScoringTab === "incidents" ? "is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeScoringTab === "incidents"}
              onClick={() => setActiveScoringTab("incidents")}
            >
              Incident records
            </button>
            <button
              className={`scoring-tab ${activeScoringTab === "requests" ? "is-active" : ""}`}
              type="button"
              role="tab"
              aria-selected={activeScoringTab === "requests"}
              onClick={() => setActiveScoringTab("requests")}
            >
              Requests
            </button>
          </div>
          {activeScoringTab === "tickets" ? renderTicketsTab() : null}
          {activeScoringTab === "jiras" ? renderJirasTab() : null}
          {activeScoringTab === "incidents" ? renderIncidentsTab() : null}
          {activeScoringTab === "requests" ? renderRequestsTab() : null}
        </div>
      </AdminCard>
      <AdminCard
        id="masterLists"
        title="Master lists"
        description="Maintain the region, environment, and account owner configuration lists."
        searchText="master lists regions environments technical account managers account managers"
      >
        <div className="row g-3 mt-1">
          <div className="col-lg-6">
            <div className="admin-list-card">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="h6 mb-0">
                  <HelpInline text="Regions" helpKey="regionsList" />
                </h4>
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
                <h4 className="h6 mb-0">
                  <HelpInline text="Environments" helpKey="environmentsList" />
                </h4>
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
                <h4 className="h6 mb-0">
                  <HelpInline text="Technical account managers" helpKey="tamList" />
                </h4>
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
                <h4 className="h6 mb-0">
                  <HelpInline text="Account managers" helpKey="amList" />
                </h4>
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
      </AdminCard>
      <AdminCard
        id="clientForm"
        title={editingId ? "Edit client" : "Add client"}
        description="Create or update client profiles and platform IDs."
        searchText="client name aliases region product environment tier technical account manager account manager status summary schemes logo platform ids zendesk jira incident io wrike"
        bodyAs="form"
        bodyProps={{ onSubmit: handleSubmit }}
        footer={
          <>
            <button className="btn btn-primary" type="submit">
              {editingId ? "Save changes" : "Save client"}
            </button>
            {editingId ? (
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            ) : null}
          </>
        }
      >
        <div className="row g-3">
          <div className="col-md-6">
            <HelpLabel htmlFor="client-name" text="Client name" helpKey="clientName" />
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
            <HelpLabel htmlFor="client-aliases" text="Client aliases" helpKey="clientAliases" />
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
            <HelpLabel htmlFor="client-region" text="Region" helpKey="clientRegion" />
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
            <HelpLabel htmlFor="client-product" text="Product" helpKey="clientProduct" />
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
            <HelpLabel htmlFor="client-environment" text="Environment" helpKey="clientEnvironment" />
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
            <HelpLabel htmlFor="client-tier" text="Tier" helpKey="clientTier" />
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
            <HelpLabel
              htmlFor="client-tam"
              text="Technical Account Manager"
              helpKey="clientTam"
            />
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
            <HelpLabel htmlFor="client-am" text="Account Manager" helpKey="clientAm" />
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
            <HelpLabel htmlFor="client-status" text="Status (optional)" helpKey="clientStatus" />
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
            <HelpLabel htmlFor="client-summary" text="Weekly summary" helpKey="clientSummary" />
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
            <div className="form-label mb-2">
              <HelpInline text="Schemes" helpKey="clientSchemes" />
            </div>
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
            <HelpLabel
              htmlFor="client-logo"
              text="Client logo (optional)"
              helpKey="clientLogo"
            />
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
            <HelpLabel
              htmlFor="scheme-logo"
              text="Upload scheme logo (optional)"
              helpKey="schemeLogo"
            />
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
          <div className="col-12">
            <div className="alert alert-info mb-0">
              <h6 className="alert-heading mb-2">
                <HelpInline text="Platform IDs (optional)" helpKey="platformIds" />
              </h6>
              <p className="small text-body-secondary mb-3">
                Map this client to organization IDs on each platform for precise ticket filtering. Leave blank to auto-detect or use client aliases.
              </p>
              <div className="row g-3">
                <div className="col-md-6">
                  <HelpLabel
                    className="form-label small"
                    htmlFor="zendesk-id"
                    text="Zendesk Organization ID"
                    helpKey="platformZendesk"
                  />
                  <input
                    id="zendesk-id"
                    className="form-control form-control-sm"
                    type="text"
                    placeholder="e.g., 123456"
                    value={formState.platformIdOverrides?.zendesk || ""}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        platformIdOverrides: {
                          ...prev.platformIdOverrides,
                          zendesk: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <HelpLabel
                    className="form-label small"
                    htmlFor="jira-id"
                    text="JIRA Project Key"
                    helpKey="platformJira"
                  />
                  <input
                    id="jira-id"
                    className="form-control form-control-sm"
                    type="text"
                    placeholder="e.g., PROJ"
                    value={formState.platformIdOverrides?.jira || ""}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        platformIdOverrides: {
                          ...prev.platformIdOverrides,
                          jira: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <HelpLabel
                    className="form-label small"
                    htmlFor="incident-io-id"
                    text="Incident.io Workspace ID"
                    helpKey="platformIncidentIo"
                  />
                  <input
                    id="incident-io-id"
                    className="form-control form-control-sm"
                    type="text"
                    placeholder="e.g., workspace-uuid"
                    value={formState.platformIdOverrides?.incidentIo || ""}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        platformIdOverrides: {
                          ...prev.platformIdOverrides,
                          incidentIo: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <HelpLabel
                    className="form-label small"
                    htmlFor="wrike-id"
                    text="Wrike Account ID"
                    helpKey="platformWrike"
                  />
                  <input
                    id="wrike-id"
                    className="form-control form-control-sm"
                    type="text"
                    placeholder="e.g., account-uuid"
                    value={formState.platformIdOverrides?.wrike || ""}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        platformIdOverrides: {
                          ...prev.platformIdOverrides,
                          wrike: event.target.value,
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminCard>
      <AdminCard
        id="clientManagement"
        title="Client management"
        description="Edit client details or remove inactive accounts."
        searchText="client management export import search filters region product environment"
      >
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
        {importError ? <p className="text-danger small mt-2 mb-0">{importError}</p> : null}
          <div className="admin-client-controls mt-3">
            <div className="admin-client-search">
            <HelpLabel
              className="form-label small mb-1"
              htmlFor="client-search"
              text="Search clients"
              helpKey="searchClients"
            />
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
              <HelpLabel
                className="filter-label"
                htmlFor="client-region-filter"
                text="Region"
                helpKey="filterRegion"
              />
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
              <HelpLabel
                className="filter-label"
                htmlFor="client-product-filter"
                text="Product"
                helpKey="filterProduct"
              />
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
              <HelpLabel
                className="filter-label"
                htmlFor="client-environment-filter"
                text="Environment"
                helpKey="filterEnvironment"
              />
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
      </AdminCard>
      <AdminCard
        id="platformIntegrations"
        title="Platform integrations"
        description="Configure API credentials and settings for Zendesk, Jira, Incident.io, and Wrike."
        searchText="platform integrations rate limiting requests per minute api key base url test connection zendesk jira incident io wrike"
      >
        <div className="border-bottom pb-4 mb-4">
          <h4 className="h6 mb-3">Rate limiting</h4>
          <div className="row g-3">
            <div className="col-md-6">
              <HelpLabel
                htmlFor="rate-limit-input"
                text="Requests per minute"
                helpKey="rateLimitRequests"
              />
              <input
                id="rate-limit-input"
                className="form-control"
                type="number"
                min="1"
                max="600"
                value={rateLimitConfig.requestsPerMinute}
                onChange={(event) =>
                    requestScrollRestore();
                    setRateLimitConfig((prev) => ({
                      ...prev,
                      requestsPerMinute: parseInt(event.target.value) || 60,
                    }))
                  }
                />
              <small className="text-body-secondary d-block mt-1">
                Limit requests to protect against rate limiting. Default: 60
              </small>
            </div>
            <div className="col-md-6">
              <div className="form-check mt-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="rate-limit-enabled"
                  checked={rateLimitConfig.enabled}
                  onChange={(event) =>
                    requestScrollRestore();
                    setRateLimitConfig((prev) => ({
                      ...prev,
                      enabled: event.target.checked,
                    }))
                  }
                />
                <label className="form-check-label" htmlFor="rate-limit-enabled">
                  <HelpInline text="Enable rate limiting" helpKey="rateLimitEnabled" />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          {Object.entries(platformConfigs).map(([platform, config_item]) => (
            <div key={platform} className="col-lg-6">
              <div className="border rounded-3 p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h5 className="h6 mb-0 text-capitalize">{platform}</h5>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id={`${platform}-enabled`}
                      checked={config_item.enabled}
                      onChange={(event) =>
                        requestScrollRestore();
                        setPlatformConfigs((prev) => ({
                          ...prev,
                          [platform]: { ...prev[platform], enabled: event.target.checked },
                        }))
                      }
                    />
                    <label className="form-check-label" htmlFor={`${platform}-enabled`}>
                      <HelpInline
                        text="Enabled"
                        helpKey="platformEnabled"
                        idSuffix={`${platform}-enabled`}
                      />
                    </label>
                  </div>
                </div>

                <div className="mb-3">
                  <HelpLabel
                    className="form-label small"
                    htmlFor={`${platform}-api-key`}
                    text="API Key"
                    helpKey="platformApiKey"
                  />
                  <input
                    id={`${platform}-api-key`}
                    className="form-control form-control-sm"
                    type="password"
                    placeholder="Enter API key"
                    value={config_item.apiKey}
                    onChange={(event) =>
                      requestScrollRestore();
                      setPlatformConfigs((prev) => ({
                        ...prev,
                        [platform]: {
                          ...prev[platform],
                          apiKey: event.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div className="mb-3">
                  <HelpLabel
                    className="form-label small"
                    htmlFor={`${platform}-base-url`}
                    text="Base URL"
                    helpKey="platformBaseUrl"
                  />
                  <input
                    id={`${platform}-base-url`}
                    className="form-control form-control-sm"
                    type="url"
                    placeholder="https://..."
                    value={config_item.baseUrl}
                    onChange={(event) =>
                      requestScrollRestore();
                      setPlatformConfigs((prev) => ({
                        ...prev,
                        [platform]: {
                          ...prev[platform],
                          baseUrl: event.target.value,
                        },
                      }))
                    }
                  />
                  <small className="text-body-secondary d-block mt-1">
                    {platform === "zendesk" && "e.g., https://your-domain.zendesk.com"}
                    {platform === "jira" && "e.g., https://your-domain.atlassian.net"}
                    {platform === "incidentIo" && "e.g., https://api.incident.io"}
                    {platform === "wrike" && "e.g., https://www.wrike.com/api/v4"}
                  </small>
                </div>

                <button
                  className="btn btn-outline-primary btn-sm w-100"
                  type="button"
                  disabled={!config_item.apiKey || !config_item.baseUrl || testingPlatform === platform}
                  onClick={() => handleTestConnection(platform)}
                >
                  {testingPlatform === platform ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Testing...
                    </>
                  ) : (
                    "Test connection"
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </AdminCard>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

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
