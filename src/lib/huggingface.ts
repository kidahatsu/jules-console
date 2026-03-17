/**
 * Hugging Face Hub API Library
 */

const HF_API_BASE = "https://huggingface.co/api";

export interface HFSpace {
    id: string;
    author: string;
    sha: string;
    lastModified: string;
    private: boolean;
    disabled: boolean;
    gitaly_status: string;
    runtime: {
        stage: "RUNNING" | "SLEEPING" | "BUILDING" | "RUNNING_BUILDING" | "FACTORY_ERROR" | "PAUSED" | "STOPPED";
        hardware: string;
        raw: unknown;
    };
    cardData?: unknown;
}

export interface HFModel {
    id: string;
    author: string;
    sha: string;
    lastModified: string;
    private: boolean;
    downloads: number;
    likes: number;
    tags: string[];
    pipeline_tag?: string;
}

export interface HFDiscussion {
    id: string;
    num: number;
    title: string;
    status: "open" | "closed";
    author: string;
    isPullRequest: boolean;
    createdAt: string;
    endpoint: string; // model, dataset, or space
    targetId: string; // e.g. "meta-llama/Llama-2-7b"
}

/**
 * Enhanced Error Handler for Hugging Face Provider
 */
async function handleHFError(response: Response): Promise<never> {
    const error = new Error() as Error & { status: number };
    error.status = response.status;
    
    if (response.status === 403 || response.status === 401) {
        error.message = "Invalid HF Token: Please ensure your Hugging Face token is correct and has 'Read' permissions.";
        throw error;
    }
    if (response.status === 429) {
        error.message = "Rate Limit Exceeded: Hugging Face API is cooling down. Please wait a few minutes before retrying.";
        throw error;
    }
    const text = await response.text();
    error.message = `HF API Error (${response.status}): ${text || response.statusText}`;
    throw error;
}

export interface HFUser {
    name: string;
    fullname: string;
    email: string;
    id: string;
    type: string;
}

export async function getHuggingFaceUser(token: string): Promise<HFUser | null> {
    if (!token || token.trim() === "") return null;
    const response = await fetch(`${HF_API_BASE}/whoami-v2`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return handleHFError(response);
    return await response.json() as HFUser;
}

export async function getUserModels(token: string, author: string) {
    if (!token || !author) return [];
    const response = await fetch(`${HF_API_BASE}/models?author=${author}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return handleHFError(response);
    return await response.json() as HFModel[];
}

export async function getUserSpaces(token: string, author: string) {
    if (!token || !author) return [];
    const response = await fetch(`${HF_API_BASE}/spaces?author=${author}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return handleHFError(response);
    return await response.json() as HFSpace[];
}

export async function getUserDiscussions(token: string, author: string) {
    if (!token || !author) return [];
    const response = await fetch(`${HF_API_BASE}/discussions?author=${author}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return handleHFError(response);
    return await response.json() as HFDiscussion[];
}

/**
 * Tests connectivity with a provided HF Token.
 */
export async function testHFToken(token: string) {
    if (!token || token.trim() === "") throw new Error("Token is required");
    
    const response = await fetch(`${HF_API_BASE}/whoami-v2`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            throw new Error("Invalid HF Token");
        }
        throw new Error(`Connection Error (${response.status})`);
    }

    return true;
}
