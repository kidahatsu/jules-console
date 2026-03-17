import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ShieldAlert, Cpu, Github, Key, ExternalLink } from "lucide-react";
import { useStore } from "@/lib/store";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface KeyRequiredBannerProps {
    onOpenSettings: () => void;
}

export function KeyRequiredBanner({ onOpenSettings }: KeyRequiredBannerProps) {
    const activeAccount = useStore(state => state.activeAccount);
    const tokenStatus = useStore(state => state.tokenStatus);
    const location = useLocation();

    if (!activeAccount) return null;

    const missingJules = !activeAccount.apiKey || activeAccount.apiKey.trim() === "" || tokenStatus.jules === "invalid" || tokenStatus.jules === "insufficient_permissions";
    const missingGithub = !activeAccount.githubToken || activeAccount.githubToken.trim() === "" || tokenStatus.github === "invalid" || tokenStatus.github === "insufficient_permissions";
    const missingHF = !activeAccount.hfToken || activeAccount.hfToken.trim() === "" || tokenStatus.hf === "invalid" || tokenStatus.hf === "insufficient_permissions";

    const isHuggingFacePage = location.pathname === "/huggingface";
    const isDashboard = location.pathname === "/";
    const isGithubPage = ["/repos", "/starred", "/inbox", "/sessions"].includes(location.pathname);

    // Show banner if:
    // 1. Critical Jules is missing/invalid (Always, core orchestration)
    // 2. GitHub is missing/invalid AND we are on a GH-relevant page or Dashboard
    // 3. HF is missing/invalid AND we are on the HF page or Dashboard
    const showBanner = missingJules ||
        (missingGithub && (isGithubPage || isDashboard)) ||
        (missingHF && (isHuggingFacePage || isDashboard));

    if (!showBanner) return null;

    const severity = (tokenStatus.jules === "invalid" || !activeAccount.apiKey) ? "critical" : "warning";

    const getStatusLabel = (provider: "jules" | "github" | "hf", value: string | undefined | null) => {
        if (!value || value.trim() === "") return "Missing";
        if (tokenStatus[provider] === "insufficient_permissions") return "Permission Denied";
        if (tokenStatus[provider] === "invalid") return "Invalid";
        return "Checking";
    };

    const getGuideLink = (provider: "jules" | "github" | "hf") => {
        if (provider === "jules") return "https://aistudio.google.com/app/apikey";
        if (provider === "github") return "https://github.com/settings/tokens?type=beta"; // Recommend Fine-grained
        return "https://huggingface.co/settings/tokens";
    };

    const getGuideMessage = (provider: "jules" | "github" | "hf") => {
        if (provider === "jules") return "Generate a Gemini API key in Google AI Studio.";
        if (provider === "github") return "Requires 'repo', 'notifications', and 'user' scopes.";
        return "Fine-grained: 'Read user info', 'Read access to contents/metadata', & 'Read discussions'.";
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0, y: -20 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden mb-8"
            >
                <div className={cn(
                    "relative group p-5 rounded-2xl border backdrop-blur-xl transition-all duration-500 overflow-hidden",
                    severity === "critical"
                        ? "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.05)]"
                        : "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.05)]"
                )}>
                    {/* Background Patterns */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />

                    <div className="relative flex flex-col lg:flex-row items-start justify-between gap-6">
                        <div className="flex items-start gap-5">
                            <div className={cn(
                                "p-3 rounded-2xl border shadow-lg shrink-0 transition-transform duration-500 group-hover:scale-110",
                                severity === "critical"
                                    ? "bg-rose-500/20 border-rose-500/30 text-rose-500"
                                    : "bg-amber-500/20 border-amber-500/30 text-amber-500"
                            )}>
                                <ShieldAlert className={cn("w-6 h-6", severity === "critical" && "animate-pulse")} />
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <h4 className={cn(
                                        "text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2",
                                        severity === "critical" ? "text-rose-400" : "text-amber-400"
                                    )}>
                                        System Verification Required
                                        <span className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            severity === "critical" ? "bg-rose-500 animate-ping" : "bg-amber-500 animate-pulse"
                                        )} />
                                    </h4>

                                    <p className="text-sm text-zinc-300 font-medium leading-relaxed mt-1">
                                        Some Jules Console features are unavailable due to credential issues.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {missingJules && (
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-rose-300">
                                                <Key className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase tracking-wider">{getStatusLabel("jules", activeAccount.apiKey)} Jules Key</span>
                                            </div>
                                            <a href={getGuideLink("jules")} target="_blank" rel="noopener noreferrer" className="group/link flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-white transition-colors">
                                                {getGuideMessage("jules")}
                                                <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                            </a>
                                        </div>
                                    )}
                                    {missingGithub && (isGithubPage || isDashboard) && (
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-amber-300">
                                                <Github className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase tracking-wider">{getStatusLabel("github", activeAccount.githubToken)} GitHub Token</span>
                                            </div>
                                            <a href={getGuideLink("github")} target="_blank" rel="noopener noreferrer" className="group/link flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-white transition-colors">
                                                {getGuideMessage("github")}
                                                <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                            </a>
                                        </div>
                                    )}
                                    {missingHF && (isHuggingFacePage || isDashboard) && (
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-blue-300">
                                                <Cpu className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase tracking-wider">{getStatusLabel("hf", activeAccount.hfToken)} HF Token</span>
                                            </div>
                                            <a href={getGuideLink("hf")} target="_blank" rel="noopener noreferrer" className="group/link flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-white transition-colors">
                                                {getGuideMessage("hf")}
                                                <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onOpenSettings}
                            className={cn(
                                "group/btn relative px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3 overflow-hidden shadow-2xl self-center lg:self-center",
                                severity === "critical"
                                    ? "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-900/20"
                                    : "bg-amber-600 text-white hover:bg-amber-500 shadow-amber-900/20"
                            )}
                        >
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                            <span className="relative">Update Credentials</span>
                            <ArrowRight className="w-4 h-4 relative group-hover/btn:translate-x-1 transition-transform duration-300" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

