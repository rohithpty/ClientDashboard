const normalizeText = (value) => (value ?? "").toString().trim().toLowerCase();

const parseDate = (value) => {
  if (!value) {
    return null;
  }
  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const ageInDays = (value) => {
  const date = parseDate(value);
  if (!date) {
    return null;
  }
  return Math.floor((Date.now() - date.getTime()) / 86400000);
};

const toList = (value) =>
  (value ?? "")
    .toString()
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const inList = (value, list) => list.some((item) => normalizeText(item) === normalizeText(value));

const isOpenStatus = (status, mapping) => {
  if (!status) {
    return true;
  }
  if (mapping?.closed?.length && inList(status, mapping.closed)) {
    return false;
  }
  if (mapping?.open?.length && inList(status, mapping.open)) {
    return true;
  }
  return true;
};

const normalizePriority = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }
  if (normalized.startsWith("p1") || normalized.includes("critical")) {
    return "critical";
  }
  if (normalized.startsWith("p2") || normalized.includes("high")) {
    return "high";
  }
  if (normalized.startsWith("p3") || normalized.includes("medium")) {
    return "medium";
  }
  if (normalized.startsWith("p4") || normalized.includes("low")) {
    return "low";
  }
  return normalized;
};

const normalizeIncidentSeverity = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }
  if (normalized.includes("p1") || normalized.includes("critical")) {
    return "p1";
  }
  if (normalized.includes("p2") || normalized.includes("high")) {
    return "p2";
  }
  if (normalized.includes("p3") || normalized.includes("medium")) {
    return "p3";
  }
  if (normalized.includes("p4") || normalized.includes("low")) {
    return "p4";
  }
  return "";
};

const cap = (value, limit) => Math.min(value, limit);

const summarizeReasons = (reasons, fallback) => (reasons.length ? reasons[0] : fallback);

const buildNoData = () => ({ status: "Green", score: 0, reason: "No data" });

const computeTicketsScore = (records, config) => {
  if (!records.length) {
    return buildNoData();
  }

  const { thresholds, scoringBands, caps, statusMapping, useFields } = config;
  const limit = caps?.perBucket ?? 5;
  let over7 = 0;
  let over30 = 0;
  let over60 = 0;
  let criticalOpen = 0;
  let highOpen = 0;
  let openCount = 0;

  records.forEach((record) => {
    if (!isOpenStatus(record.ticketStatus, statusMapping.tickets)) {
      return;
    }
    openCount += 1;

    const age = ageInDays(record.requested);
    if (age !== null) {
      if (age > 7) {
        over7 += 1;
      }
      if (age > 30) {
        over30 += 1;
      }
      if (age > 60) {
        over60 += 1;
      }
    }

    const priority = normalizePriority(record.priority);
    if (priority === "high") {
      highOpen += 1;
    }

    if (useFields.tickets.criticality) {
      const criticality = normalizePriority(record.criticality);
      if (criticality === "critical") {
        criticalOpen += 1;
      }
    }
  });

  const reasons = [];
  if (criticalOpen >= thresholds.tickets.red.criticalOpen) {
    reasons.push("Red: critical ticket open");
  }
  if (over60 >= thresholds.tickets.red.over60d) {
    reasons.push("Red: ticket >60d");
  }

  if (reasons.length) {
    return {
      status: "Red",
      score: 100,
      reason: summarizeReasons(reasons),
      counts: { over7, over30, over60, criticalOpen, highOpen, openCount },
    };
  }

  if (over30 >= thresholds.tickets.amber.over30d) {
    reasons.push("Amber: ticket >30d");
  }
  if (over7 >= thresholds.tickets.amber.over7d) {
    reasons.push("Amber: tickets >7d");
  }
  if (highOpen >= thresholds.tickets.amber.highOpen) {
    reasons.push("Amber: high priority open");
  }

  const score =
    2 * cap(over7, limit) +
    4 * cap(over30, limit) +
    6 * cap(over60, limit) +
    4 * cap(highOpen, limit) +
    6 * cap(criticalOpen, limit);

  if (reasons.length) {
    return {
      status: "Amber",
      score,
      reason: summarizeReasons(reasons),
      counts: { over7, over30, over60, criticalOpen, highOpen, openCount },
    };
  }

  if (score >= scoringBands.red) {
    return { status: "Red", score, reason: "Red: score threshold", counts: { over7, over30, over60, criticalOpen, highOpen, openCount } };
  }
  if (score >= scoringBands.amber) {
    return { status: "Amber", score, reason: "Amber: score threshold", counts: { over7, over30, over60, criticalOpen, highOpen, openCount } };
  }

  return {
    status: "Green",
    score,
    reason: "Green: within thresholds",
    counts: { over7, over30, over60, criticalOpen, highOpen, openCount },
  };
};

