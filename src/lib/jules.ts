import { z } from "zod";
import { env } from "./env";
import { ProviderProfileSchema } from "./validation";
import {
    encryptPayload,
    decryptPayload,
    setSessionAccounts,
    getSessionAccounts,
    clearSessionAccounts,
    _resetDeviceVaultCacheForTesting,
    type EncryptedVaultEnvelope,
} from "./cryptoVault";

export const DIRECT_JULES_API_URL = "https://jules.googleapis.com/v1alpha";
export const PROXY_JULES_API_URL = "/api/jules";
export const STORAGE_KEY_ACCOUNTS = "jules_accounts_v1";

let isLocalProxyAvailable: boolean | null = null;
let inMemoryAccounts: ProviderProfile[] | null = null;
let masterPasswordCache: string | undefined = undefined;

export function setMasterPassword(password?: string): void {
    masterPasswordCache = password;
}

export function setProxyAvailable(available: boolean | null): void {
    isLocalProxyAvailable = available;
}

export function _resetAccountCacheForTesting(): void {
    inMemoryAccounts = null;
    masterPasswordCache = undefined;
    isLocalProxyAvailable = null;
    clearSessionAccounts();
    _resetDeviceVaultCacheForTesting();
}

/**
 * Returns the Jules API base URL.
 * Routes directly to Google Jules API in production builds or when local proxy is not available.
 * Preserves the local Vite dev proxy in development.
 */
export function getJulesBaseUrl(): string {
    if (import.meta.env.PROD) {
        return DIRECT_JULES_API_URL;
    }
    if (isLocalProxyAvailable === false) {
        return DIRECT_JULES_API_URL;
    }
    return PROXY_JULES_API_URL;
}

/**
 * Probes the local dev proxy to determine if /api/jules is operational.
 */
export async function detectJulesProxy(): Promise<boolean> {
    if (import.meta.env.PROD) {
        isLocalProxyAvailable = false;
        return false;
    }
    try {
        const res = await fetch(`${PROXY_JULES_API_URL}/sessions?pageSize=1`, {
            method: "HEAD",
            headers: { "x-goog-api-key": "probe" },
        }).catch(() => null);

        if (!res) {
            isLocalProxyAvailable = false;
            return false;
        }

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("text/html") || res.status === 404 || res.status === 405) {
            isLocalProxyAvailable = false;
            return false;
        }

        isLocalProxyAvailable = true;
        return true;
    } catch {
        isLocalProxyAvailable = false;
        return false;
    }
}

export interface ProviderProfile {
    id: string;
    name: string;
    apiKey: string;
    githubToken: string;
    hfToken: string;
    isActive: boolean;
}

export function getAccounts(): ProviderProfile[] {
    const initialAccount: ProviderProfile = {
        id: "default",
        name: "Default Account",
        apiKey: env.JULES_API_KEY,
        githubToken: env.GITHUB_TOKEN,
        hfToken: env.HF_TOKEN,
        isActive: true,
    };

    if (inMemoryAccounts !== null) {
        return inMemoryAccounts;
    }

    const sessionAccs = getSessionAccounts();
    if (sessionAccs !== null) {
        inMemoryAccounts = sessionAccs;
        return sessionAccs;
    }

    let saved: string | null = null;
    try {
        if (typeof localStorage !== "undefined") {
            saved = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
        }
    } catch {
        // Storage restricted
    }

    if (!saved) {
        return [initialAccount];
    }

    try {
        const parsed = JSON.parse(saved);

        // If encrypted at rest, read active session storage or in-memory cache
        if (parsed && typeof parsed === "object" && parsed.__encrypted === true) {
            if (inMemoryAccounts !== null) {
                return inMemoryAccounts;
            }
            const sAccs = getSessionAccounts();
            if (sAccs !== null) {
                inMemoryAccounts = sAccs;
                return sAccs;
            }
            if (parsed.ciphertext) {
                // Trigger async background decryption for subsequent reads
                void getAccountsSecure();
            }
            return inMemoryAccounts || [initialAccount];
        }

        // Legacy plaintext in localStorage -> automatically sanitize and upgrade!
        const migrated = Array.isArray(parsed) ? parsed.map((a: unknown) => {
            if (typeof a !== 'object' || a === null) return a;
            const profile = a as Record<string, unknown>;
            return {
                ...profile,
                apiKey: (profile.apiKey as string) || env.JULES_API_KEY,
                githubToken: (profile.githubToken as string) || env.GITHUB_TOKEN,
                hfToken: (profile.hfToken as string) || env.HF_TOKEN,
            };
        }) : parsed;

        const result = z.array(ProviderProfileSchema).safeParse(migrated);
        if (result.success) {
            inMemoryAccounts = result.data;
            setSessionAccounts(result.data);
            // Upgrade legacy plaintext to encrypted envelope at rest
            void saveAccountsSecure(result.data);
            return result.data;
        } else {
            console.error("Invalid local storage accounts schema");
            return [initialAccount];
        }
    } catch (e) {
        console.error("Failed to parse accounts:", e instanceof Error ? e.message : "Unknown error");
        return [initialAccount];
    }
}

