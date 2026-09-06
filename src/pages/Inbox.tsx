import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox as InboxIcon, MessageSquare, GitPullRequest, AlertCircle, ExternalLink, CheckCircle2, Loader2, RefreshCw, ChevronDown, ChevronUp, Sparkles, User, Terminal, EyeOff, BellRing, AtSign, ShieldAlert, Search } from "lucide-react";
import { useInbox, type UnifiedNotification } from "@/hooks/useInbox";
import { JulesActionModal } from "@/components/JulesActionModal";
import { cn } from "@/lib/utils";

type SourceFilter = "ALL" | "GITHUB" | "HUGGINGFACE";
type CategoryFilter = "ALL" | "MENTION" | "REVIEW" | "SECURITY";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
};

export default function Inbox() {
    const { notifications, loading, error, refetch, markRead, markAllRead, unsubscribe, fetchDetail } = useInbox();
    const [selectedNotification, setSelectedNotification] = useState<UnifiedNotification | null>(null);
    const [isJulesModalOpen, setIsJulesModalOpen] = useState(false);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState("");
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");

    const filteredNotifications = useMemo(() => {
        return notifications.filter(n => {
            const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                n.repo.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSource = sourceFilter === "ALL" || n.source === sourceFilter;
            
            let matchesCategory = true;
            if (categoryFilter === "MENTION") matchesCategory = n.category.includes("mention");
            if (categoryFilter === "REVIEW") matchesCategory = n.category === "review_requested";
            if (categoryFilter === "SECURITY") matchesCategory = n.category === "security_alert";

            return matchesSearch && matchesSource && matchesCategory;
        });
    }, [notifications, searchQuery, sourceFilter, categoryFilter]);

    const handleJulesFix = async (n: UnifiedNotification) => {
        setIsFetchingDetail(true);
        setSelectedNotification(n);
        // Ensure we have the body before opening the modal
        const body = await fetchDetail(n);
        setSelectedNotification({ ...n, body });
        setIsFetchingDetail(false);
        setIsJulesModalOpen(true);
    };

    const handleExpand = async (n: UnifiedNotification) => {
        if (!n.body && n.source === "GITHUB") {
            await fetchDetail(n);
        }
    };

    if (loading && notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-zinc-500 animate-pulse font-bold tracking-widest uppercase text-xs">Scanning RepoGroup Channels...</p>
            </div>
        );
    }

    return (
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8 max-w-[1200px] mx-auto pb-20"
        >
            <title>Inbox | Notifications</title>
            <meta name="description" content="Aggregated notifications from GitHub and Hugging Face." />

            {/* Header */}
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                    <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-widest uppercase mb-2">
                        <InboxIcon className="w-3.5 h-3.5" />
                        Activity Feed
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter text-glow">
                        Inbox
                    </h2>
                    <p className="text-zinc-500 mt-2 max-w-xl font-medium">
                        Monitoring and action center for provider notifications.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={markAllRead}
                        className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Mark All Read
                    </button>
                    <button 
                        onClick={() => refetch()}
                        className="p-3 bg-white/5 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded-2xl transition-all shadow-inner group"
                    >
                        <RefreshCw className={`w-5 h-5 group-active:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </motion.div>

            {/* Filter Bar */}
            <motion.div variants={item} className="flex flex-col xl:flex-row gap-4 px-2">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search activity signals..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-zinc-600 shadow-2xl backdrop-blur-xl transition-all font-medium"
                    />
                </div>
                <div className="flex items-center gap-2 bg-black/40 border border-white/5 p-1.5 rounded-2xl backdrop-blur-xl">
                    <FilterTab active={sourceFilter === "ALL"} onClick={() => setSourceFilter("ALL")}>All</FilterTab>
                    <FilterTab active={sourceFilter === "GITHUB"} onClick={() => setSourceFilter("GITHUB")}>GitHub</FilterTab>
                    <FilterTab active={sourceFilter === "HUGGINGFACE"} onClick={() => setSourceFilter("HUGGINGFACE")}>HF</FilterTab>
                    <div className="w-[1px] h-6 bg-white/5 mx-1" />
                    <FilterTab active={categoryFilter === "MENTION"} onClick={() => setCategoryFilter(categoryFilter === "MENTION" ? "ALL" : "MENTION")} icon={<AtSign className="w-3 h-3" />} />
                    <FilterTab active={categoryFilter === "REVIEW"} onClick={() => setCategoryFilter(categoryFilter === "REVIEW" ? "ALL" : "REVIEW")} icon={<BellRing className="w-3 h-3" />} />
                    <FilterTab active={categoryFilter === "SECURITY"} onClick={() => setCategoryFilter(categoryFilter === "SECURITY" ? "ALL" : "SECURITY")} icon={<ShieldAlert className="w-3 h-3 text-rose-500" />} />
                </div>
            </motion.div>

            {/* List */}
            <motion.div variants={item} className="space-y-3 px-2">
                <AnimatePresence mode="popLayout">
                    {error ? (
                        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center text-rose-500 bg-rose-500/5 border border-rose-500/10 rounded-3xl">
                            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                            <p className="font-bold">{error}</p>
                        </motion.div>
                    ) : filteredNotifications.length === 0 ? (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-32 text-center glass rounded-[3rem] border-dashed border-white/5">
                            <CheckCircle2 className="w-16 h-16 text-emerald-500/20 mx-auto mb-8" />
                            <h3 className="text-2xl font-black text-white tracking-tight">No Notifications</h3>
                            <p className="text-zinc-500 mt-2 font-medium">No active communications detected in your monitored channels.</p>
                        </motion.div>
                    ) : (
                        filteredNotifications.map((n) => (
                            <NotificationRow 
                                key={n.id} 
                                notification={n} 
                                onMarkRead={markRead} 
                                onUnsubscribe={() => unsubscribe(n)}
                                onJulesFix={() => handleJulesFix(n)}
                                onExpand={() => handleExpand(n)}
                                isFetchingDetail={isFetchingDetail && selectedNotification?.id === n.id}
                            />
                        ))
                    )}
                </AnimatePresence>
            </motion.div>

            <JulesActionModal 
                isOpen={isJulesModalOpen}
                onClose={() => setIsJulesModalOpen(false)}
                repo={selectedNotification ? {
                    id: 0,
                    name: "Inbox Task",
                    full_name: selectedNotification.repo,
                    description: selectedNotification.title,
                    html_url: selectedNotification.url,
                    clone_url: "", // Force repoless/insight mode
                    ssh_url: "",
                    stargazers_count: 0,
                    forks_count: 0,
                    language: "Inbox",
                    updated_at: selectedNotification.createdAt,
                    default_branch: "main",
                    is_template: false,
                    owner: {
                        login: selectedNotification.author,
                        avatar_url: "" // Fallback handled by component
                    }
                } : null}
                inboxContext={selectedNotification ? {
                    title: selectedNotification.title,
                    source: selectedNotification.source,
                    author: selectedNotification.author,
                    type: selectedNotification.type,
                    body: selectedNotification.body
                } : undefined}
            />
        </motion.div>
    );
}

function FilterTab({ children, active, onClick, icon }: { children?: React.ReactNode, active: boolean, onClick: () => void, icon?: React.ReactNode }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                active ? "bg-primary text-white shadow-glow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
        >
            {icon}
            {children}
        </button>
    );
}

interface NotificationRowProps {
    notification: UnifiedNotification;
    onMarkRead: (n: UnifiedNotification) => void;
    onUnsubscribe: () => void;
    onJulesFix: () => void;
    onExpand: () => void;
    isFetchingDetail: boolean;
}

function NotificationRow({ notification, onMarkRead, onUnsubscribe, onJulesFix, onExpand, isFetchingDetail }: NotificationRowProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isGithub = notification.source === "GITHUB";

    const toggleExpand = () => {
        const next = !isExpanded;
        setIsExpanded(next);
        if (next) onExpand();
    };
    
    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
                "group relative rounded-2xl border transition-all flex flex-col",
                notification.unread 
                    ? "bg-zinc-900/60 border-primary/30 shadow-lg shadow-primary/5" 
                    : "bg-zinc-950/40 border-white/5 opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
            )}
        >
            <div className="flex items-center gap-6 p-5">
                {/* Status Dot */}
                {notification.unread && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full shadow-glow" />
                )}

                {/* Icon */}
                <div className={cn(
                    "p-3 rounded-xl border border-white/5 shrink-0",
                    isGithub ? "bg-zinc-800 text-white" : "bg-amber-500/10 text-amber-500"
                )}>
                    {notification.type === "PR" ? <GitPullRequest className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={toggleExpand}>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                            "text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border",
                            isGithub ? "bg-white/5 border-white/10 text-zinc-400" : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                        )}>
                            {notification.category.replace("_", " ")}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-500 truncate max-w-[200px]">{notification.repo}</span>
                        {(notification.category === "mention" || notification.category === "review_requested") && (
                            <span className="px-1.5 py-0.5 rounded bg-primary text-white text-[8px] font-black uppercase tracking-tighter animate-pulse shadow-glow-sm">Priority</span>
                        )}
                        <span className="text-[10px] text-zinc-600 ml-auto">{new Date(notification.createdAt).toLocaleString()}</span>
                    </div>
                    <h4 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                        {notification.title}
                    </h4>
                    <p className="text-xs text-zinc-500 mt-1 font-medium flex items-center gap-1">
                        <User className="w-3 h-3" /> @{notification.author}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    <button 
                        onClick={onJulesFix}
                        disabled={isFetchingDetail}
                        className="p-2.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl border border-primary/20 transition-all group/jules disabled:opacity-50"
                        title="Dispatch Jules to address this"
                    >
                        {isFetchingDetail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 group-hover/jules:scale-110 transition-transform" />}
                    </button>
                    {notification.unread && (
                        <button 
                            onClick={() => onMarkRead(notification)}
                            className="p-2.5 bg-white/5 hover:bg-emerald-500/10 text-zinc-500 hover:text-emerald-400 rounded-xl border border-white/5 transition-all"
                            title="Mark as read"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                        </button>
                    )}
                    {isGithub && (
                        <button 
                            onClick={onUnsubscribe}
                            className="p-2.5 hover:bg-rose-500/10 text-zinc-600 hover:text-rose-500 rounded-xl transition-all"
                            title="Unsubscribe from thread"
                        >
                            <EyeOff className="w-4 h-4" />
                        </button>
                    )}
                    <button 
                        onClick={toggleExpand}
                        className="p-2.5 hover:bg-white/5 text-zinc-500 rounded-xl transition-all"
                    >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Expanded Section */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden border-t border-white/5 bg-black/20"
                    >
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Activity Details</h5>
                                <a 
                                    href={notification.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs text-primary hover:underline font-bold"
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    View Original {notification.type}
                                </a>
                            </div>
                            
                            <div className="p-4 bg-zinc-900/50 rounded-xl border border-white/5 text-xs text-zinc-400 leading-relaxed font-medium overflow-hidden">
                                {notification.body ? (
                                    <div className="prose prose-invert prose-xs max-w-none whitespace-pre-wrap">
                                        {notification.body.substring(0, 2000)}{notification.body.length > 2000 ? "..." : ""}
                                    </div>
                                ) : (
                                    isGithub 
                                        ? `This ${notification.type.toLowerCase()} was triggered by ${notification.author} in the ${notification.repo} repository. Jules can analyze the context and suggest fixes or provide an audit report.` 
                                        : `This discussion on Hugging Face for ${notification.repo} requires technical attention. Jules can audit the model card or space configuration to provide insights.`
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button 
                                    onClick={onJulesFix}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    <Terminal className="w-3.5 h-3.5" />
                                    Dispatch Jules Fix
                                </button>
                                <button 
                                    onClick={() => onMarkRead(notification)}
                                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-xs font-black uppercase tracking-widest hover:text-white transition-colors"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Archive Signal
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