const computeIncidentsScore = (records, config) => {
  if (!records.length) {
    return buildNoData();
  }

  const { scoringBands, caps, statusMapping, useFields } = config;
  const incidentConfig = config.incidents || {};
  const limit = caps?.perBucket ?? 5;
  const windowDays = incidentConfig.windowDays ?? 30;
  const countOpenOnly = incidentConfig.countOpenOnly ?? true;
  const priorityThresholds = incidentConfig.priorityThresholds || {};
  const ageThresholds = incidentConfig.ageThresholds || {};
  let over7 = 0;
  let over30 = 0;
  let over60 = 0;
  let openCount = 0;
  let p1Count = 0;
  let p2Count = 0;
  let p3Count = 0;
  let p4Count = 0;

  const now = Date.now();

  records.forEach((record) => {
    const isOpen = isOpenStatus(record.ticketStatus, statusMapping.incidents);
    if (countOpenOnly && !isOpen) {
      return;
    }

    const incidentDate = parseDate(record.requested || record.reportedAt);
    if (windowDays && incidentDate) {
      const ageWindow = Math.floor((now - incidentDate.getTime()) / 86400000);
      if (ageWindow > windowDays) {
        return;
      }
    }

    openCount += 1;

    if (useFields?.incidents?.severity !== false) {
      const severity = normalizeIncidentSeverity(record.priority);
      if (severity === "p1") {
        p1Count += 1;
      } else if (severity === "p2") {
        p2Count += 1;
      } else if (severity === "p3") {
        p3Count += 1;
      } else if (severity === "p4") {
        p4Count += 1;
      }
    }

    const age = ageInDays(record.requested || record.reportedAt);
    if (age !== null) {
      if (age > 7) {
        over7 += 1;
      }
      if (age > 30) {
        over30 += 1;
      }
      if (age > 60) {
        over60 += 1;
      }
    }
  });

  const reasons = [];
  if (
    (priorityThresholds.red?.p1Count ?? 0) > 0 &&
    p1Count >= (priorityThresholds.red?.p1Count ?? 0)
  ) {
    reasons.push("Red: P1 incidents");
  }
  if (
    (ageThresholds.red?.over60d ?? 0) > 0 &&
    over60 >= (ageThresholds.red?.over60d ?? 0)
  ) {
    reasons.push("Red: incidents >60d");
  }

  if (reasons.length) {
    return {
      status: "Red",
      score: 100,
      reason: summarizeReasons(reasons),
      counts: { over7, over30, over60, p1Count, p2Count, p3Count, p4Count, openCount },
    };
  }

  if (
    (priorityThresholds.amber?.p2Count ?? 0) > 0 &&
    p2Count >= (priorityThresholds.amber?.p2Count ?? 0)
  ) {
    reasons.push("Amber: P2 incidents");
  }
  if (
    (ageThresholds.amber?.over7d ?? 0) > 0 &&
    over7 >= (ageThresholds.amber?.over7d ?? 0)
  ) {
    reasons.push("Amber: incidents >7d");
  }
  if (
    (ageThresholds.amber?.over30d ?? 0) > 0 &&
    over30 >= (ageThresholds.amber?.over30d ?? 0)
  ) {
    reasons.push("Amber: incidents >30d");
  }

  const score =
    4 * cap(over7, limit) +
    7 * cap(over30, limit) +
    9 * cap(over60, limit) +
    10 * cap(p1Count, limit) +
    7 * cap(p2Count, limit) +
    5 * cap(p3Count, limit) +
    3 * cap(p4Count, limit);

  if (reasons.length) {
    return {
      status: "Amber",
      score,
      reason: summarizeReasons(reasons),
      counts: { over7, over30, over60, p1Count, p2Count, p3Count, p4Count, openCount },
    };
  }

  if (score >= scoringBands.red) {
    return {
      status: "Red",
      score,
      reason: "Red: score threshold",
      counts: { over7, over30, over60, p1Count, p2Count, p3Count, p4Count, openCount },
    };
  }
  if (score >= scoringBands.amber) {
    return {
      status: "Amber",
      score,
      reason: "Amber: score threshold",
      counts: { over7, over30, over60, p1Count, p2Count, p3Count, p4Count, openCount },
    };
  }

  return {
    status: "Green",
    score,
    reason: "Green: within thresholds",
    counts: { over7, over30, over60, p1Count, p2Count, p3Count, p4Count, openCount },
  };
};

