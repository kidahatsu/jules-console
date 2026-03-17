import { Play, Loader2, MapPin, Building, Users, Link as LinkIcon, Activity, Star, Terminal, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { StatCard } from "@/components/StatCard";
import { SessionRow } from "@/components/SessionRow";
import { useJules } from "@/hooks/useJules";
import { useGithubRepos } from "@/hooks/useGithubRepos";
import { useGithubUser } from "@/hooks/useGithubUser";
import { useStarredRepos } from "@/hooks/useStarredRepos";
import { useHuggingFace } from "@/hooks/useHuggingFace";

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
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function Dashboard() {
    const { sessions } = useJules();
    const { repos, loading: reposLoading, isRevalidating: reposRevalidating } = useGithubRepos();
    const { user } = useGithubUser();
    const { repos: starredRepos, loading: starredLoading, isRevalidating: starredRevalidating, stats: starredStats } = useStarredRepos();
    const { stats: hfStats, loading: hfLoading } = useHuggingFace();

    // Derived Stats
    const activeSessions = sessions.filter(s => s.status === "RUNNING").length;
    const completedSessions = sessions.filter(s => s.status === "COMPLETED").length;
    const totalSessions = sessions.length;

    const successRate = totalSessions > 0
        ? Math.round((completedSessions / totalSessions) * 100)
        : 100;

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-10"
        >
            <title>Jules Console | Dashboard</title>
            <meta name="description" content="Autonomous repository management and architectural analysis dashboard." />
            {/* Header */}
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                    <h2 className="text-5xl font-black tracking-tighter text-glow">Dashboard</h2>
                    <p className="text-zinc-500 mt-1 font-medium tracking-tight">Repository management and status.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link to="/huggingface" className="group relative flex items-center gap-2 bg-amber-500/10 text-amber-500 px-5 py-3 rounded-2xl font-bold border border-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl overflow-hidden">
                        <Cpu className="h-4 w-4 relative z-10" />
                        <span className="relative z-10 text-primary">AI Jules Console</span>
                    </Link>
                    <Link to="/starred" className="group relative flex items-center gap-2 bg-zinc-900 text-zinc-300 px-5 py-3 rounded-2xl font-bold border border-zinc-800 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl overflow-hidden">
                        <Star className="h-4 w-4 relative z-10" />
                        <span className="relative z-10">Reviews</span>
                    </Link>
                    <Link to="/sessions" className="group relative flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <Play className="h-4 w-4 fill-current relative z-10" />
                        <span className="relative z-10">Deploy Agent</span>
                    </Link>
                </div>
            </motion.div>

            {/* Stats Row */}
            <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                <StatCard
                    label="Active Agents"
                    value={activeSessions}
                    color="amber"
                    trend="neutral"
                    trendValue={activeSessions > 0 ? "Active" : "Idle"}
                />
                <StatCard
                    label="Live Spaces"
                    value={hfLoading ? <Loader2 className="h-6 w-6 animate-spin text-zinc-500" /> : hfStats.activeSpaces}
                    color="emerald"
                    trend="up"
                    trendValue={`${hfStats.totalSpaces} total`}
                />
                <StatCard
                    label="Starred Repos"
                    value={starredLoading ? <Loader2 className="h-6 w-6 animate-spin text-zinc-500" /> : starredStats.total}
                    color="indigo"
                    trend="up"
                    trendValue={starredRevalidating ? "Syncing..." : (starredStats.toReview > 0 ? `${starredStats.toReview} pending` : "All reviewed")}
                />
                <StatCard
                    label="Managed Repos"
                    value={reposLoading ? <Loader2 className="h-6 w-6 animate-spin text-zinc-500" /> : repos.length}
                    color="brand"
                    trend="up"
                    trendValue={reposRevalidating ? "Syncing..." : "Synced"}
                />
                <StatCard
                    label="Jules Console Health"
                    value={`${successRate}%`}
                    color="default"
                    trend="up"
                    trendValue="Optimal"
                />
            </motion.div>

            {/* User Profile Card */}
            {user && (
                <motion.div variants={item} className="group relative glass glass-hover rounded-3xl p-8 flex flex-col md:flex-row gap-8 items-start md:items-center overflow-hidden">
                    <div className="relative">
                        <img src={user.avatar_url} alt={user.login} className="h-24 w-24 rounded-2xl border-2 border-primary/20 relative z-10 grayscale group-hover:grayscale-0 transition-all duration-500" />
                        <div className="absolute -inset-2 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>

                    <div className="flex-1 space-y-4 relative z-10">
                        <div>
                            <h3 className="text-3xl font-black tracking-tight">{user.name}</h3>
                            <p className="text-primary font-mono text-sm tracking-widest">USER_ID: {user.login.toUpperCase()}</p>
                        </div>
                        {user.bio && <p className="text-zinc-400 max-w-2xl leading-relaxed font-medium">{user.bio}</p>}

                        <div className="flex flex-wrap gap-6 pt-2 text-sm text-zinc-500 font-bold uppercase tracking-tighter">
                            {user.location && (
                                <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    <span>{user.location}</span>
                                </div>
                            )}
                            {user.company && (
                                <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
                                    <Building className="h-4 w-4 text-primary" />
                                    <span>{user.company}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 hover:text-white transition-colors cursor-default">
                                <Users className="h-4 w-4 text-primary" />
                                <span>{user.followers} Operators</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <LinkIcon className="h-4 w-4 text-primary" />
                                <a href={user.html_url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors underline decoration-primary/30 underline-offset-4">GitHub Node</a>
                            </div>
                        </div>
                    </div>

                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Activity className="h-32 w-32" />
                    </div>
                </motion.div>
            )}

            {/* Recent Activity */}
            <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sessions */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-black tracking-tighter flex items-center gap-2">
                            <Terminal className="h-5 w-5 text-primary" />
                            Recent Activity
                        </h3>
                        <Link to="/sessions" className="text-sm font-bold text-primary hover:text-indigo-400 uppercase tracking-widest transition-colors">History_Log</Link>
                    </div>
                    <div className="space-y-3">
                        {sessions.length === 0 ? (
                            <div className="text-center py-12 text-zinc-500 glass rounded-2xl border border-white/5 font-medium italic">
                                No activity data available.
                            </div>
                        ) : (
                            sessions.slice(0, 5).map(session => (
                                <SessionRow
                                    key={session.id}
                                    {...session}
                                    duration={session.duration || "0s"}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Approved Repos */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-black tracking-tighter flex items-center gap-2">
                            <Star className="h-5 w-5 text-emerald-400" />
                            Verified Nodes
                        </h3>
                        <Link to="/starred" className="text-sm font-bold text-emerald-400 hover:text-emerald-300 uppercase tracking-widest transition-colors">Manage_Stars</Link>
                    </div>
                    <div className="space-y-3">
                        {starredLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
                            </div>
                        ) : starredRepos.filter(r => r.reviewStatus === "REVIEWED").length === 0 ? (
                            <div className="text-center py-12 text-zinc-500 glass rounded-2xl border border-white/5 font-medium italic flex flex-col items-center gap-3">
                                <p>No verified repositories detected.</p>
                                <Link to="/starred" className="text-xs font-bold text-primary uppercase tracking-widest hover:underline">Start_Curation</Link>
                            </div>
                        ) : (
                            starredRepos
                                .filter(r => r.reviewStatus === "REVIEWED")
                                .slice(0, 5)
                                .map(repo => (
                                    <div key={repo.id} className="group relative flex items-center justify-between p-4 rounded-2xl glass glass-hover border border-white/5 transition-all">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="relative">
                                                <img src={repo.owner.avatar_url} alt={repo.owner.login} className="h-10 w-10 rounded-xl border border-white/10 group-hover:scale-105 transition-transform" />
                                                <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-3 h-3 rounded-full border-2 border-black" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-bold truncate leading-tight group-hover:text-primary transition-colors">{repo.name}</div>
                                                <div className="text-[10px] text-zinc-500 font-mono tracking-tighter">SOURCE: {repo.owner.login.toUpperCase()}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500/80">
                                                <Star className="h-3.5 w-3.5 fill-current" />
                                                {repo.stargazers_count.toLocaleString()}
                                            </div>
                                            <a
                                                href={repo.html_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all shadow-inner"
                                            >
                                                <LinkIcon className="h-4 w-4" />
                                            </a>
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}