export function saveAccounts(accounts: ProviderProfile[]) {
    const validated = z.array(ProviderProfileSchema).safeParse(accounts);
    if (!validated.success) {
        console.error("Refusing to save invalid account profiles:", validated.error.format());
        return;
    }

    inMemoryAccounts = validated.data;
    setSessionAccounts(validated.data);

    // Prevent raw keys from ever sitting in plaintext in localStorage
    if (typeof localStorage !== "undefined") {
        try {
            const existing = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
            let hasValidEncryptedCiphertext = false;
            if (existing) {
                try {
                    const parsed = JSON.parse(existing);
                    if (parsed && typeof parsed === "object" && parsed.__encrypted === true && parsed.ciphertext) {
                        hasValidEncryptedCiphertext = true;
                    }
                } catch {
                    // Ignore JSON parse error
                }
            }

            // Only set pending if not already holding valid encrypted ciphertext
            if (!hasValidEncryptedCiphertext) {
                localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify({
                    __encrypted: true,
                    version: 1,
                    algorithm: "AES-GCM-256",
                    pending: true,
                }));
            }
        } catch {
            // Storage quota/restriction
        }
    }

    // Persist encrypted envelope asynchronously via Web Crypto AES-GCM 256 PBKDF2
    void saveAccountsSecure(validated.data);
}

export async function saveAccountsSecure(accounts: ProviderProfile[], masterPassword?: string): Promise<void> {
    const validated = z.array(ProviderProfileSchema).safeParse(accounts);
    if (!validated.success) {
        console.error("Refusing to save invalid account profiles:", validated.error.format());
        return;
    }

    inMemoryAccounts = validated.data;
    setSessionAccounts(validated.data);

    if (typeof localStorage !== "undefined") {
        try {
            const envelope = await encryptPayload(validated.data, masterPassword || masterPasswordCache);
            localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(envelope));
        } catch (err) {
            console.error("Failed to encrypt accounts for localStorage:", err instanceof Error ? err.message : "Unknown error");
        }
    }
}