const computeJiraScore = (records, config) => {
  if (!records.length) {
    return buildNoData();
  }

  const { thresholds, scoringBands, caps, statusMapping } = config;
  const limit = caps?.perBucket ?? 5;
  let over7 = 0;
  let criticalOver14d = 0;
  let highOver30d = 0;
  let openCount = 0;

  records.forEach((record) => {
    if (!isOpenStatus(record.ticketStatus, statusMapping.jiras)) {
      return;
    }
    openCount += 1;

    const age = ageInDays(record.requested);
    if (age !== null) {
      if (age > 7) {
        over7 += 1;
      }
    }

    const priority = normalizePriority(record.priority);
    if (priority === "critical" && age !== null && age > 14) {
      criticalOver14d += 1;
    }
    if (priority === "high" && age !== null && age > 30) {
      highOver30d += 1;
    }
  });

  const reasons = [];
  if (criticalOver14d >= thresholds.jiras.red.criticalOver14d) {
    reasons.push("Red: critical >14d");
  }

  if (reasons.length) {
    return {
      status: "Red",
      score: 100,
      reason: summarizeReasons(reasons),
      counts: { over7, criticalOver14d, highOver30d, openCount },
    };
  }

  if (highOver30d >= thresholds.jiras.amber.highOver30d) {
    reasons.push("Amber: high >30d");
  }
  if (over7 >= thresholds.jiras.amber.over7d) {
    reasons.push("Amber: open >7d");
  }

  const score =
    3 * cap(over7, limit) +
    7 * cap(criticalOver14d, limit) +
    4 * cap(highOver30d, limit);

  if (reasons.length) {
    return {
      status: "Amber",
      score,
      reason: summarizeReasons(reasons),
      counts: { over7, criticalOver14d, highOver30d, openCount },
    };
  }

  if (score >= scoringBands.red) {
    return { status: "Red", score, reason: "Red: score threshold", counts: { over7, criticalOver14d, highOver30d, openCount } };
  }
  if (score >= scoringBands.amber) {
    return { status: "Amber", score, reason: "Amber: score threshold", counts: { over7, criticalOver14d, highOver30d, openCount } };
  }

  return {
    status: "Green",
    score,
    reason: "Green: within thresholds",
    counts: { over7, criticalOver14d, highOver30d, openCount },
  };
};

