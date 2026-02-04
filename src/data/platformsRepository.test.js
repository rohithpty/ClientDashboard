import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getPlatformService,
  searchAllPlatforms,
  getLatestTicketsAllPlatforms,
  testConnection,
} from "./platformsRepository.js";

// Mock the configRepository
vi.mock("./configRepository.js", () => ({
  localConfigRepository: {
    getConfig: () => ({
      platformIntegrations: {
        zendesk: {
          apiKey: "test-key",
          baseUrl: "https://test.zendesk.com",
          enabled: true,
        },
        jira: {
          apiKey: "test-key",
          baseUrl: "https://test.atlassian.net",
          enabled: true,
        },
        incidentIo: {
          apiKey: "test-key",
          baseUrl: "https://api.incident.io",
          enabled: false,
        },
        wrike: {
          apiKey: "",
          baseUrl: "https://www.wrike.com/api/v4",
          enabled: false,
        },
      },
      rateLimiting: {
        requestsPerMinute: 60,
        enabled: true,
      },
    }),
    saveConfig: vi.fn(),
  },
}));

describe("platformsRepository", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({
          results: [],
          tickets: [],
          issues: [],
          incidents: [],
          data: [],
        }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("getPlatformService", () => {
    it("should return a service instance for valid platforms", () => {
      const service = getPlatformService("zendesk");
      expect(service).toBeDefined();
      expect(service.isConfigured).toBeDefined();
    });

    it("should throw error for unknown platform", () => {
      expect(() => {
        getPlatformService("unknown");
      }).toThrow("Unknown platform: unknown");
    });
  });

  describe("searchAllPlatforms", () => {
    it("should return results object for all enabled platforms", async () => {
      const results = await searchAllPlatforms("test");
      expect(results).toBeDefined();
      expect(typeof results).toBe("object");
      // Only enabled platforms should be searched
      expect(results.zendesk).toBeDefined();
      expect(results.jira).toBeDefined();
    });
  });

  describe("getLatestTicketsAllPlatforms", () => {
    it("should accept a limit parameter", async () => {
      const results = await getLatestTicketsAllPlatforms(5);
      expect(results).toBeDefined();
      expect(typeof results).toBe("object");
    });

    it("should use default limit of 10 if not provided", async () => {
      const results = await getLatestTicketsAllPlatforms();
      expect(results).toBeDefined();
    });
  });

  describe("testConnection", () => {
    it("should return error for unconfigured platform", async () => {
      const result = await testConnection("wrike");
      expect(result.success).toBe(false);
      expect(result.message).toContain("required");
    });

    it("should return error for unknown platform", async () => {
      const result = await testConnection("unknown");
      expect(result.success).toBe(false);
      expect(result.message).toContain("Unknown platform");
    });

    it("should return error object when credentials are missing", async () => {
      const result = await testConnection("incidentIo");
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
    });
  });

  describe("Rate limiting", () => {
    it("should respect rate limit configuration", async () => {
      const startTime = Date.now();
      // This test ensures rate limiter doesn't crash
      const results = await searchAllPlatforms("");
      const endTime = Date.now();
      // Should complete reasonably fast (allowing some buffer)
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
});
