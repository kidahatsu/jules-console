// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StarredReviewService, type StarredReviewMap } from "../starredReviews";

describe("StarredReviewService", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it("getReviews should return empty object when storage is empty", () => {
        expect(StarredReviewService.getReviews()).toEqual({});
    });

    it("saveReviews should validate and persist reviews with numeric keys", () => {
        const testData: StarredReviewMap = {
            101: {
                status: "REVIEWED",
                notes: "Great architecture",
                activeSessionId: "session-abc"
            },
            102: {
                status: "REJECTED",
                notes: "Deprecated repository"
            }
        };

        StarredReviewService.saveReviews(testData);
        const retrieved = StarredReviewService.getReviews();

        expect(retrieved[101]).toBeDefined();
        expect(retrieved[101].status).toBe("REVIEWED");
        expect(retrieved[101].notes).toBe("Great architecture");
        expect(retrieved[101].activeSessionId).toBe("session-abc");
        expect(retrieved[102].status).toBe("REJECTED");
    });

    it("saveReviews should reject invalid schema and refuse to save", () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        // @ts-expect-error Testing invalid schema write
        StarredReviewService.saveReviews({ 101: { status: "INVALID_STATUS" } });

        expect(errorSpy).toHaveBeenCalled();
        expect(localStorage.getItem("starred_repo_reviews_v1")).toBeNull();
    });

    it("persistList should filter out default TO_REVIEW without notes and save active ones", () => {
        StarredReviewService.persistList([
            { id: 201, reviewStatus: "TO_REVIEW" }, // should be ignored
            { id: 202, reviewStatus: "REVIEWED", notes: "Approved" },
            { id: 203, reviewStatus: "TO_REVIEW", activeSessionId: "active-123" }
        ]);

        const retrieved = StarredReviewService.getReviews();
        expect(retrieved[201]).toBeUndefined();
        expect(retrieved[202]).toBeDefined();
        expect(retrieved[202].status).toBe("REVIEWED");
        expect(retrieved[203]).toBeDefined();
        expect(retrieved[203].activeSessionId).toBe("active-123");
    });

    it("deleteReview should remove specific review by ID", () => {
        StarredReviewService.saveReviews({
            301: { status: "REVIEWED", notes: "Keep" },
            302: { status: "REJECTED", notes: "Delete me" }
        });

        StarredReviewService.deleteReview(302);
        const retrieved = StarredReviewService.getReviews();

        expect(retrieved[301]).toBeDefined();
        expect(retrieved[302]).toBeUndefined();
    });
});
