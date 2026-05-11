import { useState, useEffect } from "react";
import { X, Loader2, BookCopy, Clipboard, Link as LinkIcon } from "lucide-react";
import { createRepoFromTemplate } from "@/lib/github";
import type { CreateRepoParams } from "@/lib/github";

interface CreateRepoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialTemplate?: { owner: string; name: string } | null;
}

export function CreateRepoModal({ isOpen, onClose, onSuccess, initialTemplate }: CreateRepoModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);

    const [formData, setFormData] = useState<CreateRepoParams>({
        templateOwner: "github",
        templateRepo: "cv",
        name: "",
        description: "",
        private: true,
        includeAllBranches: false,
    });

    useEffect(() => {
        if (isOpen) {
            // Priority 1: Props
            if (initialTemplate) {
                setFormData(prev => ({
                    ...prev,
                    templateOwner: initialTemplate.owner,
                    templateRepo: initialTemplate.name,
                    name: `${initialTemplate.name}-copy`
                }));
                return;
            }

            // Priority 2: Clipboard (if permissible)
            checkClipboard();
        }
    }, [isOpen, initialTemplate]);

    const checkClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            const githubRegex = /github\.com\/([^/]+)\/([^/]+)/;
            const match = text.match(githubRegex);

            if (match) {
                setClipboardUrl(text);
                // Don't auto-fill, let user decide via button to avoid annoyance
            }
        } catch {
            // Clipboard access denied or not available, ignore
        }
    };

    const applyClipboard = () => {
        if (!clipboardUrl) return;
        const githubRegex = /github\.com\/([^/]+)\/([^/]+)/;
        const match = clipboardUrl.match(githubRegex);
        if (match) {
            setFormData(prev => ({
                ...prev,
                templateOwner: match[1],
                templateRepo: match[2].replace(".git", ""), // cleanup .git extension if present
                name: `${match[2].replace(".git", "")}-copy`
            }));
            setClipboardUrl(null); // Clear hint after using
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await createRepoFromTemplate(formData);
            onSuccess();
            onClose();
        } catch (err: unknown) {
            console.error("Failed to create repository:", err instanceof Error ? err.message : "Unknown error");
            const errorMessage = err instanceof Error ? err.message : "Failed to create repository";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BookCopy className="w-5 h-5 text-primary" />
                        Create from Template
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="h-5 w-5 opacity-70" />
                    </button>
                </div>

                <div className="px-6 pt-6">
                    {clipboardUrl && (
                        <button
                            onClick={applyClipboard}
                            type="button"
                            className="w-full mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-md flex items-center gap-3 text-left hover:bg-indigo-500/20 transition-colors group"
                        >
                            <div className="p-2 bg-indigo-500/20 rounded-full group-hover:bg-indigo-500/30">
                                <Clipboard className="w-4 h-4 text-indigo-300" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="text-xs text-indigo-300 font-medium">Detected in clipboard</div>
                                <div className="text-sm text-indigo-100 truncate flex items-center gap-1">
                                    <LinkIcon className="w-3 h-3" />
                                    {clipboardUrl}
                                </div>
                            </div>
                            <div className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">Use</div>
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-md">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Template Owner</label>
                            <input
                                required
                                type="text"
                                value={formData.templateOwner}
                                onChange={e => setFormData({ ...formData, templateOwner: e.target.value })}
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                placeholder="github"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Template Repo</label>
                            <input
                                required
                                type="text"
                                value={formData.templateRepo}
                                onChange={e => setFormData({ ...formData, templateRepo: e.target.value })}
                                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                                placeholder="cv"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">New Repository Name</label>
                        <input
                            required
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                            placeholder="my-new-repo"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm min-h-[80px]"
                            placeholder="Optional description..."
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="private"
                            checked={formData.private}
                            onChange={e => setFormData({ ...formData, private: e.target.checked })}
                            className="rounded border-zinc-700 bg-zinc-900 text-primary focus:ring-primary/50"
                        />
                        <label htmlFor="private" className="text-sm text-zinc-300">Private Repository</label>
                    </div>

                    <div className="pt-4 border-t border-border flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookCopy className="w-4 h-4" />}
                            Create Repository
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
