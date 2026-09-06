// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
    encryptPayload,
    decryptPayload,
    deriveEncryptionKey,
    getDeviceSalt,
    getDeviceDerivedSecret,
    setSessionAccounts,
    getSessionAccounts,
    clearSessionAccounts,
    STORAGE_KEY_DEVICE_SALT,
    STORAGE_KEY_DEVICE_SECRET,
    STORAGE_KEY_SESSION_ACCOUNTS,
} from "../cryptoVault";
import type { ProviderProfile } from "../jules";

describe("Web Crypto Vault - Encryption & Key Derivation", () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        vi.restoreAllMocks();
    });

    it("should generate and persist device salt if not present", () => {
        const salt1 = getDeviceSalt();
        expect(salt1).toBeInstanceOf(Uint8Array);
        expect(salt1.length).toBe(16);

        const stored = localStorage.getItem(STORAGE_KEY_DEVICE_SALT);
        expect(stored).toBeTruthy();

        // Second call should return the exact same salt
        const salt2 = getDeviceSalt();
        expect(salt2).toEqual(salt1);
    });

    it("should generate and persist unique device secret", () => {
        const secret1 = getDeviceDerivedSecret();
        expect(secret1).toContain("device-vault-");
        expect(localStorage.getItem(STORAGE_KEY_DEVICE_SECRET)).toBeTruthy();

        const secret2 = getDeviceDerivedSecret();
        expect(secret2).toBe(secret1);
    });

    it("deriveEncryptionKey should derive an AES-GCM 256 CryptoKey via PBKDF2", async () => {
        const salt = new Uint8Array(16).fill(7);
        const key = await deriveEncryptionKey("test-secret", salt, 10000);
        expect(key.algorithm.name).toBe("AES-GCM");
        expect((key.algorithm as unknown as { length: number }).length).toBe(256);
        expect(key.extractable).toBe(false);
        expect(key.usages).toContain("encrypt");
        expect(key.usages).toContain("decrypt");
    });

    it("should encrypt and decrypt data with device-derived secret", async () => {
        const payload: ProviderProfile[] = [{
            id: "profile-1",
            name: "Primary Profile",
            apiKey: "secret-gemini-key-123",
            githubToken: "ghp_super_secret_token",
            hfToken: "hf_confidential_token",
            isActive: true,
        }];

        const envelope = await encryptPayload(payload);
        expect(envelope.__encrypted).toBe(true);
        expect(envelope.algorithm).toBe("AES-GCM-256");
        expect(envelope.iterations).toBe(100000);
        expect(typeof envelope.ciphertext).toBe("string");
        expect(typeof envelope.iv).toBe("string");
        expect(typeof envelope.salt).toBe("string");

        // Raw keys must NOT appear in the ciphertext string
        expect(envelope.ciphertext).not.toContain("secret-gemini-key-123");
        expect(envelope.ciphertext).not.toContain("ghp_super_secret_token");

        const decrypted = await decryptPayload<ProviderProfile[]>(envelope);
        expect(decrypted).toEqual(payload);
    });

    it("should encrypt and decrypt data with user-supplied master password", async () => {
        const payload = { sensitiveInfo: "user-defined-vault-data" };
        const masterPass = "correct-horse-battery-staple-2026!";

        const envelope = await encryptPayload(payload, masterPass);
        const decrypted = await decryptPayload<typeof payload>(envelope, masterPass);
        expect(decrypted).toEqual(payload);
    });

    it("should fail decryption when provided wrong master password", async () => {
        const payload = { secret: "confidential" };
        const envelope = await encryptPayload(payload, "correct-password");

        await expect(decryptPayload(envelope, "wrong-password")).rejects.toThrow();
    });

    it("should fail decryption when ciphertext is tampered with", async () => {
        const payload = { secret: "confidential" };
        const envelope = await encryptPayload(payload);

        const tamperedEnvelope = {
            ...envelope,
            ciphertext: btoa("tampered-corrupt-data"),
        };

        await expect(decryptPayload(tamperedEnvelope)).rejects.toThrow();
    });
});

describe("Web Crypto Vault - Session Storage Persistence", () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.restoreAllMocks();
    });

    it("setSessionAccounts and getSessionAccounts should store and retrieve accounts", () => {
        const accounts: ProviderProfile[] = [{
            id: "default",
            name: "Session Account",
            apiKey: "valid-api-key-12345",
            githubToken: "gh-token",
            hfToken: "hf-token",
            isActive: true,
        }];

        setSessionAccounts(accounts);
        expect(sessionStorage.getItem(STORAGE_KEY_SESSION_ACCOUNTS)).toBeTruthy();

        const retrieved = getSessionAccounts();
        expect(retrieved).toEqual(accounts);
    });

    it("clearSessionAccounts should wipe session storage", () => {
        const accounts: ProviderProfile[] = [{
            id: "default",
            name: "Temp Account",
            apiKey: "valid-api-key-12345",
            githubToken: "",
            hfToken: "",
            isActive: true,
        }];

        setSessionAccounts(accounts);
        expect(getSessionAccounts()).toHaveLength(1);

        clearSessionAccounts();
        expect(getSessionAccounts()).toBeNull();
        expect(sessionStorage.getItem(STORAGE_KEY_SESSION_ACCOUNTS)).toBeNull();
    });

    it("getSessionAccounts should handle invalid JSON gracefully and return null", () => {
        sessionStorage.setItem(STORAGE_KEY_SESSION_ACCOUNTS, "{invalid-json");
        expect(getSessionAccounts()).toBeNull();
    });
});
