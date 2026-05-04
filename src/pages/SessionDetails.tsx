import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, GitBranch, Calendar, Clock, Terminal, XCircle, Ban, Activity as ActivityIcon, ShieldCheck, Database, Zap } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { getJulesSession, getJulesActivities, type JulesSession, type Activity } from "@/lib/jules";
import { cn } from "@/lib/utils";
import { SessionTimeline } from "@/components/SessionTimeline";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
};

export default function SessionDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [session, setSession] = useState<JulesSession | null>(null);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<"timeline" | "logs">("timeline");

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            try {
                setLoading(true);
                const [sessionData, activityData] = await Promise.all([
                    getJulesSession(id),
                    getJulesActivities(id).catch(() => ({ activities: [] }))
                ]);
                setSession(sessionData);
                setActivities(activityData.activities || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load session details");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) return (
        <div className="flex flex-col h-full items-center justify-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
            <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px] animate-pulse">Connecting...</p>
        </div>
    );
    
    if (error) return (
        <div className="p-12 text-center glass rounded-3xl border-rose-500/20 max-w-xl mx-auto mt-20">
            <XCircle className="h-12 w-12 text-rose-500 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Connection Failed</h3>
            <p className="text-zinc-500 mt-2 font-medium">{error}</p>
            <button onClick={() => navigate("/sessions")} className="mt-8 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 transition-all">
                Back to Sessions
            </button>
        </div>
    );

    if (!session) return <div className="p-8 text-center glass rounded-2xl border-white/10">Session not found</div>;

    const getStatusColor = (state: string) => {
        if (state === "SUCCEEDED" || state === "COMPLETED") return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
        if (state === "FAILED" || state === "ABORTED") return "text-rose-400 bg-rose-400/10 border-rose-400/20";
        if (state === "CANCELLED") return "text-zinc-400 bg-zinc-400/10 border-zinc-400/20";
        return "text-amber-400 bg-amber-400/10 border-amber-400/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]";
    };

    const getStatusIcon = (state: string) => {
        if (state === "SUCCEEDED" || state === "COMPLETED") return <ShieldCheck className="h-5 w-5" />;
        if (state === "FAILED" || state === "ABORTED") return <XCircle className="h-5 w-5" />;
        if (state === "CANCELLED") return <Ban className="h-5 w-5" />;
        return <ActivityIcon className="h-5 w-5 animate-pulse" />;
    };

    const repoName = session.sourceContext?.source?.split("/").slice(-2).join("/") || "Unknown Repo";
    const branch = session.sourceContext?.githubRepoContext?.startingBranch || "main";
    const pullRequest = session.pullRequest?.url;

    return (
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-10"
        >
            {/* Header */}
            <motion.div variants={item} className="space-y-8">
                <Link to="/sessions" className="group inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors">
                    <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
                    Back to Activity Logs
                </Link>
                
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10">
                    <div className="flex-1 space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <Zap className="h-5 w-5 text-primary" />
                            </div>
                            <h2 className="text-4xl font-black tracking-tighter text-glow">Session Objective</h2>
                        </div>
                        
                        <div className="p-8 rounded-3xl glass border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <Terminal className="h-32 w-32" />
                            </div>
                            <div className="prose prose-invert prose-sm max-w-none relative z-10 prose-p:leading-relaxed prose-p:font-medium prose-p:text-zinc-300">
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
                                    {session.prompt || session.title || "Untitled Session"}
                                </ReactMarkdown>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/5 font-mono text-primary tracking-normal">SESSION_ID: {session.name.split("/").pop()}</span>
                            <span className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                {new Date(session.createTime).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col items-start lg:items-end gap-4 shrink-0 pt-2">
                        <div className={cn("px-6 py-3 rounded-2xl border flex items-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl", getStatusColor(session.state))}>
                            {getStatusIcon(session.state)}
                            {session.state}
                        </div>
                        {pullRequest && (
                            <a 
                                href={pullRequest} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-white bg-emerald-400/5 hover:bg-emerald-400/20 px-5 py-3 rounded-2xl border border-emerald-400/10 transition-all hover:scale-[1.02] shadow-lg shadow-emerald-500/5"
                            >
                                <GitBranch className="h-4 w-4" />
                                View Pull Request
                            </a>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Metadata Grid */}
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl glass border-white/5 space-y-4 hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-primary transition-colors">
                        <Database className="h-4 w-4" />
                        Repository
                    </div>
                    <div className="space-y-1">
                        <div className="font-black text-lg tracking-tight truncate">{repoName}</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5 inline-block">
                            BRANCH: {branch}
                        </div>
                    </div>
                </div>
                <div className="p-6 rounded-2xl glass border-white/5 space-y-4 hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-primary transition-colors">
                        <Calendar className="h-4 w-4" />
                        Created At
                    </div>
                    <div className="font-black text-lg tracking-tight uppercase">
                        {new Date(session.createTime).toLocaleString()}
                    </div>
                </div>
                <div className="p-6 rounded-2xl glass border-white/5 space-y-4 hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-primary transition-colors">
                        <Clock className="h-4 w-4" />
                        Last Updated
                    </div>
                    <div className="font-black text-lg tracking-tight uppercase">
                        {session.updateTime ? new Date(session.updateTime).toLocaleString() : "Awaiting update"}
                    </div>
                </div>
            </motion.div>

            {/* Activities Section */}
            <motion.div variants={item} className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-2">
                    <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                        <ActivityIcon className="h-6 w-6 text-primary" />
                        Session Activity
                    </h2>
                    <div className="flex bg-white/5 rounded-2xl p-1.5 border border-white/5">
                        <button
                            onClick={() => setView("timeline")}
                            className={cn(
                                "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                view === "timeline" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Visualizer
                        </button>
                        <button
                            onClick={() => setView("logs")}
                            className={cn(
                                "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                view === "logs" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            Raw Logs
                        </button>
                    </div>
                </div>

                <div className="rounded-3xl border border-white/5 glass overflow-hidden min-h-[500px]">
                    {activities.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[500px] text-zinc-700 gap-6">
                            <ActivityIcon className="h-16 w-16 opacity-10 animate-pulse" />
                            <span className="font-black uppercase tracking-[0.3em] text-xs">Awaiting activity data</span>
                        </div>
                    ) : view === "timeline" ? (
                        <SessionTimeline activities={activities} sessionState={session.state} />
                    ) : (
                        <div className="divide-y divide-white/5 animate-in fade-in duration-500">
                            {activities.map((activity, i) => (
                                <div key={i} className="p-6 hover:bg-white/5 transition-all group/log">
                                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                                        <div className="min-w-[120px] text-[10px] font-black uppercase tracking-widest text-zinc-600 group-hover/log:text-primary transition-colors">
                                            {new Date((activity.createTime || activity.create_time || 0) as string).toLocaleTimeString()}
                                        </div>
                                        <div className="space-y-3 flex-1">
                                            <div className="text-xs font-black uppercase tracking-widest text-zinc-300">
                                                {(activity.activityType || activity.type || activity.activity_type || "Event") as string}
                                            </div>
                                            <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed bg-black/40 p-4 rounded-2xl border border-white/5 overflow-x-auto selection:bg-primary/30">
                                                {(activity.description || activity.message || activity.text) ? 
                                                    ((activity.description || activity.message || activity.text) as string) : 
                                                    JSON.stringify(activity, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
