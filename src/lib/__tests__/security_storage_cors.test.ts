// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    getAccounts,
    saveAccounts,
    saveAccountsSecure,
    getAccountsSecure,
    migrateLegacyAccounts,
    getJulesBaseUrl,
    setProxyAvailable,
    detectJulesProxy,
    _resetAccountCacheForTesting,
    testJulesKey,
    createJulesSession,
    listJulesSessions,
    getJulesSession,
    deleteJulesSession,
    getJulesActivities,
    DIRECT_JULES_API_URL,
    PROXY_JULES_API_URL,
    STORAGE_KEY_ACCOUNTS,
    type ProviderProfile,
} from "../jules";

describe("Hardened Client-Side Token Storage in jules.ts", () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        _resetAccountCacheForTesting();
        vi.restoreAllMocks();
    });

    it("saveAccounts should persist encrypted payload at rest with NO plaintext secrets in localStorage", async () => {
        const testAccount: ProviderProfile = {
            id: "default",
            name: "Production Agent",
            apiKey: "AIzaSySecretGeminiKey999",
            githubToken: "ghp_PersonalAccessToken888",
            hfToken: "hf_HuggingFaceSecret777",
            isActive: true,
        };

        saveAccounts([testAccount]);

        // Synchronous retrieval from in-memory / session-scoped cache
        const inMem = getAccounts();
        expect(inMem).toHaveLength(1);
        expect(inMem[0].apiKey).toBe("AIzaSySecretGeminiKey999");

        // Wait a tick for the async Web Crypto AES-GCM encryption to persist
        await new Promise(r => setTimeout(r, 60));

        const storedRaw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
        expect(storedRaw).toBeTruthy();

        // Verify that raw secrets DO NOT exist in plaintext in localStorage
        expect(storedRaw).not.toContain("AIzaSySecretGeminiKey999");
        expect(storedRaw).not.toContain("ghp_PersonalAccessToken888");
        expect(storedRaw).not.toContain("hf_HuggingFaceSecret777");

        const parsed = JSON.parse(storedRaw!);
        expect(parsed.__encrypted).toBe(true);
        expect(parsed.algorithm).toBe("AES-GCM-256");
        expect(parsed.ciphertext).toBeTruthy();
    });

    it("getAccountsSecure should decrypt encrypted accounts from localStorage", async () => {
        const testAccount: ProviderProfile = {
            id: "default",
            name: "Vault Account",
            apiKey: "secret-key-456-valid",
            githubToken: "ghp-token-456",
            hfToken: "hf-token-456",
            isActive: true,
        };

        await saveAccountsSecure([testAccount]);

        // Wipe in-memory and session cache to simulate fresh browser session/tab
        _resetAccountCacheForTesting();

        const loaded = await getAccountsSecure();
        expect(loaded).toHaveLength(1);
        expect(loaded[0].name).toBe("Vault Account");
        expect(loaded[0].apiKey).toBe("secret-key-456-valid");
        expect(loaded[0].githubToken).toBe("ghp-token-456");
    });

    it("should automatically sanitize and upgrade legacy plaintext localStorage accounts", async () => {
        // Seed legacy plaintext accounts directly into localStorage
        const legacyPlaintext = [
            {
                id: "default",
                name: "Legacy Account",
                apiKey: "legacy-plaintext-key-123",
                isActive: true,
            }
        ];
        localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(legacyPlaintext));

        // Calling getAccounts() should detect plaintext, sanitize/migrate it
        const accounts = getAccounts();
        expect(accounts).toHaveLength(1);
        expect(accounts[0].name).toBe("Legacy Account");
        expect(accounts[0].apiKey).toBe("legacy-plaintext-key-123");

        // Allow async upgrade to commit
        await new Promise(r => setTimeout(r, 60));

        // Verify localStorage has been upgraded to encrypted envelope
        const upgradedStorage = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
        expect(upgradedStorage).toBeTruthy();
        expect(upgradedStorage).not.toContain("legacy-plaintext-key-123");
        const parsed = JSON.parse(upgradedStorage!);
        expect(parsed.__encrypted).toBe(true);
    });

    it("migrateLegacyAccounts should explicitly upgrade legacy accounts", async () => {
        localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify([
            {
                id: "default",
                name: "Explicit Migration Account",
                apiKey: "key-migrate-999-valid",
                isActive: true,
            }
        ]));

        const migrated = await migrateLegacyAccounts();
        expect(migrated).toHaveLength(1);
        expect(migrated[0].apiKey).toBe("key-migrate-999-valid");

        const stored = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
        expect(stored).not.toContain("key-migrate-999-valid");
        expect(JSON.parse(stored!).__encrypted).toBe(true);
    });

    it("should handle empty account list correctly without resurrecting default account", async () => {
        await saveAccountsSecure([]);
        const loaded = await getAccountsSecure();
        expect(loaded).toEqual([]);
        expect(getAccounts()).toEqual([]);
    });

    it("should handle pending storage envelope in getAccountsSecure without infinite loop", async () => {
        localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify({
            __encrypted: true,
            version: 1,
            algorithm: "AES-GCM-256",
            pending: true,
        }));

        _resetAccountCacheForTesting();
        const accounts = await getAccountsSecure();
        expect(accounts).toHaveLength(1);
        expect(accounts[0].id).toBe("default");
    });

    it("saveAccounts should not wipe valid encrypted ciphertext with pending stub", async () => {
        const testAccount: ProviderProfile = {
            id: "default",
            name: "Initial Vault Account",
            apiKey: "secret-key-111-valid",
            githubToken: "",
            hfToken: "",
            isActive: true,
        };

        await saveAccountsSecure([testAccount]);
        const initialRaw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
        expect(JSON.parse(initialRaw!).ciphertext).toBeTruthy();

        // Calling saveAccounts should update inMemory and not overwrite with pending: true
        saveAccounts([{
            ...testAccount,
            name: "Updated Name",
        }]);

        const intermediateRaw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
        expect(JSON.parse(intermediateRaw!).ciphertext).toBeTruthy();
        expect(JSON.parse(intermediateRaw!).pending).toBeUndefined();
    });
});

