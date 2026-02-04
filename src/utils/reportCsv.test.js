import { describe, expect, it } from "vitest";
import { parseReportCsv, REPORT_SCHEMAS } from "./reportCsv.js";

const incidentsCsv = `"ID","Status","Severity","Impacted Client(s)","Root Cause Analysis Summary","Created At","Resolved at"
"18","Closed","P1","Vodacom Tanzania","Unknown (fix implemented by client)","2024-12-18T05:34:44.546Z","2024-12-18T11:37:12.854Z"
"24","Closed","P1","C24, Gnosis, Coverflex","","2024-12-19T12:23:35.135Z","2024-12-19T13:21:24.307Z"`;

describe("parseReportCsv", () => {
  it("parses the incidents CSV into structured records", () => {
    const records = parseReportCsv(incidentsCsv, REPORT_SCHEMAS.incidents);

    expect(records).toEqual([
      {
        id: "18",
        ticketStatus: "Closed",
        priority: "P1",
        organization: "Vodacom Tanzania",
        rcaSummary: "Unknown (fix implemented by client)",
        requested: "2024-12-18T05:34:44.546Z",
        resolvedAt: "2024-12-18T11:37:12.854Z",
        reportedAt: "",
      },
      {
        id: "24",
        ticketStatus: "Closed",
        priority: "P1",
        organization: "C24, Gnosis, Coverflex",
        rcaSummary: "",
        requested: "2024-12-19T12:23:35.135Z",
        resolvedAt: "2024-12-19T13:21:24.307Z",
        reportedAt: "",
      },
    ]);
  });

  it("parses the support tickets CSV into structured records", () => {
    const supportCsv = `"ID","Ticket status","Organization","Ticket Score","Ticket Criticality","Sentiment","Subject","Requested","Group","Priority","Associated Jira"
"1054618","Requires more info","D360","37","Critical","Slightly Negative","Customers Able to Exceed Daily POS/Online Limits","2025-11-02 17:52","[L2] Advanced Support","High","Yes"`;

    const records = parseReportCsv(supportCsv, REPORT_SCHEMAS["support-tickets"]);

    expect(records).toEqual([
      {
        id: "1054618",
        ticketStatus: "Requires more info",
        organization: "D360",
        criticality: "Critical",
        score: "37",
        sentiment: "Slightly Negative",
        subject: "Customers Able to Exceed Daily POS/Online Limits",
        requested: "2025-11-02 17:52",
        priority: "High",
        associatedJira: "Yes",
        group: "[L2] Advanced Support",
      },
    ]);
  });

  it("parses the JIRA CSV into structured records", () => {
    const jiraCsv = `"Summary","Issue key","Status","Priority","Created","Updated","Custom field (Client Name [ZD])"
"[DE Rollout] Mettle","TECH-834","Proposal","Normal","11/Nov/25 6:29 PM","10/Dec/25 10:19 AM","Mettle"`;

    const records = parseReportCsv(jiraCsv, REPORT_SCHEMAS.jiras);

    expect(records).toEqual([
      {
        id: "TECH-834",
        ticketStatus: "Proposal",
        priority: "Normal",
        requested: "11/Nov/25 6:29 PM",
        updated: "10/Dec/25 10:19 AM",
        organization: "Mettle",
      },
    ]);
  });
});
