import { describe, it, expect } from "vitest";
import { JULES_PROMPTS } from "../prompts";

describe("Jules Prompts Library", () => {
    it("BOLT_PERFORMANCE should contain Bolt persona and philosophy", () => {
        expect(JULES_PROMPTS.BOLT_PERFORMANCE).toContain('You are "Bolt"');
        expect(JULES_PROMPTS.BOLT_PERFORMANCE).toContain('BOLT\'S PHILOSOPHY');
        expect(JULES_PROMPTS.BOLT_PERFORMANCE).toContain('Speed is a feature');
    });

    it("SENTINEL_SECURITY should contain Sentinel persona and philosophy", () => {
        expect(JULES_PROMPTS.SENTINEL_SECURITY).toContain('You are "Sentinel"');
        expect(JULES_PROMPTS.SENTINEL_SECURITY).toContain('SENTINEL\'S PHILOSOPHY');
        expect(JULES_PROMPTS.SENTINEL_SECURITY).toContain('Security is everyone\'s responsibility');
    });

    it("PALETTE_UX should contain Palette persona and philosophy", () => {
        expect(JULES_PROMPTS.PALETTE_UX).toContain('You are "Palette"');
        expect(JULES_PROMPTS.PALETTE_UX).toContain('PALETTE\'S PHILOSOPHY');
        expect(JULES_PROMPTS.PALETTE_UX).toContain('Accessibility is not optional');
    });

    it("ARCHITECT_SUGGESTION should contain Architect persona and philosophy", () => {
        expect(JULES_PROMPTS.ARCHITECT_SUGGESTION).toContain('You are "Architect"');
        expect(JULES_PROMPTS.ARCHITECT_SUGGESTION).toContain('ARCHITECT\'S PHILOSOPHY');
        expect(JULES_PROMPTS.ARCHITECT_SUGGESTION).toContain('Simple is better than complex');
    });

    it("AUDIT_GENERAL should correctly format with repository name", () => {
        const prompt = JULES_PROMPTS.AUDIT_GENERAL("test/repo");
        expect(prompt).toContain("test/repo");
        expect(prompt).toContain("professional software audit");
    });

    it("DESCRIPTION_BRIEF should correctly format with repository name", () => {
        const prompt = JULES_PROMPTS.DESCRIPTION_BRIEF("test/repo");
        expect(prompt).toContain("test/repo");
        expect(prompt).toContain("generate a professional description");
    });

    it("INBOX_FIX should correctly format with full context", () => {
        const context = {
            type: "BUG",
            source: "GitHub Issue",
            title: "Crashing on boot",
            body: "The app fails with a null pointer",
            author: "dev-user",
            repo: "org/app",
            url: "https://github.com/org/app/issues/1"
        };
        const prompt = JULES_PROMPTS.INBOX_FIX(context);
        expect(prompt).toContain("Address the following BUG");
        expect(prompt).toContain("The app fails with a null pointer");
        expect(prompt).toContain("@dev-user");
        expect(prompt).toContain("https://github.com/org/app/issues/1");
    });
});
