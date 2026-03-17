import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getAccounts, saveAccounts as persistAccounts, type ProviderProfile } from "./jules";

export type ThemeType = "phantom-stealth" | "event-horizon" | "toxic-neon" | "titanium-brutalist";

interface AppCache {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    repos: { data: any[]; timestamp: number };
    starred: { data: any[]; timestamp: number };
    inbox: { data: any[]; timestamp: number };
    huggingface: { data: { models: any[]; spaces: any[] }; timestamp: number };
    /* eslint-enable @typescript-eslint/no-explicit-any */
}

interface AppState {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
    
    // RepoGroup State
    accounts: ProviderProfile[];
    setAccounts: (accounts: ProviderProfile[]) => void;
    activeAccount: ProviderProfile | null;
    setActiveAccount: (id: string) => void;

    // Global Cache (Legacy - being replaced by TanStack)
    cache: AppCache;
    updateCache: (key: keyof AppCache, data: unknown) => void;
    clearCache: () => void;

    // Auth Status
    tokenStatus: {
        jules: "valid" | "invalid" | "missing" | "insufficient_permissions";
        github: "valid" | "invalid" | "missing" | "insufficient_permissions";
        hf: "valid" | "invalid" | "missing" | "insufficient_permissions";
    };
    setTokenStatus: (provider: "jules" | "github" | "hf", status: "valid" | "invalid" | "missing" | "insufficient_permissions") => void;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            theme: "phantom-stealth",
            setTheme: (theme: ThemeType) => {
                document.documentElement.setAttribute("data-theme", theme === "phantom-stealth" ? "" : theme);
                set({ theme });
            },

            // RepoGroup Logic
            accounts: getAccounts(),
            setAccounts: (accounts: ProviderProfile[]) => {
                persistAccounts(accounts);
                set({ accounts });
                const currentActive = accounts.find(a => a.isActive) || accounts[0] || null;
                set({ activeAccount: currentActive });
                // Reset token status on account change
                set({ tokenStatus: { jules: "missing", github: "missing", hf: "missing" } });
            },
            activeAccount: getAccounts().find(a => a.isActive) || getAccounts()[0] || null,
            setActiveAccount: (id: string) => {
                const updated = get().accounts.map(a => ({
                    ...a,
                    isActive: a.id === id
                }));
                persistAccounts(updated);
                set({ accounts: updated, activeAccount: updated.find(a => a.isActive) || null });
                // Reset status on account switch
                set({ tokenStatus: { jules: "missing", github: "missing", hf: "missing" } });
                // Clear cache on account switch to prevent data leakage between profiles
                get().clearCache();
            },

            // Cache Logic
            cache: {
                repos: { data: [], timestamp: 0 },
                starred: { data: [], timestamp: 0 },
                inbox: { data: [], timestamp: 0 },
                huggingface: { data: { models: [], spaces: [] }, timestamp: 0 },
            },
            updateCache: (key, data) => {
                set(state => ({
                    cache: {
                        ...state.cache,
                        [key]: { data, timestamp: Date.now() }
                    }
                }));
            },
            clearCache: () => {
                set({
                    cache: {
                        repos: { data: [], timestamp: 0 },
                        starred: { data: [], timestamp: 0 },
                        inbox: { data: [], timestamp: 0 },
                        huggingface: { data: { models: [], spaces: [] }, timestamp: 0 },
                    }
                });
            },

            // Auth Logic
            tokenStatus: { jules: "missing", github: "missing", hf: "missing" },
            setTokenStatus: (provider, status) => {
                set(state => ({
                    tokenStatus: {
                        ...state.tokenStatus,
                        [provider]: status
                    }
                }));
            }
        }),
        {
            name: "ag-app-storage",
            onRehydrateStorage: () => (state: AppState | undefined) => {
                if (state) {
                    document.documentElement.setAttribute("data-theme", state.theme === "phantom-stealth" ? "" : state.theme);
                }
            },
        }
    )
);
