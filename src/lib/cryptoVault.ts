import { z } from "zod";
import { ProviderProfileSchema } from "./validation";
import type { ProviderProfile } from "./jules";

export const STORAGE_KEY_DEVICE_SALT = "jules_device_salt_v1";
export const STORAGE_KEY_DEVICE_SECRET = "jules_device_secret_v1";
export const STORAGE_KEY_SESSION_ACCOUNTS = "jules_session_accounts_v1";

export interface EncryptedVaultEnvelope {
    __encrypted: true;
    version: number;
    algorithm: "AES-GCM-256";
    iterations: number;
    salt: string; // Base64 encoded
    iv: string;   // Base64 encoded
    ciphertext: string; // Base64 encoded
}

export const EncryptedVaultEnvelopeSchema = z.object({
    __encrypted: z.literal(true),
    version: z.number().default(1),
    algorithm: z.literal("AES-GCM-256"),
    iterations: z.number().int().min(10000).default(100000),
    salt: z.string().min(1),
    iv: z.string().min(1),
    ciphertext: z.string().min(1),
});

/**
 * Safely resolves the Web Crypto API instance from window or globalThis.
 */
export function getCrypto(): Crypto {
    if (typeof window !== "undefined" && window.crypto?.subtle) {
        return window.crypto;
    }
    if (typeof globalThis !== "undefined" && (globalThis as { crypto?: Crypto }).crypto?.subtle) {
        return (globalThis as { crypto: Crypto }).crypto;
    }
    throw new Error("Web Crypto API (crypto.subtle) is not available in this environment.");
}

/**
 * Converts a Uint8Array to a Base64 encoded string.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = "";
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Converts a Base64 encoded string to a Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

let inMemoryDeviceSecret: string | null = null;
let inMemoryDeviceSalt: Uint8Array | null = null;

export function _resetDeviceVaultCacheForTesting(): void {
    inMemoryDeviceSecret = null;
    inMemoryDeviceSalt = null;
    clearSessionAccounts();
}

/**
 * Retrieves or generates an installation-unique device salt.
 */
export function getDeviceSalt(): Uint8Array {
    try {
        if (typeof localStorage !== "undefined") {
            const stored = localStorage.getItem(STORAGE_KEY_DEVICE_SALT);
            if (stored) {
                const salt = base64ToUint8Array(stored);
                inMemoryDeviceSalt = salt;
                return salt;
            }
        }
    } catch {
        // LocalStorage might be restricted
    }

    if (inMemoryDeviceSalt) {
        return inMemoryDeviceSalt;
    }

    const cryptoObj = getCrypto();
    const newSalt = cryptoObj.getRandomValues(new Uint8Array(16));
    inMemoryDeviceSalt = newSalt;
    try {
        if (typeof localStorage !== "undefined") {
            localStorage.setItem(STORAGE_KEY_DEVICE_SALT, uint8ArrayToBase64(newSalt));
        }
    } catch {
        // LocalStorage write failed
    }
    return newSalt;
}

/**
 * Derives a device-unique installation entropy string for zero-friction encryption at rest.
 */
export function getDeviceDerivedSecret(): string {
    const origin = (typeof window !== "undefined" && window.location?.origin && window.location.origin !== "null")
        ? window.location.origin
        : "jules-console";

    try {
        if (typeof localStorage !== "undefined") {
            let secret = localStorage.getItem(STORAGE_KEY_DEVICE_SECRET);
            if (!secret) {
                const cryptoObj = getCrypto();
                const randomBytes = cryptoObj.getRandomValues(new Uint8Array(32));
                secret = uint8ArrayToBase64(randomBytes);
                try {
                    localStorage.setItem(STORAGE_KEY_DEVICE_SECRET, secret);
                } catch {
                    // localStorage write failed (quota/restriction)
                }
            }
            if (secret) {
                inMemoryDeviceSecret = secret;
                return `device-vault-${origin}-${secret}`;
            }
        }
    } catch {
        // Fallback if localStorage is inaccessible
    }

    if (!inMemoryDeviceSecret) {
        try {
            const cryptoObj = getCrypto();
            const randomBytes = cryptoObj.getRandomValues(new Uint8Array(32));
            inMemoryDeviceSecret = uint8ArrayToBase64(randomBytes);
        } catch {
            inMemoryDeviceSecret = "jules-console-ephemeral-device-secret";
        }
    }

    return `device-vault-${origin}-${inMemoryDeviceSecret}`;
}

