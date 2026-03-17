import { useState, useEffect, useCallback } from "react";
import { getUserRepos, getOctokit, mapGithubRepo } from "@/lib/github";
import { useStore } from "@/lib/store";
import { CachePolicy } from "@/lib/cache";

export interface GithubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    clone_url: string;
    ssh_url: string;
    updated_at: string;
    default_branch: string;
    is_template: boolean;
    owner: {
        login: string;
        avatar_url: string;
    };
    template_repository?: {
        owner: { login: string };
        name: string;
        full_name: string;
        html_url: string;
    } | null;
}

export function useGithubRepos() {
    const activeAccount = useStore(state => state.activeAccount);
    const updateCache = useStore(state => state.updateCache);
    const tokenStatus = useStore(state => state.tokenStatus.github);
    const setTokenStatus = useStore(state => state.setTokenStatus);
    const cachedRepos = useStore(state => state.cache.repos);

    const [repos, setRepos] = useState<GithubRepo[]>(cachedRepos.data);
    const [loading, setLoading] = useState(cachedRepos.timestamp === 0);
    const [error, setError] = useState<string | null>(null);

    // Sync repos when cache changes (e.g., from other components or storage events)
    useEffect(() => {
        if (cachedRepos.data.length > 0 && repos.length === 0) {
            setRepos(cachedRepos.data);
            setLoading(false);
        }
    }, [cachedRepos.data, repos.length]);

    const fetchRepos = useCallback(async (force = false) => {
        const token = activeAccount?.githubToken;
        if (!token || token.trim() === "") {
            setRepos([]);
            setLoading(false);
            setTokenStatus("github", "missing");
            return;
        }

        if (tokenStatus === "invalid" && !force) {
            setLoading(false);
            return;
        }

        const currentCache = useStore.getState().cache.repos;

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
            let aggregatedRepos: GithubRepo[] = [];
            
            const handleIncrementalUpdate = (batch: Record<string, unknown>[]) => {
                const mappedBatch = batch.map(mapGithubRepo);
                
                aggregatedRepos = [...aggregatedRepos, ...mappedBatch];
                // Update state incrementally
                setRepos(aggregatedRepos);
                // Also update cache incrementally so user sees results on refresh
                updateCache("repos", aggregatedRepos);
            };

            await getUserRepos(handleIncrementalUpdate);
            setTokenStatus("github", "valid");
        } catch (e: unknown) {
            const err = e as { status?: number };
            if (err.status === 401 || err.status === 403) {
                setTokenStatus("github", "invalid");
            } else {
                console.error("GitHub Fetch Error:", e);
            }
            setError("Failed to load repositories");
        } finally {
            setLoading(false);
        }
    }, [activeAccount, updateCache, tokenStatus, setTokenStatus]);

    useEffect(() => {
        fetchRepos();
    }, [fetchRepos]);

    const deleteRepo = async (id: number) => {
        const repo = repos.find(r => r.id === id);
        if (!repo) return;

        const typedName = window.prompt(`To delete ${repo.full_name}, type the repository name below. THIS ACTION IS PERMANENT!`);
        
        if (typedName === null) return; // User cancelled

        if (typedName !== repo.name) {
            alert(`Incorrect name. Expected "${repo.name}" but got "${typedName}". Deletion aborted.`);
            return;
        }

        try {
            const [owner, name] = repo.full_name.split("/");

            await getOctokit().request("DELETE /repos/{owner}/{repo}", {
                owner,
                repo: name
            });

            setRepos(prev => prev.filter(r => r.id !== id));
        } catch (e: unknown) {
            console.error("Failed to delete repo", e);
            const err = e as { status?: number };
            if (err.status === 404 || err.status === 403) {
                alert("Failed to delete repository. Please ensure your GitHub token has the 'delete_repo' scope enabled.");
            } else {
                alert("Failed to delete repository. Check console for details.");
            }
        }
    };

    return { repos, loading, error, deleteRepo, refetch: fetchRepos };
}
