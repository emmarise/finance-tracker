import { z } from "zod";

export const askQuerySpecSchema = z.object({
  query_type: z.enum(["ratio", "comparison", "total", "trend", "top_n"]),
  category: z.string().optional(),
  period: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
  comparison_period: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
  limit: z.number().optional(),
});

export type AskQuerySpec = z.infer<typeof askQuerySpecSchema>;
