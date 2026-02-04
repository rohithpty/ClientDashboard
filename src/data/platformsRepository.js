import { localConfigRepository } from "./configRepository.js";

// Rate limiter implementation
class RateLimiter {
  constructor(requestsPerMinute = 60) {
    this.requestsPerMinute = requestsPerMinute;
    this.requestTimes = [];
  }

  async waitIfNeeded() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old timestamps
    this.requestTimes = this.requestTimes.filter((time) => time > oneMinuteAgo);

    if (this.requestTimes.length >= this.requestsPerMinute) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = oldestRequest + 60000 - now;
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    this.requestTimes.push(now);
  }
}

const limiter = new RateLimiter();

// Normalized ticket schema
const normalizeTicket = (ticket, platform) => ({
  id: ticket.id || ticket.key || "",
  title: ticket.title || ticket.subject || ticket.summary || "",
  status: ticket.status || "",
  priority: ticket.priority || "",
  assignee: ticket.assignee || "",
  createdDate: ticket.createdDate || ticket.created || "",
  platformUrl: ticket.platformUrl || "",
  platform,
});

// Zendesk Service
class ZendeskService {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async isConfigured() {
    return !!(this.apiKey && this.baseUrl);
  }

  async searchByIdOrTitle(query) {
    if (!this.apiKey || !this.baseUrl) {
      throw new Error("Zendesk API not configured");
    }

    try {
      await limiter.waitIfNeeded();

      // Zendesk search API
      const searchUrl = `${this.baseUrl}/api/v2/search.json?query=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Zendesk API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.results || []).map((ticket) =>
        normalizeTicket(
          {
            id: ticket.id,
            title: ticket.subject,
            status: ticket.status,
            priority: ticket.priority,
            assignee: ticket.assignee_id,
            createdDate: ticket.created_at,
            platformUrl: `${this.baseUrl}/agent/tickets/${ticket.id}`,
          },
          "zendesk",
        ),
      );
    } catch (error) {
      console.error("Zendesk search error:", error);
      throw error;
    }
  }

  async getLatestTickets(limit = 10) {
    if (!this.apiKey || !this.baseUrl) {
      throw new Error("Zendesk API not configured");
    }

    try {
      await limiter.waitIfNeeded();

      const listUrl = `${this.baseUrl}/api/v2/tickets.json?per_page=${limit}&sort_by=created_at&sort_order=desc`;
      const response = await fetch(listUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Zendesk API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.tickets || []).map((ticket) =>
        normalizeTicket(
          {
            id: ticket.id,
            title: ticket.subject,
            status: ticket.status,
            priority: ticket.priority,
            assignee: ticket.assignee_id,
            createdDate: ticket.created_at,
            platformUrl: `${this.baseUrl}/agent/tickets/${ticket.id}`,
          },
          "zendesk",
        ),
      );
    } catch (error) {
      console.error("Zendesk fetch error:", error);
      throw error;
    }
  }
}

// Jira Service
class JiraService {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async isConfigured() {
    return !!(this.apiKey && this.baseUrl);
  }

  async searchByIdOrTitle(query) {
    if (!this.apiKey || !this.baseUrl) {
      throw new Error("Jira API not configured");
    }

    try {
      await limiter.waitIfNeeded();

      // Jira JQL search
      const jql = `summary ~ "${query}" OR key = "${query}"`;
      const searchUrl = `${this.baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=10`;
      const response = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Jira API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.issues || []).map((issue) =>
        normalizeTicket(
          {
            id: issue.key,
            title: issue.fields.summary,
            status: issue.fields.status?.name,
            priority: issue.fields.priority?.name,
            assignee: issue.fields.assignee?.displayName,
            createdDate: issue.fields.created,
            platformUrl: `${this.baseUrl}/browse/${issue.key}`,
          },
          "jira",
        ),
      );
    } catch (error) {
      console.error("Jira search error:", error);
      throw error;
    }
  }

  async getLatestTickets(limit = 10) {
    if (!this.apiKey || !this.baseUrl) {
      throw new Error("Jira API not configured");
    }

    try {
      await limiter.waitIfNeeded();

      const jql = "ORDER BY created DESC";
      const listUrl = `${this.baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${limit}`;
      const response = await fetch(listUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Jira API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.issues || []).map((issue) =>
        normalizeTicket(
          {
            id: issue.key,
            title: issue.fields.summary,
            status: issue.fields.status?.name,
            priority: issue.fields.priority?.name,
            assignee: issue.fields.assignee?.displayName,
            createdDate: issue.fields.created,
            platformUrl: `${this.baseUrl}/browse/${issue.key}`,
          },
          "jira",
        ),
      );
    } catch (error) {
      console.error("Jira fetch error:", error);
      throw error;
    }
  }
}

// Incident.io Service
class IncidentIoService {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async isConfigured() {
    return !!(this.apiKey && this.baseUrl);
  }

  async searchByIdOrTitle(query) {
    if (!this.apiKey || !this.baseUrl) {
      throw new Error("Incident.io API not configured");
    }

    try {
      await limiter.waitIfNeeded();

      const searchUrl = `${this.baseUrl}/incidents/search?query=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Incident.io API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.incidents || []).map((incident) =>
        normalizeTicket(
          {
            id: incident.id,
            title: incident.name,
            status: incident.status,
            priority: incident.severity,
            assignee: incident.commander?.name,
            createdDate: incident.created_at,
            platformUrl: incident.url,
          },
          "incident.io",
        ),
      );
    } catch (error) {
      console.error("Incident.io search error:", error);
      throw error;
    }
  }

  async getLatestTickets(limit = 10) {
    if (!this.apiKey || !this.baseUrl) {
      throw new Error("Incident.io API not configured");
    }

    try {
      await limiter.waitIfNeeded();

      const listUrl = `${this.baseUrl}/incidents?limit=${limit}&sort=-created_at`;
      const response = await fetch(listUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Incident.io API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.incidents || []).map((incident) =>
        normalizeTicket(
          {
            id: incident.id,
            title: incident.name,
            status: incident.status,
            priority: incident.severity,
            assignee: incident.commander?.name,
            createdDate: incident.created_at,
            platformUrl: incident.url,
          },
          "incident.io",
        ),
      );
    } catch (error) {
      console.error("Incident.io fetch error:", error);
      throw error;
    }
  }
}

// Wrike Service
class WrikeService {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async isConfigured() {
    return !!(this.apiKey && this.baseUrl);
  }

