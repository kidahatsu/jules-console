import { useState, useEffect, memo } from "react";
import { Star, ExternalLink, MessageSquare, CheckCircle2, XCircle, Sparkles, Pencil, X, Trash2, Loader2, Link2, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { StarredRepo, ReviewStatus } from "@/hooks/useStarredRepos";
import { JulesActionModal } from "./JulesActionModal";
import { StarredRepoDetailModal } from "./StarredRepoDetailModal";
import { extractSessionId, cn } from "@/lib/utils";
import { audio } from "@/lib/audio";

interface StarredRepoCardProps {
    repo: StarredRepo;
    onUpdateReview: (id: number, status: ReviewStatus, notes?: string) => void;
    onUnstar?: (repo: StarredRepo) => Promise<void>;
    onBindSession?: (repoId: number, sessionId: string) => void;
}

export const StarredRepoCard = memo(function StarredRepoCard({ repo, onUpdateReview, onUnstar, onBindSession }: StarredRepoCardProps) {
    const [isJulesModalOpen, setIsJulesModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [isLinkingSession, setIsLinkingSession] = useState(false);
    const [manualSessionInput, setManualSessionInput] = useState("");
    const [notes, setNotes] = useState(repo.notes || "");
    const [isUnstarring, setIsUnstarring] = useState(false);

    // Keep notes state in sync with prop updates (e.g. from background polling)
    useEffect(() => {
        if (!isEditingNotes) {
            setNotes(repo.notes || "");
        }
    }, [repo.notes, isEditingNotes]);

    const handleSaveNotes = () => {
        audio.playClick();
        onUpdateReview(repo.id, repo.reviewStatus, notes);
        setIsEditingNotes(false);
    };

    const handleManualLink = () => {
        if (!manualSessionInput.trim()) return;
        const sessionId = extractSessionId(manualSessionInput);
        onBindSession?.(repo.id, sessionId);
        setManualSessionInput("");
        setIsLinkingSession(false);
    };

    const handleUnstar = async () => {
        if (!onUnstar) return;
        const confirmed = window.confirm(`Permanently unstar ${repo.full_name} on GitHub?`);
        if (!confirmed) return;

        setIsUnstarring(true);
        try {
            await onUnstar(repo);
        } catch {
            alert("Failed to unstar repository.");
        } finally {
            setIsUnstarring(false);
        }
    };

    const renderStatusBadge = () => {
        if (repo.activeSessionId) {
            return (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-400 uppercase tracking-widest animate-pulse shadow-glow-sm" title="Jules is performing a deep architectural analysis">
                    <Sparkles className="w-3 h-3" />
                    Analyzing
                </div>
            );
        }

        switch (repo.reviewStatus) {
            case "REVIEWED":
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-widest" title="Verified & Approved Node">
                        <CheckCircle2 className="w-3 h-3" />
                        Reviewed
                    </div>
                );
            case "REJECTED":
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[9px] font-black text-rose-400 uppercase tracking-widest" title="Rejected for alignment issues">
                        <XCircle className="w-3 h-3" />
                        Rejected
                    </div>
                );
            default: // TO_REVIEW
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[9px] font-black text-amber-400 uppercase tracking-widest" title="Awaiting human triage">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        To Review
                    </div>
                );
        }
    };

    return (
        <>
            <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group p-5 rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl hover:border-primary/30 transition-all flex flex-col gap-4 shadow-2xl hover:shadow-primary/5 h-full relative overflow-hidden ${isUnstarring ? 'opacity-50 pointer-events-none' : ''}`}
            >
                {/* Background Glow */}
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-colors pointer-events-none" />

                <div className="flex items-start gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                            <img 
                                src={`${repo.owner.avatar_url}${repo.owner.avatar_url.includes('?') ? '&' : '?'}s=64`} 
                                alt={repo.owner.login} 
                                className="w-10 h-10 rounded-xl border border-white/10 shadow-lg group-hover:scale-105 transition-transform" 
                                loading="lazy"
                            />
                            <div className={cn(
                                "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-zinc-900 shadow-sm",
                                repo.reviewStatus === "REVIEWED" ? "bg-emerald-500" : repo.reviewStatus === "REJECTED" ? "bg-rose-500" : "bg-amber-500"
                            )} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-xs text-zinc-500 font-bold uppercase tracking-[0.1em] truncate mb-0.5">
                                {repo.owner.login}
                            </div>
                            <h3 className="font-black text-base leading-tight truncate group-hover:text-primary transition-colors" title={repo.full_name}>
                                {repo.name}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all -mt-3">
                    {repo.reviewStatus === "REJECTED" && onUnstar && (
                        <button 
                            onClick={handleUnstar}
                            className="p-1.5 hover:bg-rose-500/10 rounded-lg text-zinc-500 hover:text-rose-500 transition-colors"
                            title="Unstar on GitHub"
                        >
                            {isUnstarring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                    )}
                    <button 
                        onClick={() => setIsDetailModalOpen(true)}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors"
                        title="Deep View"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 min-h-[32px] font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                    {repo.description || "No description provided for this node."}
                </p>

                <div className="flex flex-col gap-3 border-t border-white/5 pt-3">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                            <div className="flex items-center gap-1.5">
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500/20" />
                                <span>{repo.stargazers_count.toLocaleString()}</span>
                            </div>
                            {repo.language && (
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    <span>{repo.language}</span>
                                </div>
                            )}
                        </div>
                        <div className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest ml-auto">
                            {new Date(repo.updated_at).toLocaleDateString()}
                        </div>
                    </div>
                    <div className="flex items-center">
                        {renderStatusBadge()}
                    </div>
                </div>

                {/* Notes Area */}
                <div className="bg-black/20 rounded-xl p-4 border border-white/5 flex-1 min-h-[80px] relative group/notes overflow-hidden transition-colors hover:border-white/10">
                    <AnimatePresence mode="wait">
                        {isEditingNotes ? (
                            <motion.div 
                                key="edit"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-3"
                            >
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-xs text-zinc-200 resize-none min-h-[50px] placeholder:text-zinc-700"
                                    placeholder="Enter technical observations..."
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setIsEditingNotes(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
                                    <button onClick={handleSaveNotes} className="p-1.5 bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="view"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsEditingNotes(true)}
                                className="cursor-pointer h-full"
                            >
                                <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-[0.2em] font-black text-zinc-600">
                                    <MessageSquare className="w-3 h-3" />
                                    Telemetry_Notes
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed font-medium italic line-clamp-3">
                                    {repo.notes || "No technical debt logged. Click to initiate manual report."}
                                </p>
                                <Pencil className="absolute top-4 right-4 w-3 h-3 text-zinc-700 opacity-0 group-hover/notes:opacity-100 transition-opacity" />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                    <button 
                        onClick={() => {
                            audio.playSuccess();
                            onUpdateReview(repo.id, "REVIEWED", repo.notes);
                        }}
                        disabled={repo.reviewStatus === "REVIEWED"}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            repo.reviewStatus === "REVIEWED" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-glow-sm" 
                            : "bg-zinc-900/50 hover:bg-emerald-500/10 text-zinc-500 hover:text-emerald-400 border border-white/5"
                        }`}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                    </button>
                    <button 
                        onClick={() => {
                            audio.playError();
                            onUpdateReview(repo.id, "REJECTED", repo.notes);
                        }}
                        disabled={repo.reviewStatus === "REJECTED"}
                        className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            repo.reviewStatus === "REJECTED" 
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-glow-sm" 
                            : "bg-zinc-900/50 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 border border-white/5"
                        }`}
                    >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                    </button>
                </div>

                <div className="flex gap-2">
                    {!repo.activeSessionId ? (
                        <div className="flex-1 flex gap-2">
                            <button 
                                onClick={() => {
                                    audio.playClick();
                                    setIsJulesModalOpen(true);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                Run_Audit
                            </button>
                            <button 
                                onClick={() => setIsLinkingSession(!isLinkingSession)}
                                className={`p-2.5 rounded-xl border transition-all ${isLinkingSession ? 'bg-primary text-white border-primary shadow-glow-sm' : 'bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 border-white/5'}`}
                                title="Manually link a session"
                            >
                                <Link2 className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button 
                            disabled
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-500/5 text-indigo-400/50 border border-indigo-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed"
                        >
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Audit_In_Progress
                        </button>
                    )}
                    <a 
                        href={repo.html_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2.5 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-xl border border-white/5 transition-all"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>

                <AnimatePresence>
                    {isLinkingSession && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="flex gap-2 p-2 bg-zinc-950 rounded-lg border border-primary/20 mt-1">
                                <input 
                                    type="text"
                                    value={manualSessionInput}
                                    onChange={(e) => setManualSessionInput(e.target.value)}
                                    placeholder="Paste Session ID or Jules URL..."
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-[10px] text-zinc-300 placeholder:text-zinc-600"
                                    onKeyDown={(e) => e.key === 'Enter' && handleManualLink()}
                                    autoFocus
                                />
                                <button 
                                    onClick={handleManualLink}
                                    className="p-1 bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <JulesActionModal 
                    isOpen={isJulesModalOpen}
                    onClose={() => setIsJulesModalOpen(false)}
                    repo={{
                        id: repo.id,
                        name: repo.name,
                        full_name: repo.full_name,
                        description: repo.description,
                        html_url: repo.html_url,
                        clone_url: repo.clone_url,
                        ssh_url: repo.ssh_url,
                        updated_at: repo.updated_at,
                        default_branch: repo.default_branch,
                        is_template: false,
                        stargazers_count: repo.stargazers_count,
                        forks_count: 0,
                        language: repo.language,
                        owner: {
                            login: repo.owner.login,
                            avatar_url: repo.owner.avatar_url
                        }
                    }}

                    onSessionStarted={(sessionId) => {
                        onBindSession?.(repo.id, sessionId);
                    }}
                />
            </motion.div>

            <StarredRepoDetailModal 
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                repo={repo}
                onUpdateReview={onUpdateReview}
                onUnstar={onUnstar}
                onBindSession={onBindSession}
            />
        </>
    );
});
