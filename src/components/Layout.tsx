import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Terminal, GitBranch, LayoutDashboard, Settings, Palette, Star, Cpu, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useGithubUser } from "@/hooks/useGithubUser";
import { useInbox } from "@/hooks/useInbox";
import { useStore } from "@/lib/store";
import type { ThemeType } from "@/lib/store";
import { SettingsModal } from "./SettingsModal";
import { JulesAccountSwitcher } from "./JulesAccountSwitcher";
import { KeyRequiredBanner } from "./KeyRequiredBanner";

export default function Layout() {
    const { user } = useGithubUser();
    const { unreadCount } = useInbox();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isThemeOpen, setIsThemeOpen] = useState(false);
    const location = useLocation();
    const theme = useStore(state => state.theme);
    const setTheme = useStore(state => state.setTheme);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme === "phantom-stealth" ? "" : theme);
    }, [theme]);

    const themes: { id: ThemeType; label: string; color: string }[] = [
        { id: "phantom-stealth", label: "Phantom Stealth", color: "bg-[#6366f1]" },
        { id: "event-horizon", label: "Event Horizon", color: "bg-[#f59e0b]" },
        { id: "toxic-neon", label: "Toxic Neon", color: "bg-[#22c55e]" },
        { id: "titanium-brutalist", label: "Titanium Brutalist", color: "bg-[#eab308]" },
    ];

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden transition-colors duration-500">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 bg-black/40 backdrop-blur-xl p-4 flex flex-col z-20">
                <div className="flex items-center gap-3 mb-10 px-4">
                    <div className="p-2 bg-primary/20 rounded-xl shadow-glow transition-colors duration-500">
                        <Terminal className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tighter text-glow transition-all duration-500">
                            Jules Console
                        </h1>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">
                            Alpha / Under Dev
                        </span>
                    </div>
                </div>

                <nav className="space-y-2 flex-1">
                    <NavItem to="/" icon={<LayoutDashboard />}>Dashboard</NavItem>
                    <NavItem to="/inbox" icon={<Inbox />}>
                        Inbox
                        {unreadCount > 0 && (
                            <span className="ml-auto px-1.5 py-0.5 bg-primary text-white text-[9px] font-black rounded-md shadow-glow-sm">
                                {unreadCount}
                            </span>
                        )}
                    </NavItem>
                    <NavItem to="/sessions" icon={<Terminal />}>Sessions</NavItem>
                    <NavItem to="/repos" icon={<GitBranch />}>Repositories</NavItem>
                    <NavItem to="/starred" icon={<Star />}>Starred Repos</NavItem>
                    <NavItem to="/huggingface" icon={<Cpu />}>Hugging Face</NavItem>
                </nav>

                <div className="mt-auto pt-4 border-t border-white/5 space-y-4">
                    <JulesAccountSwitcher />

                    <div className="relative">
                        <button
                            onClick={() => setIsThemeOpen(!isThemeOpen)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-left group"
                        >
                            <Palette className="h-4 w-4 group-hover:scale-110 transition-transform" />
                            Theme Switcher
                        </button>

                        <AnimatePresence>
                            {isThemeOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute bottom-full left-0 w-full mb-2 glass rounded-2xl p-2 z-50 overflow-hidden shadow-2xl border-white/10"
                                >
                                    <div className="grid grid-cols-1 gap-1">
                                        {themes.map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => {
                                                    setTheme(t.id);
                                                    setIsThemeOpen(false);
                                                }}
                                                className={cn(
                                                    "flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                                                    theme === t.id ? "bg-primary text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                <div className={cn("h-3 w-3 rounded-full border border-white/20", t.color)} />
                                                {t.label.split(" ")[0]}
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-left group"
                    >
                        <Settings className="h-4 w-4 group-hover:rotate-45 transition-transform duration-500" />
                        Settings
                    </button>

                    <div className="px-4 py-3 flex items-center gap-3 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md hover:bg-white/10 transition-all cursor-default group/user">
                        {user ? (
                            <>
                                <img src={user.avatar_url} alt={user.login} className="h-9 w-9 rounded-full border border-white/10 group-hover/user:scale-105 transition-transform" />
                                <div className="text-sm min-w-0">
                                    <p className="font-semibold truncate leading-tight transition-colors group-hover/user:text-primary">{user.name || user.login}</p>
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">@{user.login}</p>
                                </div>
                            </>
                        ) : (
                            <div className="animate-pulse flex items-center gap-3 w-full">
                                <div className="h-9 w-9 rounded-full bg-zinc-800" />
                                <div className="space-y-1.5 flex-1">
                                    <div className="h-3 w-20 bg-zinc-800 rounded" />
                                    <div className="h-2 w-12 bg-zinc-800 rounded" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="p-8 max-w-7xl mx-auto"
                    >
                        <KeyRequiredBanner onOpenSettings={() => setIsSettingsOpen(true)} />
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
}

function NavItem({ to, icon, children }: { to: string, icon: React.ReactElement, children: React.ReactNode }) {
    return (
        <NavLink to={to} className={({ isActive }) => cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 relative group",
            isActive
                ? "text-primary bg-primary/10 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                : "text-zinc-400 hover:text-white hover:bg-white/5"
        )}>
            {({ isActive }) => (
                <>
                    {isActive && (
                        <motion.div
                            layoutId="nav-glow"
                            className="absolute inset-0 bg-primary/5 rounded-xl border border-primary/20 -z-10"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    {React.cloneElement(icon, { className: "h-4 w-4" } as React.HTMLAttributes<HTMLElement>)}
                    {children}
                </>
            )}
        </NavLink>
    )
}
