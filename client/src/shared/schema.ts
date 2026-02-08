import { z } from "zod";

// Client-side Zod schemas (no drizzle). Must match server API contract.

export const insertRumorSchema = z.object({
  content: z.string().min(1),
  summary: z.string().optional(),
  contentWarning: z.boolean().optional(),
  imageUrl: z.string().url().optional().nullable(),
  hasDependencies: z.boolean().optional(),
  dependencyStatus: z.string().optional(),
});

export const insertEvidenceSchema = z.object({
  rumorId: z.number().optional(),
  content: z.string().min(1),
  url: z.string().url().optional().nullable(),
  isSupporting: z.boolean(),
});

export type InsertRumor = z.infer<typeof insertRumorSchema>;
export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
