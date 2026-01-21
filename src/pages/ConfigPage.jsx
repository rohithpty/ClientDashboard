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

const createEmptyForm = () => ({
  name: "",
  region: REGIONS[0],
  product: PRODUCTS[0],
  tier: TIERS[0],
  status: "Green",
  summary: "",
  schemes: [],
  customSchemeLogo: "",
});

export default function ConfigPage() {
  const navigate = useNavigate();
  const { clients, addClient, updateClient, removeClient } = useClients();
  const [formState, setFormState] = useState(createEmptyForm);
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      return;
    }
    const trimmedName = formState.name.trim();
    const today = new Date().toISOString().slice(0, 10);
    const payload = {
      name: trimmedName,
      region: formState.region,
      product: formState.product,
      tier: formState.tier,
      schemes: formState.schemes,
      customSchemeLogo: formState.customSchemeLogo,
      currentStatus: formState.status,
      summary: formState.summary.trim() || "New client added.",
    };

    if (editingId) {
      updateClient(editingId, payload);
      setEditingId(null);
      setFormState(createEmptyForm());
      return;
    }

    addClient({
      id: `client-${Date.now()}`,
      ...payload,
      metrics: defaultMetrics,
      history: [
        {
          week: today,
          status: formState.status,
          note: formState.summary.trim() || "Initial onboarding update.",
        },
      ],
    });
    navigate("/");
  };

  const handleLogoUpload = (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      setFormState((prev) => ({ ...prev, customSchemeLogo: "" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormState((prev) => ({ ...prev, customSchemeLogo: reader.result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditClient = (client) => {
    setEditingId(client.id);
    setFormState({
      name: client.name ?? "",
      region: client.region ?? REGIONS[0],
      product: client.product ?? PRODUCTS[0],
      tier: client.tier ?? TIERS[0],
      status: client.currentStatus ?? "Green",
      summary: client.summary ?? "",
      schemes: client.schemes ?? [],
      customSchemeLogo: client.customSchemeLogo ?? "",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormState(createEmptyForm());
  };

  const handleDeleteClient = (clientId) => {
    removeClient(clientId);
    if (editingId === clientId) {
      handleCancelEdit();
    }
  };

  return (
    <section className="d-grid gap-4">
      <div>
        <h2 className="mb-1">{editingId ? "Edit client" : "Add a new client"}</h2>
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
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
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
                value={formState.region}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, region: event.target.value }))
                }
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
                value={formState.product}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, product: event.target.value }))
                }
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
                value={formState.tier}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, tier: event.target.value }))
                }
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
                value={formState.status}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, status: event.target.value }))
                }
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
                value={formState.summary}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, summary: event.target.value }))
                }
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
                        checked={formState.schemes.includes(scheme)}
                        onChange={() =>
                          setFormState((prev) => ({
                            ...prev,
                            schemes: toggleScheme(prev.schemes, scheme),
                          }))
                        }
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
              {formState.customSchemeLogo ? (
                <p className="text-body-secondary small mb-0 mt-2">
                  Custom logo will be saved with this client.
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="card-footer bg-white border-0 d-flex flex-wrap gap-2">
          <button className="btn btn-primary" type="submit">
            {editingId ? "Save changes" : "Save client"}
          </button>
          {editingId ? (
            <button className="btn btn-outline-secondary" type="button" onClick={handleCancelEdit}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="card shadow-sm">
        <div className="card-body">
          <h3 className="h5">Manage clients</h3>
          <p className="text-body-secondary mb-3">
            Edit client details or remove inactive accounts.
          </p>
          <div className="row row-cols-1 row-cols-lg-2 g-3">
            {clients.map((client) => (
              <div key={client.id} className="col">
                <div className="border rounded-3 p-3 h-100">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div>
                      <h4 className="h6 mb-1">{client.name}</h4>
                      <p className="text-body-secondary small mb-0">
                        {client.region} · {client.product} · {client.tier}
                      </p>
                    </div>
                    <span className="badge text-bg-light border">{client.currentStatus}</span>
                  </div>
                  <div className="d-flex flex-wrap gap-2 mt-3">
                    <button
                      className="btn btn-outline-primary btn-sm"
                      type="button"
                      onClick={() => handleEditClient(client)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      type="button"
                      onClick={() => handleDeleteClient(client.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
