import { useState, useMemo } from "react";
import { Cpu, Box, Search, Loader2, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useHuggingFace } from "@/hooks/useHuggingFace";
import { HFAssetCard } from "@/components/HFAssetCard";
import { StatCard } from "@/components/StatCard";
import { FilterButton } from "@/components/FilterButton";
import { JulesActionModal } from "@/components/JulesActionModal";

import { type HFModel, type HFSpace } from "@/lib/huggingface";

type AssetTypeFilter = "ALL" | "MODEL" | "SPACE";

export default function HuggingFace() {
    const { models, spaces, loading, error, refetch, stats } = useHuggingFace();
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<AssetTypeFilter>("ALL");
    const [isJulesModalOpen, setIsJulesModalOpen] = useState(false);
    const [selectedUrl, setSelectedUrl] = useState("");

    const filteredAssets = useMemo(() => {
        let all: { id: string; author: string; lastModified: string; private: boolean; type: "model" | "space"; data: HFModel | HFSpace }[] = [
            ...models.map(m => ({ ...m, type: "model" as const, data: m })),
            ...spaces.map(s => ({ ...s, type: "space" as const, data: s }))
        ];

        if (typeFilter !== "ALL") {
            all = all.filter(a => a.type === typeFilter.toLowerCase());
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            all = all.filter(a => a.id.toLowerCase().includes(query));
        }

        // Sort by recency
        return all.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
    }, [models, spaces, searchQuery, typeFilter]);

    const handleAnalyze = (url: string) => {
        setSelectedUrl(url);
        setIsJulesModalOpen(true);
    };

    if (loading && models.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-zinc-500 animate-pulse font-bold tracking-widest uppercase text-xs">Loading AI Assets...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-[1440px] mx-auto">
            <title>Hugging Face | AI Intelligence</title>
            <meta name="description" content="Manage and audit your Hugging Face models and spaces." />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
                <div>
                    <div className="flex items-center gap-2 text-amber-500 font-bold text-xs tracking-widest uppercase mb-2">
                        <Cpu className="w-3.5 h-3.5" />
                        AI Models & Spaces
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter text-glow">
                        Hugging Face
                    </h2>
                    <p className="text-zinc-500 mt-2 max-w-xl font-medium">
                        Real-time management and monitoring of your AI assets.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => refetch()}
                        className="p-3 bg-white/5 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white rounded-2xl transition-all shadow-inner group"
                    >
                        <RefreshCw className={`w-5 h-5 group-active:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="h-10 w-[1px] bg-white/5 mx-2 hidden md:block" />
                    <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner backdrop-blur-xl">
                        <FilterButton 
                            active={typeFilter === "ALL"} 
                            onClick={() => setTypeFilter("ALL")}
                            label="All Assets"
                            count={stats.totalModels + stats.totalSpaces}
                        />
                        <FilterButton 
                            active={typeFilter === "MODEL"} 
                            onClick={() => setTypeFilter("MODEL")}
                            label="Models"
                            count={stats.totalModels}
                            icon={<Cpu className="w-3 h-3" />}
                        />
                        <FilterButton 
                            active={typeFilter === "SPACE"} 
                            onClick={() => setTypeFilter("SPACE")}
                            label="Spaces"
                            count={stats.totalSpaces}
                            icon={<Box className="w-3 h-3" />}
                        />
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-2">
                <StatCard 
                    label="Active Spaces"
                    value={stats.activeSpaces}
                    color="emerald"
                    trend="up"
                    trendValue="Live"
                />
                <StatCard 
                    label="Sleeping"
                    value={stats.sleepingSpaces}
                    color="amber"
                    trend="neutral"
                    trendValue="Standby"
                />
                <StatCard 
                    label="Models"
                    value={stats.totalModels}
                    color="indigo"
                    trend="up"
                    trendValue="Inventory"
                />
                <StatCard 
                    label="Uptime Index"
                    value={stats.totalSpaces > 0 ? `${Math.round((stats.activeSpaces / stats.totalSpaces) * 100)}%` : "100%"}
                    color="default"
                    trend="neutral"
                    trendValue="Operational"
                />
            </div>

            {/* Controls */}
            <div className="px-2">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search models and spaces by ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-11 pr-4 py-4 bg-black/40 border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-zinc-600 shadow-2xl backdrop-blur-xl transition-all font-medium"
                    />
                </div>
            </div>

            {/* Grid */}
            <AnimatePresence mode="popLayout">
                {error ? (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 text-center px-4"
                    >
                        <AlertCircle className="w-16 h-16 text-rose-500 mb-6" />
                        <h3 className="text-2xl font-black text-white tracking-tight">Connection Interrupted</h3>
                        <p className="text-zinc-500 mt-2 max-w-sm font-medium">{error}</p>
                    </motion.div>
                ) : filteredAssets.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-32 text-center glass rounded-[3rem] border-dashed border-white/5"
                    >
                        <BookOpen className="w-16 h-16 text-zinc-800 mb-8" />
                        <h3 className="text-3xl font-black text-white tracking-tight">No Assets Found</h3>
                        <p className="text-zinc-500 mt-3 max-w-sm mx-auto font-medium">No Hugging Face assets matching your search were detected.</p>
                    </motion.div>
                ) : (
                    <motion.div 
                        layout
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-2 pb-20"
                    >
                        {filteredAssets.map(asset => (
                            <HFAssetCard 
                                key={asset.id} 
                                asset={asset.data} 
                                type={asset.type} 
                                onAnalyze={handleAnalyze}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <JulesActionModal 
                isOpen={isJulesModalOpen}
                onClose={() => setIsJulesModalOpen(false)}
                repo={{
                    id: 0,
                    name: "HF Audit",
                    full_name: "Hugging Face Asset",
                    description: "Autonomous audit of Hugging Face asset card and deployment config.",
                    html_url: selectedUrl,
                    clone_url: "",
                    ssh_url: "",
                    updated_at: new Date().toISOString(),
                    default_branch: "main",
                    is_template: false,
                    owner: {
                        login: "huggingface",
                        avatar_url: "https://huggingface.co/front/assets/huggingface_logo-noborder.svg"
                    }
                }}
            />
        </div>
    );
}
