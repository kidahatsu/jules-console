import { useQuery } from "@tanstack/react-query";
import { getUserRepos, getOctokit, mapGithubRepo, type GithubRepo as LibGithubRepo } from "@/lib/github";
import { useStore } from "@/lib/store";

export type GithubRepo = LibGithubRepo;

export function useGithubRepos() {
    const activeAccount = useStore(state => state.activeAccount);
    const setTokenStatus = useStore(state => state.setTokenStatus);

    const { data: repos = [], isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ["github-repos", activeAccount?.id],
        queryFn: async () => {
            if (!activeAccount?.githubToken) {
                setTokenStatus("github", "missing");
                return [];
            }
            try {
                const rawRepos = await getUserRepos();
                setTokenStatus("github", "valid");
                // Explicitly map with the correct library type
                return (rawRepos as LibGithubRepo[]).map(mapGithubRepo);
            } catch (e: unknown) {
                const err = e as { status?: number };
                if (err.status === 401 || err.status === 403) {
                    setTokenStatus("github", "invalid");
                }
                throw e;
            }
        },
        enabled: !!activeAccount?.githubToken,
        // Reuse old data while background sync occurs
        placeholderData: (prev) => prev,
    });

    const deleteRepo = async (id: number) => {
        const repo = (repos as LibGithubRepo[]).find(r => r.id === id);
        if (!repo) return;

        const typedName = window.prompt(`To delete ${repo.full_name}, type the repository name below. THIS ACTION IS PERMANENT!`);
        
        if (typedName === null) return; // User cancelled

        if (typedName !== repo.name) {
            alert(`Incorrect name. Expected "${repo.name}" but got "${typedName}". Deletion aborted.`);
            return;
        }

        try {
            const [owner, name] = repo.full_name.split("/");

            await getOctokit().request("DELETE /repos/{owner}/{repo}", {
                owner,
                repo: name
            });

            // Re-invalidate query to update list
            refetch();
        } catch (e: unknown) {
            console.error('Failed to delete repo:', e instanceof Error ? e.message : 'Unknown error');
            const err = e as { status?: number };
            if (err.status === 404 || err.status === 403) {
                alert("Failed to delete repository. Please ensure your GitHub token has the 'delete_repo' scope enabled.");
            } else {
                alert("Failed to delete repository. Check console for details.");
            }
        }
    };

    return { 
        repos: repos as LibGithubRepo[], 
        loading: isLoading, 
        isRevalidating: isFetching, 
        error: error ? (error as Error).message : null, 
        deleteRepo, 
        refetch: () => { refetch(); }
    };
}
