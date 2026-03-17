import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterButtonProps {
    active: boolean;
    onClick: () => void;
    label?: string;
    count?: number;
    icon?: ReactNode;
    children?: ReactNode;
    className?: string;
}

export function FilterButton({ 
    active, 
    onClick, 
    label, 
    count, 
    icon, 
    children,
    className 
}: FilterButtonProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-3 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                active 
                    ? "bg-primary text-white shadow-lg border border-primary/20" 
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5",
                className
            )}
        >
            {icon}
            {label || children}
            {typeof count === "number" && (
                <span className={cn(
                    "px-2 py-0.5 rounded-lg text-[10px] font-black",
                    active ? "bg-black/20 text-inherit" : "bg-white/5 text-zinc-600"
                )}>
                    {count}
                </span>
            )}
        </button>
    );
}
