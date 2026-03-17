import { useState, useMemo } from "react";
import { Trash2, Plus, Loader2, RefreshCw, Filter, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SessionRow } from "@/components/SessionRow";
import { useJules } from "@/hooks/useJules";
import { useGithubRepos } from "@/hooks/useGithubRepos";
import { cn } from "@/lib/utils";

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

export default function Sessions() {
    const { sessions, creating, loading, startSession, refresh, deleteSessions, clearSessions, error: sessionError } = useJules();
    const { repos } = useGithubRepos();

    // Local state for "New Session" form
    const [showNew, setShowNew] = useState(false);
    const [newTask, setNewTask] = useState("");
    const [selectedRepo, setSelectedRepo] = useState("");
    const [branch, setBranch] = useState("main");
    const [automationMode, setAutomationMode] = useState<"AUTO_CREATE_PR" | "AUTO_MERGE_PR">("AUTO_CREATE_PR");

    // Filter State
    const [statusFilter, setStatusFilter] = useState<string>("ALL");

    // Selection State
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const filteredSessions = useMemo(() => {
        if (statusFilter === "ALL") return sessions;
        return sessions.filter(s => s.status === statusFilter);
    }, [sessions, statusFilter]);

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredSessions.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredSessions.map(s => s.id));
        }
    };

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(prev => prev.filter(i => i !== id));
        } else {
            setSelectedIds(prev => [...prev, id]);
        }
    };

    const handleBulkDelete = () => {
        if (confirm(`Remove ${selectedIds.length} sessions?`)) {
            deleteSessions(selectedIds);
            setSelectedIds([]);
        }
    };

    const handleCancel = (id: string) => {
        if (confirm("Remove this session?")) {
            deleteSessions([id]);
        }
    };

    const handleCreate = async () => {
        if (!selectedRepo || !newTask) return;
        try {
            await startSession({ repo: selectedRepo, task: newTask, branch, automationMode });
            setShowNew(false);
            setNewTask("");
            setBranch("main");
            setAutomationMode("AUTO_CREATE_PR");
        } catch {
            // Error managed by hook
        }
    };

    return (
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            <motion.div variants={item} className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-end">
                <div>
                    <h2 className="text-4xl font-black tracking-tighter text-glow uppercase">Activity Logs</h2>
                    <p className="text-zinc-500 mt-1 font-medium tracking-tight">Session management and monitoring.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <button
                        onClick={refresh}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2.5 glass text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-white/5"
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Sync
                    </button>
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-rose-500/20"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete ({selectedIds.length})
                        </button>
                    )}
                    <button
                        onClick={() => setShowNew(!showNew)}
                        className="group relative flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-primary/20 overflow-hidden text-sm"
                    >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        <Plus className="h-4 w-4 relative z-10" />
                        <span className="relative z-10 uppercase tracking-widest">New Session</span>
                    </button>
                    <button
                        onClick={clearSessions}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-500 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border border-white/5"
                    >
                        <Trash2 className="h-4 w-4" />
                        Clear All
                    </button>
                </div>
            </motion.div>

            {/* Filters Bar */}
            <motion.div variants={item} className="flex items-center gap-3 glass p-2 rounded-2xl border-white/5 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-3 px-4 border-r border-white/10 mr-1 text-zinc-500">
                    <Filter className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Status</span>
                </div>
                {["ALL", "RUNNING", "COMPLETED", "FAILED", "CANCELLED", "PENDING"].map((status) => (
                    <button
                        key={status}
                        onClick={() => {
                            setStatusFilter(status);
                            setSelectedIds([]); 
                        }}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                            statusFilter === status 
                                ? "bg-primary text-white shadow-lg shadow-primary/20" 
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                        )}
                    >
                        {status}
                    </button>
                ))}
            </motion.div>

            {/* Error Banner */}
            {sessionError && (
                <motion.div variants={item} className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl text-xs font-bold uppercase tracking-widest">
                    System Error: {sessionError}
                </motion.div>
            )}

            {/* New Session Panel */}
            <AnimatePresence>
                {showNew && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-8 rounded-3xl border border-primary/20 bg-primary/5 space-y-8 glass mb-8">
                            <div className="flex items-center gap-3">
                                <Terminal className="h-5 w-5 text-primary" />
                                <h3 className="font-black text-xl tracking-tight uppercase">Create New Session</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Target Repository</label>
                                    <select
                                        className="w-full glass border border-white/10 p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-bold appearance-none bg-black/20"
                                        value={selectedRepo}
                                        onChange={(e) => {
                                            const repoName = e.target.value;
                                            setSelectedRepo(repoName);
                                            const repo = repos.find(r => r.full_name === repoName);
                                            if (repo) setBranch(repo.default_branch);
                                        }}
                                    >
                                        <option value="">Select a repository...</option>
                                        {repos.map(r => (
                                            <option key={r.id} value={r.full_name}>{r.name.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Task Description</label>
                                    <input
                                        className="w-full glass border border-white/10 p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-bold bg-black/20"
                                        placeholder="Describe the task..."
                                        value={newTask}
                                        onChange={(e) => setNewTask(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Branch Name</label>
                                    <input
                                        className="w-full glass border border-white/10 p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-bold bg-black/20"
                                        placeholder="main"
                                        value={branch}
                                        onChange={(e) => setBranch(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Automation Mode</label>
                                    <select
                                        className="w-full glass border border-white/10 p-3 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none text-sm font-bold appearance-none bg-black/20"
                                        value={automationMode}
                                        onChange={(e) => setAutomationMode(e.target.value as "AUTO_CREATE_PR" | "AUTO_MERGE_PR")}
                                    >
                                        <option value="AUTO_CREATE_PR">AUTO_CREATE_PR</option>
                                        <option value="AUTO_MERGE_PR">AUTO_MERGE_PR</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-4">
                                <button onClick={() => setShowNew(false)} className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Cancel</button>
                                <button
                                    onClick={handleCreate}
                                    disabled={creating || !selectedRepo || !newTask}
                                    className="bg-primary hover:bg-indigo-500 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-95"
                                >
                                    {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Start Session
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.div variants={item} className="space-y-3">
                <div className="flex items-center gap-4 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 glass rounded-2xl border-white/5">
                    <input
                        type="checkbox"
                        checked={filteredSessions.length > 0 && selectedIds.length === filteredSessions.length}
                        onChange={toggleSelectAll}
                        className="rounded-lg border-white/10 bg-white/5 text-primary focus:ring-primary/50 h-4 w-4"
                    />
                    <span className="flex-1">Total Sessions: {filteredSessions.length}</span>
                    <span className="flex items-center gap-1.5 opacity-50">
                        <RefreshCw className="h-3 w-3 animate-spin duration-[5s]" />
                        Auto-refreshing
                    </span>
                </div>
                
                <div className="space-y-3 mt-4">
                    {filteredSessions.length === 0 ? (
                        <div className="text-center py-20 text-zinc-600 glass rounded-3xl border border-dashed border-white/5 font-black uppercase tracking-widest text-xs">
                            {statusFilter === "ALL" ? "No sessions found. Create a new session to get started." : `No sessions found for status: ${statusFilter}`}
                        </div>
                    ) : (
                        filteredSessions.map(session => (
                            <div key={session.id} className="flex gap-4 items-center group/row">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(session.id)}
                                    onChange={() => toggleSelect(session.id)}
                                    className="ml-6 rounded-lg border-white/10 bg-white/5 text-primary focus:ring-primary/50 h-4 w-4 opacity-30 group-hover/row:opacity-100 transition-opacity"
                                />
                                <div className="flex-1">
                                    <SessionRow
                                        {...session}
                                        duration={session.duration || "0s"}
                                        onCancel={() => handleCancel(session.id)}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        </motion.div>
    )
}
