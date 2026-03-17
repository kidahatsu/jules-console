import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Extract a Session ID from a raw ID or a full Jules URL.
 */
export function extractSessionId(input: string): string {
    const trimmed = input.trim();
    // Handle Jules Web UI URLs: https://jules.google.com/session/12345
    if (trimmed.includes("/session/")) {
        return trimmed.split("/session/").pop()?.split("/")[0] || trimmed;
    }
    // Handle API Resource Names: projects/.../sessions/12345
    if (trimmed.includes("/sessions/")) {
        return trimmed.split("/sessions/").pop() || trimmed;
    }
    return trimmed;
}

/**
 * Converts a GitHub API URL (e.g. api.github.com/repos/...) to a Web URL (github.com/...)
 */
export function githubApiToWebUrl(apiUrl: string): string {
    if (!apiUrl || !apiUrl.includes("api.github.com/repos/")) return apiUrl;
    
    return apiUrl
        .replace("api.github.com/repos/", "github.com/")
        .replace("/pulls/", "/pull/")
        .replace("/issues/", "/issues/");
}
