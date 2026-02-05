import { useEffect, useMemo, useRef, useState } from "react";
import { searchAllPlatforms } from "../data/platformsRepository.js";
import { useToast, ToastContainer } from "./Toast.jsx";
import { searchCache } from "../utils/searchCache.js";

const DEBOUNCE_DELAY = 500;
const STATUS_FILTERS = ["Open", "Closed", "In Progress", "Resolved"];
const PRIORITY_FILTERS = ["Critical", "High", "Medium", "Low"];
const DATE_FILTERS = ["Last 7 days", "Last 30 days", "All"];

const filterByDate = (tickets, selectedDates) => {
  if (selectedDates.includes("All") || selectedDates.length === 0) {
    return tickets;
  }

  const now = new Date();
  return tickets.filter((ticket) => {
    const createdDate = new Date(ticket.createdDate);
    const ageInDays = (now - createdDate) / (1000 * 60 * 60 * 24);

    if (selectedDates.includes("Last 7 days") && ageInDays <= 7) return true;
    if (selectedDates.includes("Last 30 days") && ageInDays <= 30) return true;
    return false;
  });
};

const filterByStatus = (tickets, selectedStatuses) => {
  if (selectedStatuses.length === 0) return tickets;
  return tickets.filter((ticket) =>
    selectedStatuses.some((status) => ticket.status?.toLowerCase().includes(status.toLowerCase())),
  );
};

