import { memo } from "react";
import { Square, ExternalLink, Cpu } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SessionStatus } from "@/lib/jules";

interface SessionRowProps {
    id: string;
    status: SessionStatus;
    repo?: string;
    task: string;
    duration: string;
    onCancel?: () => void;
}

export const SessionRow = memo(function SessionRow({ id, status, repo, task, duration, onCancel }: SessionRowProps) {
    const statusStyles = {
        PENDING: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
        RUNNING: "bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]",
        COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        FAILED: "bg-rose-500/10 text-rose-500 border-rose-500/20",
        CANCELLED: "bg-zinc-800/50 text-zinc-500 border-zinc-700/30",
    };

    return (
        <motion.div 
            whileHover={{ scale: 1.005, x: 4 }}
            className="group flex items-center justify-between p-4 rounded-2xl border glass glass-hover transition-all"
        >
            <div className="flex items-center gap-5 min-w-0">
                <div className={cn(
                    "relative flex items-center justify-center h-10 w-10 rounded-xl border flex-shrink-0 transition-colors duration-500",
                    status === 'RUNNING' ? "border-amber-500/40 bg-amber-500/10" : "border-white/5 bg-white/5"
                )}>
                    <Cpu className={cn(
                        "h-5 w-5",
                        status === 'RUNNING' ? "text-amber-500 animate-pulse" : "text-zinc-500"
                    )} />
                </div>

                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">AGENT_ID: {id}</span>
                        <div className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest border uppercase", statusStyles[status])}>
                            {status}
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                        {repo ? (
                            <span className="text-sm font-bold text-foreground truncate">{repo}</span>
                        ) : (
                            <span className="text-[10px] text-primary uppercase tracking-widest font-black">Repoless Session</span>
                        )}
                        <span className="text-xs text-zinc-500 font-medium truncate max-w-[400px]">/ {task}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-8">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Runtime</span>
                    <span className="text-xs font-mono font-bold text-zinc-300">{duration}</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                    <Link to={`/sessions/${id}`} className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all" title="View Telemetry">
                        <ExternalLink className="h-4 w-4" />
                    </Link>
                    {(status === 'RUNNING' || status === 'PENDING') && (
                        <button onClick={onCancel} className="p-2.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-500 transition-all" title="Terminate">
                            <Square className="h-4 w-4 fill-current" />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    )
});
