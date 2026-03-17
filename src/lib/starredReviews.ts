import type { ReviewStatus } from "@/hooks/useStarredRepos";

const STORAGE_KEY = "starred_repo_reviews_v1";

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
        return saved ? JSON.parse(saved) : {};
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
