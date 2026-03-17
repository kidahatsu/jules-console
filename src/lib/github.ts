import { Octokit } from "@octokit/core";
import { getGithubToken } from "./jules";

export function getOctokit() {
    const token = getGithubToken();
    if (!token || token.trim() === "") {
        throw new Error("MISSING_TOKEN");
    }
    return new Octokit({
        auth: token,
        headers: {
            "X-GitHub-Api-Version": "2022-11-28",
        },
    });
}

interface GithubError extends Error {
    status?: number;
}

/**
 * Enhanced Error Handler for GitHub Provider
 */
function handleGithubError(error: unknown): never {
    const ghError = error as GithubError;
    
    if (ghError.message === "MISSING_TOKEN") {
        const err: GithubError = new Error("GitHub Token is missing. Please configure it in Profile Settings.");
        err.status = 401;
        throw err;
    }

    // Only log actual API errors, not missing token checks
    if (ghError.status !== 401 && ghError.status !== 403) {
        console.error("GitHub API Error:", ghError.message || ghError);
    }
    
    const status = ghError.status;
    let message = ghError.message || "An unexpected GitHub error occurred.";

    if (status === 403) {
        message = "Insufficient Permissions: Your GitHub token lacks the required scopes (e.g., 'repo', 'notifications').";
    } else if (status === 401) {
        message = "Unauthorized: Your GitHub token is invalid or has expired.";
    } else if (status === 429) {
        message = "Rate Limit Exceeded: GitHub is cooling down. Please wait a few minutes before retrying.";
    }

    const finalError = new Error(message) as GithubError;
    finalError.status = status;
    throw finalError;
}

export interface GithubRepo {
    id: number;
    name: string;
    full_name: string;
    description: string | null;
    html_url: string;
    clone_url: string;
    ssh_url: string;
    stargazers_count: number;
    forks_count: number;
    updated_at: string;
    default_branch: string;
    is_template: boolean;
    language: string | null;
    owner: {
        login: string;
        avatar_url: string;
    };
    topics?: string[];
    archived?: boolean;
    visibility?: string;
    template_repository?: {
        owner: { login: string };
        name: string;
        full_name: string;
        html_url: string;
    } | null;
}

export function mapGithubRepo(r: GithubRepo) {
    return {
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        html_url: r.html_url,
        clone_url: r.clone_url,
        ssh_url: r.ssh_url,
        updated_at: r.updated_at,
        default_branch: r.default_branch,
        is_template: r.is_template,
        owner: {
            login: r.owner?.login || r.full_name.split("/")[0],
            avatar_url: r.owner?.avatar_url || ""
        },
        template_repository: r.template_repository ? {
            owner: { login: r.template_repository.owner.login },
            name: r.template_repository.name,
            full_name: r.template_repository.full_name,
            html_url: r.template_repository.html_url
        } : null
    };
}

export async function getUserRepos(onIncrementalUpdate?: (repos: Record<string, unknown>[]) => void) {
    console.log("[getUserRepos] Starting fetch...");
    try {
        const octokit = getOctokit();
        let allRepos: Record<string, unknown>[] = [];
        let page = 1;
        const MAX_PAGES = 10;

        while (page <= MAX_PAGES) {
            console.log(`[getUserRepos] Requesting page ${page}...`);
            const response = await octokit.request("GET /user/repos", {
                visibility: "all",
                sort: "updated",
                per_page: 100,
                page: page,
                t: Date.now(),
            });

            const repos = response.data;
            console.log(`[getUserRepos] Page ${page} returned ${repos.length} repos`);
            if (repos.length === 0) break;
            
            if (onIncrementalUpdate) {
                onIncrementalUpdate(repos);
            }
            
            allRepos = [...allRepos, ...repos];
            if (repos.length < 100) break;
            page++;
        }
        return allRepos;
    } catch (error) {
        return handleGithubError(error);
    }
}

export async function getStarredRepos(onIncrementalUpdate?: (repos: Record<string, unknown>[]) => void) {
    try {
        const octokit = getOctokit();
        let allRepos: Record<string, unknown>[] = [];
        let page = 1;
        const MAX_PAGES = 5;

        while (page <= MAX_PAGES) {
            const response = await octokit.request("GET /user/starred", {
                                sort: "created",
                direction: "desc",
                per_page: 100,
                page: page,
            });

            const repos = response.data as GithubRepo[];
            if (!repos || repos.length === 0) break;

            if (onIncrementalUpdate) {
                onIncrementalUpdate(repos as unknown as Record<string, unknown>[]);
            }

            allRepos = [...allRepos, ...(repos as unknown as Record<string, unknown>[])];
            if (repos.length < 100) break;
            page++;
        }
        return allRepos;
    } catch (error) {
        return handleGithubError(error);
    }
}

export async function unstarRepo(owner: string, repo: string) {
    try {
        const octokit = getOctokit();
        await octokit.request("DELETE /user/starred/{owner}/{repo}", {
            owner,
            repo,
                    });
    } catch (error) {
        return handleGithubError(error);
    }
}

export async function getUserProfile() {
    try {
        const octokit = getOctokit();
        const response = await octokit.request("GET /user", {
                    });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch user profile", error);
        return null;
    }
}

