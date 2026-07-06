import { z } from "zod";
import type { ReviewStatus } from "@/hooks/useStarredRepos";

const STORAGE_KEY = "starred_repo_reviews_v1";

export interface StarredReview {
    status: ReviewStatus;
    notes?: string;
    activeSessionId?: string;
}

export type StarredReviewMap = Record<number, StarredReview>;

const StarredReviewSchema = z.object({
    status: z.enum(["TO_REVIEW", "REVIEWED", "REJECTED"]),
    notes: z.string().optional(),
    activeSessionId: z.string().optional()
}).passthrough();

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
            const parsed = JSON.parse(saved);
            if (typeof parsed !== "object" || parsed === null) return {};

            const validMap: StarredReviewMap = {};
            for (const [key, value] of Object.entries(parsed)) {
                const numKey = Number(key);
                if (isNaN(numKey)) continue;

                const result = StarredReviewSchema.safeParse(value);
                if (result.success) {
                    validMap[numKey] = result.data as StarredReview;
                }
            }
            return validMap;
        } catch (err) {
            console.error("Error parsing starred reviews:", err instanceof Error ? err.message : "Unknown error");
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
