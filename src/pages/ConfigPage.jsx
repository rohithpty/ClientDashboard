import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients } from "../state/ClientsContext.jsx";

const REGIONS = ["APAC", "Europe", "Africa", "MEA", "Americas"];
const PRODUCTS = ["VoucherEngine", "Banking.Live"];
const TIERS = ["Gold", "Silver", "Tier 1", "Tier 2", "Tier 3"];
const STATUS_OPTIONS = ["Green", "Amber", "Red"];

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

export default function ConfigPage() {
  const navigate = useNavigate();
  const { addClient } = useClients();
  const [name, setName] = useState("");
  const [region, setRegion] = useState(REGIONS[0]);
  const [product, setProduct] = useState(PRODUCTS[0]);
  const [tier, setTier] = useState(TIERS[0]);
  const [status, setStatus] = useState("Green");
  const [summary, setSummary] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    const trimmedName = name.trim();
    const today = new Date().toISOString().slice(0, 10);
    addClient({
      id: `client-${Date.now()}`,
      name: trimmedName,
      region,
      product,
      tier,
      currentStatus: status,
      summary: summary.trim() || "New client added.",
      metrics: defaultMetrics,
      history: [
        {
          week: today,
          status,
          note: summary.trim() || "Initial onboarding update.",
        },
      ],
    });
    navigate("/");
  };

  return (
    <section className="config">
      <div className="config__header">
        <h2>Add a new client</h2>
        <p className="muted">
          Configure region, product, tier, and an initial weekly status note.
        </p>
      </div>
      <form className="config-form" onSubmit={handleSubmit}>
        <label>
          Client name
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Client name"
          />
        </label>
        <label>
          Region
          <select value={region} onChange={(event) => setRegion(event.target.value)}>
            {REGIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Product
          <select value={product} onChange={(event) => setProduct(event.target.value)}>
            {PRODUCTS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tier
          <select value={tier} onChange={(event) => setTier(event.target.value)}>
            {TIERS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Initial status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label>
          Weekly summary
          <textarea
            rows={3}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="Short weekly note..."
          />
        </label>
        <button className="primary-button" type="submit">
          Save client
        </button>
      </form>
    </section>
  );
}
