import { useState, useMemo } from "react";
import { Star, Search, Filter, RefreshCw, BookOpen, AlertCircle, SortAsc, Code2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStarredRepos, type ReviewStatus } from "@/hooks/useStarredRepos";
import { useGridColumns } from "@/hooks/useGridColumns";
import { StarredRepoCard } from "@/components/StarredRepoCard";
import { StatCard } from "@/components/StatCard";
import { cn } from "@/lib/utils";

type StatusFilter = ReviewStatus | "ALL";
type SortOption = "updated" | "stars" | "name" | "newest_starred";

export default function StarredRepos() {
    const { repos, loading, error, updateReview, unstar, stats, refetch, bindSession } = useStarredRepos();
    const columns = useGridColumns();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
    const [languageFilter, setLanguageFilter] = useState<string>("ALL");
    const [sortBy, setSortBy] = useState<SortOption>("updated");

    // Discover unique languages
    const languages = useMemo(() => {
        const set = new Set<string>();
        repos.forEach(r => { if (r.language) set.add(r.language); });
        return Array.from(set).sort();
    }, [repos]);

    const filteredAndSortedRepos = useMemo(() => {
        let result = [...repos];

        // 1. Filter by Status
        if (statusFilter !== "ALL") {
            result = result.filter(r => r.reviewStatus === statusFilter);
        }

        // 2. Filter by Language
        if (languageFilter !== "ALL") {
            result = result.filter(r => r.language === languageFilter);
        }

        // 3. Filter by Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(repo =>
                repo.name.toLowerCase().includes(query) ||
                (repo.description && repo.description.toLowerCase().includes(query)) ||
                repo.owner.login.toLowerCase().includes(query)
            );
        }

        // 4. Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case "stars": return b.stargazers_count - a.stargazers_count;
                case "name": return a.name.localeCompare(b.name);
                case "newest_starred": return b.id - a.id; // GitHub IDs are chronological for stars usually
                default: return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            }
        });

        return result;
    }, [repos, searchQuery, statusFilter, languageFilter, sortBy]);

    if (loading && repos.length === 0) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500 max-w-[1440px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2 animate-pulse">
                    <div className="space-y-2">
                        <div className="h-4 w-32 bg-white/5 rounded-lg" />
                        <div className="h-12 w-96 bg-white/5 rounded-xl" />
                        <div className="h-4 w-64 bg-white/5 rounded-lg" />
                    </div>
                    <div className="flex gap-4">
                        <div className="h-12 w-12 bg-white/5 rounded-2xl" />
                        <div className="h-12 w-64 bg-white/5 rounded-2xl" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-2 animate-pulse">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 bg-white/5 rounded-2xl border border-white/5" />
                    ))}
                </div>

                <div className="h-16 bg-white/5 rounded-2xl border border-white/5 mx-2 animate-pulse" />

                <div className={cn(
                    "grid gap-8 px-2 pb-20",
                    columns === 3 ? "grid-cols-3" : columns === 2 ? "grid-cols-2" : "grid-cols-1"
                )}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-[320px] bg-white/5 rounded-2xl border border-white/5 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 flex flex-col items-center justify-center text-rose-500 gap-4">
                <AlertCircle className="w-12 h-12" />
                <div className="text-center">
                    <h3 className="text-xl font-bold">Failed to Load</h3>
                    <p className="text-zinc-500">{error}</p>
                </div>
                <button onClick={() => refetch()} className="px-4 py-2 bg-rose-500 text-white rounded-md">Retry</button>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-[1440px] mx-auto">
            <title>Starred Repositories | Curation Pipeline</title>
            <meta name="description" content="Curation and analysis of your external repositories." />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                    <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-widest uppercase mb-2">
                        <Star className="w-3.5 h-3.5 fill-primary" />
                        Curation Pipeline
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter text-glow">
                        Starred Repositories
                    </h2>
                    <p className="text-zinc-500 mt-2 max-w-xl font-medium">
                        Curation and analysis of your external repositories.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => refetch()}
                        className="p-3 bg-white/5 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded-2xl transition-all shadow-inner group"
                        title="Force Resync"
                    >
                        <RefreshCw className={`w-5 h-5 group-active:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="h-10 w-[1px] bg-white/5 mx-2 hidden md:block" />
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner backdrop-blur-xl">
                        <StatusFilterButton 
                            active={statusFilter === "ALL"} 
                            onClick={() => setStatusFilter("ALL")}
                            label="All"
                            count={stats.total}
                        />
                        <StatusFilterButton 
                            active={statusFilter === "TO_REVIEW"} 
                            onClick={() => setStatusFilter("TO_REVIEW")}
                            label="Pending"
                            count={stats.toReview}
                            color="amber"
                        />
                        <StatusFilterButton 
                            active={statusFilter === "REVIEWED"} 
                            onClick={() => setStatusFilter("REVIEWED")}
                            label="Approved"
                            count={stats.reviewed}
                            color="emerald"
                        />
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-2">
                <StatCard 
                    label="Synced Stars"
                    value={stats.total}
                    color="default"
                    trend="neutral"
                    trendValue="GitHub"
                />
                <StatCard 
                    label="Inbox"
                    value={stats.toReview}
                    color="amber"
                    trend="up"
                    trendValue="Waitlist"
                />
                <StatCard 
                    label="Vetted"
                    value={stats.reviewed}
                    color="emerald"
                    trend="up"
                    trendValue="Ready"
                />
                <StatCard 
                    label="Discovery Rate"
                    value={stats.total > 0 ? `${Math.round(((stats.total - stats.toReview) / stats.total) * 100)}%` : "0%"}
                    color="indigo"
                    trend="neutral"
                    trendValue="Efficiency"
                />
            </div>

            {/* Enhanced Controls Bar */}
            <div className="flex flex-col xl:flex-row gap-4 px-2">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by repo name, description or owner..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-zinc-600 shadow-2xl backdrop-blur-xl transition-all font-medium"
                    />
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {/* Language Filter */}
                    <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-4 py-2 rounded-2xl backdrop-blur-xl">
                        <Code2 className="w-4 h-4 text-zinc-500" />
                        <select 
                            value={languageFilter}
                            onChange={(e) => setLanguageFilter(e.target.value)}
                            className="bg-transparent text-sm font-bold text-zinc-300 focus:outline-none border-none cursor-pointer pr-4"
                        >
                            <option value="ALL">All Languages</option>
                            {languages.map(lang => (
                                <option key={lang} value={lang} className="bg-zinc-950">{lang}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2 bg-black/40 border border-white/5 px-4 py-2 rounded-2xl backdrop-blur-xl">
                        <SortAsc className="w-4 h-4 text-zinc-500" />
                        <select 
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="bg-transparent text-sm font-bold text-zinc-300 focus:outline-none border-none cursor-pointer pr-4"
                        >
                            <option value="updated" className="bg-zinc-950">Recently Updated</option>
                            <option value="stars" className="bg-zinc-950">Most Stars</option>
                            <option value="name" className="bg-zinc-950">Alphabetical (A-Z)</option>
                            <option value="newest_starred" className="bg-zinc-950">Recently Starred</option>
                        </select>
                    </div>

                    <div className="h-8 w-[1px] bg-white/5 mx-1" />

                    <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-2xl text-primary text-xs font-black uppercase tracking-widest shadow-glow-sm">
                        <Filter className="w-3.5 h-3.5" />
                        <span>{filteredAndSortedRepos.length} Results</span>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <AnimatePresence mode="popLayout">
                {filteredAndSortedRepos.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-32 text-center glass rounded-[3rem] border-dashed border-white/5"
                    >
                        <div className="p-8 bg-white/5 rounded-full mb-8 border border-white/5 shadow-inner">
                            <BookOpen className="w-16 h-16 text-zinc-800" />
                        </div>
                        <h3 className="text-3xl font-black text-white tracking-tight">No Repositories Found</h3>
                        <p className="text-zinc-500 mt-3 max-w-sm mx-auto font-medium">
                            {searchQuery ? `No matches found for "${searchQuery}".` : "Try relaxing your filters or refresh the GitHub sync."}
                        </p>
                        <button
                            onClick={() => { setSearchQuery(""); setStatusFilter("ALL"); setLanguageFilter("ALL"); }}
                            className="mt-8 px-8 py-3 bg-white text-black hover:bg-zinc-200 rounded-2xl transition-all font-black uppercase tracking-widest text-xs shadow-xl active:scale-95"
                        >
                            Reset Filters
                        </button>
                    </motion.div>
                ) : (
                    <motion.div 
                        layout
                        className={cn(
                            "grid gap-8 px-2 pb-20",
                            columns === 3 ? "grid-cols-3" : columns === 2 ? "grid-cols-2" : "grid-cols-1"
                        )}
                    >
                        {filteredAndSortedRepos.map(repo => (
                            <StarredRepoCard 
                                key={repo.id} 
                                repo={repo} 
                                onUpdateReview={updateReview} 
                                onUnstar={unstar}
                                onBindSession={bindSession}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface StatusFilterButtonProps {
    active: boolean;
    onClick: () => void;
    label: string;
    count: number;
    color?: "amber" | "emerald" | "default";
}

function StatusFilterButton({ active, onClick, label, count, color = "default" }: StatusFilterButtonProps) {
    const getColorClass = () => {
        if (!active) return "text-zinc-500 hover:text-zinc-300 hover:bg-white/5";
        switch (color) {
            case "amber": return "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-glow-sm";
            case "emerald": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-glow-sm";
            default: return "bg-primary text-white border-primary/20 shadow-glow-primary";
        }
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-transparent",
                getColorClass()
            )}
        >
            {label}
            <span className={cn(
                "px-2 py-0.5 rounded-lg text-[9px] font-black",
                active ? 'bg-black/20 text-inherit' : 'bg-white/5 text-zinc-600'
            )}>
                {count}
            </span>
        </button>
    );
}
