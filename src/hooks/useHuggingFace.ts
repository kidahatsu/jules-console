import { useState, useEffect, useCallback, useMemo } from "react";
import { getUserModels, getUserSpaces, getHuggingFaceUser, type HFModel, type HFSpace } from "@/lib/huggingface";
import { useStore } from "@/lib/store";
import { CachePolicy } from "@/lib/cache";

export function useHuggingFace() {
    const activeAccount = useStore(state => state.activeAccount);
    const updateCache = useStore(state => state.updateCache);
    const tokenStatus = useStore(state => state.tokenStatus.hf);
    const setTokenStatus = useStore(state => state.setTokenStatus);
    const cachedData = useStore(state => state.cache.huggingface);

    const [models, setModels] = useState<HFModel[]>(cachedData.data.models);
    const [spaces, setSpaces] = useState<HFSpace[]>(cachedData.data.spaces);
    const [loading, setLoading] = useState(cachedData.timestamp === 0);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async (force = false) => {
        const token = activeAccount?.hfToken;
        if (!token || token.trim() === "") {
            setModels([]);
            setSpaces([]);
            setLoading(false);
            setTokenStatus("hf", "missing");
            return;
        }

        if ((tokenStatus === "invalid" || tokenStatus === "insufficient_permissions") && !force) {
            setLoading(false);
            return;
        }

        const currentCache = useStore.getState().cache.huggingface;

        // Cache Hit Verification
        const isFresh = CachePolicy.isFresh(currentCache, CachePolicy.ASSET_TTL);
        if (!force && isFresh && (currentCache.data.models.length > 0 || currentCache.data.spaces.length > 0)) {
            setModels(currentCache.data.models);
            setSpaces(currentCache.data.spaces);
            setLoading(false);
            return;
        }

        if (force || currentCache.timestamp === 0) {
            setLoading(true);
        }

        try {
            // First get the username context
            const user = await getHuggingFaceUser(token);
            if (!user) {
                setTokenStatus("hf", "invalid");
                setLoading(false);
                return;
            }
            if (!user.name) throw new Error("Could not retrieve HF username.");

            const [fetchedModels, fetchedSpaces] = await Promise.all([
                getUserModels(token, user.name),
                getUserSpaces(token, user.name)
            ]);
            setModels(fetchedModels);
            setSpaces(fetchedSpaces);
            updateCache("huggingface", { models: fetchedModels, spaces: fetchedSpaces });
            setError(null);
            setTokenStatus("hf", "valid");
        } catch (err: unknown) {
            const e = err as { status?: number };
            if (e.status === 401) {
                setTokenStatus("hf", "invalid");
            } else if (e.status === 403) {
                setTokenStatus("hf", "insufficient_permissions");
            } else {
                console.error("HF Fetch Error:", err);
            }
            setError("Failed to fetch Hugging Face assets. Check your token permissions.");
        } finally {
            setLoading(false);
        }
    }, [activeAccount, updateCache, tokenStatus, setTokenStatus]);

    useEffect(() => {
        fetchData();
        
        // Polling for space status every 45 seconds
        const interval = setInterval(fetchData, 45000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const stats = useMemo(() => ({
        totalModels: models.length,
        totalSpaces: spaces.length,
        activeSpaces: spaces.filter(s => s.runtime?.stage === "RUNNING").length,
        sleepingSpaces: spaces.filter(s => s.runtime?.stage === "SLEEPING").length
    }), [models, spaces]);

    return {
        models,
        spaces,
        loading,
        error,
        refetch: fetchData,
        stats
    };
}
