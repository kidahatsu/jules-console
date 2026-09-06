import { z } from "zod";

/**
 * Schema for an individual Identity Profile
 */
export const ProviderProfileSchema = z.object({
    id: z.string().uuid().or(z.literal("default")),
    name: z.string().min(2, "Account name must be at least 2 characters").max(100, "Name is too long"),
    apiKey: z.string().min(10, "Google API Key is required and must be valid").max(100, "API Key is too long"),
    githubToken: z.string().max(200, "GitHub Token is too long").optional().default(""),
    hfToken: z.string().max(200, "HF Token is too long").optional().default(""),
    isActive: z.boolean(),
});

/**
 * Schema for creating a new Jules Session
 */
export const CreateSessionSchema = z.object({
    task: z.string().min(5, "Task description is too short. Be more descriptive.").max(5000, "Task description is too long"),
    repo: z.string().max(200, "Repository name is too long").optional(),
    branch: z.string().max(100, "Branch name is too long").default("main"),
    automationMode: z.enum(["AUTO_CREATE_PR", "AUTO_MERGE_PR"]).default("AUTO_CREATE_PR"),
});
