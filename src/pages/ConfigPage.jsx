import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients } from "../state/ClientsContext.jsx";

const REGIONS = ["APAC", "Europe", "Africa", "MEA", "Americas"];
const PRODUCTS = ["VoucherEngine", "Banking.Live"];
const TIERS = ["Gold", "Silver", "Tier 1", "Tier 2", "Tier 3"];
const STATUS_OPTIONS = ["Green", "Amber", "Red"];
const SCHEME_OPTIONS = [
  "Mastercard",
  "Visa",
  "UAE",
  "Jonet/Cortex",
  "MADA",
  "AFS",
  "Jetco",
];

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

const toggleScheme = (selected, scheme) =>
  selected.includes(scheme)
    ? selected.filter((item) => item !== scheme)
    : [...selected, scheme];

export default function ConfigPage() {
  const navigate = useNavigate();
  const { addClient } = useClients();
  const [name, setName] = useState("");
  const [region, setRegion] = useState(REGIONS[0]);
  const [product, setProduct] = useState(PRODUCTS[0]);
  const [tier, setTier] = useState(TIERS[0]);
  const [status, setStatus] = useState("Green");
  const [summary, setSummary] = useState("");
  const [schemes, setSchemes] = useState([]);
  const [customSchemeLogo, setCustomSchemeLogo] = useState("");

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
      schemes,
      customSchemeLogo,
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

  const handleLogoUpload = (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      setCustomSchemeLogo("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCustomSchemeLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="d-grid gap-3">
      <div>
        <h2 className="mb-1">Add a new client</h2>
        <p className="text-body-secondary mb-0">
          Configure region, product, tier, and an initial weekly status note.
        </p>
      </div>
      <form className="card shadow-sm" onSubmit={handleSubmit}>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="client-name">
                Client name
              </label>
              <input
                id="client-name"
                className="form-control"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Client name"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="client-region">
                Region
              </label>
              <select
                id="client-region"
                className="form-select"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
              >
                {REGIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="client-product">
                Product
              </label>
              <select
                id="client-product"
                className="form-select"
                value={product}
                onChange={(event) => setProduct(event.target.value)}
              >
                {PRODUCTS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="client-tier">
                Tier
              </label>
              <select
                id="client-tier"
                className="form-select"
                value={tier}
                onChange={(event) => setTier(event.target.value)}
              >
                {TIERS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="client-status">
                Initial status
              </label>
              <select
                id="client-status"
                className="form-select"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="client-summary">
                Weekly summary
              </label>
              <textarea
                id="client-summary"
                className="form-control"
                rows={3}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Short weekly note..."
              />
            </div>
            <div className="col-12">
              <label className="form-label mb-2">Schemes</label>
              <div className="row row-cols-2 row-cols-md-4 g-2">
                {SCHEME_OPTIONS.map((scheme) => (
                  <div key={scheme} className="col">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`scheme-${scheme}`}
                        checked={schemes.includes(scheme)}
                        onChange={() => setSchemes((prev) => toggleScheme(prev, scheme))}
                      />
                      <label className="form-check-label" htmlFor={`scheme-${scheme}`}>
                        {scheme}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="scheme-logo">
                Upload scheme logo (optional)
              </label>
              <input
                id="scheme-logo"
                className="form-control"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
              />
              {customSchemeLogo ? (
                <p className="text-body-secondary small mb-0 mt-2">
                  Custom logo will be saved with this client.
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="card-footer bg-white border-0">
          <button className="btn btn-primary" type="submit">
            Save client
          </button>
        </div>
      </form>
    </section>
  );
}