const computeRequestsScore = (records, config) => {
  if (!records.length) {
    return buildNoData();
  }

  const { thresholds, scoringBands, caps, statusMapping } = config;
  const limit = caps?.perBucket ?? 5;
  let over7 = 0;
  let over30 = 0;
  let over60 = 0;
  let openCount = 0;

  records.forEach((record) => {
    const isOpen = statusMapping?.requests
      ? isOpenStatus(record.ticketStatus, statusMapping.requests)
      : true;
    if (!isOpen) {
      return;
    }
    openCount += 1;

    const age = ageInDays(record.requested || record.createdAt || record.reportedAt);
    if (age !== null) {
      if (age > 7) {
        over7 += 1;
      }
      if (age > 30) {
        over30 += 1;
      }
      if (age > 60) {
        over60 += 1;
      }
    }
  });

  const reasons = [];
  if (over60 >= thresholds.requests.red.over60d) {
    reasons.push("Red: requests >60d");
  }

  if (reasons.length) {
    return {
      status: "Red",
      score: 100,
      reason: summarizeReasons(reasons),
      counts: { over7, over30, over60, openCount },
    };
  }

  if (over30 >= thresholds.requests.amber.over30d) {
    reasons.push("Amber: requests >30d");
  }
  if (over7 >= thresholds.requests.amber.over7d) {
    reasons.push("Amber: requests >7d");
  }

  const score =
    2 * cap(over7, limit) +
    4 * cap(over30, limit) +
    6 * cap(over60, limit);

  if (reasons.length) {
    return {
      status: "Amber",
      score,
      reason: summarizeReasons(reasons),
      counts: { over7, over30, over60, openCount },
    };
  }

  if (score >= scoringBands.red) {
    return {
      status: "Red",
      score,
      reason: "Red: score threshold",
      counts: { over7, over30, over60, openCount },
    };
  }
  if (score >= scoringBands.amber) {
    return {
      status: "Amber",
      score,
      reason: "Amber: score threshold",
      counts: { over7, over30, over60, openCount },
    };
  }

  return {
    status: "Green",
    score,
    reason: "Green: within thresholds",
    counts: { over7, over30, over60, openCount },
  };
};

export const matchClientRecord = (recordOrg, client) => {
  const candidateNames = [client.name, ...(client.aliases ?? [])]
    .map((value) => value?.trim())
    .filter(Boolean);
  if (!recordOrg) {
    return false;
  }
  const orgs = toList(recordOrg);
  return orgs.some((org) =>
    candidateNames.some((candidate) => normalizeText(candidate) === normalizeText(org)),
  );
};

export const computeClientScores = ({ client, tickets = [], incidents = [], jiras = [], requests = [], config }) => {
  const ticketsForClient = tickets.filter((record) => matchClientRecord(record.organization, client));
  const incidentsForClient = incidents.filter((record) => matchClientRecord(record.organization, client));
  const jirasForClient = jiras.filter((record) => matchClientRecord(record.organization, client));
  const requestsForClient = requests.filter((record) => matchClientRecord(record.organization, client));

  const scores = {
    tickets: computeTicketsScore(ticketsForClient, config),
    incidents: computeIncidentsScore(incidentsForClient, config),
    jiras: computeJiraScore(jirasForClient, config),
    requests: computeRequestsScore(requestsForClient, config),
  };

  return scores;
};

const statusToScore = (status) => (status === "Red" ? 100 : status === "Amber" ? 55 : 0);

export const rollupClientStatusWeighted = (scores, config) => {
  const weights = config.weights || {};
  const enabledCards = config.enabledCards || {};
  const entries = Object.entries(scores).filter(([key]) => enabledCards[key]);

  if (!entries.length) {
    return "Green";
  }

  const totalScore = entries.reduce((acc, [key, value]) => {
    const weight = weights[key] ?? 0;
    return acc + weight * (value.score ?? statusToScore(value.status));
  }, 0);

  if (totalScore >= config.scoringBands.red) {
    return "Red";
  }
  if (totalScore >= config.scoringBands.amber) {
    return "Amber";
  }
  return "Green";
};

export const rollupClientStatus = (scores, config) => {
  if (config.rollupMode === "weighted") {
    return rollupClientStatusWeighted(scores, config);
  }
  const statuses = Object.entries(scores)
    .filter(([key]) => config.enabledCards[key])
    .map(([, value]) => value.status);

  if (statuses.includes("Red")) {
    return "Red";
  }
  if (statuses.includes("Amber")) {
    return "Amber";
  }
  return "Green";
};
