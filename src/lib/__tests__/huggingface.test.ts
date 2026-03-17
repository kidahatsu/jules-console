import { describe, it, expect, vi, beforeEach } from "vitest";
import { getHuggingFaceUser, getUserModels, getUserSpaces, getUserDiscussions } from "../huggingface";

vi.stubGlobal('fetch', vi.fn());

describe("Hugging Face API", () => {
    const mockToken = "hf_test_token";
    const mockUser = "testuser";

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("getHuggingFaceUser should fetch user data via whoami-v2", async () => {
        const mockResponse = { name: "testuser", fullname: "Test User" };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
        });

        const user = await getHuggingFaceUser(mockToken);

        expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/whoami-v2"), {
            headers: { Authorization: `Bearer ${mockToken}` },
        });
        expect(user).toEqual(mockResponse);
    });

    it("getUserModels should use author filtering", async () => {
        const mockModels = [{ id: "test/model-1" }];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockModels,
        });

        const models = await getUserModels(mockToken, mockUser);

        expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/models?author=${mockUser}`), {
            headers: { Authorization: `Bearer ${mockToken}` },
        });
        expect(models).toEqual(mockModels);
    });

    it("getUserSpaces should use author filtering", async () => {
        const mockSpaces = [{ id: "test/space-1" }];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockSpaces,
        });

        const spaces = await getUserSpaces(mockToken, mockUser);

        expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/spaces?author=${mockUser}`), {
            headers: { Authorization: `Bearer ${mockToken}` },
        });
        expect(spaces).toEqual(mockSpaces);
    });

    it("getUserDiscussions should use author filtering", async () => {
        const mockDiscussions = [{ id: "disc1", title: "Discussion 1" }];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fetch as any).mockResolvedValue({
            ok: true,
            json: async () => mockDiscussions,
        });

        const discussions = await getUserDiscussions(mockToken, mockUser);

        expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/discussions?author=${mockUser}`), {
            headers: { Authorization: `Bearer ${mockToken}` },
        });
        expect(discussions).toEqual(mockDiscussions);
    });

    it("should handle error codes (403/401) as specific token errors", async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fetch as any).mockResolvedValue({
            ok: false,
            status: 403,
            text: async () => "Forbidden",
        });

        await expect(getHuggingFaceUser(mockToken)).rejects.toThrow("Invalid HF Token");
    });
});
