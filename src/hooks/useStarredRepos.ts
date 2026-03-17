import { useState, useEffect, useCallback, useMemo } from "react";
import { getStarredRepos, unstarRepo as githubUnstar, mapGithubRepo } from "@/lib/github";
import { getJulesSession, getJulesActivities } from "@/lib/jules";
import { useStore } from "@/lib/store";
import { CachePolicy } from "@/lib/cache";
import { StarredReviewService } from "@/lib/starredReviews";

export type ReviewStatus = "TO_REVIEW" | "REVIEWED" | "REJECTED";

export interface StarredRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
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
    const cachedStarred = useStore(state => state.cache.starred);

    const [repos, setRepos] = useState<StarredRepo[]>(cachedStarred.data);
    const [loading, setLoading] = useState(cachedStarred.timestamp === 0);
    const [error, setError] = useState<string | null>(null);

    // 1. Fetch from API + Load from Local Storage
    const fetchStarred = useCallback(async (force = false) => {
        if (!activeAccount?.githubToken) {
            setRepos([]);
            setLoading(false);
            return;
        }

        const currentCache = useStore.getState().cache.starred;

        // Cache Hit Verification
        const isFresh = CachePolicy.isFresh(currentCache, CachePolicy.STANDARD_TTL);
        const hasValidStructure = CachePolicy.isValidList(currentCache.data, "owner");

        if (!force && isFresh && hasValidStructure && currentCache.data.length > 0) {
            setRepos(currentCache.data);
            setLoading(false);
            return;
        }

        if (force || currentCache.timestamp === 0) {
            setLoading(true);
        }

        setError(null);
        try {
            // Load local review metadata
            const reviewsMap = StarredReviewService.getReviews();
            let aggregatedRepos: StarredRepo[] = [];
            
            const handleIncrementalUpdate = (batch: Record<string, unknown>[]) => {
                const mappedBatch: StarredRepo[] = batch.map(r => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const item = r as any as { language?: string; stargazers_count?: number };
                    const base = mapGithubRepo(r);
                    const review = reviewsMap[base.id];
                    return {
                        ...base,
                        language: item.language || null,
                        stargazers_count: item.stargazers_count || 0,
                        reviewStatus: review?.status || "TO_REVIEW",
                        notes: review?.notes,
                        activeSessionId: review?.activeSessionId
                    };
                });
                
                aggregatedRepos = [...aggregatedRepos, ...mappedBatch];
                setRepos(aggregatedRepos);
                updateCache("starred", aggregatedRepos);
            };

            await getStarredRepos(handleIncrementalUpdate);
        } catch (err) {
            console.error("Failed to load starred repos", err);
            setError("Failed to load starred repositories.");
        } finally {
            setLoading(false);
        }
    }, [activeAccount, updateCache]);

    useEffect(() => {
        fetchStarred();
    }, [fetchStarred]);

    // 2. Persist Updates
    const saveToLocalAndCache = useCallback((data: StarredRepo[]) => {
        StarredReviewService.persistList(data);
        updateCache("starred", data);
    }, [updateCache]);

    const updateReview = (id: number, status: ReviewStatus, notes?: string) => {
        setRepos(prev => {
            const next = prev.map(repo => 
                repo.id === id ? { ...repo, reviewStatus: status, notes } : repo
            );
            saveToLocalAndCache(next);
            return next;
        });
    };

    const bindSession = useCallback((repoId: number, sessionId: string) => {
        setRepos(prev => {
            const next = prev.map(repo => 
                repo.id === repoId ? { ...repo, activeSessionId: sessionId } : repo
            );
            saveToLocalAndCache(next);
            return next;
        });
    }, [saveToLocalAndCache]);

    const clearSession = useCallback((repoId: number) => {
        setRepos(prev => {
            const next = prev.map(repo => 
                repo.id === repoId ? { ...repo, activeSessionId: undefined } : repo
            );
            saveToLocalAndCache(next);
            return next;
        });
    }, [saveToLocalAndCache]);

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

                        setRepos(prev => {
                            const next = prev.map(r => 
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
                            return next;
                        });
                    } else if (session.state === "FAILED" || session.state === "CANCELLED") {
                        clearSession(repo.id);
                    }
                } catch (e) {
                    console.warn(`Failed to poll session ${repo.activeSessionId}`, e);
                }
            }
        }, 10000); // Poll every 10s

        return () => clearInterval(interval);
    }, [repos, clearSession, saveToLocalAndCache]);

    const unstar = async (repo: StarredRepo) => {
        try {
            setRepos(prev => prev.filter(r => r.id !== repo.id));
            await githubUnstar(repo.owner.login, repo.name);
            StarredReviewService.deleteReview(repo.id);
        } catch (err) {
            console.error("Failed to unstar repo", err);
            fetchStarred();
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
        loading, 
        error, 
        updateReview, 
        unstar,
        bindSession,
        stats, 
        refetch: fetchStarred 
    };
}
