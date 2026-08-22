// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
    mapJulesSession, 
    createJulesSession, 
    listJulesSessions,
    deleteJulesSession,
    saveAccounts,
    getAccounts,
    type JulesSession 
} from "../jules";

describe("Jules API - Session Mapping & Processing", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it("mapJulesSession should correctly map completed session and compute duration", () => {
        const mockJulesSession: JulesSession = {
            name: "projects/test/locations/global/sessions/session-456",
            state: "SUCCEEDED",
            createTime: "2026-08-20T10:00:00Z",
            updateTime: "2026-08-20T10:02:30Z",
            prompt: "Refactor database query",
            sourceContext: {
                source: "sources/github/owner/repo",
                githubRepoContext: { startingBranch: "main" }
            }
        };

        const result = mapJulesSession(mockJulesSession);
        expect(result.id).toBe("session-456");
        expect(result.status).toBe("COMPLETED");
        expect(result.repo).toBe("owner/repo");
        expect(result.duration).toBe("2m 30s");
        expect(result.task).toBe("Refactor database query");
    });

    it("mapJulesSession should parse markdown title from prompt", () => {
        const mockJulesSession: JulesSession = {
            name: "projects/test/locations/global/sessions/session-789",
            state: "RUNNING",
            createTime: new Date().toISOString(),
            prompt: "# Title Heading\nDetailed prompt description"
        };

        const result = mapJulesSession(mockJulesSession);
        expect(result.id).toBe("session-789");
        expect(result.status).toBe("RUNNING");
        expect(result.repo).toBe("Remote Session");
        expect(result.task).toBe("Title Heading");
    });

    it("mapJulesSession should handle seconds-only and hours duration formats", () => {
        const sessionShort: JulesSession = {
            name: "sessions/short-1",
            state: "COMPLETED",
            createTime: "2026-08-20T10:00:00Z",
            updateTime: "2026-08-20T10:00:45Z"
        };
        expect(mapJulesSession(sessionShort).duration).toBe("45s");

        const sessionLong: JulesSession = {
            name: "sessions/long-1",
            state: "FAILED",
            createTime: "2026-08-20T10:00:00Z",
            updateTime: "2026-08-20T12:15:00Z"
        };
        expect(mapJulesSession(sessionLong).duration).toBe("2h 15m");
    });
});

describe("Jules API - Network Operations", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it("createJulesSession should send appropriate payload for repoless sessions", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ name: "projects/test/sessions/new-session-123" })
        });
        globalThis.fetch = mockFetch;

        const result = await createJulesSession({
            task: "Analyze performance",
            automationMode: "AUTO_CREATE_PR"
        });

        expect(result.name).toBe("projects/test/sessions/new-session-123");
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("/sessions"),
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    prompt: "Analyze performance",
                    automationMode: "AUTO_CREATE_PR"
                })
            })
        );
    });

    it("createJulesSession should include sourceContext when repo is provided", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ name: "projects/test/sessions/repo-session-456" })
        });
        globalThis.fetch = mockFetch;

        await createJulesSession({
            task: "Security Audit",
            repo: "owner/repo",
            branch: "feature-branch",
            automationMode: "AUTO_MERGE_PR"
        });

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("/sessions"),
            expect.objectContaining({
                body: JSON.stringify({
                    prompt: "Security Audit",
                    automationMode: "AUTO_MERGE_PR",
                    sourceContext: {
                        source: "sources/github/owner/repo",
                        githubRepoContext: { startingBranch: "feature-branch" }
                    }
                })
            })
        );
    });

    it("createJulesSession should throw friendly error on 401/403", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 401
        });

        await expect(createJulesSession({ task: "Test" })).rejects.toThrow(
            "Invalid Jules Key: Please check your Google API Key in Settings."
        );
    });

    it("listJulesSessions should parse sessions array from API response", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                sessions: [
                    { name: "sessions/1", state: "SUCCEEDED", createTime: "2026-08-20T00:00:00Z" },
                    { name: "sessions/2", state: "RUNNING", createTime: "2026-08-20T00:00:00Z" }
                ]
            })
        });

        const res = await listJulesSessions();
        expect(res.sessions).toHaveLength(2);
        expect(res.sessions[0].name).toBe("sessions/1");
    });

    it("deleteJulesSession should issue DELETE request", async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({})
        });
        globalThis.fetch = mockFetch;

        await deleteJulesSession("test-session-id");
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("/sessions/test-session-id"),
            expect.objectContaining({ method: "DELETE" })
        );
    });
});

describe("Jules Accounts Serialization Validation", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it("saveAccounts should save valid profiles to localStorage", () => {
        const validProfiles = [{
            id: "default" as const,
            name: "Primary Profile",
            apiKey: "valid-jules-api-key-123",
            githubToken: "ghp_abc",
            hfToken: "hf_xyz",
            isActive: true
        }];

        saveAccounts(validProfiles);
        const retrieved = getAccounts();
        expect(retrieved).toHaveLength(1);
        expect(retrieved[0].name).toBe("Primary Profile");
    });

    it("saveAccounts should refuse to save invalid schemas", () => {
        const spyError = vi.spyOn(console, "error").mockImplementation(() => {});
        // @ts-expect-error test invalid schema write
        saveAccounts([{ id: 123, name: null }]);

        expect(spyError).toHaveBeenCalled();
        expect(localStorage.getItem("jules_accounts_v1")).toBeNull();
    });
});
