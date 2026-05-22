import { useState, useEffect, useMemo, useCallback } from "react";
import { createJulesSession, listJulesSessions, deleteJulesSession, getJulesSession, getActiveAccount, mapJulesSession, type CreateSessionParams, type JulesSession, type Session } from "@/lib/jules";
import { useStore } from "@/lib/store";

// Base storage key
const STORAGE_KEY_PREFIX = "jules_sessions_";

export function useJules() {
    const tokenStatus = useStore(state => state.tokenStatus.jules);
    const setTokenStatus = useStore(state => state.setTokenStatus);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);

    // Get active account to use as part of storage key
    const activeAccount = getActiveAccount();
    const storageKey = useMemo(() => 
        activeAccount ? `${STORAGE_KEY_PREFIX}${activeAccount.id}` : null,
    [activeAccount]);

    const loadSessions = useCallback(async (silent = false) => {
        if (!storageKey) return;

        const active = getActiveAccount();
        if (!active?.apiKey || active.apiKey.trim() === "") {
            setTokenStatus("jules", "missing");
            setSessions([]);
            return;
        }

        if (tokenStatus === "invalid" && !silent) {
            setLoading(false);
            return;
        }

        if (!silent) setLoading(true);
        setError(null);
        try {
            // 1. Load Local (source of truth for metadata like "task")
            const saved = localStorage.getItem(storageKey);
            let currentSessions: Session[] = saved ? JSON.parse(saved) : [];

            // 2. Load API (source of truth for status/existence)
            try {
                const data = await listJulesSessions();
                setTokenStatus("jules", "valid");
                if (data && data.sessions) {
                    // Map API sessions to our format
                    const apiSessions = data.sessions.map((s: JulesSession) => {
                        const id = s.name.split("/").pop(); // extract short ID
                        const localMatch = currentSessions.find(cs => cs.id === id);
                        return mapJulesSession(s, localMatch);
                    });

                    currentSessions = apiSessions;
                } else {
                    currentSessions = [];
                }
            } catch (apiErr) {
                // If API fails (e.g. invalid key), we might want to show error
                if (apiErr instanceof Error && (apiErr.message.includes("403") || apiErr.message.includes("401"))) {
                    setTokenStatus("jules", "invalid");
                    setError("API Key unauthorized. Please check your account settings.");
                } else {
                    console.warn("API List failed, utilizing local storage only:", apiErr instanceof Error ? apiErr.message : "Unknown error");
                }
            }

            setSessions(currentSessions);
        } catch (e) {
            console.error("Failed to load sessions:", e instanceof Error ? e.message : "Unknown error");
            setError("Failed to load sessions from storage.");
        } finally {
            if (!silent) setLoading(false);
        }
    }, [storageKey, tokenStatus, setTokenStatus]);

    useEffect(() => {
        loadSessions();
    }, [loadSessions]);

    // Polling for active sessions
    useEffect(() => {
        const hasActive = sessions.some(s => s.status === "RUNNING" || s.status === "PENDING");
        if (!hasActive) return;

        const interval = setInterval(() => {
            loadSessions(true); // silent refresh
        }, 10000); // 10s polling when active

        return () => clearInterval(interval);
    }, [sessions, loadSessions]);

    // Persist to local storage whenever sessions change
    useEffect(() => {
        if (storageKey && sessions.length >= 0) {
            localStorage.setItem(storageKey, JSON.stringify(sessions));
        }
    }, [sessions, storageKey]);

    const startSession = async (params: CreateSessionParams) => {
        setCreating(true);
        setError(null);
        try {
            const apiResponse = await createJulesSession(params);
            const realId = apiResponse.name.split("/").pop();

            const newSession: Session = {
                id: realId,
                status: "RUNNING",
                createdAt: new Date().toISOString(),
                duration: "0s",
                ...params,
                branch: params.branch || "main",
                automationMode: params.automationMode
            };

            setSessions(prev => [newSession, ...prev]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create session");
            throw err;
        } finally {
            setCreating(false);
        }
    };

    const deleteSessions = async (ids: string[]) => {
        try {
            // Optimistic update: remove from UI immediately
            setSessions(prev => prev.filter(s => !ids.includes(s.id)));

            // Fire and forget server deletes (or await if we wanted loading state)
            await Promise.all(ids.map(id => deleteJulesSession(id)));
        } catch (e: unknown) {
            console.error("Failed to delete sessions server-side:", e instanceof Error ? e.message : "Unknown error");
            // Optionally revert local state here if strict consistency needed
            // For now, just logging error is acceptable for MVP
        }
    };

    const clearSessions = () => deleteSessions(sessions.map(s => s.id));

    // Expose getJulesSession for direct consumption if needed (e.g. detailed view)
    const getSessionDetails = async (id: string) => {
        return await getJulesSession(id);
    };

    return { sessions, startSession, creating, loading, error, refresh: () => loadSessions(), deleteSessions, clearSessions, getSessionDetails };
}
