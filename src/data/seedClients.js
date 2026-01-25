export const seedClients = [
  {
    id: "client-aurora",
    name: "Aurora Pay",
    region: "Europe",
    product: "VoucherEngine",
    tier: "Gold",
    schemes: ["Mastercard", "Visa"],
    customSchemeLogo: "",
    currentStatus: "Red",
    summary: "Payment gateway latency spikes; fix rolling out.",
    metrics: {
      tickets: {
        L1: 5,
        L2: 3,
        L3: 1,
        olderThan30: 2,
        olderThan60: 1,
      },
      jiras: {
        openCount: 4,
        critical: 1,
      },
      requests: 2,
      incidents: 1,
    },
    history: [
      {
        week: "2025-10-04",
        status: "Green",
        note: "Stable operations after release.",
      },
      {
        week: "2025-10-11",
        status: "Amber",
        note: "Increased error rate in voucher redemption.",
      },
      {
        week: "2025-10-18",
        status: "Red",
        note: "Gateway saturation affecting settlement time.",
      },
    ],
  },
  {
    id: "client-borealis",
    name: "Borealis Bank",
    region: "APAC",
    product: "Banking.Live",
    tier: "Tier 1",
    schemes: ["MADA", "UAE", "AFS"],
    customSchemeLogo: "",
    currentStatus: "Amber",
    summary: "Audit remediation underway; two critical bugs open.",
    metrics: {
      tickets: {
        L1: 2,
        L2: 4,
        L3: 0,
        olderThan30: 1,
        olderThan60: 0,
      },
      jiras: {
        openCount: 6,
        critical: 2,
      },
      requests: 3,
      incidents: 0,
    },
    history: [
      {
        week: "2025-10-04",
        status: "Green",
        note: "Quarterly release complete.",
      },
      {
        week: "2025-10-11",
        status: "Amber",
        note: "Regulatory audit findings in progress.",
      },
    ],
  },
  {
    id: "client-cascade",
    name: "Cascade Retail",
    region: "MEA",
    product: "VoucherEngine",
    tier: "Silver",
    schemes: ["Jetco", "Jonet/Cortex"],
    customSchemeLogo: "",
    currentStatus: "Green",
    summary: "All SLAs met; no priority issues.",
    metrics: {
      tickets: {
        L1: 1,
        L2: 1,
        L3: 0,
        olderThan30: 0,
        olderThan60: 0,
      },
      jiras: {
        openCount: 1,
        critical: 0,
      },
      requests: 1,
      incidents: 0,
    },
    history: [
      {
        week: "2025-10-04",
        status: "Green",
        note: "Weekly operations steady.",
      },
      {
        week: "2025-10-11",
        status: "Green",
        note: "Minor feature requests logged.",
      },
      {
        week: "2025-10-18",
        status: "Green",
        note: "No escalations reported.",
      },
    ],
  },
];