export async function getAccountsSecure(masterPassword?: string): Promise<ProviderProfile[]> {
    if (inMemoryAccounts !== null) {
        return inMemoryAccounts;
    }

    const sessionAccs = getSessionAccounts();
    if (sessionAccs !== null) {
        inMemoryAccounts = sessionAccs;
        return sessionAccs;
    }

    const initialAccount: ProviderProfile = {
        id: "default",
        name: "Default Account",
        apiKey: env.JULES_API_KEY,
        githubToken: env.GITHUB_TOKEN,
        hfToken: env.HF_TOKEN,
        isActive: true,
    };

    if (typeof localStorage !== "undefined") {
        const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
        if (!raw) return [initialAccount];

        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object" && parsed.__encrypted === true) {
                if (parsed.pending || !parsed.ciphertext) {
                    return inMemoryAccounts || [initialAccount];
                }
                const decrypted = await decryptPayload<ProviderProfile[]>(
                    parsed as EncryptedVaultEnvelope,
                    masterPassword || masterPasswordCache
                );
                const res = z.array(ProviderProfileSchema).safeParse(decrypted);
                if (res.success) {
                    inMemoryAccounts = res.data;
                    setSessionAccounts(res.data);
                    return res.data;
                } else {
                    console.error("Decrypted accounts failed schema validation");
                    return inMemoryAccounts || [initialAccount];
                }
            } else {
                return await migrateLegacyAccounts(masterPassword);
            }
        } catch (e) {
            console.error("Failed to decrypt accounts from localStorage:", e instanceof Error ? e.message : "Unknown error");
            return inMemoryAccounts || [initialAccount];
        }
    }

    return [initialAccount];
}

export async function migrateLegacyAccounts(masterPassword?: string): Promise<ProviderProfile[]> {
    const initialAccount: ProviderProfile = {
        id: "default",
        name: "Default Account",
        apiKey: env.JULES_API_KEY,
        githubToken: env.GITHUB_TOKEN,
        hfToken: env.HF_TOKEN,
        isActive: true,
    };

    if (typeof localStorage === "undefined") return inMemoryAccounts || [initialAccount];
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!raw) return inMemoryAccounts || [initialAccount];

    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && parsed.__encrypted === true) {
            return await getAccountsSecure(masterPassword);
        }

        const migrated = Array.isArray(parsed) ? parsed.map((a: unknown) => {
            if (typeof a !== 'object' || a === null) return a;
            const profile = a as Record<string, unknown>;
            return {
                ...profile,
                apiKey: (profile.apiKey as string) || env.JULES_API_KEY,
                githubToken: (profile.githubToken as string) || env.GITHUB_TOKEN,
                hfToken: (profile.hfToken as string) || env.HF_TOKEN,
            };
        }) : parsed;

        const result = z.array(ProviderProfileSchema).safeParse(migrated);
        if (result.success) {
            await saveAccountsSecure(result.data, masterPassword);
            return result.data;
        } else {
            console.error("Invalid local storage accounts schema during migration");
            return inMemoryAccounts || [initialAccount];
        }
    } catch (e) {
        console.error("Failed to parse accounts during migration:", e instanceof Error ? e.message : "Unknown error");
        return inMemoryAccounts || [initialAccount];
    }
}

export function getActiveAccount(): ProviderProfile | null {
    const accounts = getAccounts();
    return accounts.find(a => a.isActive) || accounts[0] || null;
}

// Helper to get key from active account
function getApiKey(): string {
    const active = getActiveAccount();
    return active?.apiKey || env.JULES_API_KEY;
}

// Helper to get GH token from active account
export function getGithubToken(): string {
    const active = getActiveAccount();
    return active?.githubToken || env.GITHUB_TOKEN;
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
    const cleanId = id.replace(/^\/?(api\/jules\/|v1alpha\/)?/, "");
    const url = id.includes("/") ? `${getJulesBaseUrl()}/${cleanId}` : `${getJulesBaseUrl()}/sessions/${cleanId}`;
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
    const cleanId = id.replace(/^\/?(api\/jules\/|v1alpha\/)?/, "");
    const url = id.includes("/") ? `${getJulesBaseUrl()}/${cleanId}` : `${getJulesBaseUrl()}/sessions/${cleanId}`;
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
    const cleanId = sessionId.replace(/^\/?(api\/jules\/|v1alpha\/)?/, "");
    const url = sessionId.includes("/") ? `${getJulesBaseUrl()}/${cleanId}/activities` : `${getJulesBaseUrl()}/sessions/${cleanId}/activities`;
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
    
    const response = await fetch(`${getJulesBaseUrl()}/sessions?pageSize=1`, {
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
