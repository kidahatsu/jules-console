import { useState, useEffect, useCallback } from "react";
import { X, Loader2, Sparkles, FileText, Search, Zap, GitPullRequest, Info, ArrowRight, Terminal, Cpu, ShieldAlert, LayoutGrid, Palette } from "lucide-react";
import { createJulesSession } from "@/lib/jules";
import { getRepoPullRequests, mergePullRequest } from "@/lib/github";
import type { GithubRepo } from "@/hooks/useGithubRepos";
import { Link } from "react-router-dom";
import { CreateSessionSchema } from "@/lib/validation";

interface JulesActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    repo: GithubRepo | null;
    onSessionStarted?: (sessionId: string) => void;
    inboxContext?: {
        title: string;
        source: string;
        author: string;
        type: string;
        body?: string;
    };
}

import { JULES_PROMPTS } from "@/lib/prompts";

type ActionType = "audit" | "suggestions" | "description" | "fix" | "performance" | "architecture";

export function JulesActionModal({ isOpen, onClose, repo, onSessionStarted, inboxContext }: JulesActionModalProps) {
    const [actionType, setActionType] = useState<ActionType>(inboxContext ? "fix" : "audit");
    const [customPrompt, setCustomPrompt] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{ sessionId: string; } | null>(null);
    const [prNumber, setPrNumber] = useState<number | null>(null);
    const [isMerging, setIsMerging] = useState(false);
    const [mergeSuccess, setMergeSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Heuristic: If it has a clone_url, we treat it as "Synced/Owned" for full indexed Jules session
    const isOwnedRepo = repo?.clone_url !== "" && repo?.id !== 0;
    const isHFAsset = repo?.name === "HF Audit";
    const isInboxTask = repo?.name === "Inbox Task";

    const checkForPR = useCallback(async () => {
        if (!repo || !isOwnedRepo || isHFAsset || isInboxTask) return;
        try {
            const [owner, name] = repo.full_name.split("/");
            const prs = await getRepoPullRequests(owner, name);
            if (prs.length > 0) {
                const latest = prs[0];
                const created = new Date(latest.created_at).getTime();
                const now = Date.now();
                if (now - created < 24 * 60 * 60 * 1000) { // 24 hours
                    setPrNumber(latest.number);
                }
            }
        } catch (e) {
            console.error("Failed to check for PR", e instanceof Error ? e.message : "Unknown error");
        }
    }, [repo, isOwnedRepo, isHFAsset, isInboxTask]);

    // Reset state when modal opens/closes or repo changes
    useEffect(() => {
        if (isOpen) {
            checkForPR();
            if (inboxContext) {
                setActionType("fix");
            }
        } else {
            setPrNumber(null);
            setResult(null); 
            setError(null);
            setCustomPrompt("");
        }
    }, [isOpen, repo, checkForPR, inboxContext]);

    if (!isOpen || !repo) return null;

    const prompts: Record<ActionType, string> = {
        audit: isHFAsset 
            ? `Analyze this Hugging Face asset (${repo.html_url}). Audit the model card, intended use cases, and configuration. Provide a technical summary of the model's architecture and performance characteristics.`
            : JULES_PROMPTS.SENTINEL_SECURITY + `\n\nContext: Perform a security audit on ${repo.full_name} at ${repo.html_url}.`,
        architecture: JULES_PROMPTS.ARCHITECT_SUGGESTION + `\n\nContext: Suggest architectural improvements for ${repo.full_name} at ${repo.html_url}.`,
        suggestions: isHFAsset
            ? `Analyze the Hugging Face asset at ${repo.html_url} and suggest 3-5 potential applications or fine-tuning directions that would maximize its utility.`
            : JULES_PROMPTS.PALETTE_UX + `\n\nContext: Find a micro-UX improvement for ${repo.full_name} at ${repo.html_url}.`,
        description: isHFAsset
            ? `Analyze the Hugging Face asset card for ${repo.html_url} and generate a professional, high-density summary for an AI engineering dashboard.`
            : JULES_PROMPTS.DESCRIPTION_BRIEF(repo.full_name),
        performance: JULES_PROMPTS.BOLT_PERFORMANCE + `\n\nContext: Hunt for a performance boost in ${repo.full_name} at ${repo.html_url}.`,
        fix: isInboxTask && inboxContext
            ? JULES_PROMPTS.INBOX_FIX({ ...inboxContext, repo: repo.full_name, url: repo.html_url })
            : JULES_PROMPTS.BOLT_PERFORMANCE + `\n\nContext: Fix architectural debt in ${repo.full_name} at ${repo.html_url}.`
    };

    const handleActionChange = (type: ActionType) => {
        setActionType(type);
        setCustomPrompt(prompts[type]);
        setResult(null);
        setError(null);
    };

    // Initialize prompt on open if empty
    if (!customPrompt && actionType) {
        setCustomPrompt(prompts[actionType]);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setResult(null);
        setPrNumber(null);
        setMergeSuccess(false);

        try {
            // Validate payload with Zod
            const payload = {
                task: customPrompt,
                repo: (isOwnedRepo && !isHFAsset) ? repo.full_name : undefined,
                branch: (isOwnedRepo && !isHFAsset) ? repo.default_branch : "main",
                automationMode: (isOwnedRepo && !isHFAsset) ? "AUTO_CREATE_PR" : "AUTO_CREATE_PR"
            };

            const validation = CreateSessionSchema.safeParse(payload);
            if (!validation.success) {
                throw new Error(validation.error.issues[0].message);
            }

            // For both Owned and Starred repos, we now use the Jules Session API
            // For Starred/Public repos, we omit the 'repo' parameter to dispatch a "repoless" session
            // Jules will analyze the public repo mentioned in the prompt.
            const session = await createJulesSession(validation.data);

            const sessionId = session.name.split("/").pop() || session.name;
            setResult({ sessionId });
            onSessionStarted?.(sessionId);
            
            if (isOwnedRepo && !isHFAsset) {
                setTimeout(() => checkForPR(), 10000); 
            }

        } catch (err: unknown) {
            console.error("Error:", err instanceof Error ? err.message : "Unknown error");
            const errorMessage = err instanceof Error ? err.message : "Failed to start session";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const reset = () => {
        setResult(null);
        setError(null);
        setIsLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className={`w-full max-w-md bg-card border border-border rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-300 max-h-[90vh]`}>
                <div className="flex items-center justify-between p-4 border-b border-border bg-zinc-950/30">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Sparkles className={`w-5 h-5 ${isOwnedRepo && !isHFAsset ? 'text-indigo-400' : isHFAsset ? 'text-amber-500' : 'text-emerald-400'}`} />
                        {isOwnedRepo && !isHFAsset ? "Jules AI Action" : isHFAsset ? "Jules HF Audit" : "Jules Insight Session"}
                    </h3>
                    <button onClick={reset} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="h-5 w-5 opacity-70" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Repository Header */}
                    <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-white/5">
                         <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOwnedRepo && !isHFAsset ? 'bg-indigo-500/10' : isHFAsset ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                            {isOwnedRepo && !isHFAsset ? <Zap className="w-5 h-5 text-indigo-400" /> : isHFAsset ? <Cpu className="w-5 h-5 text-amber-500" /> : <Search className="w-5 h-5 text-emerald-400" />}
                         </div>
                         <div className="min-w-0">
                            <div className="text-sm font-bold text-white truncate">{isHFAsset ? "Hugging Face Asset" : repo.name}</div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">
                                {isOwnedRepo && !isHFAsset ? "Autonomous Orchestration" : isHFAsset ? "Repoless AI Audit" : "Repoless Insight Session"}
                            </div>
                         </div>
                    </div>

                    {/* Pending PR (Owned only) */}
                    {!result && prNumber && !mergeSuccess && isOwnedRepo && !isHFAsset && (
                         <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2 text-indigo-300 font-medium">
                                <GitPullRequest className="w-4 h-4" />
                                <span>Recent PR #{prNumber} detected</span>
                            </div>
                            <button
                                onClick={async () => {
                                    setIsMerging(true);
                                    try {
                                        const [owner, name] = repo.full_name.split("/");
                                        await mergePullRequest(owner, name, prNumber);
                                        setMergeSuccess(true);
                                        setTimeout(() => onClose(), 2000);
                                    } catch { setError("Failed to merge PR"); }
                                    finally { setIsMerging(false); }
                                }}
                                disabled={isMerging}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {isMerging ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitPullRequest className="w-4 h-4" />}
                                Merge Pull Request
                            </button>
                        </div>
                    )}

                    {!result && (
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => handleActionChange("fix")}
                                className={`p-2.5 rounded-lg border text-[9px] font-black uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${actionType === "fix"
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800"
                                    }`}
                            >
                                <Terminal className="w-3.5 h-3.5" />
                                Fix
                            </button>
                            <button
                                type="button"
                                onClick={() => handleActionChange("audit")}
                                className={`p-2.5 rounded-lg border text-[9px] font-black uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${actionType === "audit"
                                        ? "bg-rose-500/10 border-rose-500/50 text-rose-400"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800"
                                    }`}
                            >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Audit
                            </button>
                            <button
                                type="button"
                                onClick={() => handleActionChange("architecture")}
                                className={`p-2.5 rounded-lg border text-[9px] font-black uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${actionType === "architecture"
                                        ? "bg-blue-500/10 border-blue-500/50 text-blue-400"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800"
                                    }`}
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                Arch
                            </button>
                            <button
                                type="button"
                                onClick={() => handleActionChange("performance")}
                                className={`p-2.5 rounded-lg border text-[9px] font-black uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${actionType === "performance"
                                        ? "bg-amber-500/10 border-amber-500/50 text-amber-500"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800"
                                    }`}
                            >
                                <Zap className="w-3.5 h-3.5" />
                                Bolt
                            </button>
                            <button
                                type="button"
                                onClick={() => handleActionChange("suggestions")}
                                className={`p-2.5 rounded-lg border text-[9px] font-black uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${actionType === "suggestions"
                                        ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800"
                                    }`}
                            >
                                <Palette className="w-3.5 h-3.5" />
                                UX
                            </button>
                            <button
                                type="button"
                                onClick={() => handleActionChange("description")}
                                className={`p-2.5 rounded-lg border text-[9px] font-black uppercase tracking-widest flex flex-col items-center gap-2 transition-all ${actionType === "description"
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800"
                                    }`}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                Brief
                            </button>
                        </div>
                    )}

                    {!result ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Analysis Scope</label>
                                <textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm min-h-[120px] shadow-inner"
                                />
                                {!isOwnedRepo && (
                                    <div className="text-[10px] text-zinc-500 flex items-center gap-1">
                                        <Info className="w-3 h-3" />
                                        Jules will perform a repoless analysis of this {isHFAsset ? 'Hugging Face asset' : 'public project'}.
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="p-3 text-sm text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-in shake-1 duration-300">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`px-6 py-2 ${isOwnedRepo && !isHFAsset ? 'bg-primary hover:bg-primary/90' : isHFAsset ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-primary/10`}
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                                    Dispatch Session
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div className="text-center space-y-4 py-8">
                                <div className={`w-16 h-16 ${isOwnedRepo && !isHFAsset ? 'bg-indigo-500/10' : isHFAsset ? 'bg-amber-500/10' : 'bg-emerald-500/10'} rounded-full flex items-center justify-center mx-auto border border-white/5 shadow-lg`}>
                                    <Sparkles className={`w-8 h-8 ${isOwnedRepo && !isHFAsset ? 'text-indigo-400' : isHFAsset ? 'text-amber-500' : 'text-emerald-400'} animate-pulse`} />
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-white tracking-tight">
                                        {isOwnedRepo && !isHFAsset ? "Autonomous Session Started" : "Insight Session Dispatched"}
                                    </h4>
                                    <p className="text-sm text-zinc-400 px-4">
                                        {isOwnedRepo && !isHFAsset
                                            ? `Jules is provisioning a cloud environment to analyze ${repo.name}.`
                                            : `Jules is starting a repoless analysis session for ${isHFAsset ? 'Hugging Face asset' : repo.name}.`}
                                    </p>
                                </div>
                                <div className="bg-zinc-950/80 p-3 rounded-lg text-xs font-mono text-zinc-500 border border-white/5">
                                    SESSION_ID: {result.sessionId}
                                </div>
                                <div className="pt-2">
                                    <Link 
                                        to={`/sessions/${result.sessionId}`}
                                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                                        onClick={onClose}
                                    >
                                        <Terminal className="w-4 h-4" />
                                        Track Session Progress
                                    </Link>
                                </div>
                            </div>

                            <button
                                onClick={reset}
                                className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl transition-all shadow-xl"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
