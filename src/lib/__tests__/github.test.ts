import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserRepos, getStarredRepos, getNotificationSubjectDetail } from "../github";
import { Octokit } from "@octokit/core";

// Mock Octokit
vi.mock("@octokit/core", () => {
    const Octokit = vi.fn();
    Octokit.prototype.request = vi.fn();
    return { Octokit };
});

// Mock jules.ts
vi.mock("../jules", () => ({
    getGithubToken: vi.fn(() => "test-token"),
}));

describe("GitHub API - Concurrent Pagination", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("getUserRepos should fetch only page 1 if it has less than 100 items", async () => {
        const mockRepos = Array(50).fill({ id: 1, name: "repo" });
        const mockRequest = vi.mocked(Octokit.prototype.request);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockRequest.mockResolvedValueOnce({ data: mockRepos } as any);

        const repos = await getUserRepos();

        expect(mockRequest).toHaveBeenCalledTimes(1);
        expect(mockRequest).toHaveBeenCalledWith(expect.stringContaining("GET /user/repos"), expect.objectContaining({ page: 1 }));
        expect(repos).toHaveLength(50);
    });

    it("getUserRepos should fetch pages 2-10 in parallel if page 1 has 100 items", async () => {
        const page1 = Array(100).fill({ id: 1, name: "p1" });
        const page2 = Array(10).fill({ id: 2, name: "p2" });
        
        const mockRequest = vi.mocked(Octokit.prototype.request);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockRequest.mockResolvedValueOnce({ data: page1 } as any);
        
        for (let i = 2; i <= 10; i++) {
            if (i === 2) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mockRequest.mockResolvedValueOnce({ data: page2 } as any);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mockRequest.mockResolvedValueOnce({ data: [] } as any);
            }
        }

        const repos = await getUserRepos();

        expect(mockRequest).toHaveBeenCalledTimes(10);
        
        const requestedPages = mockRequest.mock.calls.map(call => call[1]?.page);
        expect(requestedPages).toContain(1);
        expect(requestedPages).toContain(2);
        expect(requestedPages).toContain(10);
        
        expect(repos).toHaveLength(110);
    });

    it("getUserRepos should handle API errors gracefully", async () => {
        const mockRequest = vi.mocked(Octokit.prototype.request);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockRequest.mockRejectedValueOnce({ status: 401, message: "Unauthorized" } as any);

        await expect(getUserRepos()).rejects.toThrow("Unauthorized");
    });

    it("getStarredRepos should fetch pages 2-5 in parallel if page 1 has 100 items", async () => {
        const page1 = Array(100).fill({ id: 1, name: "p1" });
        const page2 = Array(10).fill({ id: 2, name: "p2" });
        
        const mockRequest = vi.mocked(Octokit.prototype.request);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockRequest.mockResolvedValueOnce({ data: page1 } as any);
        
        for (let i = 2; i <= 5; i++) {
            if (i === 2) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mockRequest.mockResolvedValueOnce({ data: page2 } as any);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mockRequest.mockResolvedValueOnce({ data: [] } as any);
            }
        }

        const repos = await getStarredRepos();

        expect(mockRequest).toHaveBeenCalledTimes(5);
        
        const requestedPages = mockRequest.mock.calls.map(call => call[1]?.page);
        expect(requestedPages).toContain(1);
        expect(requestedPages).toContain(2);
        expect(requestedPages).toContain(5);
        
        expect(repos).toHaveLength(110);
    });
});

describe("GitHub API - Security: URL Injection Guard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("getNotificationSubjectDetail should reject URLs pointing to non-GitHub API hosts", async () => {
        // An attacker-controlled notification could embed a crafted URL
        await expect(
            getNotificationSubjectDetail("https://attacker.com/users/victim/repos")
        ).rejects.toThrow("Blocked request to non-GitHub API host: attacker.com");
    });

    it("getNotificationSubjectDetail should reject localhost URLs", async () => {
        await expect(
            getNotificationSubjectDetail("https://localhost:8080/api/admin")
        ).rejects.toThrow("Blocked request to non-GitHub API host: localhost");
    });

    it("getNotificationSubjectDetail should accept valid api.github.com URLs", async () => {
        const mockRequest = vi.mocked(Octokit.prototype.request);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockRequest.mockResolvedValueOnce({ data: { title: "Test PR", body: "Test body" } } as any);

        const result = await getNotificationSubjectDetail("https://api.github.com/repos/owner/repo/pulls/1");
        expect(result).toEqual({ title: "Test PR", body: "Test body" });
        expect(mockRequest).toHaveBeenCalledWith("GET /repos/owner/repo/pulls/1", expect.anything());
    });
});
