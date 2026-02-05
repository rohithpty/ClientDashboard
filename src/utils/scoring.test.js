import { describe, expect, it } from "vitest";
import { computeClientScores, rollupClientStatus } from "./scoring.js";

const baseClient = {
  id: "client-1",
  name: "D360",
  aliases: [],
};

const config = {
  enabledCards: { tickets: true, jiras: true, incidents: true, requests: true },
  rollupMode: "weighted",
  weights: { tickets: 0.3, incidents: 0.3, jiras: 0.2, requests: 0.2 },
  statusMapping: {
    tickets: { open: ["Open"], closed: ["Closed"] },
    incidents: { open: ["Open"], closed: ["Closed"] },
    jiras: { open: ["In Progress", "Proposal"], closed: ["Done"] },
    requests: { open: ["Open"], closed: ["Closed"] },
  },
  useFields: {
    tickets: { criticality: true, score: false, sentiment: false },
    incidents: { severity: true, rca: true },
    jiras: { priority: true },
  },
  thresholds: {
    tickets: { red: { criticalOpen: 1, over60d: 1 }, amber: { over30d: 1, over7d: 3, highOpen: 2 } },
    jiras: { red: { criticalOver14d: 1 }, amber: { highOver30d: 1, over7d: 5 } },
    requests: { red: { over60d: 1 }, amber: { over30d: 1, over7d: 3 } },
  },
  incidents: {
    windowDays: 3650,
    countOpenOnly: true,
    priorityThresholds: { red: { p1Count: 1 }, amber: { p2Count: 1 } },
    ageThresholds: { red: { over60d: 1 }, amber: { over30d: 1, over7d: 2 } },
  },
  scoringBands: { red: 70, amber: 35 },
  caps: { perBucket: 5 },
};

describe("scoring", () => {
  it("returns Green when there is no data", () => {
    const scores = computeClientScores({
      client: baseClient,
      tickets: [],
      incidents: [],
      jiras: [],
      config,
    });

    expect(scores.tickets.status).toBe("Green");
    expect(scores.incidents.status).toBe("Green");
    expect(scores.jiras.status).toBe("Green");
    expect(rollupClientStatus(scores, config)).toBe("Green");
  });

  it("flags Red for critical open ticket", () => {
    const scores = computeClientScores({
      client: baseClient,
      tickets: [
        {
          organization: "D360",
          ticketStatus: "Open",
          criticality: "Critical",
          requested: "2025-11-02 17:52",
          priority: "High",
        },
      ],
      incidents: [],
      jiras: [],
      config,
    });

    expect(scores.tickets.status).toBe("Red");
  });

  it("flags Red for P1 incident open without RCA", () => {
    const scores = computeClientScores({
      client: baseClient,
      tickets: [],
      incidents: [
        {
          organization: "D360",
          ticketStatus: "Open",
          priority: "P1",
          rcaSummary: "",
          requested: "2025-10-01 10:00",
        },
      ],
      jiras: [],
      config,
    });

    expect(scores.incidents.status).toBe("Red");
  });

  it("flags Amber for JIRA high open >30d", () => {
    const scores = computeClientScores({
      client: baseClient,
      tickets: [],
      incidents: [],
      jiras: [
        {
          organization: "D360",
          ticketStatus: "In Progress",
          priority: "High",
          requested: "2025-10-01 10:00",
        },
      ],
      config,
    });

    expect(scores.jiras.status).toBe("Amber");
  });
});
