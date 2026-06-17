import { z } from "zod";
import type { ReviewStatus } from "@/hooks/useStarredRepos";

const STORAGE_KEY = "starred_repo_reviews_v1";

const StarredReviewMapSchema = z.record(z.string(), z.object({
    status: z.enum(["TO_REVIEW", "REVIEWED", "REJECTED"]),
    notes: z.string().optional(),
    activeSessionId: z.string().optional()
}));

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
            const parsed = JSON.parse(saved);
            const result = StarredReviewMapSchema.safeParse(parsed);
            if (!result.success) return {};
            return result.data as unknown as StarredReviewMap;
        } catch {
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
