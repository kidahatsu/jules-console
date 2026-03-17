import { CheckCircle2, MessageSquare, AlertCircle, FileCode, GitPullRequest, Search, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Activity } from "@/lib/jules";

interface SessionTimelineProps {
    activities: Activity[];
    sessionState?: string;
}

interface TimelineStep {
    label: string;
    description: string;
    icon: React.ElementType;
    status: "completed" | "current" | "pending" | "failed";
    time?: string;
}

export function SessionTimeline({ activities, sessionState }: SessionTimelineProps) {
    const getTimelineSteps = (): TimelineStep[] => {
        const steps: TimelineStep[] = [];
        const sorted = [...activities].sort((a, b) => {
            const timeA = new Date((a.createTime || a.create_time || 0) as string).getTime();
            const timeB = new Date((b.createTime || b.create_time || 0) as string).getTime();
            return timeA - timeB;
        });

        const findActivity = (patterns: string[]) => 
            sorted.find(a => {
                const type = ((a.activityType || a.type || a.activity_type || "") as string).toUpperCase();
                const desc = ((a.description || a.message || a.text || "") as string).toUpperCase();
                return patterns.some(p => type.includes(p.toUpperCase()) || desc.includes(p.toUpperCase()));
            });

        const sessionStarted = findActivity(["STARTED", "CREAT", "INIT"]);
        const analysisStarted = findActivity(["ANALYSIS", "READ", "SCAN", "FETCH"]);
        const planningStarted = findActivity(["PLAN", "THINK", "DECIDE"]);
        const executionStarted = findActivity(["EXECUTION", "EDIT", "WRITE", "MODIFY"]);
        const prCreated = findActivity(["PR", "PULL_REQUEST", "SUBMIT"]);
        const finished = findActivity(["COMPLETED", "SUCCEEDED", "FINISHED"]);
        const failed = findActivity(["FAILED", "ERROR", "ABORTED"]);

        const isOverallFinished = sessionState === "SUCCEEDED" || sessionState === "COMPLETED";
        const isOverallFailed = sessionState === "FAILED" || sessionState === "ABORTED";
        
        const isFailed = !!failed || isOverallFailed;
        const isFinished = !!finished || isOverallFinished || isFailed;
        const isPR = !!prCreated || isFinished;
        const isExecuting = !!executionStarted || isPR;
        const isPlanning = !!planningStarted || isExecuting;
        const isAnalyzing = !!analysisStarted || isPlanning;
        const isStarted = !!sessionStarted || isAnalyzing || activities.length > 0;

        const latestActivity = sorted[sorted.length - 1];

        steps.push({
            label: "Initialization",
            description: isAnalyzing ? "Kernel initialized and context synchronized." : "Synchronizing system context...",
            icon: Zap,
            status: isStarted ? "completed" : "current",
            time: (sessionStarted?.createTime || sessionStarted?.create_time || (isStarted ? sorted[0]?.createTime || sorted[0]?.create_time : undefined)) as string
        });

        steps.push({
            label: "Codebase Analysis",
            description: isPlanning ? "Heuristic analysis complete." : (analysisStarted ? "Scanning dependency graph and indexing..." : "Awaiting scan trigger."),
            icon: Search,
            status: isAnalyzing ? (isPlanning ? "completed" : "current") : (isStarted ? "current" : "pending"),
            time: (analysisStarted?.createTime || analysisStarted?.create_time) as string
        });

        steps.push({
            label: "Strategy Planning",
            description: isExecuting ? "Optimization strategy generated." : (planningStarted ? "Synthesizing implementation vectors..." : "Pending strategy phase."),
            icon: MessageSquare,
            status: isPlanning ? (isExecuting ? "completed" : "current") : (isAnalyzing ? "current" : "pending"),
            time: (planningStarted?.createTime || planningStarted?.create_time) as string
        });

        steps.push({
            label: "Implementation",
            description: isPR ? "System modifications applied." : (executionStarted ? "Applying codebase patches..." : "Awaiting implementation."),
            icon: FileCode,
            status: isExecuting ? (isPR ? "completed" : "current") : (isPlanning ? "current" : "pending"),
            time: (executionStarted?.createTime || executionStarted?.create_time) as string
        });

        if (isOverallFailed && !isOverallFinished) {
            steps.push({
                label: "Termination",
                description: (failed?.description || failed?.message || "Critical exception encountered.") as string,
                icon: AlertCircle,
                status: "failed",
                time: (failed?.createTime || failed?.create_time || latestActivity?.createTime || latestActivity?.create_time) as string
            });
        } else {
            steps.push({
                label: "Pull Request",
                description: isOverallFinished ? "PR deployed and merged." : (prCreated ? "Submitting changes to master branch..." : "Awaiting PR creation."),
                icon: GitPullRequest,
                status: isPR ? (isFinished ? "completed" : "current") : (isExecuting ? "current" : "pending"),
                time: (prCreated?.createTime || prCreated?.create_time) as string
            });

            steps.push({
                label: "Finalization",
                description: isOverallFinished ? "Mission successful." : "Verifying system integrity...",
                icon: CheckCircle2,
                status: isFinished ? "completed" : "pending",
                time: (finished?.createTime || finished?.create_time || (isOverallFinished ? latestActivity?.createTime || latestActivity?.create_time : undefined)) as string
            });
        }

        const currentStep = steps.find(s => s.status === "current" || s.status === "failed");
        if (currentStep && latestActivity) {
            const activityDesc = (latestActivity.description || latestActivity.message || latestActivity.text) as string;
            if (activityDesc && activityDesc.length < 200) {
                currentStep.description = activityDesc;
            }
        }

        return steps;
    };

    const steps = getTimelineSteps();

    return (
        <div className="space-y-10 p-6">
            {steps.map((step, idx) => {
                const Icon = step.icon;
                const isLast = idx === steps.length - 1;

                return (
                    <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative flex gap-8"
                    >
                        {!isLast && (
                            <div 
                                className={cn(
                                    "absolute left-[23px] top-12 bottom-[-40px] w-[1px] transition-colors duration-1000",
                                    step.status === "completed" ? "bg-primary/50 shadow-[0_0_10px_rgba(99,102,241,0.3)]" : "bg-white/5"
                                )} 
                            />
                        )}
                        
                        <div className={cn(
                            "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all duration-700",
                            step.status === "completed" && "border-primary bg-primary/10 text-primary shadow-glow",
                            step.status === "current" && "border-amber-500/50 bg-amber-500/10 text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)] animate-pulse",
                            step.status === "pending" && "border-white/5 bg-white/5 text-zinc-600",
                            step.status === "failed" && "border-rose-500/50 bg-rose-500/10 text-rose-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                        )}>
                            {step.status === "completed" ? (
                                <CheckCircle2 className="h-6 w-6" />
                            ) : (
                                <Icon className="h-6 w-6" />
                            )}
                        </div>

                        <div className="flex flex-col gap-2 pt-1">
                            <div className="flex items-center gap-4">
                                <h4 className={cn(
                                    "text-sm font-black uppercase tracking-widest transition-colors",
                                    step.status === "pending" ? "text-zinc-600" : 
                                    step.status === "current" ? "text-amber-500" : "text-white"
                                )}>
                                    {step.label}
                                </h4>
                                {step.time && (
                                    <span className="text-[10px] font-mono font-bold text-zinc-500 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                                        {new Date(step.time).toLocaleTimeString()}
                                    </span>
                                )}
                            </div>
                            <p className={cn(
                                "text-xs font-medium leading-relaxed max-w-xl transition-colors",
                                step.status === "pending" ? "text-zinc-700" : "text-zinc-400"
                            )}>
                                {step.description}
                            </p>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
