import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClients } from "../state/ClientsContext.jsx";

const REGIONS = ["APAC", "Europe", "Africa", "MEA", "Americas"];
const PRODUCTS = ["VoucherEngine", "Banking.Live", "Acorn"];
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
  const {
    addClient,
    clients,
    accountManagers,
    technicalAccountManagers,
    setAccountManagers,
    setTechnicalAccountManagers,
    updateClient,
  } = useClients();
  const [selectedClientId, setSelectedClientId] = useState(
    clients[0]?.id || "",
  );
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId),
    [clients, selectedClientId],
  );
  const [name, setName] = useState("");
  const [region, setRegion] = useState(REGIONS[0]);
  const [country, setCountry] = useState("");
  const [product, setProduct] = useState(PRODUCTS[0]);
  const [status, setStatus] = useState("Green");
  const [summary, setSummary] = useState("");
  const [accountManager, setAccountManager] = useState(
    accountManagers[0] || "",
  );
  const [technicalAccountManager, setTechnicalAccountManager] = useState(
    technicalAccountManagers[0] || "",
  );
  const [newAccountManager, setNewAccountManager] = useState("");
  const [newTechnicalAccountManager, setNewTechnicalAccountManager] =
    useState("");

  const [editForm, setEditForm] = useState({
    name: "",
    region: "",
    country: "",
    product: "",
    status: "Green",
    accountManager: "",
    technicalAccountManager: "",
    summary: "",
  });

  useEffect(() => {
    if (selectedClient) {
      setEditForm({
        name: selectedClient.name,
        region: selectedClient.region,
        country: selectedClient.country,
        product: selectedClient.product,
        status: selectedClient.currentStatus,
        accountManager: selectedClient.accountManager,
        technicalAccountManager: selectedClient.technicalAccountManager,
        summary: selectedClient.summary,
      });
    }
  }, [selectedClient]);

  const updateAccountManager = (index, value) => {
    setAccountManagers((prev) =>
      prev.map((item, idx) => (idx === index ? value : item)),
    );
  };

  const updateTechnicalAccountManager = (index, value) => {
    setTechnicalAccountManagers((prev) =>
      prev.map((item, idx) => (idx === index ? value : item)),
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!name.trim() || !accountManager || !technicalAccountManager) {
      return;
    }
    const trimmedName = name.trim();
    const today = new Date().toISOString().slice(0, 10);
    addClient({
      id: `client-${Date.now()}`,
      name: trimmedName,
      region,
      country,
      product,
      currentStatus: status,
      summary: summary.trim() || "New client added.",
      accountManager,
      technicalAccountManager,
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

  const handleEditSubmit = (event) => {
    event.preventDefault();
    if (!selectedClient) {
      return;
    }
    updateClient(selectedClient.id, {
      name: editForm.name,
      region: editForm.region,
      country: editForm.country,
      product: editForm.product,
      currentStatus: editForm.status,
      accountManager: editForm.accountManager,
      technicalAccountManager: editForm.technicalAccountManager,
      summary: editForm.summary,
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <section className="config">
      <div className="config__header">
        <h2>Configuration</h2>
        <p className="muted">
          Manage master AM/TAM lists and update client assignments.
        </p>
      </div>
      <div className="config-grid">
        <form className="config-form" onSubmit={handleSubmit}>
          <h3>Add new client</h3>
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
            Country
            <input
              type="text"
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              placeholder="Country"
            />
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
            TAM
            <select
              value={technicalAccountManager}
              onChange={(event) => setTechnicalAccountManager(event.target.value)}
            >
              {technicalAccountManagers.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            AM
            <select
              value={accountManager}
              onChange={(event) => setAccountManager(event.target.value)}
            >
              {accountManagers.map((option) => (
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

        <form className="config-form" onSubmit={handleEditSubmit}>
          <h3>Edit existing client</h3>
          <label>
            Select client
            <select
              value={selectedClientId}
              onChange={(event) => setSelectedClientId(event.target.value)}
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Client name
            <input
              type="text"
              value={editForm.name}
              onChange={(event) => handleEditChange("name", event.target.value)}
            />
          </label>
          <label>
            Region
            <select
              value={editForm.region}
              onChange={(event) => handleEditChange("region", event.target.value)}
            >
              {REGIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Country
            <input
              type="text"
              value={editForm.country}
              onChange={(event) => handleEditChange("country", event.target.value)}
            />
          </label>
          <label>
            Product
            <select
              value={editForm.product}
              onChange={(event) => handleEditChange("product", event.target.value)}
            >
              {PRODUCTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            TAM
            <select
              value={editForm.technicalAccountManager}
              onChange={(event) =>
                handleEditChange("technicalAccountManager", event.target.value)
              }
            >
              {technicalAccountManagers.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            AM
            <select
              value={editForm.accountManager}
              onChange={(event) => handleEditChange("accountManager", event.target.value)}
            >
              {accountManagers.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={editForm.status}
              onChange={(event) => handleEditChange("status", event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Summary
            <textarea
              rows={3}
              value={editForm.summary}
              onChange={(event) => handleEditChange("summary", event.target.value)}
            />
          </label>
          <button className="primary-button" type="submit">
            Save updates
          </button>
        </form>
      </div>

      <div className="config-grid">
        <div className="config-form">
          <h3>Master Account Manager list</h3>
          <div className="list-editor">
            {accountManagers.map((manager, index) => (
              <input
                key={`${manager}-${index}`}
                value={manager}
                onChange={(event) => updateAccountManager(index, event.target.value)}
              />
            ))}
          </div>
          <div className="list-add">
            <input
              type="text"
              value={newAccountManager}
              onChange={(event) => setNewAccountManager(event.target.value)}
              placeholder="Add new AM"
            />
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                if (!newAccountManager.trim()) return;
                setAccountManagers((prev) => [...prev, newAccountManager.trim()]);
                setNewAccountManager("");
              }}
            >
              Add
            </button>
          </div>
        </div>
        <div className="config-form">
          <h3>Master Technical Account Manager list</h3>
          <div className="list-editor">
            {technicalAccountManagers.map((manager, index) => (
              <input
                key={`${manager}-${index}`}
                value={manager}
                onChange={(event) =>
                  updateTechnicalAccountManager(index, event.target.value)
                }
              />
            ))}
          </div>
          <div className="list-add">
            <input
              type="text"
              value={newTechnicalAccountManager}
              onChange={(event) => setNewTechnicalAccountManager(event.target.value)}
              placeholder="Add new TAM"
            />
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                if (!newTechnicalAccountManager.trim()) return;
                setTechnicalAccountManagers((prev) => [
                  ...prev,
                  newTechnicalAccountManager.trim(),
                ]);
                setNewTechnicalAccountManager("");
              }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
