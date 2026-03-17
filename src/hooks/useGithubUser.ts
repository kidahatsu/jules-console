import { useState, useEffect } from "react";
import { getUserProfile } from "@/lib/github";
import { useStore } from "@/lib/store";

export interface GithubUser {
    // ... GithubUser interface ...
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
    const [user, setUser] = useState<GithubUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            if (!activeAccount?.githubToken) {
                setUser(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const data = await getUserProfile();
                if (data) {
                    setUser(data as GithubUser);
                } else {
                    setError("Failed to load user profile");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to fetch user");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [activeAccount]);

    return { user, loading, error };
}
