import { motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export function DeletionCautionBanner() {
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 overflow-hidden px-2"
        >
            <div className="relative group p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-4 transition-all hover:border-amber-500/40">
                <div className="p-2 bg-amber-500/20 rounded-xl text-amber-500">
                    <AlertTriangle className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-0.5">
                        Security Notice: Permanent Deletion
                    </h4>
                    <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                        Repository deletion in Jules Console is <span className="text-amber-200 font-bold underline decoration-amber-500/30">permanent</span> and cannot be undone. 
                        Ensure you have backups before removing active repositories.
                    </p>
                </div>

                <button 
                    onClick={() => setIsVisible(false)}
                    className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}
