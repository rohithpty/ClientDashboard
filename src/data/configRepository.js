const STORAGE_KEY = "rag-admin-config";

export const DEFAULT_SCORING_CONFIG = {
  enabledCards: {
    tickets: true,
    jiras: true,
    incidents: true,
    requests: true,
  },
  clientStatusRollup: "worst",
  rollupMode: "weighted",
  weights: {
    tickets: 0.3,
    incidents: 0.3,
    jiras: 0.2,
    requests: 0.2,
  },
  statusMapping: {
    tickets: {
      open: ["New", "Open", "On-hold", "Escalated Internally", "Requires more info"],
      closed: ["Solved", "Closed", "Resolved"],
    },
    incidents: {
      open: ["Open", "Investigating", "Monitoring", "Mitigating", "Identified"],
      closed: ["Resolved", "Closed", "Canceled"],
    },
    jiras: {
      open: ["To Do", "In Progress", "Blocked", "In Review", "Testing", "Proposal"],
      closed: ["Done", "Resolved", "Closed"],
    },
    requests: {
      open: ["Open", "In Progress", "Pending", "On hold"],
      closed: ["Completed", "Closed", "Resolved", "Done"],
    },
  },
  statusOptions: {
    tickets: {
      open: ["New", "Open", "On-hold", "Escalated Internally", "Requires more info"],
      closed: ["Solved", "Closed", "Resolved"],
    },
    incidents: {
      open: ["Open", "Investigating", "Monitoring", "Mitigating", "Identified"],
      closed: ["Resolved", "Closed", "Canceled"],
    },
    jiras: {
      open: ["To Do", "In Progress", "Blocked", "In Review", "Testing", "Proposal"],
      closed: ["Done", "Resolved", "Closed"],
    },
    requests: {
      open: ["Open", "In Progress", "Pending", "On hold"],
      closed: ["Completed", "Closed", "Resolved", "Done"],
    },
  },
  useFields: {
    tickets: {
      criticality: true,
      score: false,
      sentiment: false,
    },
    incidents: {
      severity: true,
      rca: true,
    },
    jiras: {
      priority: true,
    },
  },
  thresholds: {
    tickets: {
      red: { criticalOpen: 1, over60d: 1 },
      amber: { over30d: 1, over7d: 3, highOpen: 2 },
    },
    jiras: {
      red: { criticalOver14d: 1 },
      amber: { highOver30d: 1, over7d: 5 },
    },
    requests: {
      red: { over60d: 1 },
      amber: { over30d: 1, over7d: 3 },
    },
  },
  incidents: {
    windowDays: 30,
    countOpenOnly: true,
    priorityThresholds: {
      red: { p1Count: 1 },
      amber: { p2Count: 1 },
    },
    ageThresholds: {
      red: { over60d: 1 },
      amber: { over30d: 1, over7d: 2 },
    },
  },
  scoringBands: { red: 70, amber: 35 },
  caps: { perBucket: 5 },
};

const defaultConfig = {
  regions: ["APAC", "Europe", "Africa", "MEA", "Americas"],
  environments: ["Production", "Staging", "UAT", "Sandbox"],
  products: ["VoucherEngine", "Banking.Live"],
  technicalAccountManagers: ["Ava Hart", "Jordan Lee", "Morgan Blake"],
  accountManagers: ["Logan Price", "Riley Chen"],
  platformIntegrations: {
    zendesk: {
      apiKey: "",
      baseUrl: "https://your-domain.zendesk.com",
      enabled: false,
    },
    jira: {
      apiKey: "",
      baseUrl: "https://your-domain.atlassian.net",
      enabled: false,
    },
    incidentIo: {
      apiKey: "",
      baseUrl: "https://api.incident.io",
      enabled: false,
    },
    wrike: {
      apiKey: "",
      baseUrl: "https://www.wrike.com/api/v4",
      enabled: false,
    },
  },
  rateLimiting: {
    requestsPerMinute: 60,
    enabled: true,
  },
  scoringConfig: DEFAULT_SCORING_CONFIG,
};

