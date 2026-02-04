import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import RichTextContent from "../components/RichTextContent.jsx";
import RichTextEditor from "../components/RichTextEditor.jsx";
import { useClients } from "../state/ClientsContext.jsx";
import { getReportData } from "../data/reportRepository.js";
import PlatformModal from "../components/PlatformModal.jsx";
import { localConfigRepository } from "../data/configRepository.js";
import { computeClientScores, rollupClientStatus } from "../utils/scoring.js";
import { isRichTextEmpty } from "../utils/richText.js";

const STATUS_OPTIONS = ["Red", "Amber", "Green"];
const formatWeek = () => new Date().toISOString().slice(0, 10);

const normalizeName = (value) => value?.trim().toLowerCase() ?? "";

const parseCsvDate = (value) => {
  if (!value) {
    return null;
  }
  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
  const parsed = parseCsvDate(value);
  if (!parsed) {
    return "N/A";
  }
  return parsed.toLocaleDateString();
};

const buildTicketSummary = (records) => {
  const counts = {
    total: records.length,
    rca: 0,
    over7: 0,
    over30: 0,
    over60: 0,
    over90: 0,
  };

  records.forEach((record) => {
    const status = record.ticketStatus ?? "";
    if (status.toLowerCase().includes("rca")) {
      counts.rca += 1;
    }
    const requested = parseCsvDate(record.requested);
    if (!requested) {
      return;
    }
    const ageInDays = Math.floor((Date.now() - requested.getTime()) / 86400000);
    if (ageInDays > 7) {
      counts.over7 += 1;
    }
    if (ageInDays > 30) {
      counts.over30 += 1;
    }
    if (ageInDays > 60) {
      counts.over60 += 1;
    }
    if (ageInDays > 90) {
      counts.over90 += 1;
    }
  });

  return counts;
};

const buildMockTicketSummary = (tickets) => {
  const counts = {
    total: tickets.length,
    rca: 0,
    over7: 0,
    over30: 0,
    over60: 0,
    over90: 0,
  };

  tickets.forEach((ticket) => {
    const createdDate = new Date(ticket.createdDate);
    const ageInDays = Math.floor((Date.now() - createdDate.getTime()) / 86400000);
    
    if (ageInDays > 7) {
      counts.over7 += 1;
    }
    if (ageInDays > 30) {
      counts.over30 += 1;
    }
    if (ageInDays > 60) {
      counts.over60 += 1;
    }
    if (ageInDays > 90) {
      counts.over90 += 1;
    }
  });

  return counts;
};

const getPriorityBreakdown = (tickets) => {
  return {
    critical: tickets.filter(t => t.priority === "Critical").length,
    high: tickets.filter(t => t.priority === "High").length,
    medium: tickets.filter(t => t.priority === "Medium").length,
    low: tickets.filter(t => t.priority === "Low").length,
  };
};

const PriorityBadges = ({ priorities }) => (
  <div style={{ fontSize: "12px", marginTop: "8px", color: "#666", lineHeight: "1.6", marginBottom: "0" }}>
    <span style={{ marginRight: "4px" }}>🔴 Critical: {priorities.critical}</span>
    <span style={{ marginRight: "6px" }}>│</span>
    <span style={{ marginRight: "4px" }}>🟠 High: {priorities.high}</span>
    <span style={{ marginRight: "6px" }}>│</span>
    <span style={{ marginRight: "4px" }}>🟡 Med: {priorities.medium}</span>
    <span style={{ marginRight: "6px" }}>│</span>
    <span>🟢 Low: {priorities.low}</span>
  </div>
);

const getStatusTone = (status) => {
  if (status === "Red") {
    return "risk";
  }
  if (status === "Amber") {
    return "watch";
  }
  return "healthy";
};

