import { mergeReportRecords, parseReportCsv, REPORT_SCHEMAS } from "../utils/reportCsv.js";

const STORAGE_PREFIX = "csvReports:";

export const REPORT_TYPES = [
  "incidents",
  "support-tickets",
  "jiras",
  "product-requests",
  "implementation-requests",
];

const buildStorageKey = (type) => `${STORAGE_PREFIX}${type}`;

export const getReportData = (type) => {
  if (!REPORT_TYPES.includes(type)) {
    throw new Error(`Unknown report type: ${type}`);
  }
  const stored = localStorage.getItem(buildStorageKey(type));
  if (!stored) {
    return { records: [], lastImportedAt: null };
  }
  try {
    const parsed = JSON.parse(stored);
    return {
      records: Array.isArray(parsed.records) ? parsed.records : [],
      lastImportedAt: parsed.lastImportedAt ?? null,
    };
  } catch (error) {
    return { records: [], lastImportedAt: null };
  }
};

export const saveReportData = (type, data) => {
  localStorage.setItem(buildStorageKey(type), JSON.stringify(data));
};

export const importReportCsv = (type, csvText) => {
  const schema = REPORT_SCHEMAS[type];
  if (!schema) {
    throw new Error(`No CSV schema configured for ${type}.`);
  }
  const parsedRecords = parseReportCsv(csvText, schema);
  const existing = getReportData(type);
  const mergedRecords = mergeReportRecords(existing.records, parsedRecords);
  const payload = {
    records: mergedRecords,
    lastImportedAt: new Date().toISOString(),
  };
  saveReportData(type, payload);
  return payload;
};
