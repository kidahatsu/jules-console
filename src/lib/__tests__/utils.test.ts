import { describe, it, expect } from "vitest";
import { extractSessionId, githubApiToWebUrl, cn } from "../utils";

describe("Utility Functions", () => {
    describe("extractSessionId", () => {
        it("should return the raw ID if passed directly", () => {
            expect(extractSessionId("session-12345")).toBe("session-12345");
            expect(extractSessionId("  session-abc  ")).toBe("session-abc");
        });

        it("should extract ID from Jules Web UI URL", () => {
            expect(extractSessionId("https://jules.google.com/session/abc-123-xyz")).toBe("abc-123-xyz");
            expect(extractSessionId("https://jules.google.com/session/abc-123-xyz/details")).toBe("abc-123-xyz");
        });

        it("should extract ID from Jules API Resource Name", () => {
            expect(extractSessionId("projects/test-project/locations/us-central1/sessions/session-999")).toBe("session-999");
        });
    });

    describe("githubApiToWebUrl", () => {
        it("should convert GitHub API PR URL to web PR URL", () => {
            const apiUrl = "https://api.github.com/repos/owner/repo/pulls/42";
            expect(githubApiToWebUrl(apiUrl)).toBe("https://github.com/owner/repo/pull/42");
        });

        it("should convert GitHub API Issue URL to web Issue URL", () => {
            const apiUrl = "https://api.github.com/repos/owner/repo/issues/10";
            expect(githubApiToWebUrl(apiUrl)).toBe("https://github.com/owner/repo/issues/10");
        });

        it("should return original URL if not a github API url", () => {
            expect(githubApiToWebUrl("https://example.com/item/1")).toBe("https://example.com/item/1");
            expect(githubApiToWebUrl("")).toBe("");
        });
    });

    describe("cn", () => {
        it("should merge classes cleanly using clsx and tailwind-merge", () => {
            expect(cn("px-2 py-1", "bg-primary", { "text-white": true, "hidden": false })).toBe("px-2 py-1 bg-primary text-white");
            expect(cn("px-2", "px-4")).toBe("px-4");
        });
    });
});
