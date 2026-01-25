import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients } from "../state/ClientsContext.jsx";
import { getReportData, importReportCsv } from "../data/reportRepository.js";

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
  clientLogo: "",
});

const REPORT_IMPORTS = [
  { type: "incidents", label: "Incidents" },
  { type: "support-tickets", label: "Support Tickets" },
  { type: "jiras", label: "JIRAs" },
  { type: "product-requests", label: "Product Requests" },
  { type: "implementation-requests", label: "Implementation Requests" },
];

export default function ConfigPage() {
  const navigate = useNavigate();
  const { clients, addClient, updateClient, removeClient, replaceClients } = useClients();
  const [formState, setFormState] = useState(createEmptyForm);
  const [editingId, setEditingId] = useState(null);
  const [importError, setImportError] = useState("");
  const importInputRef = useRef(null);
  const [reportError, setReportError] = useState("");
  const [reportData, setReportData] = useState(() =>
    REPORT_IMPORTS.reduce((acc, report) => {
      acc[report.type] = getReportData(report.type);
      return acc;
    }, {})
  );

  const reportSummary = useMemo(
    () =>
      REPORT_IMPORTS.map((report) => ({
        ...report,
        records: reportData[report.type]?.records ?? [],
        lastImportedAt: reportData[report.type]?.lastImportedAt ?? null,
      })),
    [reportData]
  );

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
      clientLogo: formState.clientLogo,
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

  const handleLogoUpload = (event, field) => {
    const [file] = event.target.files || [];
    if (!file) {
      setFormState((prev) => ({ ...prev, [field]: "" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setFormState((prev) => ({ ...prev, [field]: reader.result }));
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
      clientLogo: client.clientLogo ?? "",
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

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(clients, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "clients-export.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        return;
      }
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed)) {
          throw new Error("Import file must be an array of clients.");
        }
        replaceClients(parsed);
        setImportError("");
      } catch (error) {
        setImportError(error.message || "Unable to import data.");
      }
    };
    reader.readAsText(file);
  };

  const handleReportImport = (type, file) => {
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        return;
      }
      try {
        const payload = importReportCsv(type, reader.result);
        setReportData((prev) => ({ ...prev, [type]: payload }));
        setReportError("");
      } catch (error) {
        setReportError(error.message || "Unable to import CSV report.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <section className="d-grid gap-4">
      <div>
        <h2 className="mb-1">Admin center</h2>
        <p className="text-body-secondary mb-0">
          Manage client profiles and import operational reports.
        </p>
      </div>
      <div className="card shadow-sm">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
            <div>
              <h3 className="h5">Import data</h3>
              <p className="text-body-secondary mb-0">
                Upload CSV reports by category to keep incident and support data in sync.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              {REPORT_IMPORTS.map((report) => (
                <label
                  key={report.type}
                  className="btn btn-outline-primary btn-sm mb-0"
                >
                  {report.label}
                  <input
                    className="d-none"
                    type="file"
                    accept=".csv"
                    onChange={(event) =>
                      handleReportImport(report.type, event.target.files?.[0])
                    }
                  />
                </label>
              ))}
            </div>
          </div>
          {reportError ? (
            <p className="text-danger small mt-2 mb-0">{reportError}</p>
          ) : null}
          <div className="table-responsive mt-3">
            <table className="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th scope="col">Report type</th>
                  <th scope="col">Records</th>
                  <th scope="col">Last imported</th>
                </tr>
              </thead>
              <tbody>
                {reportSummary.map((report) => (
                  <tr key={report.type}>
                    <td>{report.label}</td>
                    <td>{report.records.length}</td>
                    <td>{report.lastImportedAt || "Not imported yet"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
              <label className="form-label" htmlFor="client-logo">
                Client logo (optional)
              </label>
              <input
                id="client-logo"
                className="form-control"
                type="file"
                accept="image/*"
                onChange={(event) => handleLogoUpload(event, "clientLogo")}
              />
              {formState.clientLogo ? (
                <div className="mt-2 d-flex align-items-center gap-2">
                  <img src={formState.clientLogo} alt="Client logo" className="client-logo" />
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    type="button"
                    onClick={() =>
                      setFormState((prev) => ({
                        ...prev,
                        clientLogo: "",
                      }))
                    }
                  >
                    Remove logo
                  </button>
                </div>
              ) : null}
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
                onChange={(event) => handleLogoUpload(event, "customSchemeLogo")}
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
          <div className="d-flex flex-wrap justify-content-between align-items-start gap-2">
            <div>
              <h3 className="h5">Client management</h3>
              <p className="text-body-secondary mb-0">
                Edit client details or remove inactive accounts.
              </p>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <button className="btn btn-outline-primary btn-sm" type="button" onClick={handleExport}>
                Export data
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                type="button"
                onClick={() => importInputRef.current?.click()}
              >
                Import data
              </button>
              <input
                ref={importInputRef}
                className="d-none"
                type="file"
                accept="application/json"
                onChange={handleImport}
              />
            </div>
          </div>
          {importError ? (
            <p className="text-danger small mt-2 mb-0">{importError}</p>
          ) : null}
          <div className="row row-cols-1 row-cols-lg-2 g-3 mt-1">
            {clients.map((client) => (
              <div key={client.id} className="col">
                <div className="border rounded-3 p-3 h-100">
                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div className="d-flex gap-2 align-items-start">
                      {client.clientLogo ? (
                        <img
                          src={client.clientLogo}
                          alt={`${client.name} logo`}
                          className="client-logo"
                        />
                      ) : null}
                      <div>
                        <h4 className="h6 mb-1">{client.name}</h4>
                        <p className="text-body-secondary small mb-0">
                          {client.region} · {client.product} · {client.tier}
                        </p>
                      </div>
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