/**
 * Derives an AES-GCM 256-bit CryptoKey via PBKDF2 with SHA-256 from a password/secret and salt.
 */
export async function deriveEncryptionKey(
    secret: string,
    salt: Uint8Array,
    iterations = 100000
): Promise<CryptoKey> {
    const cryptoObj = getCrypto();
    const enc = new TextEncoder();
    const keyMaterial = await cryptoObj.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    return cryptoObj.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt as BufferSource,
            iterations: iterations,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Encrypts arbitrary serializable data using AES-GCM 256-bit with PBKDF2 key derivation.
 */
export async function encryptPayload(
    data: unknown,
    masterPassword?: string
): Promise<EncryptedVaultEnvelope> {
    const cryptoObj = getCrypto();
    const enc = new TextEncoder();
    const salt = cryptoObj.getRandomValues(new Uint8Array(16));
    const iv = cryptoObj.getRandomValues(new Uint8Array(12));

    const secret = masterPassword && masterPassword.trim().length > 0
        ? masterPassword.trim()
        : getDeviceDerivedSecret();

    const iterations = 100000;
    const key = await deriveEncryptionKey(secret, salt, iterations);
    const plaintext = enc.encode(JSON.stringify(data));

    const ciphertextBuffer = await cryptoObj.subtle.encrypt(
        { name: "AES-GCM", iv: iv as BufferSource },
        key,
        plaintext
    );

    return {
        __encrypted: true,
        version: 1,
        algorithm: "AES-GCM-256",
        iterations: iterations,
        salt: uint8ArrayToBase64(salt),
        iv: uint8ArrayToBase64(iv),
        ciphertext: uint8ArrayToBase64(new Uint8Array(ciphertextBuffer)),
    };
}

/**
 * Decrypts an EncryptedVaultEnvelope using AES-GCM 256-bit with PBKDF2 key derivation.
 */
export async function decryptPayload<T>(
    envelope: EncryptedVaultEnvelope,
    masterPassword?: string
): Promise<T> {
    const validated = EncryptedVaultEnvelopeSchema.parse(envelope);
    const cryptoObj = getCrypto();
    const dec = new TextDecoder();

    const salt = base64ToUint8Array(validated.salt);
    const iv = base64ToUint8Array(validated.iv);
    const ciphertext = base64ToUint8Array(validated.ciphertext);

    const secret = masterPassword && masterPassword.trim().length > 0
        ? masterPassword.trim()
        : getDeviceDerivedSecret();

    const key = await deriveEncryptionKey(secret, salt, validated.iterations);

    const decryptedBuffer = await cryptoObj.subtle.decrypt(
        { name: "AES-GCM", iv: iv as BufferSource },
        key,
        ciphertext as BufferSource
    );

    const jsonStr = dec.decode(decryptedBuffer);
    return JSON.parse(jsonStr) as T;
}

/**
 * Stores accounts in session-scoped storage (sessionStorage).
 */
export function setSessionAccounts(accounts: ProviderProfile[]): void {
    try {
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(STORAGE_KEY_SESSION_ACCOUNTS, JSON.stringify(accounts));
        }
    } catch {
        // Ignore sessionStorage failures (quota/private browsing)
    }
}

/**
 * Retrieves accounts from session-scoped storage (sessionStorage).
 */
export function getSessionAccounts(): ProviderProfile[] | null {
    try {
        if (typeof sessionStorage !== "undefined") {
            const raw = sessionStorage.getItem(STORAGE_KEY_SESSION_ACCOUNTS);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const result = z.array(ProviderProfileSchema).safeParse(parsed);
            if (result.success) {
                return result.data;
            }
        }
    } catch {
        // Corrupted or inaccessible session storage
    }
    return null;
}

/**
 * Clears session-scoped accounts.
 */
export function clearSessionAccounts(): void {
    try {
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.removeItem(STORAGE_KEY_SESSION_ACCOUNTS);
        }
    } catch {
        // Ignore
    }
}