describe("Direct Browser CORS vs Dev Proxy Routing", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        _resetAccountCacheForTesting();
    });

    it("getJulesBaseUrl should return DIRECT_JULES_API_URL when proxy is not available", () => {
        setProxyAvailable(false);
        expect(getJulesBaseUrl()).toBe(DIRECT_JULES_API_URL);
        expect(getJulesBaseUrl()).toBe("https://jules.googleapis.com/v1alpha");
    });

    it("getJulesBaseUrl should return PROXY_JULES_API_URL in development when proxy is available", () => {
        setProxyAvailable(true);
        expect(getJulesBaseUrl()).toBe(PROXY_JULES_API_URL);
        expect(getJulesBaseUrl()).toBe("/api/jules");
    });

    it("testJulesKey should use dynamic getJulesBaseUrl", async () => {
        setProxyAvailable(false);
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ sessions: [] })
        });
        globalThis.fetch = mockFetch;

        await testJulesKey("test-key-direct");

        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("https://jules.googleapis.com/v1alpha/sessions?pageSize=1"),
            expect.objectContaining({
                headers: expect.objectContaining({
                    "x-goog-api-key": "test-key-direct"
                })
            })
        );
    });

    it("all API endpoints should route to DIRECT_JULES_API_URL when proxy is disabled", async () => {
        setProxyAvailable(false);
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ name: "sessions/123", sessions: [] })
        });
        globalThis.fetch = mockFetch;

        await createJulesSession({ task: "Direct Test" });
        expect(mockFetch).toHaveBeenLastCalledWith(
            "https://jules.googleapis.com/v1alpha/sessions",
            expect.any(Object)
        );

        await listJulesSessions();
        expect(mockFetch).toHaveBeenLastCalledWith(
            "https://jules.googleapis.com/v1alpha/sessions?pageSize=100",
            expect.any(Object)
        );

        await getJulesSession("session-456");
        expect(mockFetch).toHaveBeenLastCalledWith(
            "https://jules.googleapis.com/v1alpha/sessions/session-456",
            expect.any(Object)
        );

        await getJulesSession("projects/test/locations/global/sessions/session-789");
        expect(mockFetch).toHaveBeenLastCalledWith(
            "https://jules.googleapis.com/v1alpha/projects/test/locations/global/sessions/session-789",
            expect.any(Object)
        );

        await deleteJulesSession("session-456");
        expect(mockFetch).toHaveBeenLastCalledWith(
            "https://jules.googleapis.com/v1alpha/sessions/session-456",
            expect.objectContaining({ method: "DELETE" })
        );

        await getJulesActivities("session-456");
        expect(mockFetch).toHaveBeenLastCalledWith(
            "https://jules.googleapis.com/v1alpha/sessions/session-456/activities",
            expect.any(Object)
        );
    });

    it("detectJulesProxy should return false if response returns HTML (e.g. static site catch-all)", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            status: 200,
            headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
        });

        const isProxy = await detectJulesProxy();
        expect(isProxy).toBe(false);
        expect(getJulesBaseUrl()).toBe(DIRECT_JULES_API_URL);
    });

    it("detectJulesProxy should return false on 404 or 405 error", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            status: 404,
            headers: new Headers({ "content-type": "application/json" }),
        });

        const isProxy = await detectJulesProxy();
        expect(isProxy).toBe(false);
        expect(getJulesBaseUrl()).toBe(DIRECT_JULES_API_URL);
    });

    it("detectJulesProxy should return true on non-HTML API response", async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            status: 400,
            headers: new Headers({ "content-type": "application/json" }),
        });

        const isProxy = await detectJulesProxy();
        expect(isProxy).toBe(true);
        expect(getJulesBaseUrl()).toBe(PROXY_JULES_API_URL);
    });
});
