import { useState, memo } from "react";
import { GitBranch, Trash2, ExternalLink, Copy, Code, Check, Sparkles, Settings2, Pencil, Save, Loader2, Activity } from "lucide-react";
import { motion } from "framer-motion";
import type { GithubRepo } from "@/hooks/useGithubRepos";
import { JulesActionModal } from "./JulesActionModal";
import { BranchManagerModal } from "./BranchManagerModal";
import { updateRepo, getReadme } from "@/lib/github";

function cleanRepoDescription(text: string): string {
    if (!text) return "";
    return text
        .replace(/[\r\n\t]+/g, " ")
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

interface RepoCardProps {
    repo: GithubRepo;
    onDelete: (id: number) => void;
    onCloneToNew: (repo: GithubRepo) => void;
}

export const RepoCard = memo(function RepoCard({ repo, onDelete, onCloneToNew }: RepoCardProps) {
    const [copied, setCopied] = useState(false);
    const [isJulesModalOpen, setIsJulesModalOpen] = useState(false);
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);

    // Description Editing State
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [description, setDescription] = useState(repo.description || "");
    const [isSavingDesc, setIsSavingDesc] = useState(false);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

    const handleCopyClone = () => {
        navigator.clipboard.writeText(`git clone ${repo.clone_url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveDescription = async () => {
        setIsSavingDesc(true);
        try {
            const [owner, name] = repo.full_name.split("/");
            const cleanDescription = cleanRepoDescription(description);
            await updateRepo({ owner, repo: name, description: cleanDescription });
            setIsEditingDesc(false);
            repo.description = cleanDescription;
            setDescription(cleanDescription);
        } catch (error) {
            console.error(error);
            alert("Failed to update description");
        } finally {
            setIsSavingDesc(false);
        }
    };

    const handleGenerateDescription = async () => {
        setIsGeneratingDesc(true);
        try {
            const [owner, name] = repo.full_name.split("/");
            const readme = await getReadme(owner, name);
            if (readme) {
                const lines = readme.split("\n");
                let extracted = "";
                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("![")) {
                        extracted = trimmed;
                        break;
                    }
                }
                if (extracted) {
                    let cleanDescription = extracted
                        .replace(/(\*\*|__|\*|_)/g, "")
                        .replace(/^>\s*/g, "")
                        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
                        .replace(/`([^`]+)`/g, "$1");
                    cleanDescription = cleanRepoDescription(cleanDescription);
                    setDescription(cleanDescription);
                } else {
                    alert("Could not extract a description from README.");
                }
            } else {
                alert("No README found to generate description from.");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    return (
        <>
            <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className="group relative p-5 rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl hover:border-primary/30 transition-all flex flex-col gap-4 shadow-2xl hover:shadow-primary/5 h-full overflow-hidden"
            >
                <div className="flex items-start gap-4">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="relative shrink-0">
                            {repo.owner?.avatar_url ? (
                                <img src={`${repo.owner.avatar_url}&s=80`} alt={repo.owner?.login || "owner"} className="w-10 h-10 rounded-xl border border-white/10 shadow-lg group-hover:scale-105 transition-transform" />
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-white/10 text-primary font-black text-xs">
                                    {(repo.owner?.login || repo.full_name || "??").substring(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.1em] truncate mb-0.5">
                                {repo.owner?.login || repo.full_name?.split("/")[0] || "SYSTEM"}
                            </div>
                            <h3 className="font-black text-base leading-tight truncate group-hover:text-primary transition-colors" title={repo.full_name}>
                                {repo.name}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all -mt-3">
                    {repo.is_template && (
                        <button onClick={() => onCloneToNew(repo)} className="p-1.5 hover:bg-emerald-500/10 rounded-lg text-zinc-500 hover:text-emerald-400 transition-colors" title="Use as Template">
                            <Copy className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button onClick={() => setIsBranchModalOpen(true)} className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors" title="Settings">
                        <Settings2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setIsJulesModalOpen(true)} className="p-1.5 hover:bg-primary/10 rounded-lg text-zinc-500 hover:text-primary transition-colors" title="AI Actions">
                        <Sparkles className="h-3.5 w-3.5" />
                    </button>
                    <a href={repo.html_url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <button onClick={() => onDelete(repo.id)} className="p-1.5 hover:bg-rose-500/10 rounded-lg text-zinc-400 hover:text-rose-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Description Area */}
                <div className="flex-1 min-h-[48px] relative group/desc">
                    {isEditingDesc ? (
                        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px] font-medium leading-relaxed"
                                placeholder="Repository objective..."
                                autoFocus
                            />
                            <div className="flex justify-between items-center">
                                <button onClick={handleGenerateDescription} disabled={isGeneratingDesc} className="text-[10px] font-bold text-primary hover:text-indigo-300 flex items-center gap-1.5 disabled:opacity-50 uppercase tracking-widest">
                                    {isGeneratingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                    Auto_Gen
                                </button>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsEditingDesc(false)} className="px-2 py-1 hover:bg-white/5 rounded-lg text-zinc-400 text-[10px] font-bold" disabled={isSavingDesc}>CANCEL</button>
                                    <button onClick={handleSaveDescription} disabled={isSavingDesc} className="px-3 py-1 bg-primary hover:bg-indigo-500 text-white rounded-lg flex items-center gap-1.5 disabled:opacity-50 text-[10px] font-bold shadow-lg shadow-primary/20">
                                        {isSavingDesc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                        SAVE
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="relative group/text">
                            <p className="text-xs text-zinc-400 font-medium leading-relaxed line-clamp-2 group-hover/text:text-zinc-300 transition-colors opacity-80 group-hover:opacity-100" title={description}>
                                {description || "System: Awaiting repository objective documentation..."}
                            </p>
                            <button
                                onClick={() => setIsEditingDesc(true)}
                                className="absolute -top-2 -right-2 p-1.5 bg-primary/20 backdrop-blur-md rounded-lg text-primary opacity-0 group-hover/desc:opacity-100 hover:scale-110 transition-all border border-primary/30"
                            >
                                <Pencil className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3 pt-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                            <div className="flex items-center gap-1.5">
                                <GitBranch className="h-3 w-3 text-primary" />
                                <span>{repo.default_branch}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Activity className="h-3 w-3 text-zinc-600" />
                                <span>{new Date(repo.updated_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {repo.is_template && (
                                <span className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-amber-500/20">Template</span>
                            )}
                            <span className="bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">Synced</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button
                        onClick={handleCopyClone}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-zinc-900/50 hover:bg-white/5 text-zinc-500 hover:text-white border border-white/5 transition-all shadow-inner"
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? <span className="text-emerald-400">Copied</span> : "Clone"}
                    </button>
                    <a
                        href={`vscode://vscode.git/clone?url=${encodeURIComponent(repo.clone_url)}`}
                        className="flex items-center justify-center gap-2 py-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl hover:bg-primary/20 transition-all shadow-glow text-[10px] font-black uppercase tracking-widest"
                    >
                        <Code className="h-3.5 w-3.5" />
                        VS Code
                    </a>
                </div>
                
                {/* Decoration */}
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </motion.div>

            <JulesActionModal isOpen={isJulesModalOpen} onClose={() => setIsJulesModalOpen(false)} repo={repo} />
            <BranchManagerModal isOpen={isBranchModalOpen} onClose={() => setIsBranchModalOpen(false)} repo={repo} />
        </>
    );
});
