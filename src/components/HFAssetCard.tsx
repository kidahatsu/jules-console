import { motion } from "framer-motion";
import { Cpu, ExternalLink, Star, Download, Box, Zap, Sparkles, User, Calendar, Lock } from "lucide-react";
import type { HFModel, HFSpace } from "@/lib/huggingface";
import { cn } from "@/lib/utils";

interface HFAssetCardProps {
    asset: HFModel | HFSpace;
    type: "model" | "space";
    onAnalyze?: (id: string) => void;
}

export function HFAssetCard({ asset, type, onAnalyze }: HFAssetCardProps) {
    const isSpace = type === "space";
    const space = isSpace ? (asset as HFSpace) : null;
    const model = !isSpace ? (asset as HFModel) : null;

    const getStatusColor = (stage?: string) => {
        switch (stage) {
            case "RUNNING": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            case "SLEEPING": return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
            case "BUILDING": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
            case "FACTORY_ERROR": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
            default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
        }
    };

    const assetUrl = `https://huggingface.co/${isSpace ? "spaces/" : ""}${asset.id}`;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group p-5 rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md hover:border-primary/50 transition-all flex flex-col gap-4 relative overflow-hidden"
        >
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-colors" />

            <div className="flex items-start justify-between relative">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-xl border border-white/5",
                        isSpace ? "bg-amber-500/10 text-amber-400" : "bg-primary/10 text-primary"
                    )}>
                        {isSpace ? <Box className="w-5 h-5" /> : <Cpu className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-base text-white truncate group-hover:text-primary transition-colors leading-tight" title={asset.id}>
                            {asset.id.split("/")[1]}
                        </h3>
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1 font-bold uppercase tracking-widest mt-0.5">
                            <User className="w-2.5 h-2.5" /> @{asset.author}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    {asset.private && (
                        <div className="p-1 bg-zinc-800 text-zinc-400 rounded-md" title="Private">
                            <Lock className="w-3 h-3" />
                        </div>
                    )}
                    {isSpace && (
                        <div className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border",
                            getStatusColor(space?.runtime?.stage)
                        )}>
                            {space?.runtime?.stage || "UNKNOWN"}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 space-y-3 relative">
                <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500">
                    {!isSpace ? (
                        <>
                            <div className="flex items-center gap-1">
                                <Download className="w-3 h-3 text-primary" />
                                <span>{model?.downloads.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-500" />
                                <span>{model?.likes.toLocaleString()}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span className="uppercase tracking-widest">{space?.runtime?.hardware || "Standard"}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1 ml-auto">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(asset.lastModified).toLocaleDateString()}</span>
                    </div>
                </div>

                {model?.pipeline_tag && (
                    <div className="px-2 py-1 bg-white/5 rounded-lg border border-white/5 inline-block">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/80">
                            {model.pipeline_tag.replace("-", " ")}
                        </span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 pt-2 relative">
                <button
                    onClick={() => onAnalyze?.(assetUrl)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                    <Sparkles className="w-3.5 h-3.5" />
                    Jules Audit
                </button>
                <a
                    href={assetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition-all"
                >
                    <ExternalLink className="w-4 h-4" />
                </a>
            </div>
        </motion.div>
    );
}
