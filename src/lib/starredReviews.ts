import { z } from "zod";
import type { ReviewStatus } from "@/hooks/useStarredRepos";

const STORAGE_KEY = "starred_repo_reviews_v1";

const StarredReviewSchema = z.object({
    status: z.enum(["TO_REVIEW", "REVIEWED", "REJECTED"]).catch("TO_REVIEW"),
    notes: z.string().optional(),
    activeSessionId: z.string().optional()
});

const StarredReviewMapSchema = z.record(z.string(), StarredReviewSchema);

export interface StarredReview {
    status: ReviewStatus;
    notes?: string;
    activeSessionId?: string;
}

export type StarredReviewMap = Record<number, StarredReview>;

/**
 * Service for persisting starred repository reviews and telemetry metadata.
 */
export const StarredReviewService = {
    /**
     * Retrieves all saved reviews from local storage.
     */
    getReviews: (): StarredReviewMap => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return {};
        try {
            let parsed = JSON.parse(saved);

            // Legacy migration: ensure parsed is an object and handle missing fields
            if (typeof parsed !== "object" || parsed === null) {
                parsed = {};
            }

            for (const key of Object.keys(parsed)) {
                if (!parsed[key] || typeof parsed[key] !== "object") {
                    parsed[key] = { status: "TO_REVIEW" };
                } else if (!parsed[key].status) {
                    parsed[key].status = "TO_REVIEW";
                }
            }

            const result = StarredReviewMapSchema.safeParse(parsed);
            if (!result.success) {
                console.error("Failed to parse reviews:", result.error.message);
                return {};
            }
            return result.data as unknown as StarredReviewMap;
        } catch (e) {
            console.error("Error:", e instanceof Error ? e.message : "Unknown error");
            return {};
        }
    },

    /**
     * Saves a full map of reviews to local storage.
     */
    saveReviews: (data: StarredReviewMap): void => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    },

    /**
     * Syncs a list of StarredRepo objects into the local storage map.
     */
    persistList: (repos: { id: number; reviewStatus: ReviewStatus; notes?: string; activeSessionId?: string }[]): void => {
        const reviewsMap: StarredReviewMap = {};
        repos.forEach(r => {
            if (r.reviewStatus !== "TO_REVIEW" || r.notes || r.activeSessionId) {
                reviewsMap[r.id] = { 
                    status: r.reviewStatus, 
                    notes: r.notes,
                    activeSessionId: r.activeSessionId
                };
            }
        });
        StarredReviewService.saveReviews(reviewsMap);
    },

    /**
     * Removes a specific review from storage.
     */
    deleteReview: (id: number): void => {
        const reviews = StarredReviewService.getReviews();
        delete reviews[id];
        StarredReviewService.saveReviews(reviews);
    }
};
