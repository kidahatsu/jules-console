import { describe, it, expect } from "vitest";
import { CachePolicy } from "../cache";

describe("CachePolicy", () => {
    describe("isFresh", () => {
        it("should return false if timestamp is 0 or negative", () => {
            expect(CachePolicy.isFresh({ data: [1, 2], timestamp: 0 }, 1000)).toBe(false);
            expect(CachePolicy.isFresh({ data: [], timestamp: -1 }, 1000)).toBe(false);
        });

        it("should return true if elapsed time is within TTL", () => {
            const now = Date.now();
            const entry = { data: "test", timestamp: now - 5000 };
            expect(CachePolicy.isFresh(entry, 10000)).toBe(true);
        });

        it("should return false if elapsed time exceeds TTL", () => {
            const now = Date.now();
            const entry = { data: "test", timestamp: now - 15000 };
            expect(CachePolicy.isFresh(entry, 10000)).toBe(false);
        });
    });

    describe("isValidList", () => {
        it("should return true for empty lists", () => {
            expect(CachePolicy.isValidList([], "id" as never)).toBe(true);
        });

        it("should return true when items contain the required field", () => {
            const items = [{ id: 1, name: "repo1" }, { id: 2, name: "repo2" }];
            expect(CachePolicy.isValidList(items, "id")).toBe(true);
            expect(CachePolicy.isValidList(items, "name")).toBe(true);
        });

        it("should return false when items miss the required field", () => {
            const items = [{ name: "repo1" }] as unknown as { id: number; name: string }[];
            expect(CachePolicy.isValidList(items, "id")).toBe(false);
        });
    });

    describe("TTL Constants", () => {
        it("should define standard TTL constants", () => {
            expect(CachePolicy.STANDARD_TTL).toBe(5 * 60 * 1000);
            expect(CachePolicy.INBOX_TTL).toBe(60 * 1000);
            expect(CachePolicy.ASSET_TTL).toBe(10 * 60 * 1000);
        });
    });
});
