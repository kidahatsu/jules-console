import { useState, useEffect, useCallback } from "react";
import { X, GitBranch, Plus, Trash2, Loader2, RefreshCw } from "lucide-react";
import type { GithubRepo } from "@/hooks/useGithubRepos";
import { getBranches, createBranch, deleteBranch } from "@/lib/github";

interface BranchManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    repo: GithubRepo | null;
}

interface Branch {
    name: string;
    commit: {
        sha: string;
        url: string;
    };
    protected: boolean;
}

export function BranchManagerModal({ isOpen, onClose, repo }: BranchManagerModalProps) {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newBranchName, setNewBranchName] = useState("");
    const [sourceBranch, setSourceBranch] = useState(""); // Default to repo.default_branch
    const [error, setError] = useState<string | null>(null);

    const loadBranches = useCallback(async () => {
        if (!repo) return;
        setIsLoading(true);
        setError(null);
        try {
            const [owner, name] = repo.full_name.split("/");
            const data = await getBranches(owner, name);
            setBranches(data);
        } catch (err) {
            console.error("Branch Manager Error:", err instanceof Error ? err.message : "Unknown error");
            setError("Failed to load branches");
        } finally {
            setIsLoading(false);
        }
    }, [repo]);

    useEffect(() => {
        if (isOpen && repo) {
            loadBranches();
            setSourceBranch(repo.default_branch);
        }
    }, [isOpen, repo, loadBranches]);

    const handleCreateBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!repo || !newBranchName.trim()) return;

        setIsCreating(true);
        setError(null);
        try {
            const [owner, name] = repo.full_name.split("/");
            // Find SHA of source branch
            const source = branches.find(b => b.name === sourceBranch);
            if (!source) throw new Error("Source branch not found");

            await createBranch(owner, name, newBranchName, source.commit.sha);
            setNewBranchName("");
            await loadBranches();
        } catch (err: unknown) {
            console.error("Branch Manager Error:", err instanceof Error ? err.message : "Unknown error");
            setError(err instanceof Error ? err.message : "Failed to create branch");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteBranch = async (branchName: string) => {
        if (!repo) return;
        if (!confirm(`Are you sure you want to delete branch '${branchName}'?`)) return;

        setIsLoading(true);
        try {
            const [owner, name] = repo.full_name.split("/");
            await deleteBranch(owner, name, branchName);
            await loadBranches();
        } catch (err: unknown) {
            console.error("Branch Manager Error:", err instanceof Error ? err.message : "Unknown error");
            setError("Failed to delete branch");
            setIsLoading(false); // Stop loading only on error, success handled by loadBranches re-render
        }
    };

    if (!isOpen || !repo) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 h-[600px]">
                <div className="flex items-center justify-between p-4 border-b border-border bg-zinc-900/50">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-indigo-400" />
                        Manage Branches
                        <span className="text-zinc-500 font-normal text-sm ml-2">({repo.name})</span>
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={loadBranches}
                            disabled={isLoading}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white"
                        >
                            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white">
                            <X className="h-5 w-5 opacity-70" />
                        </button>
                    </div>
                </div>

                {/* Create Branch Form */}
                <div className="p-4 border-b border-border bg-zinc-900/30">
                    <form onSubmit={handleCreateBranch} className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-medium text-zinc-400">New Branch Name</label>
                            <input
                                required
                                type="text"
                                value={newBranchName}
                                onChange={(e) => setNewBranchName(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                                placeholder="feature/new-idea"
                            />
                        </div>
                        <div className="w-1/3 space-y-1.5">
                            <label className="text-xs font-medium text-zinc-400">Source</label>
                            <select
                                value={sourceBranch}
                                onChange={(e) => setSourceBranch(e.target.value)}
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm"
                            >
                                {branches.map(b => (
                                    <option key={b.name} value={b.name}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={isCreating || isLoading}
                            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-500 transition-colors flex items-center gap-2 disabled:opacity-50 mb-0.5"
                        >
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Create
                        </button>
                    </form>
                    {error && <div className="mt-2 text-xs text-rose-300 bg-rose-500/10 px-2 py-1 rounded">{error}</div>}
                </div>

                {/* Branch List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {isLoading && branches.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-zinc-500 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" /> Loading branches...
                        </div>
                    ) : branches.length === 0 ? (
                        <div className="text-center py-10 text-zinc-500">No branches found.</div>
                    ) : (
                        <div className="space-y-1">
                            {branches.map((branch) => (
                                <div key={branch.name} className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/50 group border border-transparent hover:border-zinc-800 transition-all">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <GitBranch className="w-4 h-4 text-zinc-500" />
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm text-zinc-200 truncate">{branch.name}</span>
                                                {branch.name === repo.default_branch && (
                                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20">Default</span>
                                                )}
                                                {branch.protected && (
                                                    <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">Protected</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-zinc-500 font-mono mt-0.5 truncate max-w-[200px]" title={branch.commit.sha}>
                                                {branch.commit.sha.substring(0, 7)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                        {branch.name !== repo.default_branch && !branch.protected && (
                                            <button
                                                onClick={() => handleDeleteBranch(branch.name)}
                                                className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                                                title="Delete branch"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