const safeParse = (stored) => {
  if (!stored) {
    return null;
  }
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.warn("Failed to parse stored admin config.", error);
    return null;
  }
};

const normalizeList = (list, fallback) =>
  Array.isArray(list) && list.length > 0 ? list : fallback;

export const localConfigRepository = {
  getConfig() {
    const parsed = safeParse(localStorage.getItem(STORAGE_KEY));
    if (!parsed) {
      return defaultConfig;
    }
    const scoringConfig = parsed.scoringConfig || defaultConfig.scoringConfig;
    const statusOptions =
      scoringConfig.statusOptions ||
      defaultConfig.scoringConfig.statusOptions ||
      scoringConfig.statusMapping;
    const mergedStatusMapping = {
      ...defaultConfig.scoringConfig.statusMapping,
      ...(scoringConfig.statusMapping || {}),
    };
    const mergedStatusOptions = {
      ...defaultConfig.scoringConfig.statusOptions,
      ...(statusOptions || {}),
    };
    const mergedThresholds = {
      ...defaultConfig.scoringConfig.thresholds,
      ...(scoringConfig.thresholds || {}),
      tickets: {
        ...defaultConfig.scoringConfig.thresholds.tickets,
        ...(scoringConfig.thresholds?.tickets || {}),
      },
      jiras: {
        ...defaultConfig.scoringConfig.thresholds.jiras,
        ...(scoringConfig.thresholds?.jiras || {}),
      },
      requests: {
        ...defaultConfig.scoringConfig.thresholds.requests,
        ...(scoringConfig.thresholds?.requests || {}),
      },
    };
    const mergedEnabledCards = {
      ...defaultConfig.scoringConfig.enabledCards,
      ...(scoringConfig.enabledCards || {}),
    };
    const mergedWeights = {
      ...defaultConfig.scoringConfig.weights,
      ...(scoringConfig.weights || {}),
    };
    const mergedIncidents = {
      ...defaultConfig.scoringConfig.incidents,
      ...(scoringConfig.incidents || {}),
      priorityThresholds: {
        ...defaultConfig.scoringConfig.incidents.priorityThresholds,
        ...(scoringConfig.incidents?.priorityThresholds || {}),
        red: {
          ...defaultConfig.scoringConfig.incidents.priorityThresholds.red,
          ...(scoringConfig.incidents?.priorityThresholds?.red || {}),
        },
        amber: {
          ...defaultConfig.scoringConfig.incidents.priorityThresholds.amber,
          ...(scoringConfig.incidents?.priorityThresholds?.amber || {}),
        },
      },
      ageThresholds: {
        ...defaultConfig.scoringConfig.incidents.ageThresholds,
        ...(scoringConfig.incidents?.ageThresholds || {}),
        red: {
          ...defaultConfig.scoringConfig.incidents.ageThresholds.red,
          ...(scoringConfig.incidents?.ageThresholds?.red || {}),
        },
        amber: {
          ...defaultConfig.scoringConfig.incidents.ageThresholds.amber,
          ...(scoringConfig.incidents?.ageThresholds?.amber || {}),
        },
      },
    };
    return {
      regions: normalizeList(parsed.regions, defaultConfig.regions),
      environments: normalizeList(parsed.environments, defaultConfig.environments),
      products: normalizeList(parsed.products, defaultConfig.products),
      technicalAccountManagers: normalizeList(
        parsed.technicalAccountManagers,
        defaultConfig.technicalAccountManagers,
      ),
      accountManagers: normalizeList(parsed.accountManagers, defaultConfig.accountManagers),
      platformIntegrations: parsed.platformIntegrations || defaultConfig.platformIntegrations,
      rateLimiting: parsed.rateLimiting || defaultConfig.rateLimiting,
      scoringConfig: {
        ...defaultConfig.scoringConfig,
        ...scoringConfig,
        enabledCards: mergedEnabledCards,
        weights: mergedWeights,
        thresholds: mergedThresholds,
        incidents: mergedIncidents,
        statusMapping: mergedStatusMapping,
        statusOptions: mergedStatusOptions,
      },
    };
  },
  saveConfig(config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  },
};
