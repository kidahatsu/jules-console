import { z } from "zod";

/**
 * Schema for an individual Identity Profile (RepoGroup)
 */
export const ProviderProfileSchema = z.object({
    id: z.string().uuid().or(z.literal("default")),
    name: z.string().min(2, "Account name must be at least 2 characters"),
    apiKey: z.string().min(10, "Google API Key is required and must be valid"),
    githubToken: z.string().optional(),
    hfToken: z.string().optional(),
    isActive: z.boolean(),
});

/**
 * Schema for creating a new Jules Session
 */
export const CreateSessionSchema = z.object({
    task: z.string().min(5, "Task description is too short. Be more descriptive."),
    repo: z.string().optional(),
    branch: z.string().default("main"),
    automationMode: z.enum(["AUTO_CREATE_PR", "AUTO_MERGE_PR"]).default("AUTO_CREATE_PR"),
});

export type ProviderProfileInput = z.infer<typeof ProviderProfileSchema>;
export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
