const INCIDENT_REQUIRED_HEADERS = [
  "ID",
  "Status",
  "Severity",
  "Impacted Client(s)",
  "Root Cause Analysis Summary",
  "Created At",
  "Resolved at",
];

const INCIDENT_HEADER_KEY_MAP = {
  id: "ID",
  ticketStatus: "Status",
  priority: "Severity",
  organization: "Impacted Client(s)",
  rcaSummary: "Root Cause Analysis Summary",
  requested: "Created At",
  resolvedAt: "Resolved at",
  reportedAt: "Reported at",
};

const SUPPORT_TICKET_REQUIRED_HEADERS = [
  "ID",
  "Ticket status",
  "Organization",
  "Ticket Criticality",
  "Ticket Score",
  "Sentiment",
  "Subject",
  "Requested",
  "Priority",
];

const SUPPORT_TICKET_HEADER_KEY_MAP = {
  id: "ID",
  ticketStatus: "Ticket status",
  organization: "Organization",
  criticality: "Ticket Criticality",
  score: "Ticket Score",
  sentiment: "Sentiment",
  subject: "Subject",
  requested: "Requested",
  priority: "Priority",
  associatedJira: "Associated Jira",
  group: "Group",
};

const JIRA_REQUIRED_HEADERS = ["Issue key", "Status", "Priority", "Created", "Updated"];

const JIRA_HEADER_KEY_MAP = {
  id: "Issue key",
  ticketStatus: "Status",
  priority: "Priority",
  requested: "Created",
  updated: "Updated",
  organization: [
    "Custom field (Client Name [ZD])",
    "Custom field (Client name)",
    "Custom field (Client)",
    "Custom field (Client Name)",
    "Custom field (Client)",
    "Project name",
  ],
};

const parseCsvLine = (line) => {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
};

const normalizeRows = (csvText) =>
  csvText
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

export const parseReportCsv = (csvText, schema) => {
  if (!schema) {
    throw new Error("CSV schema is required.");
  }
  const expectedHeaders = schema.headers;
  const requiredHeaders = schema.requiredHeaders || [];
  const headerKeyMap = schema.keyMap;
  const rows = normalizeRows(csvText);
  if (rows.length === 0) {
    return [];
  }

  const headerValues = parseCsvLine(rows[0]).map((value) => value.trim());
  if (expectedHeaders && !requiredHeaders.length) {
    const headerKey = headerValues.join("|");
    const expectedKey = expectedHeaders.join("|");
    if (headerKey !== expectedKey) {
      throw new Error("CSV headers do not match the expected template.");
    }
  }

  if (requiredHeaders.length) {
    const missing = requiredHeaders.filter((header) => !headerValues.includes(header));
    if (missing.length) {
      throw new Error("CSV headers do not match the expected template.");
    }
  }

  const indexMap = headerValues.reduce((acc, header, index) => {
    acc[header] = index;
    return acc;
  }, {});

  return rows.slice(1).map((row) => {
    const values = parseCsvLine(row);
    return Object.entries(headerKeyMap).reduce((acc, [sourceKey, headerName]) => {
      if (Array.isArray(headerName)) {
        const resolvedHeader = headerName.find((candidate) => candidate in indexMap);
        acc[sourceKey] = resolvedHeader ? values[indexMap[resolvedHeader]] ?? "" : "";
        return acc;
      }
      const index = indexMap[headerName];
      acc[sourceKey] = index !== undefined ? values[index] ?? "" : "";
      return acc;
    }, {});
  });
};

export const mergeReportRecords = (existingRecords, incomingRecords, importedAt) => {
  const timestamp = importedAt || new Date().toISOString();
  const recordMap = new Map(
    (existingRecords || []).map((record) => [record.id, record])
  );

  incomingRecords.forEach((incoming) => {
    const existing = recordMap.get(incoming.id);

    if (!existing) {
      recordMap.set(incoming.id, {
        ...incoming,
        history: {},
      });
      return;
    }

    const history = { ...existing.history };
    const updatedRecord = { ...existing, ...incoming, history };

    Object.entries(incoming).forEach(([field, value]) => {
      if (field === "id") {
        return;
      }
      const previous = existing[field] ?? "";
      if (previous !== value) {
        const fieldHistory = history[field] ? [...history[field]] : [];
        fieldHistory.push({ from: previous, to: value, changedAt: timestamp });
        history[field] = fieldHistory;
      }
    });

    recordMap.set(incoming.id, updatedRecord);
  });

  return Array.from(recordMap.values());
};

export const REPORT_SCHEMAS = {
  incidents: {
    requiredHeaders: INCIDENT_REQUIRED_HEADERS,
    keyMap: INCIDENT_HEADER_KEY_MAP,
  },
  jiras: {
    requiredHeaders: JIRA_REQUIRED_HEADERS,
    keyMap: JIRA_HEADER_KEY_MAP,
  },
  "product-requests": {
    requiredHeaders: INCIDENT_REQUIRED_HEADERS,
    keyMap: INCIDENT_HEADER_KEY_MAP,
  },
  "implementation-requests": {
    requiredHeaders: INCIDENT_REQUIRED_HEADERS,
    keyMap: INCIDENT_HEADER_KEY_MAP,
  },
  "support-tickets": {
    requiredHeaders: SUPPORT_TICKET_REQUIRED_HEADERS,
    keyMap: SUPPORT_TICKET_HEADER_KEY_MAP,
  },
};
