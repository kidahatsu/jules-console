import { useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStarredRepos, unstarRepo as githubUnstar, mapGithubRepo, type GithubRepo } from "@/lib/github";
import { getJulesSession, getJulesActivities } from "@/lib/jules";
import { useStore } from "@/lib/store";
import { StarredReviewService } from "@/lib/starredReviews";

export type ReviewStatus = "TO_REVIEW" | "REVIEWED" | "REJECTED";

export interface StarredRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    clone_url: string;
    ssh_url: string;
    language: string | null;
    stargazers_count: number;
    updated_at: string;
    default_branch: string;
    owner: {
        login: string;
        avatar_url: string;
    };
    reviewStatus: ReviewStatus;
    notes?: string;
    activeSessionId?: string;
}

export function useStarredRepos() {
    const activeAccount = useStore(state => state.activeAccount);
    const updateCache = useStore(state => state.updateCache);
    const queryClient = useQueryClient();

    const queryKey = useMemo(() => ["starred-repos", activeAccount?.id], [activeAccount?.id]);

    const { data: repos = [], isLoading, isFetching, error, refetch } = useQuery({
        queryKey,
        queryFn: async () => {
            if (!activeAccount?.githubToken) return [];
            
            // Load local review metadata
            const reviewsMap = StarredReviewService.getReviews();
            
            const handleUpdate = (batch: GithubRepo[]) => {
                const mapped = batch.map(r => {
                    const base = mapGithubRepo(r);
                    const review = reviewsMap[base.id];
                    return {
                        ...base,
                        reviewStatus: (review?.status as ReviewStatus) || "TO_REVIEW",
                        notes: review?.notes,
                        activeSessionId: review?.activeSessionId
                    };
                });
                // Update the query data immediately for the first page
                queryClient.setQueryData(queryKey, mapped);
            };

            const rawRepos = await getStarredRepos(handleUpdate);
            
            return (rawRepos as unknown as GithubRepo[]).map(r => {
                const base = mapGithubRepo(r);
                const review = reviewsMap[base.id];
                return {
                    ...base,
                    reviewStatus: (review?.status as ReviewStatus) || "TO_REVIEW",
                    notes: review?.notes,
                    activeSessionId: review?.activeSessionId
                };
            });
        },
        enabled: !!activeAccount?.githubToken,
        placeholderData: (prev) => prev,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });

    // 2. Persist Updates
    const saveToLocalAndCache = useCallback((data: StarredRepo[]) => {
        StarredReviewService.persistList(data);
        updateCache("starred", data);
        refetch(); // Refresh list to reflect persistence changes
    }, [updateCache, refetch]);

    const updateReview = (id: number, status: ReviewStatus, notes?: string) => {
        const next = repos.map(repo => 
            repo.id === id ? { ...repo, reviewStatus: status, notes } : repo
        );
        saveToLocalAndCache(next);
    };

    const bindSession = useCallback((repoId: number, sessionId: string) => {
        const next = repos.map(repo => 
            repo.id === repoId ? { ...repo, activeSessionId: sessionId } : repo
        );
        saveToLocalAndCache(next);
    }, [repos, saveToLocalAndCache]);

    const clearSession = useCallback((repoId: number) => {
        const next = repos.map(repo => 
            repo.id === repoId ? { ...repo, activeSessionId: undefined } : repo
        );
        saveToLocalAndCache(next);
    }, [repos, saveToLocalAndCache]);

    // 3. Background Polling for Session Completion
    useEffect(() => {
        const activeRepos = repos.filter(r => !!r.activeSessionId);
        if (activeRepos.length === 0) return;

        const interval = setInterval(async () => {
            for (const repo of activeRepos) {
                if (!repo.activeSessionId) continue;
                try {
                    const session = await getJulesSession(repo.activeSessionId);
                    if (session.state === "COMPLETED" || session.state === "SUCCEEDED") {
                        const activityData = await getJulesActivities(repo.activeSessionId);
                        const activities: { activityType?: string; description?: string; message?: string }[] = activityData.activities || [];
                        
                        const reportSummary = activities
                            .filter(a => a.activityType === "SUMMARY" || a.activityType === "MESSAGE_FROM_AGENT")
                            .map(a => a.description || a.message || "")
                            .join("\n\n");

                        const finalReport = `### 🤖 Jules Architectural Report (${new Date().toLocaleDateString()})\n\n${reportSummary || "Analysis completed successfully. See session for details."}`;

                        const next = repos.map(r => 
                            r.id === repo.id 
                            ? { 
                                ...r, 
                                notes: r.notes ? `${finalReport}\n\n---\n\n${r.notes}` : finalReport,
                                activeSessionId: undefined,
                                reviewStatus: "REVIEWED" as ReviewStatus 
                              } 
                            : r
                        );
                        saveToLocalAndCache(next);
                    } else if (session.state === "FAILED" || session.state === "CANCELLED") {
                        clearSession(repo.id);
                    }
                } catch (e) {
                    console.warn(`Failed to poll session ${repo.activeSessionId}:`, e instanceof Error ? e.message : "Unknown error");
                }
            }
        }, 10000); // Poll every 10s

        return () => clearInterval(interval);
    }, [repos, clearSession, saveToLocalAndCache]);

    const unstar = async (repo: StarredRepo) => {
        try {
            await githubUnstar(repo.owner.login, repo.name);
            StarredReviewService.deleteReview(repo.id);
            refetch();
        } catch (err) {
            console.error("Failed to unstar repo", err instanceof Error ? err.message : "Unknown error");
            throw err;
        }
    };

    const stats = useMemo(() => ({
        toReview: repos.filter(r => r.reviewStatus === "TO_REVIEW").length,
        reviewed: repos.filter(r => r.reviewStatus === "REVIEWED").length,
        rejected: repos.filter(r => r.reviewStatus === "REJECTED").length,
        total: repos.length
    }), [repos]);

    return { 
        repos, 
        loading: isLoading, 
        isRevalidating: isFetching,
        error: error ? (error as Error).message : null, 
        updateReview, 
        unstar,
        bindSession,
        stats, 
        refetch: () => { refetch(); }
    };
}
