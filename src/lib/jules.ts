import { env } from "./env";
import { z } from "zod";
import { ProviderProfileSchema } from "./validation";

const JULES_API_URL = "/api/jules";
const STORAGE_KEY_ACCOUNTS = "jules_accounts_v1";

export interface ProviderProfile {
    id: string;
    name: string;
    apiKey: string;
    githubToken: string;
    hfToken: string;
    isActive: boolean;
}

export type JulesAccount = ProviderProfile;

export function getAccounts(): ProviderProfile[] {
    const saved = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!saved) {
        // Migration or initial state: seed with env keys if available
        const initialAccount: ProviderProfile = {
            id: "default",
            name: "Default Account",
            apiKey: env.JULES_API_KEY,
            githubToken: env.GITHUB_TOKEN,
            hfToken: env.HF_TOKEN,
            isActive: true,
        };
        return [initialAccount];
    }
    try {
        const parsed = JSON.parse(saved);
        const result = z.array(ProviderProfileSchema).safeParse(parsed);

        if (!result.success) {
            console.error("Failed to validate accounts:", result.error.message);
            return [];
        }

        // Ensure new fields exist for legacy saved accounts
        return result.data.map(profile => ({
            ...profile,
            githubToken: profile.githubToken || env.GITHUB_TOKEN,
            hfToken: profile.hfToken || env.HF_TOKEN,
        }));
    } catch (e) {
        console.error("Failed to parse accounts:", e instanceof Error ? e.message : "Unknown error");
        return [];
    }
}

export function saveAccounts(accounts: ProviderProfile[]) {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
}

export function getActiveAccount(): ProviderProfile | null {
    const accounts = getAccounts();
    return accounts.find(a => a.isActive) || accounts[0] || null;
}

// Helper to get key from active account
export function getApiKey(): string {
    const active = getActiveAccount();
    return active?.apiKey || env.JULES_API_KEY;
}

// Helper to get GH token from active account
export function getGithubToken(): string {
    const active = getActiveAccount();
    return active?.githubToken || env.GITHUB_TOKEN;
}

// Helper to get HF token from active account
export function getHFToken(): string {
    const active = getActiveAccount();
    return active?.hfToken || env.HF_TOKEN;
}

// Helper to build the correct base path for the API
export function getJulesBaseUrl(): string {
    // Always use the proxy path. The Jules API handles project context 
    // via the API key (x-goog-api-key) rather than the URL path.
    return JULES_API_URL;
}

export type SessionStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface Session extends CreateSessionParams {
    id: string;
    status: SessionStatus;
    createdAt: string;
    branch: string;
    duration?: string;
    logs?: Record<string, unknown>[];
    automationMode?: AutomationMode;
}

/**
 * Maps a JulesSession (API format) to our internal Session format.
 */
export function mapJulesSession(s: JulesSession, localMatch?: Session): Session {
    const id = s.name.split("/").pop() || "";
    
    let status: SessionStatus = "RUNNING";
    if (s.state === "SUCCEEDED" || s.state === "COMPLETED") status = "COMPLETED";
    else if (s.state === "FAILED" || s.state === "ABORTED") status = "FAILED";
    else if (s.state === "CANCELLED") status = "CANCELLED";
    else if (s.state === "PENDING" || s.state === "QUEUED") status = "PENDING";
    else if (s.state === "AWAITING_USER_INPUT" || s.state === "AWAITING_USER_FEEDBACK" || s.state === "AWAITING_USER_REPLY") status = "RUNNING"; 
    else status = "RUNNING";

    let duration = localMatch?.duration || "0s";
    if (s.createTime) {
        const start = new Date(s.createTime).getTime();
        const end = (s.updateTime && (status === "COMPLETED" || status === "FAILED"))
            ? new Date(s.updateTime).getTime()
            : Date.now();
        if (!isNaN(start) && !isNaN(end) && end >= start) {
            const diff = Math.floor((end - start) / 1000);
            if (diff < 60) duration = `${diff}s`;
            else if (diff < 3600) duration = `${Math.floor(diff / 60)}m ${diff % 60}s`;
            else duration = `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
        }
    }

    // Determine Task Name
    let taskName = localMatch?.task || "Imported Session";
    if (!localMatch?.task && (s.title || s.prompt)) {
        const rawText = s.title || s.prompt || "";
        const firstLine = rawText.split("\n").find((l: string) => l.trim().length > 0) || "";
        const cleaned = firstLine.replace(/^#+\s*/, "").substring(0, 80).trim();
        if (cleaned.length > 0) taskName = cleaned;
    }

    // Determine Repo
    let repo = localMatch?.repo || "Remote Session";
    if (s.sourceContext?.source?.includes("github")) {
        repo = s.sourceContext.source.split("/").slice(-2).join("/");
    }

    return {
        id: id,
        status: status,
        createdAt: s.createTime,
        task: taskName,
        repo: repo,
        branch: localMatch?.branch || "main",
        duration: duration,
        logs: [],
        automationMode: localMatch?.automationMode || (s.automationMode as AutomationMode)
    };
}

export interface JulesSession {
    name: string;
    state: string;
    createTime: string;
    updateTime?: string;
    title?: string;
    prompt?: string;
    sourceContext?: {
        source?: string;
        githubRepoContext?: {
            startingBranch?: string;
        };
    };
    pullRequest?: {
        url: string;
        number: number;
        title: string;
    };
    [key: string]: unknown;
}

export interface Activity {
    description: string;
    createTime: string;
    activityType: string;
    [key: string]: unknown;
}

export type AutomationMode = "AUTO_CREATE_PR" | "AUTO_MERGE_PR";

export interface CreateSessionParams {
    task: string;
    repo?: string;
    branch?: string;
    automationMode?: AutomationMode;
}

/**
 * Creates a Jules Session. 
 * If 'repo' is omitted, it dispatches a "repoless" session suitable for 
 * architectural insights on public or not-owned repositories.
 */
export async function createJulesSession({ task, repo, branch = "main", automationMode = "AUTO_CREATE_PR" }: CreateSessionParams) {
    const payload: {
        prompt: string;
        automationMode?: AutomationMode;
        sourceContext?: {
            source: string;
            githubRepoContext: { startingBranch: string };
        };
    } = {
        prompt: task,
        automationMode: automationMode,
    };

    // Only include sourceContext if a repo is provided (indexed source mode)
    if (repo) {
        payload.sourceContext = {
            source: `sources/github/${repo}`,
            githubRepoContext: { startingBranch: branch },
        };
    }

    const response = await fetch(`${getJulesBaseUrl()}/sessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": getApiKey(),
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error("Invalid Jules Key: Please check your Google API Key in Settings.");
        }
        
        let errorText = "";
        let parsedError: { error?: { message?: string } } | null = null;
        try {
            errorText = await response.text();
            parsedError = JSON.parse(errorText);
        } catch { /* ignored */ }
        
        const safeMessage = parsedError?.error?.message || response.statusText;
        console.error(`Jules API Create Error [${response.status}]: ${safeMessage}`);
        throw new Error(`Jules API Error (${response.status}): ${safeMessage}`);
    }

    return response.json();
}