export interface CreateRepoParams {
    templateOwner: string;
    templateRepo: string;
    owner?: string;
    name: string;
    description?: string;
    private?: boolean;
    includeAllBranches?: boolean;
}

export async function createRepoFromTemplate(params: CreateRepoParams) {
    try {
        const octokit = getOctokit();
        const response = await octokit.request("POST /repos/{template_owner}/{template_repo}/generate", {
            template_owner: params.templateOwner,
            template_repo: params.templateRepo,
            owner: params.owner,
            name: params.name,
            description: params.description,
            private: params.private,
            include_all_branches: params.includeAllBranches,
                    });
        return response.data;
    } catch (error) {
        return handleGithubError(error);
    }
}

export async function getBranches(owner: string, repo: string) {
    try {
        const octokit = getOctokit();
        const response = await octokit.request("GET /repos/{owner}/{repo}/branches", {
            owner,
            repo,
                    });
        return response.data;
    } catch (error) {
        return handleGithubError(error);
    }
}

export async function createBranch(owner: string, repo: string, newBranch: string, sourceSha: string) {
    try {
        const octokit = getOctokit();
        const response = await octokit.request("POST /repos/{owner}/{repo}/git/refs", {
            owner,
            repo,
            ref: `refs/heads/${newBranch}`,
            sha: sourceSha,
                    });
        return response.data;
    } catch (error) {
        return handleGithubError(error);
    }
}

export async function deleteBranch(owner: string, repo: string, branch: string) {
    try {
        const octokit = getOctokit();
        await octokit.request("DELETE /repos/{owner}/{repo}/git/refs/heads/{branch}", {
            owner,
            repo,
            branch,
                    });
    } catch (error) {
        return handleGithubError(error);
    }
}

export async function getRepoPullRequests(owner: string, repo: string) {
    try {
        const octokit = getOctokit();
        const response = await octokit.request("GET /repos/{owner}/{repo}/pulls", {
            owner,
            repo,
            state: "open",
            sort: "created",
            direction: "desc",
                    });
        return response.data;
    } catch (error) {
        return handleGithubError(error);
    }
}

export async function mergePullRequest(owner: string, repo: string, pullNumber: number) {
    try {
        const response = await getOctokit().request("PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge", {
            owner,
            repo,
            pull_number: pullNumber,
                    });
        return response.data;
    } catch (error) {
        return handleGithubError(error);
    }
}

export interface UpdateRepoParams {
    owner: string;
    repo: string;
    description?: string;
    homepage?: string;
    private?: boolean;
}

export async function updateRepo(params: UpdateRepoParams) {
    try {
        const octokit = getOctokit();
        const response = await octokit.request("PATCH /repos/{owner}/{repo}", {
            owner: params.owner,
            repo: params.repo,
            description: params.description,
            homepage: params.homepage,
            private: params.private,
                    });
        return response.data;
    } catch (error) {
        return handleGithubError(error);
    }
}

export async function getReadme(owner: string, repo: string) {
    try {
        const octokit = getOctokit();
        const response = await octokit.request("GET /repos/{owner}/{repo}/readme", {
            owner,
            repo,
                    });
        // Content is base64 encoded
        return atob(response.data.content);
    } catch (error) {
        console.error("Failed to fetch README", error);
        return null;
    }
}

export async function getNotifications() {
    try {
        const octokit = getOctokit();
        const response = await octokit.request("GET /notifications", {
                        all: false, // Only unread
            participating: true,
        });
        return response.data;
    } catch (error) {
        return handleGithubError(error);
    }
}

export async function markNotificationRead(threadId: string) {
    try {
        const octokit = getOctokit();
        await octokit.request("PATCH /notifications/threads/{thread_id}", {
            thread_id: parseInt(threadId),
                    });
    } catch (error) {
        return handleGithubError(error);
    }
}

export async function markAllNotificationsRead() {
    try {
        const octokit = getOctokit();
        await octokit.request("PUT /notifications", {
                    });
    } catch (error) {
        return handleGithubError(error);
    }
}

export async function unsubscribeFromThread(threadId: string) {
    try {
        const octokit = getOctokit();
        await octokit.request("DELETE /notifications/threads/{thread_id}/subscription", {
            thread_id: parseInt(threadId),
                    });
    } catch (error) {
        return handleGithubError(error);
    }
}

/**
 * Fetches the detail of a notification subject (Issue or PR body)
 */
export async function getNotificationSubjectDetail(url: string) {
    try {
        const octokit = getOctokit();
        // Extract the path from the full API URL
        const apiUrl = new URL(url);
        const path = apiUrl.pathname;

        const response = await octokit.request(`GET ${path}`, {
                    });
        return response.data;
    } catch (error) {
        return handleGithubError(error);
    }
}

/**
 * Tests connectivity with a provided GitHub Token.
 */
export async function testGithubToken(token: string) {
    if (!token || token.trim() === "") throw new Error("Token is required");
    
    const octokit = new Octokit({ auth: token });
    try {
        const response = await octokit.request("GET /user", {
                    });
        return !!response.data;
    } catch (e) {
        const ghError = e as GithubError;
        if (ghError.status === 401 || ghError.status === 403) {
            throw new Error("Invalid GitHub Token");
        }
        throw new Error(ghError.message || "Connection Error");
    }
}
