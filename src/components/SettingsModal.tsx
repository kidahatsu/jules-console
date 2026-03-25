import { useState, useEffect, useRef } from "react";
import { X, Save, Key, Plus, Trash2, CheckCircle2, AlertCircle, Github, Cpu, Pencil, Download, Upload, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { type ProviderProfile, testJulesKey } from "@/lib/jules";
import { testGithubToken } from "@/lib/github";
import { testHFToken } from "@/lib/huggingface";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { ProviderProfileSchema } from "@/lib/validation";
import { z } from "zod";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const storeAccounts = useStore(state => state.accounts);
    const setStoreAccounts = useStore(state => state.setAccounts);
    const setGlobalTokenStatus = useStore(state => state.setTokenStatus);
    const [accounts, setAccounts] = useState<ProviderProfile[]>([]);
    const [newName, setNewName] = useState("");
    const [newJulesKey, setNewJulesKey] = useState("");
    const [newGithubToken, setNewGithubToken] = useState("");
    const [newHfToken, setNewHfToken] = useState("");
    const [showAdd, setShowAdd] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [testStatus, setTestStatus] = useState<Record<string, "idle" | "testing" | "success" | "error">>({
        jules: "idle",
        github: "idle",
        hf: "idle"
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAccounts(storeAccounts);
            setError(null);
            setTestStatus({ jules: "idle", github: "idle", hf: "idle" });
        }
    }, [isOpen, storeAccounts]);

    const handleTest = async (provider: "jules" | "github" | "hf") => {
        setTestStatus(prev => ({ ...prev, [provider]: "testing" }));
        try {
            let result = false;
            if (provider === "jules") result = await testJulesKey(newJulesKey);
            if (provider === "github") result = await testGithubToken(newGithubToken);
            if (provider === "hf") result = await testHFToken(newHfToken);

            if (result) {
                setTestStatus(prev => ({ ...prev, [provider]: "success" }));
                setGlobalTokenStatus(provider, "valid");
            } else {
                setTestStatus(prev => ({ ...prev, [provider]: "error" }));
            }
        } catch (e) {
            console.error(`Test ${provider} failed`, e);
            setTestStatus(prev => ({ ...prev, [provider]: "error" }));
        }
    };

    const handleSave = () => {
        setStoreAccounts(accounts);
        onClose();
    };

    const handleExport = () => {
        const data = JSON.stringify(accounts, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "jules-console.local.json"; // Matches *.local gitignore rule
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                const result = z.array(ProviderProfileSchema).safeParse(imported);
                if (result.success) {
                    setAccounts(result.data as ProviderProfile[]);
                    setError(null);
                } else {
                    // Security fix: Validate imported data structure to prevent insecure deserialization
                    setError("Invalid repoGroup file format or missing required fields.");
                }
            } catch {
                setError("Failed to parse repoGroup file.");
            }
        };
        reader.readAsText(file);
    };

    const handleAddAccount = () => {
        const payload = {
            id: editingId || crypto.randomUUID(),
            name: newName.trim(),
            apiKey: newJulesKey.trim(),
            githubToken: newGithubToken.trim(),
            hfToken: newHfToken.trim(),
            isActive: accounts.length === 0 || !!accounts.find(a => a.id === editingId)?.isActive,
        };

        const result = ProviderProfileSchema.safeParse(payload);

        if (!result.success) {
            setError(result.error.issues[0].message);
            return;
        }

        const validatedAccount = result.data as ProviderProfile;

        if (editingId) {
            const updated = accounts.map(a => a.id === editingId ? validatedAccount : a);
            setAccounts(updated);
            setEditingId(null);
        } else {
            const updated = [...accounts, validatedAccount];
            setAccounts(updated);
        }

        setNewName("");
        setNewJulesKey("");
        setNewGithubToken("");
        setNewHfToken("");
        setShowAdd(false);
        setError(null);
    };

    const handleEditAccount = (account: ProviderProfile) => {
        setEditingId(account.id);
        setNewName(account.name);
        setNewJulesKey(account.apiKey);
        setNewGithubToken(account.githubToken || "");
        setNewHfToken(account.hfToken || "");
        setShowAdd(true);
    };

    const handleDeleteAccount = (id: string) => {
        const updated = accounts.filter(a => a.id !== id);
        if (updated.length > 0 && accounts.find(a => a.id === id)?.isActive) {
            updated[0].isActive = true;
        }
        setAccounts(updated);
    };

    const handleSetActive = (id: string) => {
        const updated = accounts.map(a => ({
            ...a,
            isActive: a.id === id
        }));
        setAccounts(updated);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Key className="w-5 h-5 text-primary" />
                        Provider Profiles
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors" aria-label="Close settings">
                        <X className="h-5 w-5 opacity-70" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 max-h-[80vh]">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-zinc-300">Managed Identity Jules Console</label>
                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    setNewName("");
                                    setNewJulesKey("");
                                    setNewGithubToken("");
                                    setNewHfToken("");
                                    setShowAdd(!showAdd);
                                }}
                                className="text-xs text-primary hover:text-indigo-400 flex items-center gap-1 font-medium transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                                {showAdd && !editingId ? "Cancel" : "New Profile"}
                            </button>
                        </div>

                        {showAdd && (
                            <div className="p-4 bg-zinc-900 border border-primary/20 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1 block">Profile Name</label>
                                        <input
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                                            placeholder="e.g. Work AI, Personal Research"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block flex items-center gap-2">
                                                <Key className="w-3 h-3 text-primary" /> Jules API Key
                                            </label>
                                            <TestButton
                                                status={testStatus.jules}
                                                onClick={() => handleTest("jules")}
                                                disabled={!newJulesKey}
                                            />
                                        </div>
                                        <input
                                            type="password"
                                            value={newJulesKey}
                                            onChange={(e) => {
                                                setNewJulesKey(e.target.value);
                                                setTestStatus(prev => ({ ...prev, jules: "idle" }));
                                            }}
                                            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm font-mono"
                                            placeholder="AIza..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block flex items-center gap-2">
                                                    <Github className="w-3 h-3" /> GitHub Token
                                                </label>
                                                <TestButton
                                                    status={testStatus.github}
                                                    onClick={() => handleTest("github")}
                                                    disabled={!newGithubToken}
                                                />
                                            </div>
                                            <input
                                                type="password"
                                                value={newGithubToken}
                                                onChange={(e) => {
                                                    setNewGithubToken(e.target.value);
                                                    setTestStatus(prev => ({ ...prev, github: "idle" }));
                                                }}
                                                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm font-mono"
                                                placeholder="ghp_..."
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block flex items-center gap-2">
                                                    <Cpu className="w-3 h-3 text-amber-500" /> HF Token
                                                </label>
                                                <TestButton
                                                    status={testStatus.hf}
                                                    onClick={() => handleTest("hf")}
                                                    disabled={!newHfToken}
                                                />
                                            </div>
                                            <input
                                                type="password"
                                                value={newHfToken}
                                                onChange={(e) => {
                                                    setNewHfToken(e.target.value);
                                                    setTestStatus(prev => ({ ...prev, hf: "idle" }));
                                                }}
                                                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm font-mono"
                                                placeholder="hf_..."
                                            />
                                        </div>
                                    </div>
                                </div>
                                {error && (
                                    <div className="flex items-center gap-2 text-xs text-rose-400">
                                        <AlertCircle className="w-3 h-3" />
                                        {error}
                                    </div>
                                )}
                                <div className="flex justify-end gap-2 pt-1">
                                    <button
                                        onClick={() => {
                                            setShowAdd(false);
                                            setEditingId(null);
                                        }}
                                        className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddAccount}
                                        className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-md hover:bg-primary/90"
                                    >
                                        {editingId ? "Update Profile" : "Save Profile"}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            {accounts.length === 0 ? (
                                <div className="text-center py-8 text-zinc-500 bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800">
                                    No identity profiles configured.
                                </div>
                            ) : (
                                accounts.map((account) => (
                                    <div
                                        key={account.id}
                                        className={cn(
                                            "group p-3 rounded-lg border flex items-center justify-between transition-all",
                                            account.isActive
                                                ? "bg-primary/5 border-primary/30"
                                                : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                                        )}
                                    >
                                        <div
                                            className="flex-1 cursor-pointer flex items-center gap-3"
                                            onClick={() => handleSetActive(account.id)}
                                        >
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                account.isActive ? "bg-primary animate-pulse" : "bg-zinc-700"
                                            )} />
                                            <div>
                                                <p className={cn(
                                                    "text-sm font-medium",
                                                    account.isActive ? "text-white" : "text-zinc-400"
                                                )}>
                                                    {account.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="flex items-center gap-1 text-[8px] text-zinc-600 font-black uppercase tracking-tighter">
                                                        <Key className="w-2 h-2" /> Jules
                                                    </div>
                                                    {account.githubToken && (
                                                        <div className="flex items-center gap-1 text-[8px] text-zinc-600 font-black uppercase tracking-tighter">
                                                            <Github className="w-2 h-2" /> GitHub
                                                        </div>
                                                    )}
                                                    {account.hfToken && (
                                                        <div className="flex items-center gap-1 text-[8px] text-zinc-600 font-black uppercase tracking-tighter">
                                                            <Cpu className="w-2 h-2" /> HF
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {account.isActive && (
                                                <CheckCircle2 className="w-4 h-4 text-primary ml-auto mr-4" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleEditAccount(account)}
                                                className="p-2 text-zinc-600 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                                                title="Edit Profile"
                                                aria-label={`Edit ${account.name} profile`}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAccount(account.id)}
                                                className="p-2 text-zinc-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Delete Account"
                                                aria-label={`Delete ${account.name} profile`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 text-[11px] text-blue-300/70">
                        Identity profiles store your keys locally to enable multi-provider orchestration. Switching profiles will reload the dashboard.
                    </div>
                </div>

                <div className="p-4 border-t border-border flex items-center justify-between bg-zinc-950/50">
                    <div className="flex gap-2">
                        <button
                            onClick={handleExport}
                            className="p-2 text-zinc-500 hover:text-primary transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                            title="Export Jules Console Configuration"
                            aria-label="Export Jules Console Configuration"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Export</span>
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-zinc-500 hover:text-amber-500 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                            title="Import Jules Console Configuration"
                            aria-label="Import Jules Console Configuration"
                        >
                            <Upload className="w-4 h-4" />
                            <span className="hidden sm:inline">Import</span>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImport}
                                className="hidden"
                                accept=".json"
                            />
                        </button>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-white transition-colors"
                        >
                            Close
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-lg shadow-primary/20"
                        >
                            <Save className="w-4 h-4" />
                            Apply & Sync Jules Console
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TestButton({ status, onClick, disabled }: { status: string, onClick: () => void, disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || status === "testing"}
            aria-label={status === "idle" ? "Test connection" : `Connection status: ${status}`}
            className={cn(
                "text-[9px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded border transition-all flex items-center gap-1",
                status === "idle" && "text-zinc-500 border-zinc-800 hover:text-primary hover:border-primary/50",
                status === "testing" && "text-primary border-primary/30 animate-pulse cursor-wait",
                status === "success" && "text-emerald-500 border-emerald-500/30 bg-emerald-500/5",
                status === "error" && "text-rose-500 border-rose-500/30 bg-rose-500/5",
                disabled && "opacity-30 cursor-not-allowed"
            )}
        >
            {status === "testing" ? (
                <>
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    Testing
                </>
            ) : status === "success" ? (
                <>
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Valid
                </>
            ) : status === "error" ? (
                <>
                    <ShieldAlert className="w-2.5 h-2.5" />
                    Failed
                </>
            ) : (
                "Test Connection"
            )}
        </button>
    );
}
