import { describe, expect, it } from "vitest";
import { parseReportCsv } from "./reportCsv.js";

const sampleCsv = `"ID","Ticket status","Organization","Requester","Subject","Priority","SLA","Requested","Updated","Ticket form","Org Tier"
"1085566","Resolved - Awaiting Feedback","ICC Loyalty","Abhijit Awale","ALDAR - txns decline","High","","2026-01-07 20:03","2026-01-24 17:02","Service Incident","3. Preferred"
"1076938","Resolved - Awaiting Feedback","Ascend Group (True Money)","Warapon Leadlum","[SMC-8815] TrueMoney Mastercard transactions are High Reversal.","High","","2025-12-16 12:30","2026-01-25 03:02","Service Incident","2. Premier"
"1013494","Awaiting RCA","SBSA Virtual Card","Aaref Mia","Partial Outage of Transaction Processing - 26 August 2025","High","2025-09-05 19:30","2025-08-26 06:37","2025-12-27 10:06","Service Incident","1. Elite"
"981469","Resolved - Awaiting Feedback","DolarApp","Tomasz Jangrot","SimPos doesn't work from at least 5th June","High","","2025-06-26 20:36","2026-01-24 15:02","Service Incident","2. Premier"
"1080111","Awaiting RCA","Ascend Group (True Money)","jerawan banlue","SMC-8846 : TrueMoney Mastercard transactions are High Reversal. 23/12/2025 04:37 PM. (BKK Time) until the present time.","Urgent","2025-12-24 08:12","2025-12-23 12:04","2026-01-22 13:02","Service Incident","2. Premier"
"1080110","Awaiting RCA","Mukuru","Brandon Matthee","ATM Non-Disbursement of Funds , POS transactions declining 23Dec25","Urgent","2025-12-23 16:03","2025-12-23 12:03","2026-01-22 13:02","Service Incident","1. Elite"
"1080094","Awaiting RCA","Wave Senegal","Integrationops","High rate of API Errors","Urgent","2025-12-30 11:51","2025-12-23 11:50","2026-01-22 12:02","Service Incident","4. Standard"
"1080066","Resolved - Awaiting Feedback","Orange Botswana","SSPO Incident Management","[OM ADDON][OBW][TOC 2512O09457]","Urgent","","2025-12-23 11:29","2026-01-22 12:02","Service Incident","1. Elite"`;

describe("parseReportCsv", () => {
  it("parses the sample CSV into structured records", () => {
    const records = parseReportCsv(sampleCsv);

    expect(records).toEqual([
      {
        id: "1085566",
        ticketStatus: "Resolved - Awaiting Feedback",
        organization: "ICC Loyalty",
        requester: "Abhijit Awale",
        subject: "ALDAR - txns decline",
        priority: "High",
        sla: "",
        requested: "2026-01-07 20:03",
        updated: "2026-01-24 17:02",
        ticketForm: "Service Incident",
        orgTier: "3. Preferred",
      },
      {
        id: "1076938",
        ticketStatus: "Resolved - Awaiting Feedback",
        organization: "Ascend Group (True Money)",
        requester: "Warapon Leadlum",
        subject: "[SMC-8815] TrueMoney Mastercard transactions are High Reversal.",
        priority: "High",
        sla: "",
        requested: "2025-12-16 12:30",
        updated: "2026-01-25 03:02",
        ticketForm: "Service Incident",
        orgTier: "2. Premier",
      },
      {
        id: "1013494",
        ticketStatus: "Awaiting RCA",
        organization: "SBSA Virtual Card",
        requester: "Aaref Mia",
        subject: "Partial Outage of Transaction Processing - 26 August 2025",
        priority: "High",
        sla: "2025-09-05 19:30",
        requested: "2025-08-26 06:37",
        updated: "2025-12-27 10:06",
        ticketForm: "Service Incident",
        orgTier: "1. Elite",
      },
      {
        id: "981469",
        ticketStatus: "Resolved - Awaiting Feedback",
        organization: "DolarApp",
        requester: "Tomasz Jangrot",
        subject: "SimPos doesn't work from at least 5th June",
        priority: "High",
        sla: "",
        requested: "2025-06-26 20:36",
        updated: "2026-01-24 15:02",
        ticketForm: "Service Incident",
        orgTier: "2. Premier",
      },
      {
        id: "1080111",
        ticketStatus: "Awaiting RCA",
        organization: "Ascend Group (True Money)",
        requester: "jerawan banlue",
        subject:
          "SMC-8846 : TrueMoney Mastercard transactions are High Reversal. 23/12/2025 04:37 PM. (BKK Time) until the present time.",
        priority: "Urgent",
        sla: "2025-12-24 08:12",
        requested: "2025-12-23 12:04",
        updated: "2026-01-22 13:02",
        ticketForm: "Service Incident",
        orgTier: "2. Premier",
      },
      {
        id: "1080110",
        ticketStatus: "Awaiting RCA",
        organization: "Mukuru",
        requester: "Brandon Matthee",
        subject: "ATM Non-Disbursement of Funds , POS transactions declining 23Dec25",
        priority: "Urgent",
        sla: "2025-12-23 16:03",
        requested: "2025-12-23 12:03",
        updated: "2026-01-22 13:02",
        ticketForm: "Service Incident",
        orgTier: "1. Elite",
      },
      {
        id: "1080094",
        ticketStatus: "Awaiting RCA",
        organization: "Wave Senegal",
        requester: "Integrationops",
        subject: "High rate of API Errors",
        priority: "Urgent",
        sla: "2025-12-30 11:51",
        requested: "2025-12-23 11:50",
        updated: "2026-01-22 12:02",
        ticketForm: "Service Incident",
        orgTier: "4. Standard",
      },
      {
        id: "1080066",
        ticketStatus: "Resolved - Awaiting Feedback",
        organization: "Orange Botswana",
        requester: "SSPO Incident Management",
        subject: "[OM ADDON][OBW][TOC 2512O09457]",
        priority: "Urgent",
        sla: "",
        requested: "2025-12-23 11:29",
        updated: "2026-01-22 12:02",
        ticketForm: "Service Incident",
        orgTier: "1. Elite",
      },
    ]);
  });
});
