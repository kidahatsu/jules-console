import { useState, useRef, useEffect, useMemo } from "react";
import { Plus, BookCopy, Download, Search, Calendar, SortAsc, LayoutGrid, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useGithubRepos } from "@/hooks/useGithubRepos";
import type { GithubRepo } from "@/hooks/useGithubRepos";
import { CreateRepoModal } from "@/components/CreateRepoModal";
import { RepoCard } from "@/components/RepoCard";
import { useGridColumns } from "@/hooks/useGridColumns";
import { DeletionCautionBanner } from "@/components/DeletionCautionBanner";
import { cn } from "@/lib/utils";

type SortOption = "updated" | "name";

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

export default function Repositories() {
    const { repos, loading, error, deleteRepo, refetch } = useGithubRepos();
    const columns = useGridColumns();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [initialTemplate, setInitialTemplate] = useState<{ owner: string; name: string } | null>(null);

    // UX State
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("updated");

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleCloneToNew = (repo: GithubRepo) => {
        const [owner, name] = repo.full_name.split("/");
        setInitialTemplate({ owner, name });
        setIsCreateModalOpen(true);
    };

    const filteredRepos = useMemo(() => {
        let result = [...repos];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(repo =>
                repo.name.toLowerCase().includes(query) ||
                (repo.description && repo.description.toLowerCase().includes(query))
            );
        }

        result.sort((a, b) => {
            if (sortBy === "name") {
                return a.name.localeCompare(b.name);
            } else {
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            }
        });

        return result;
    }, [repos, searchQuery, sortBy]);

    if (loading && repos.length === 0) {
        return (
            <div className="space-y-8 max-w-[1440px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2 animate-pulse">
                    <div className="space-y-2">
                        <div className="h-10 w-48 bg-white/5 rounded-xl" />
                        <div className="h-4 w-64 bg-white/5 rounded-lg" />
                    </div>
                    <div className="flex gap-4">
                        <div className="h-12 w-12 bg-white/5 rounded-2xl" />
                        <div className="h-12 w-48 bg-white/5 rounded-2xl" />
                    </div>
                </div>

                <div className="h-14 bg-white/5 rounded-2xl border border-white/5 mx-2 animate-pulse" />

                <div className={cn(
                    "grid gap-6 px-2",
                    columns === 3 ? "grid-cols-3" : columns === 2 ? "grid-cols-2" : "grid-cols-1"
                )}>
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-[240px] bg-white/5 rounded-2xl border border-white/5 animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="p-8 text-rose-500 font-bold glass rounded-2xl border-rose-500/20">Error: {error}</div>;
    }

    return (
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8 max-w-[1440px] mx-auto"
        >
            <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-glow">Repositories</h2>
                    <p className="text-zinc-500 mt-1 font-medium tracking-tight">Managed repositories for autonomous sessions.</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => refetch(true)}
                        disabled={loading}
                        className="p-3 bg-white/5 border border-white/5 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
                        title="Sync Repositories"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </button>

                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="group relative flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <Plus className="h-4 w-4 relative z-10" />
                            <span className="relative z-10">Create New Repository</span>
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute right-0 mt-3 w-64 glass rounded-2xl shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200 overflow-hidden border border-white/10">
                                <button
                                    onClick={() => {
                                        setInitialTemplate(null);
                                        setIsCreateModalOpen(true);
                                        setIsDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-5 py-4 hover:bg-white/5 transition-colors flex items-center gap-4 group/item"
                                >
                                    <div className="p-2.5 bg-primary/10 rounded-xl group-hover/item:bg-primary/20 transition-colors">
                                        <BookCopy className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">From Template</div>
                                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Create New</div>
                                    </div>
                                </button>

                                <button
                                    disabled
                                    className="w-full text-left px-5 py-4 hover:bg-white/5 transition-colors flex items-center gap-4 opacity-30 cursor-not-allowed"
                                >
                                    <div className="p-2.5 bg-zinc-800 rounded-xl">
                                        <Download className="h-5 w-5 text-zinc-500" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm">Import Repo</div>
                                        <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Coming Soon</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Controls Bar */}
            <motion.div variants={item} className="flex flex-col sm:flex-row gap-4 p-2 glass rounded-2xl border-white/5 mx-2">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search repositories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm font-medium placeholder:text-zinc-600 placeholder:font-black placeholder:uppercase placeholder:tracking-widest"
                    />
                </div>
                <div className="flex bg-white/5 p-1.5 rounded-xl border border-white/5">
                    <button
                        onClick={() => setSortBy("updated")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'updated' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        Updated
                    </button>
                    <button
                        onClick={() => setSortBy("name")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sortBy === 'name' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        <SortAsc className="w-3.5 h-3.5" />
                        Name
                    </button>
                </div>
            </motion.div>

            <DeletionCautionBanner />

            {filteredRepos.length === 0 ? (
                <motion.div variants={item} className="flex flex-col items-center justify-center py-32 text-center glass rounded-3xl border-dashed border-white/10 mx-2">
                    <div className="p-6 bg-white/5 rounded-3xl mb-6">
                        <LayoutGrid className="w-10 h-10 text-zinc-700" />
                    </div>
                    <h3 className="text-xl font-black tracking-tight text-zinc-300 uppercase">No Repositories Found</h3>
                    <p className="text-zinc-500 mt-2 max-w-sm font-medium">
                        {searchQuery ? `No matches found for "${searchQuery}"` : "Awaiting initial repository synchronization."}
                    </p>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="mt-6 text-xs font-black uppercase tracking-widest text-primary hover:text-indigo-400 transition-colors"
                        >
                            Clear Search
                        </button>
                    )}
                </motion.div>
            ) : (
                <div className={cn(
                    "grid gap-6 px-2",
                    columns === 3 ? "grid-cols-3" : columns === 2 ? "grid-cols-2" : "grid-cols-1"
                )}>
                    {filteredRepos.map(repo => (
                        <RepoCard key={repo.id} repo={repo} onDelete={deleteRepo} onCloneToNew={handleCloneToNew} />
                    ))}
                </div>
            )}

            <CreateRepoModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setInitialTemplate(null);
                }}
                onSuccess={() => {
                    refetch(true);
                }}
                initialTemplate={initialTemplate}
            />
        </motion.div>
    );
}
