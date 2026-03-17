import { X } from "lucide-react";
import type { Activity } from "@/lib/jules";

interface LogsModalProps {
    isOpen: boolean;
    onClose: () => void;
    activities: Activity[] | null;
    loading: boolean;
    error: string | null;
}

export function LogsModal({ isOpen, onClose, activities, loading, error }: LogsModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold">Session Logs</h3>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
                        <X className="h-5 w-5 opacity-70" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-4 space-y-4">
                    {loading && <div className="text-center py-8 text-zinc-400">Loading logs...</div>}

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg">
                            {error}
                        </div>
                    )}

                    {!loading && !error && activities?.length === 0 && (
                        <div className="text-center py-8 text-zinc-500">No activities found.</div>
                    )}

                    {!loading && activities && activities.map((activity, i) => (
                        <div key={i} className="flex gap-4 p-3 rounded-lg bg-zinc-900/50 border border-white/5">
                            <span className="text-xs font-mono text-zinc-500 shrink-0 mt-0.5">
                                {new Date((activity.createTime || activity.create_time || 0) as string).toLocaleTimeString()}
                            </span>
                            <div className="space-y-1">
                                <div className="text-sm font-medium text-zinc-300">{(activity.activityType || activity.type || activity.activity_type || "Activity") as string}</div>
                                <p className="text-sm text-zinc-400 whitespace-pre-wrap font-mono text-xs opacity-80">
                                    {(activity.description || activity.message || activity.text) ? 
                                        ((activity.description || activity.message || activity.text) as string) : 
                                        JSON.stringify(activity, null, 2)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
