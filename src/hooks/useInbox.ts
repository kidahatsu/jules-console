import { useState, useEffect, useCallback } from "react";
import { getNotifications, markNotificationRead, getNotificationSubjectDetail, markAllNotificationsRead, unsubscribeFromThread } from "@/lib/github";
import { getUserDiscussions, getHuggingFaceUser, type HFDiscussion } from "@/lib/huggingface";
import { useStore } from "@/lib/store";
import { getGithubToken } from "@/lib/jules";
import { githubApiToWebUrl } from "@/lib/utils";
import { CachePolicy } from "@/lib/cache";

export interface UnifiedNotification {
// ... UnifiedNotification interface ...
    id: string;
    source: "GITHUB" | "HUGGINGFACE";
    category: string; // GitHub 'reason' or HF 'status'
    title: string;
    body?: string;
    type: "PR" | "ISSUE" | "DISCUSSION" | "MENTION" | "OTHER";
    author: string;
    repo: string;
    url: string;
    apiUrl?: string;
    createdAt: string;
    unread: boolean;
    raw: unknown;
}

export function useInbox() {
    const activeAccount = useStore(state => state.activeAccount);
    const updateCache = useStore(state => state.updateCache);
    const tokenStatusGh = useStore(state => state.tokenStatus.github);
    const tokenStatusHf = useStore(state => state.tokenStatus.hf);
    const setTokenStatus = useStore(state => state.setTokenStatus);
    const cachedInbox = useStore(state => state.cache.inbox);

    const [notifications, setNotifications] = useState<UnifiedNotification[]>(cachedInbox.data);
    const [loading, setLoading] = useState(cachedInbox.timestamp === 0);
    const [error, setError] = useState<string | null>(null);

    const fetchInbox = useCallback(async (force = false) => {
        const ghToken = activeAccount?.githubToken;
        const hfToken = activeAccount?.hfToken;

        const skipGh = (!ghToken || tokenStatusGh === "invalid" || tokenStatusGh === "insufficient_permissions") && !force;
        const skipHf = (!hfToken || tokenStatusHf === "invalid" || tokenStatusHf === "insufficient_permissions") && !force;

        if (skipGh && skipHf) {
            setLoading(false);
            if (!ghToken && !hfToken) {
                setNotifications([]);
            }
            return;
        }

        // Access cache directly from store to avoid dependency loop
        const currentCache = useStore.getState().cache.inbox;

        // Cache Hit Verification
        const isFresh = CachePolicy.isFresh(currentCache, CachePolicy.INBOX_TTL);
        if (!force && isFresh && currentCache.data.length > 0) {
            setNotifications(currentCache.data);
            setLoading(false);
            return;
        }

        if (force || currentCache.timestamp === 0) {
            setLoading(true);
        }

        try {
            const results = await Promise.allSettled([
                !skipGh ? getNotifications() : Promise.resolve([]),
                !skipHf ? (async () => {
                    const user = await getHuggingFaceUser(hfToken!);
                    if (!user) return [];
                    return await getUserDiscussions(hfToken!, user.name);
                })() : Promise.resolve([])
            ]);

            let mappedGh: UnifiedNotification[] = [];
            let mappedHf: UnifiedNotification[] = [];
            const fetchErrors: string[] = [];

            if (results[0].status === "fulfilled") {
                const ghData = results[0].value;
                if (!skipGh) setTokenStatus("github", "valid");
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mappedGh = (ghData as any[]).map(item => {
                    return {
                        id: item.id,
                        source: "GITHUB",
                        category: item.reason,
                        title: item.subject.title,
                        body: "",
                        type: item.subject.type === "PullRequest" ? "PR" : item.subject.type === "Issue" ? "ISSUE" : "OTHER",
                        author: item.repository.owner.login,
                        repo: item.repository.full_name,
                        url: githubApiToWebUrl(item.subject.url),
                        apiUrl: item.subject.url,
                        createdAt: item.updated_at,
                        unread: item.unread,
                        raw: item
                    };
                });
            } else {
                const err = results[0].reason as { status?: number };
                if (err?.status === 401 || err?.status === 403) {
                    setTokenStatus("github", "invalid");
                } else {
                    console.error("GitHub Fetch Error:", results[0].reason instanceof Error ? results[0].reason.message : "Unknown error");
                }
                fetchErrors.push("GitHub signals offline.");
            }

            if (results[1].status === "fulfilled") {
                const hfData = results[1].value;
                if (!skipHf) setTokenStatus("hf", "valid");
                mappedHf = (hfData as HFDiscussion[]).map(d => ({
                    id: d.id,
                    source: "HUGGINGFACE",
                    category: d.status,
                    title: d.title,
                    body: "",
                    type: d.isPullRequest ? "PR" : "DISCUSSION",
                    author: d.author,
                    repo: d.targetId,
                    url: `https://huggingface.co/${d.endpoint}s/${d.targetId}/discussions/${d.num}`,
                    createdAt: d.createdAt,
                    unread: d.status === "open",
                    raw: d
                }));
            } else {
                const err = results[1].reason as { status?: number };
                if (err?.status === 401 || err?.status === 403) {
                    setTokenStatus("hf", "insufficient_permissions");
                } else {
                    console.error("HF Fetch Error:", results[1].reason instanceof Error ? results[1].reason.message : "Unknown error");
                }
                fetchErrors.push("HF discussions offline.");
            }

            const combined = [...mappedGh, ...mappedHf].sort((a, b) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            setNotifications(combined);
            updateCache("inbox", combined);
            setError(fetchErrors.length > 0 ? fetchErrors.join(" ") : null);
        } catch (err) {
            console.error("Inbox Fetch Error:", err instanceof Error ? err.message : "Unknown error");
            setError("Unexpected inbox failure.");
        } finally {
            setLoading(false);
        }
    }, [activeAccount, updateCache, tokenStatusGh, tokenStatusHf, setTokenStatus]);

    const fetchDetail = async (notification: UnifiedNotification) => {
        if (notification.source === "GITHUB" && notification.apiUrl) {
            try {
                const detail = await getNotificationSubjectDetail(notification.apiUrl);
                const body = detail.body || "";
                setNotifications(prev => prev.map(n => 
                    n.id === notification.id ? { ...n, body } : n
                ));
                return body;
            } catch (e) {
                console.error("Failed to fetch notification detail", e instanceof Error ? e.message : "Unknown error");
                return "";
            }
        }
        return notification.body || "";
    };

    const markRead = async (notification: UnifiedNotification) => {
        if (notification.source === "GITHUB") {
            await markNotificationRead(notification.id);
        }
        setNotifications(prev => prev.map(n => 
            n.id === notification.id ? { ...n, unread: false } : n
        ));
    };

    const markAllRead = async () => {
        const ghToken = getGithubToken();
        if (ghToken) {
            await markAllNotificationsRead();
        }
        setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    };

    const unsubscribe = async (notification: UnifiedNotification) => {
        if (notification.source === "GITHUB") {
            await unsubscribeFromThread(notification.id);
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }
    };

    useEffect(() => {
        fetchInbox();
        const interval = setInterval(fetchInbox, 60000);
        return () => clearInterval(interval);
    }, [fetchInbox]);

    return {
        notifications,
        loading,
        error,
        refetch: fetchInbox,
        markRead,
        markAllRead,
        unsubscribe,
        fetchDetail,
        unreadCount: notifications.filter(n => n.unread).length
    };
}