export default function ClientDetailPage() {
  const { id } = useParams();
  const { clients, addStatusUpdate, updateStatusUpdate } = useClients();
  const client = useMemo(() => clients.find((item) => item.id === id), [clients, id]);
  const [status, setStatus] = useState("Green");
  const [note, setNote] = useState("");
  const [modalState, setModalState] = useState({ isOpen: false, platform: null });
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingStatus, setEditingStatus] = useState("Green");
  const [editingNote, setEditingNote] = useState("");

  if (!client) {
    return (
      <section className="d-grid gap-3">
        <p>Client not found.</p>
        <Link className="link-primary" to="/">
          Return to dashboard
        </Link>
      </section>
    );
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isRichTextEmpty(note)) {
      return;
    }
    addStatusUpdate(client.id, {
      week: formatWeek(),
      status,
      note,
    });
    setNote("");
  };

  const startEditing = (index) => {
    const entry = client.history[index];
    setEditingIndex(index);
    setEditingStatus(entry.status);
    setEditingNote(entry.note);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingNote("");
  };

  const handleUpdate = (index) => {
    if (isRichTextEmpty(editingNote)) {
      return;
    }
    updateStatusUpdate(client.id, index, {
      status: editingStatus,
      note: editingNote,
    });
    cancelEditing();
  };
  const candidateNames = useMemo(() => {
    const aliases = client.aliases ?? [];
    return [client.name, ...aliases].map(normalizeName).filter(Boolean);
  }, [client]);
  const incidentRecords = useMemo(() => {
    const records = getReportData("incidents").records;
    return records.filter((record) =>
      candidateNames.includes(normalizeName(record.organization)),
    );
  }, [candidateNames]);
  const supportRecords = useMemo(() => {
    const records = getReportData("support-tickets").records;
    return records.filter((record) =>
      candidateNames.includes(normalizeName(record.organization)),
    );
  }, [candidateNames]);
  const jiraRecords = useMemo(() => {
    const records = getReportData("jiras").records;
    return records.filter((record) =>
      candidateNames.includes(normalizeName(record.organization)),
    );
  }, [candidateNames]);
  const requestRecords = useMemo(() => {
    const records = [
      ...getReportData("product-requests").records,
      ...getReportData("implementation-requests").records,
    ];
    return records.filter((record) =>
      candidateNames.includes(normalizeName(record.organization)),
    );
  }, [candidateNames]);
  const scoringConfig = localConfigRepository.getConfig().scoringConfig;
  const cardScores = useMemo(
    () =>
      computeClientScores({
        client,
        tickets: supportRecords,
        incidents: incidentRecords,
        jiras: jiraRecords,
        requests: requestRecords,
        config: scoringConfig,
      }),
    [client, supportRecords, incidentRecords, jiraRecords, requestRecords, scoringConfig],
  );
  const displayStatus = rollupClientStatus(cardScores, scoringConfig);
  const statusTone = getStatusTone(displayStatus);
  
  const incidentSummary = useMemo(
    () => buildTicketSummary(incidentRecords),
    [incidentRecords],
  );
  const supportSummary = useMemo(
    () => buildTicketSummary(supportRecords),
    [supportRecords],
  );
  
  // Priority breakdown for each platform
  const supportPriorities = useMemo(() => getPriorityBreakdown([]), []);
  const incidentPriorities = useMemo(() => getPriorityBreakdown([]), []);
  const jiraPriorities = useMemo(() => getPriorityBreakdown([]), []);
  const wrikePriorities = useMemo(() => getPriorityBreakdown([]), []);
  
  // Calculate JIRA metrics from mock data
  const jiraMetrics = useMemo(
    () => ({
      openCount: cardScores.jiras.counts?.openCount ?? 0,
      critical: cardScores.jiras.counts?.criticalOver14d ?? 0,
    }),
    [cardScores],
  );
  
  // Calculate Product request metrics from mock data
  const productRequestMetrics = useMemo(() => 0, []);
  const recentIncidents = useMemo(
    () =>
      [...incidentRecords]
        .sort((a, b) => (parseCsvDate(b.requested)?.getTime() ?? 0) - (parseCsvDate(a.requested)?.getTime() ?? 0))
        .slice(0, 5),
    [incidentRecords],
  );
  const recentSupportTickets = useMemo(
    () =>
      [...supportRecords]
        .sort((a, b) => (parseCsvDate(b.requested)?.getTime() ?? 0) - (parseCsvDate(a.requested)?.getTime() ?? 0))
        .slice(0, 5),
    [supportRecords],
  );
  const zendeskTicketBase = "https://paymentology.zendesk.com/agent/tickets";
  const buildTicketUrl = (ticketId) => `${zendeskTicketBase}/${ticketId}`;

  return (
    <section className={`d-grid gap-4 detail-shell status-${statusTone}`}>
      <header className={`detail-hero status-${statusTone}`}>
        <div>
          <Link className="detail-hero__link" to="/">
            ← Back to dashboard
          </Link>
          <h2 className="detail-hero__title">{client.name}</h2>
          <p className="detail-hero__meta">
            {client.region} · {client.product} · {client.tier} ·{" "}
            {client.environment ?? "Unknown"}
          </p>
        </div>
        <span className="detail-status-pill">Status: {displayStatus}</span>
      </header>

      <div className="detail-card">
        <h3 className="h5">Latest summary</h3>
        <RichTextContent html={client.summary} />
      </div>

      <div className="detail-grid">
        <button
          className="detail-card"
          type="button"
          onClick={() => setModalState({ isOpen: true, platform: "zendesk" })}
        >
          <h4 className="h6 d-flex align-items-center gap-2">
            <i className="bi bi-ticket-perforated" aria-hidden="true"></i>
            Support tickets
          </h4>
          <p className="detail-stat">{supportSummary.total} total</p>
          <div className="detail-list">
            <span>RCA: {supportSummary.rca}</span>
            <span>&gt;7d: {supportSummary.over7}</span>
            <span>&gt;30d: {supportSummary.over30}</span>
            <span>&gt;60d: {supportSummary.over60}</span>
          </div>
          <PriorityBadges priorities={supportPriorities} />
        </button>
        <button
          className="detail-card"
          type="button"
          onClick={() => setModalState({ isOpen: true, platform: "incidentIo" })}
        >
          <h4 className="h6 d-flex align-items-center gap-2">
            <i className="bi bi-exclamation-triangle" aria-hidden="true"></i>
            Incidents
          </h4>
          <p className="detail-stat">{incidentSummary.total} total</p>
          <div className="detail-list">
            <span>RCA: {incidentSummary.rca}</span>
            <span>&gt;7d: {incidentSummary.over7}</span>
            <span>&gt;30d: {incidentSummary.over30}</span>
            <span>&gt;60d: {incidentSummary.over60}</span>
          </div>
          <PriorityBadges priorities={incidentPriorities} />
        </button>
        <button
          className="detail-card"
          type="button"
          onClick={() => setModalState({ isOpen: true, platform: "jira" })}
        >
          <h4 className="h6 d-flex align-items-center gap-2">
            <i className="bi bi-kanban" aria-hidden="true"></i>
            JIRA issues
          </h4>
          <p className="detail-stat">Open: {jiraMetrics.openCount} | Critical: {jiraMetrics.critical}</p>
          <PriorityBadges priorities={jiraPriorities} />
        </button>
        <button
          className="detail-card"
          type="button"
          onClick={() => setModalState({ isOpen: true, platform: "wrike" })}
        >
          <h4 className="h6 d-flex align-items-center gap-2">
            <i className="bi bi-inbox" aria-hidden="true"></i>
            Product requests
          </h4>
          <p className="detail-stat">Open requests: {productRequestMetrics}</p>
          <PriorityBadges priorities={wrikePriorities} />
        </button>
      </div>

      <div className="detail-split">
        <div className="detail-panel">
          <div className="detail-panel__header">
            <h3 className="h5 mb-1">Recent support tickets</h3>
            <span className="detail-panel__count">{supportRecords.length} total</span>
          </div>
          <div className="detail-table">
            {recentSupportTickets.length === 0 ? (
              <p className="mb-0 text-body-secondary">No imported support tickets.</p>
            ) : (
              <ul>
                {recentSupportTickets.map((record) => (
                  <li key={record.id}>
                    <div>
                      <strong>
                        <a
                          className="detail-link"
                          href={buildTicketUrl(record.id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {record.subject || `Ticket #${record.id}`}
                        </a>
                      </strong>
                      <p className="mb-0">
                        Ticket {record.id} · {record.ticketStatus} · Priority{" "}
                        {record.priority || "N/A"}
                      </p>
                    </div>
                    <span>{formatDate(record.requested)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="detail-panel">
          <div className="detail-panel__header">
            <h3 className="h5 mb-1">Recent incidents</h3>
            <span className="detail-panel__count">{incidentRecords.length} total</span>
          </div>
          <div className="detail-table">
            {recentIncidents.length === 0 ? (
              <p className="mb-0 text-body-secondary">No imported incidents.</p>
            ) : (
              <ul>
                {recentIncidents.map((record) => (
                  <li key={record.id}>
                    <div>
                      <strong>
                        <a
                          className="detail-link"
                          href={buildTicketUrl(record.id)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {record.subject || `Incident #${record.id}`}
                        </a>
                      </strong>
                      <p className="mb-0">
                        Ticket {record.id} · {record.ticketStatus} · Priority{" "}
                        {record.priority || "N/A"}
                      </p>
                    </div>
                    <span>{formatDate(record.requested)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="detail-panel">
        <div className="detail-panel__header">
          <div>
            <h3 className="h5 mb-1">Weekly status timeline</h3>
            <p className="text-body-secondary mb-0">
              Chronological history of weekly health updates.
            </p>
          </div>
        </div>
        <ul className="detail-timeline">
          {client.history.map((entry, index) => (
            <li
              key={`${entry.week}-${entry.status}`}
              className="detail-timeline__item"
            >
              <span className={`detail-timeline__badge status-${getStatusTone(entry.status)}`}>
                {entry.status}
              </span>
              <div>
                <div className="detail-timeline__meta">
                  <p className="fw-semibold mb-1">{entry.week}</p>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light"
                    onClick={() => startEditing(index)}
                  >
                    Edit
                  </button>
                </div>
                {editingIndex === index ? (
                  <div className="detail-timeline__editor">
                    <div className="detail-form">
                      <div>
                        <label className="form-label" htmlFor={`edit-status-${index}`}>
                          Status
                        </label>
                        <select
                          id={`edit-status-${index}`}
                          className="form-select"
                          value={editingStatus}
                          onChange={(event) => setEditingStatus(event.target.value)}
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="form-label" htmlFor={`edit-note-${index}`}>
                          Summary note
                        </label>
                        <RichTextEditor
                          id={`edit-note-${index}`}
                          value={editingNote}
                          onChange={setEditingNote}
                          placeholder="Update the weekly note..."
                        />
                      </div>
                    </div>
                    <div className="detail-form__footer">
                      <button
                        className="btn btn-amber"
                        type="button"
                        onClick={() => handleUpdate(index)}
                      >
                        Save update
                      </button>
                      <button
                        className="btn btn-outline-light"
                        type="button"
                        onClick={cancelEditing}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <RichTextContent html={entry.note} />
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <form className="detail-panel" onSubmit={handleSubmit}>
        <div className="detail-panel__header">
          <h3 className="h5 mb-0">Log weekly update</h3>
        </div>
        <div className="detail-form">
          <div>
            <label className="form-label" htmlFor="status-select">
              Status
            </label>
            <select
              id="status-select"
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
          <div>
            <label className="form-label" htmlFor="summary-note">
              Summary note
            </label>
            <RichTextEditor
              id="summary-note"
              value={note}
              onChange={setNote}
              placeholder="Describe the weekly update..."
            />
          </div>
        </div>
        <div className="detail-form__footer">
          <button className="btn btn-amber" type="submit">
            Add update
          </button>
        </div>
      </form>

      <PlatformModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, platform: null })}
        client={client}
        platform={modalState.platform}
      />
    </section>
  );
}
