const EXPECTED_HEADERS = [
  "ID",
  "Ticket status",
  "Organization",
  "Requester",
  "Subject",
  "Priority",
  "SLA",
  "Requested",
  "Updated",
  "Ticket form",
  "Org Tier",
];

const HEADER_KEY_MAP = {
  ID: "id",
  "Ticket status": "ticketStatus",
  Organization: "organization",
  Requester: "requester",
  Subject: "subject",
  Priority: "priority",
  SLA: "sla",
  Requested: "requested",
  Updated: "updated",
  "Ticket form": "ticketForm",
  "Org Tier": "orgTier",
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

export const parseReportCsv = (csvText) => {
  const rows = normalizeRows(csvText);
  if (rows.length === 0) {
    return [];
  }

  const headerValues = parseCsvLine(rows[0]).map((value) => value.trim());
  const headerKey = headerValues.join("|");
  const expectedKey = EXPECTED_HEADERS.join("|");

  if (headerKey !== expectedKey) {
    throw new Error("CSV headers do not match the expected template.");
  }

  return rows.slice(1).map((row) => {
    const values = parseCsvLine(row);
    return EXPECTED_HEADERS.reduce((acc, header, index) => {
      const key = HEADER_KEY_MAP[header];
      acc[key] = values[index] ?? "";
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

export const REPORT_HEADERS = EXPECTED_HEADERS;