  async searchByIdOrTitle(query) {
    if (!this.apiKey || !this.baseUrl) {
      throw new Error("Wrike API not configured");
    }

    try {
      await limiter.waitIfNeeded();

      const searchUrl = `${this.baseUrl}/tasks?title=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Wrike API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.data || []).map((task) =>
        normalizeTicket(
          {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            assignee: task.assignees?.[0]?.name,
            createdDate: task.createdDate,
            platformUrl: task.url,
          },
          "wrike",
        ),
      );
    } catch (error) {
      console.error("Wrike search error:", error);
      throw error;
    }
  }

  async getLatestTickets(limit = 10) {
    if (!this.apiKey || !this.baseUrl) {
      throw new Error("Wrike API not configured");
    }

    try {
      await limiter.waitIfNeeded();

      const listUrl = `${this.baseUrl}/tasks?limit=${limit}&sortBy=-updatedDate`;
      const response = await fetch(listUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Wrike API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (data.data || []).map((task) =>
        normalizeTicket(
          {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            assignee: task.assignees?.[0]?.name,
            createdDate: task.createdDate,
            platformUrl: task.url,
          },
          "wrike",
        ),
      );
    } catch (error) {
      console.error("Wrike fetch error:", error);
      throw error;
    }
  }
}

// Factory function to get service instances
export const getPlatformService = (platform) => {
  const config = localConfigRepository.getConfig();
  const integration = config.platformIntegrations[platform];

  if (!integration) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  switch (platform) {
    case "zendesk":
      return new ZendeskService(integration.apiKey, integration.baseUrl);
    case "jira":
      return new JiraService(integration.apiKey, integration.baseUrl);
    case "incidentIo":
      return new IncidentIoService(integration.apiKey, integration.baseUrl);
    case "wrike":
      return new WrikeService(integration.apiKey, integration.baseUrl);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
};

// Centralized search across all platforms
export const searchAllPlatforms = async (query) => {
  const config = localConfigRepository.getConfig();
  const results = {};

  for (const [platform, integration] of Object.entries(config.platformIntegrations)) {
    if (!integration.enabled || !integration.apiKey) {
      continue;
    }

    try {
      const service = getPlatformService(platform);
      results[platform] = await service.searchByIdOrTitle(query);
    } catch (error) {
      console.error(`Error searching ${platform}:`, error);
      results[platform] = { error: error.message };
    }
  }

  return results;
};

// Get latest tickets from all enabled platforms
export const getLatestTicketsAllPlatforms = async (limit = 10) => {
  const config = localConfigRepository.getConfig();
  const results = {};

  for (const [platform, integration] of Object.entries(config.platformIntegrations)) {
    if (!integration.enabled || !integration.apiKey) {
      continue;
    }

    try {
      const service = getPlatformService(platform);
      results[platform] = await service.getLatestTickets(limit);
    } catch (error) {
      console.error(`Error fetching latest from ${platform}:`, error);
      results[platform] = { error: error.message };
    }
  }

  return results;
};

// Test connection to a platform
export const testConnection = async (platform) => {
  const config = localConfigRepository.getConfig();
  const integration = config.platformIntegrations[platform];

  if (!integration) {
    return { success: false, message: `Unknown platform: ${platform}` };
  }

  if (!integration.apiKey || !integration.baseUrl) {
    return { success: false, message: "API key and base URL are required" };
  }

  try {
    const service = getPlatformService(platform);
    await limiter.waitIfNeeded();

    // Attempt a simple API call to validate credentials
    switch (platform) {
      case "zendesk": {
        const response = await fetch(`${integration.baseUrl}/api/v2/users/me.json`, {
          headers: {
            Authorization: `Bearer ${integration.apiKey}`,
            "Content-Type": "application/json",
          },
        });
        if (response.status === 401) {
          return { success: false, message: "Invalid API key (401 Unauthorized)" };
        }
        if (response.status === 403) {
          return { success: false, message: "Insufficient permissions (403 Forbidden)" };
        }
        if (!response.ok) {
          return { success: false, message: `API error: ${response.status} ${response.statusText}` };
        }
        return { success: true, message: "✓ Connected to Zendesk" };
      }
      case "jira": {
        const response = await fetch(`${integration.baseUrl}/rest/api/3/myself`, {
          headers: {
            Authorization: `Bearer ${integration.apiKey}`,
            "Content-Type": "application/json",
          },
        });
        if (response.status === 401) {
          return { success: false, message: "Invalid API token (401 Unauthorized)" };
        }
        if (response.status === 403) {
          return { success: false, message: "Insufficient permissions (403 Forbidden)" };
        }
        if (!response.ok) {
          return { success: false, message: `API error: ${response.status} ${response.statusText}` };
        }
        return { success: true, message: "✓ Connected to Jira" };
      }
      case "incidentIo": {
        const response = await fetch(`${integration.baseUrl}/users/current`, {
          headers: {
            Authorization: `Bearer ${integration.apiKey}`,
            "Content-Type": "application/json",
          },
        });
        if (response.status === 401) {
          return { success: false, message: "Invalid API key (401 Unauthorized)" };
        }
        if (!response.ok) {
          return { success: false, message: `API error: ${response.status} ${response.statusText}` };
        }
        return { success: true, message: "✓ Connected to Incident.io" };
      }
      case "wrike": {
        const response = await fetch(`${integration.baseUrl}/user`, {
          headers: {
            Authorization: `Bearer ${integration.apiKey}`,
            "Content-Type": "application/json",
          },
        });
        if (response.status === 401) {
          return { success: false, message: "Invalid API token (401 Unauthorized)" };
        }
        if (!response.ok) {
          return { success: false, message: `API error: ${response.status} ${response.statusText}` };
        }
        return { success: true, message: "✓ Connected to Wrike" };
      }
      default:
        return { success: false, message: `Unknown platform: ${platform}` };
    }
  } catch (error) {
    if (error.message.includes("fetch")) {
      return { success: false, message: "Network error - check base URL and network connection" };
    }
    return { success: false, message: `Connection error: ${error.message}` };
  }
};

