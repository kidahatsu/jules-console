import { describe, it, expect, beforeEach, afterEach } from "vitest";
import viteConfigFn from "../../../vite.config";

describe("Vite Configuration Security - Sever Ambient Secret Baking", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Clear potential secret environment variables
        delete process.env.VITE_JULES_API_KEY;
        delete process.env.VITE_GITHUB_TOKEN;
        delete process.env.VITE_HF_TOKEN;
        delete process.env.GEMINI_API_KEY;
        delete process.env.GOOGLE_API_KEY;
        delete process.env.JULES_API_KEY;
        delete process.env.GITHUB_TOKEN;
        delete process.env.GH_TOKEN;
        delete process.env.HF_TOKEN;
        delete process.env.HUGGINGFACE_TOKEN;
        delete process.env.HUGGING_FACE_HUB_TOKEN;
    });

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    it("production mode must NEVER embed credentials into client bundle defines", () => {
        // Even if ambient or VITE_ keys exist in process.env on the build machine
        process.env.VITE_JULES_API_KEY = "build-machine-jules-key";
        process.env.VITE_GITHUB_TOKEN = "build-machine-github-token";
        process.env.VITE_HF_TOKEN = "build-machine-hf-token";
        process.env.GEMINI_API_KEY = "host-ambient-gemini-key";

        const config = typeof viteConfigFn === "function" ? viteConfigFn({ mode: "production", command: "build" }) : viteConfigFn;

        // In production builds, defines must evaluate strictly to empty strings
        expect(config.define?.["import.meta.env.VITE_JULES_API_KEY"]).toBe(JSON.stringify(""));
        expect(config.define?.["import.meta.env.VITE_GITHUB_TOKEN"]).toBe(JSON.stringify(""));
        expect(config.define?.["import.meta.env.VITE_HF_TOKEN"]).toBe(JSON.stringify(""));
    });

    it("any build command (even non-production mode) must NEVER embed credentials", () => {
        process.env.VITE_JULES_API_KEY = "staging-build-key";
        const config = typeof viteConfigFn === "function" ? viteConfigFn({ mode: "staging", command: "build" }) : viteConfigFn;

        expect(config.define?.["import.meta.env.VITE_JULES_API_KEY"]).toBe(JSON.stringify(""));
        expect(config.define?.["import.meta.env.VITE_GITHUB_TOKEN"]).toBe(JSON.stringify(""));
        expect(config.define?.["import.meta.env.VITE_HF_TOKEN"]).toBe(JSON.stringify(""));
    });

    it("ambient host variables without VITE_ prefix must NOT be bridged in development", () => {
        // Set ambient system variables that do not have VITE_ prefix
        process.env.GEMINI_API_KEY = "host-ambient-gemini-key";
        process.env.GOOGLE_API_KEY = "host-ambient-google-key";
        process.env.GH_TOKEN = "host-ambient-gh-token";
        process.env.HUGGINGFACE_TOKEN = "host-ambient-hf-token";

        const config = typeof viteConfigFn === "function" ? viteConfigFn({ mode: "development", command: "serve" }) : viteConfigFn;

        // Ambient system variables must NEVER bridge into client defines
        expect(config.define?.["import.meta.env.VITE_JULES_API_KEY"]).not.toContain("host-ambient-gemini-key");
        expect(config.define?.["import.meta.env.VITE_JULES_API_KEY"]).not.toContain("host-ambient-google-key");
        expect(config.define?.["import.meta.env.VITE_GITHUB_TOKEN"]).not.toContain("host-ambient-gh-token");
        expect(config.define?.["import.meta.env.VITE_HF_TOKEN"]).not.toContain("host-ambient-hf-token");
        expect(config.define?.["import.meta.env.VITE_JULES_API_KEY"]).toBe(JSON.stringify(""));
    });
});