export async function listJulesSessions(pageSize = 100) {
    const url = `${getJulesBaseUrl()}/sessions?pageSize=${pageSize}`;
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": getApiKey(),
        },
    });

    if (!response.ok) {
        // List might not be supported on root, assume empty if 404 to avoid console spam
        if (response.status === 404) {
            console.warn("Jules List Sessions 404 - endpoint might require parent resource or not exist.");
            return { sessions: [] };
        }
        
        let errorText = "";
        let parsedError: { error?: { message?: string } } | null = null;
        try {
            errorText = await response.text();
            parsedError = JSON.parse(errorText);
        } catch {
            errorText = "Could not parse error response body";
        }
        
        const safeMessage = parsedError?.error?.message || response.statusText;
        console.error(`Jules API List Error [${response.status}]: ${safeMessage}`);
        throw new Error(`Jules API Error (${response.status}): ${safeMessage}`);
    }

    return response.json();
}

export async function getJulesSession(id: string) {
    // API expects full resource name if not relative.
    const url = id.includes("/") ? `${JULES_API_URL}/${id}` : `${getJulesBaseUrl()}/sessions/${id}`;
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": getApiKey(),
        },
    });

    if (!response.ok) {
        let errorText = "";
        let parsedError: { error?: { message?: string } } | null = null;
        try {
            errorText = await response.text();
            parsedError = JSON.parse(errorText);
        } catch {
            errorText = "Could not parse error response body";
        }
        const safeMessage = parsedError?.error?.message || response.statusText;
        console.error(`Jules API Get Error [${response.status}]: ${safeMessage}`);
        throw new Error(`Jules API Error (${response.status}): ${safeMessage}`);
    }

    return response.json();
}

export async function deleteJulesSession(id: string) {
    // API expects full resource name if not relative. 
    const url = id.includes("/") ? `${JULES_API_URL}/${id}` : `${getJulesBaseUrl()}/sessions/${id}`;
    const response = await fetch(url, {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": getApiKey(),
        },
    });

    if (!response.ok) {
        if (response.status === 404) return; // Already deleted
        let errorText = "";
        let parsedError: { error?: { message?: string } } | null = null;
        try {
            errorText = await response.text();
            parsedError = JSON.parse(errorText);
        } catch {
            errorText = "Could not parse error response body";
        }
        const safeMessage = parsedError?.error?.message || response.statusText;
        console.error(`Jules API Delete Error [${response.status}]: ${safeMessage}`);
        throw new Error(`Jules API Error (${response.status}): ${safeMessage}`);
    }

    return response.json();
}

export async function getJulesActivities(sessionId: string) {
    const url = sessionId.includes("/") ? `${JULES_API_URL}/${sessionId}/activities` : `${getJulesBaseUrl()}/sessions/${sessionId}/activities`;
    const response = await fetch(url, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": getApiKey(),
        },
    });

    if (!response.ok) {
        throw new Error(`Jules API Error: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Tests connectivity with a provided Jules API Key.
 */
export async function testJulesKey(key: string) {
    if (!key || key.trim() === "") throw new Error("Key is required");
    
    const response = await fetch(`${JULES_API_URL}/sessions?pageSize=1`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
        },
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error("Invalid Jules Key");
        }
        throw new Error(`Connection Error (${response.status})`);
    }

    return true;
}