const filterByPriority = (tickets, selectedPriorities) => {
  if (selectedPriorities.length === 0) return tickets;
  return tickets.filter((ticket) =>
    selectedPriorities.some((priority) => ticket.priority?.toLowerCase().includes(priority.toLowerCase())),
  );
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const getPlatformName = (platform) => {
  const names = {
    zendesk: "Zendesk",
    incidentIo: "Incident.io",
    jira: "JIRA",
    wrike: "Wrike",
  };
  return names[platform] || "Tickets";
};

const getPlatformIcon = (platform) => {
  const icons = {
    zendesk: "📧",
    incidentIo: "⚠️",
    jira: "📋",
    wrike: "📋",
  };
  return icons[platform] || "🔍";
};

export default function PlatformModal({ isOpen, onClose, client, platform }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedPriorities, setSelectedPriorities] = useState([]);
  const [selectedDates, setSelectedDates] = useState([]);
  const [platformLoading, setPlatformLoading] = useState({});
  const [resultsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const debounceTimerRef = useRef(null);
  const { toasts, addToast, removeToast } = useToast();

  const filteredTickets = useMemo(() => {
    let result = [...tickets];
    result = filterByStatus(result, selectedStatuses);
    result = filterByPriority(result, selectedPriorities);
    result = filterByDate(result, selectedDates);
    return result;
  }, [tickets, selectedStatuses, selectedPriorities, selectedDates]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / resultsPerPage));
  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * resultsPerPage;
    return filteredTickets.slice(startIndex, startIndex + resultsPerPage);
  }, [filteredTickets, currentPage, resultsPerPage]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const loadTickets = async () => {
      setLoading(true);
      setError(null);
      setPlatformLoading({});
      try {
        const results = await searchAllPlatforms("");
        const platformResult = results[platform];
        
        // Check if this platform is configured
        if (platformResult?.error || !Array.isArray(platformResult)) {
          setTickets([]);
          setError("No platforms configured or platform error.");
          addToast("Configure platform credentials to load live data.", "warning");
        } else {
          setTickets(platformResult.slice(0, 50)); // Keep top 50 for filtering
          addToast(`Loaded tickets from ${getPlatformName(platform)}`, "success");
        }
      } catch (err) {
        const message = err.message || "Failed to load tickets";
        setTickets([]);
        setError(message);
        addToast(message, "error");
      } finally {
        setLoading(false);
      }
    };

    loadTickets();

    // Cleanup debounce timer on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isOpen]);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      // Reset to initial load
      const results = await searchAllPlatforms("");
      const platformResult = results[platform];
      if (platformResult?.error || !Array.isArray(platformResult)) {
        setTickets([]);
        setError("No platforms configured or platform error.");
        return;
      }
      setTickets(platformResult.slice(0, 50));
      return;
    }

    // Set loading and debounce the search
    setLoading(true);
    setError(null);
    
    debounceTimerRef.current = setTimeout(async () => {
      try {
        // Check cache first
        const cacheKey = `${platform}:${query}`;
        const cachedResults = searchCache.get(cacheKey);
        if (cachedResults) {
          setTickets(cachedResults);
          addToast("Results loaded from cache", "info");
          setLoading(false);
          return;
        }

        const results = await searchAllPlatforms(query);
        const platformResult = results[platform];
        
        // Check if this platform failed
        if (platformResult?.error || !Array.isArray(platformResult)) {
          setTickets([]);
          setError("No platforms configured or platform error.");
          setLoading(false);
          return;
        }
        
        // Cache the results
        searchCache.set(cacheKey, platformResult);
        setTickets(platformResult);
        
        // Check for results and show appropriate feedback
        if (platformResult.length === 0) {
          addToast("No results found. Try a different search term.", "info");
        } else {
          addToast(`Found ${platformResult.length} ticket(s)`, "success");
        }
      } catch (err) {
        const message = err.message || "Failed to search tickets";
        setTickets([]);
        setError(message);
        addToast(message, "error");
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_DELAY);
  };

  const toggleStatus = (status) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
    setCurrentPage(1); // Reset to first page when filtering
  };

  const togglePriority = (priority) => {
    setSelectedPriorities((prev) =>
      prev.includes(priority) ? prev.filter((p) => p !== priority) : [...prev, priority],
    );
    setCurrentPage(1); // Reset to first page when filtering
  };

  const toggleDate = (date) => {
    setSelectedDates((prev) =>
      prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date],
    );
    setCurrentPage(1); // Reset to first page when filtering
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="position-fixed top-0 start-0 w-100 h-100"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 999 }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="position-fixed start-50"
        style={{
          top: "calc(50% + 30px)",
          transform: "translate(-50%, -50%)",
          width: "95%",
          maxWidth: "1200px",
          height: "85vh",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-1">
              {getPlatformIcon(platform)} {getPlatformName(platform)} - {client?.name || "Tickets"}
            </h5>
            <small className="text-muted">Search and filter linked tickets across platforms</small>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            aria-label="Close"
          />
        </div>

        {/* Content */}
        <div className="flex-grow-1 d-flex flex-column overflow-hidden">
          {/* Search Bar with Clear Button */}
          <div className="p-4 border-bottom">
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="form-control form-control-lg"
                placeholder="🔍 Search by ticket ID or title (e.g., ZD-123, JIRA-456)..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#999",
                    fontSize: "18px",
                    padding: "0 8px",
                  }}
                  onClick={() => handleSearch("")}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* Active Filters Pills */}
          {(selectedStatuses.length > 0 || selectedPriorities.length > 0 || selectedDates.length > 0) && (
            <div className="px-4 pt-3 pb-2" style={{ borderBottom: "1px solid #eee" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {selectedStatuses.map((status) => (
                  <span
                    key={`status-${status}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      backgroundColor: "#e3f2fd",
                      color: "#1976d2",
                      borderRadius: "16px",
                      fontSize: "13px",
                      fontWeight: "500",
                    }}
                  >
                    ✓ {status}
                    <button
                      type="button"
                      onClick={() => toggleStatus(status)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#1976d2",
                        padding: "0",
                        fontSize: "16px",
                        lineHeight: "1",
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {selectedPriorities.map((priority) => (
                  <span
                    key={`priority-${priority}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      backgroundColor: "#fff3e0",
                      color: "#f57c00",
                      borderRadius: "16px",
                      fontSize: "13px",
                      fontWeight: "500",
                    }}
                  >
                    ! {priority}
                    <button
                      type="button"
                      onClick={() => togglePriority(priority)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#f57c00",
                        padding: "0",
                        fontSize: "16px",
                        lineHeight: "1",
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {selectedDates.map((date) => (
                  <span
                    key={`date-${date}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 10px",
                      backgroundColor: "#f3e5f5",
                      color: "#7b1fa2",
                      borderRadius: "16px",
                      fontSize: "13px",
                      fontWeight: "500",
                    }}
                  >
                    📅 {date}
                    <button
                      type="button"
                      onClick={() => toggleDate(date)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#7b1fa2",
                        padding: "0",
                        fontSize: "16px",
                        lineHeight: "1",
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Collapsible Filters */}
          <div style={{ borderBottom: "1px solid #eee" }}>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              style={{
                width: "100%",
                padding: "12px 16px",
                background: "none",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>⊕ Filters {(selectedStatuses.length + selectedPriorities.length + selectedDates.length > 0) ? `(${selectedStatuses.length + selectedPriorities.length + selectedDates.length} active)` : ""}</span>
              <span style={{ fontSize: "12px" }}>{showFilters ? "▼" : "▶"}</span>
            </button>

            {showFilters && (
              <div style={{ padding: "16px", paddingTop: "8px", backgroundColor: "#fafafa" }}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: "#333" }}>
                    Status
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {STATUS_FILTERS.map((status) => (
                      <label key={status} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={selectedStatuses.includes(status)}
                          onChange={() => toggleStatus(status)}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ fontSize: "13px" }}>{status}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: "#333" }}>
                    Priority
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {PRIORITY_FILTERS.map((priority) => (
                      <label key={priority} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={selectedPriorities.includes(priority)}
                          onChange={() => togglePriority(priority)}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ fontSize: "13px" }}>{priority}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "600", color: "#333" }}>
                    Date
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {DATE_FILTERS.map((date) => (
                      <label key={date} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={selectedDates.includes(date)}
                          onChange={() => toggleDate(date)}
                          style={{ cursor: "pointer" }}
                        />
                        <span style={{ fontSize: "13px" }}>{date}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tickets List */}
          <div style={{ flex: "1", display: "flex", flexDirection: "column", overflow: "hidden", padding: "12px 16px", minHeight: 0 }}>
            {loading && (
              <div style={{ textAlign: "center", color: "#999", paddingTop: "40px" }}>
                <div style={{ fontSize: "18px", marginBottom: "12px" }}>⏳ Searching...</div>
              </div>
            )}

            {error && (
              <div style={{
                background: "#fee",
                border: "1px solid #fcc",
                borderRadius: "4px",
                padding: "16px",
                color: "#c33",
                marginBottom: "12px"
              }}>
                <div style={{ fontWeight: "bold", marginBottom: "8px" }}>❌ {error.includes("No platforms") ? "No Platforms" : "Error"}</div>
                <div style={{ fontSize: "12px" }}>
                  {error.includes("No platforms")
                    ? "Configure API credentials in Admin Center"
                    : error}
                </div>
              </div>
            )}

            {!loading && !error && filteredTickets.length === 0 && (
              <div style={{ textAlign: "center", color: "#999", paddingTop: "40px" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
                <div>{searchQuery || selectedStatuses.length > 0 || selectedPriorities.length > 0 || selectedDates.length > 0
                    ? "No matches found"
                    : "Select filters to search"}</div>
              </div>
            )}

            {!loading && !error && filteredTickets.length > 0 && (
              <>
                <div style={{ marginBottom: "8px", fontSize: "11px", color: "#666", fontWeight: "500" }}>
                  📊 {(currentPage - 1) * resultsPerPage + 1}–{Math.min(currentPage * resultsPerPage, filteredTickets.length)} of {filteredTickets.length} | Page {currentPage}/{totalPages}
                </div>
                <div className="table-responsive" style={{ flex: "1", overflow: "auto", minHeight: 0 }}>
                  <table className="table table-sm table-hover mb-0">
                    <thead className="table-light sticky-top">
                      <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Priority</th>
                        <th>Assignee</th>
                        <th>Created</th>
                        <th>Last Updated</th>
                        <th>Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTickets.map((ticket) => (
                        <tr key={`${ticket.platform}-${ticket.id}`}>
                        <td className="fw-semibold text-nowrap">{ticket.id}</td>
                        <td>
                          <span title={ticket.title}>{ticket.title.substring(0, 50)}</span>
                        </td>
                        <td className="text-nowrap">
                          <span className="badge bg-info text-dark" style={{ fontSize: "10px" }}>{ticket.status}</span>
                        </td>
                        <td className="text-nowrap">
                          <span
                            className={`badge ${
                              ticket.priority === "Critical"
                                ? "bg-danger"
                                : ticket.priority === "High"
                                  ? "bg-warning text-dark"
                                  : "bg-secondary"
                            }`}
                            style={{ fontSize: "10px" }}
                          >
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="text-nowrap">{ticket.assignee || "—"}</td>
                        <td className="text-muted small text-nowrap">{formatDate(ticket.createdDate)}</td>
                        <td className="text-muted small text-nowrap">{ticket.lastUpdated ? formatDate(ticket.lastUpdated) : "—"}</td>
                        <td className="text-nowrap">
                          {ticket.platformUrl && (
                            <a
                              href={ticket.platformUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-outline-primary"
                              style={{ fontSize: "10px", padding: "2px 6px" }}
                            >
                              Open ↗
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              title="Previous page"
            >
              ⬅ Previous
            </button>
            <span style={{ fontSize: "13px", color: "#666", minWidth: "100px", textAlign: "center" }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              title="Next page"
            >
              Next ➡
            </button>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: "6px 16px", fontSize: "14px" }}
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </>
  );
}
