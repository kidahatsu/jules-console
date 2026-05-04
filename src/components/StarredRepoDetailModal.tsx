import { useState, useEffect } from "react";
import { X, Star, ExternalLink, MessageSquare, CheckCircle2, XCircle, Save, Calendar, Code, Trash2, Loader2, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import type { StarredRepo, ReviewStatus } from "@/hooks/useStarredRepos";
import { extractSessionId } from "@/lib/utils";

interface StarredRepoDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    repo: StarredRepo;
    onUpdateReview: (id: number, status: ReviewStatus, notes?: string) => void;
    onUnstar?: (repo: StarredRepo) => Promise<void>;
    onBindSession?: (repoId: number, sessionId: string) => void;
}

export function StarredRepoDetailModal({ isOpen, onClose, repo, onUpdateReview, onUnstar, onBindSession }: StarredRepoDetailModalProps) {
    const [notes, setNotes] = useState(repo.notes || "");
    const [isSaving, setIsSaving] = useState(false);
    const [isUnstarring, setIsUnstarring] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [manualId, setManualId] = useState("");

    useEffect(() => {
        setNotes(repo.notes || "");
    }, [repo.notes]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsSaving(true);
        onUpdateReview(repo.id, repo.reviewStatus, notes);
        setTimeout(() => setIsSaving(false), 500);
    };

    const handleStatusChange = (status: ReviewStatus) => {
        onUpdateReview(repo.id, status, notes);
    };

    const handleManualLink = () => {
        if (!manualId.trim()) return;
        onBindSession?.(repo.id, extractSessionId(manualId));
        setManualId("");
        setIsLinking(false);
    };

    const renderStatusBadge = () => {
        switch (repo.reviewStatus) {
            case "REVIEWED":
                return (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest shadow-glow-sm">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified Node
                    </div>
                );
            case "REJECTED":
                return (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-black text-rose-400 uppercase tracking-widest shadow-glow-sm">
                        <XCircle className="w-3 h-3" />
                        Rejected
                    </div>
                );
            default:
                return (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-black text-amber-400 uppercase tracking-widest shadow-glow-sm">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Pending Review
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="w-full max-w-5xl bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-black/40 flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <img src={repo.owner.avatar_url} alt={repo.owner.login} className="w-16 h-16 rounded-2xl border border-white/10 shadow-2xl" />
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="min-w-0">
                                    <div className="text-xs text-zinc-500 font-bold uppercase tracking-[0.2em] mb-1">
                                        {repo.owner.login}
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tighter text-glow text-white leading-none">{repo.name}</h2>
                                </div>
                                {renderStatusBadge()}
                            </div>
                            <div className="flex items-center gap-4 mt-3 text-sm text-zinc-500 font-medium">
                                <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500" /> {repo.stargazers_count.toLocaleString()} stars</span>
                                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-zinc-600" /> Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <a 
                            href={repo.html_url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="p-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition-all"
                        >
                            <ExternalLink className="w-5 h-5" />
                        </a>
                        <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Left Side: Metadata & Description */}
                    <div className="w-full md:w-1/3 border-r border-border p-8 space-y-8 overflow-y-auto bg-zinc-950/10">
                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Overview</h3>
                            <p className="text-zinc-400 leading-relaxed font-medium">
                                {repo.description || "No description provided for this repository."}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Quick Actions</h3>
                            <div className="grid grid-cols-1 gap-2">
                                <button 
                                    onClick={() => handleStatusChange("REVIEWED")}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${repo.reviewStatus === "REVIEWED" ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                                >
                                    <span className="font-bold text-sm">Approve Node</span>
                                    <CheckCircle2 className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => handleStatusChange("REJECTED")}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${repo.reviewStatus === "REJECTED" ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                                >
                                    <span className="font-bold text-sm">Reject Node</span>
                                    <XCircle className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-600">Manual Sync</h3>
                                <button onClick={() => setIsLinking(!isLinking)} className="text-primary hover:text-indigo-400 transition-colors">
                                    <Link2 className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <AnimatePresence>
                                {isLinking && (
                                    <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-2 overflow-hidden"
                                    >
                                        <input 
                                            type="text" 
                                            value={manualId}
                                            onChange={(e) => setManualId(e.target.value)}
                                            placeholder="Jules Session ID or URL"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                        <button 
                                            onClick={handleManualLink}
                                            className="w-full py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest"
                                        >
                                            Link Session
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {repo.reviewStatus === "REJECTED" && onUnstar && (
                                <button 
                                    onClick={async () => {
                                        if (window.confirm("Unstar on GitHub?")) {
                                            setIsUnstarring(true);
                                            try { await onUnstar(repo); onClose(); } catch { alert("Failed"); } finally { setIsUnstarring(false); }
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-rose-500 hover:bg-rose-500/10 transition-all text-xs font-black uppercase tracking-widest"
                                >
                                    {isUnstarring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    Unstar Repository
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Notes & Reports (The "Bigger View") */}
                    <div className="flex-1 p-8 overflow-y-auto space-y-8 bg-zinc-950/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-primary" />
                                <h3 className="text-lg font-bold text-white tracking-tight">Intelligence & Notes</h3>
                            </div>
                            <button 
                                onClick={handleSave}
                                disabled={isSaving || notes === repo.notes}
                                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${notes !== repo.notes ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-zinc-900 text-zinc-600 border border-zinc-800'}`}
                            >
                                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                {isSaving ? 'Synchronizing...' : 'Save Notes'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-8">
                            <div className="space-y-4">
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add private architectural thoughts, research notes, or findings..."
                                    className="w-full h-[300px] bg-zinc-950 border border-border rounded-3xl p-6 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium leading-relaxed resize-none shadow-inner"
                                />
                            </div>

                            <div className="space-y-4 pt-8 border-t border-white/5">
                                <div className="flex items-center gap-2 text-zinc-500">
                                    <Code className="w-4 h-4" />
                                    <span className="text-xs font-black uppercase tracking-widest">Rendered Analysis</span>
                                </div>
                                <div className="prose prose-invert prose-sm max-w-none bg-zinc-900/30 rounded-3xl p-8 border border-white/5 shadow-inner">
                                    {/* Security: Prevent XSS by sanitizing markdown with rehype-sanitize */}
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeSanitize]}
                                        components={{
                                            a: ({ node, ...props }) => {
                                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                                // @ts-expect-error - node is removed from props to prevent React warning
                                                const _node = node;
                                                return <a {...props} target="_blank" rel="noopener noreferrer" />;
                                            }
                                        }}
                                    >
                                        {notes || "*No intelligence data provided. Use Jules to generate an architectural report.*"}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
