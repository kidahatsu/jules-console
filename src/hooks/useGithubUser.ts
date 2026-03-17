import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "@/lib/github";
import { useStore } from "@/lib/store";

export interface GithubUser {
    login: string;
    id: number;
    avatar_url: string;
    html_url: string;
    name: string | null;
    company: string | null;
    blog: string | null;
    location: string | null;
    email: string | null;
    bio: string | null;
    public_repos: number;
    followers: number;
    following: number;
    created_at: string;
}

export function useGithubUser() {
    const activeAccount = useStore(state => state.activeAccount);

    const { data: user = null, isLoading, error } = useQuery({
        queryKey: ["github-user", activeAccount?.id],
        queryFn: async () => {
            if (!activeAccount?.githubToken) return null;
            const data = await getUserProfile();
            return data as GithubUser;
        },
        enabled: !!activeAccount?.githubToken,
        staleTime: 60 * 60 * 1000, // User profile is quite stable, 1 hour
    });

    return { user, loading: isLoading, error: error ? (error as Error).message : null };
}
