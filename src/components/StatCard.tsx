import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatCardProps {
    label: string;
    value: React.ReactNode;
    trend?: "up" | "down" | "neutral";
    trendValue?: string;
    color?: "default" | "brand" | "amber" | "emerald" | "rose" | "indigo";
}

export function StatCard({ label, value, trend, trendValue, color = "default" }: StatCardProps) {
    const colorStyles = {
        default: "border-white/10 group-hover:border-white/20",
        brand: "border-primary/20 group-hover:border-primary/40",
        amber: "border-amber-500/20 group-hover:border-amber-500/40",
        emerald: "border-emerald-500/20 group-hover:border-emerald-500/40",
        rose: "border-rose-500/20 group-hover:border-rose-500/40",
        indigo: "border-indigo-500/20 group-hover:border-indigo-500/40",
    };

    const textColors = {
        default: "text-foreground",
        brand: "text-primary",
        amber: "text-amber-400",
        emerald: "text-emerald-400",
        rose: "text-rose-400",
        indigo: "text-indigo-400",
    };

    return (
        <motion.div 
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className={cn(
                "group relative p-5 rounded-2xl border glass glass-hover overflow-hidden",
                colorStyles[color]
            )}
        >
            <div className="relative z-10 flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-400 transition-colors">
                    {label}
                </span>
                <div className="flex items-end justify-between mt-1">
                    <span className={cn("text-3xl font-black tracking-tighter", textColors[color])}>
                        {value}
                    </span>
                    {trend && (
                        <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-tighter",
                            trend === "up" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                trend === "down" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                                    "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        )}>
                            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
                        </span>
                    )}
                </div>
            </div>
            
            {/* Subtle background glow */}
            <div className={cn(
                "absolute -right-8 -bottom-8 w-24 h-24 blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity duration-500",
                color === "brand" ? "bg-primary" :
                color === "amber" ? "bg-amber-500" :
                color === "emerald" ? "bg-emerald-500" :
                color === "rose" ? "bg-rose-500" :
                color === "indigo" ? "bg-indigo-500" : "bg-white"
            )} />
        </motion.div>
    )
}
