import { z } from "zod";

export const transactionSchema = z.object({
  amount: z.number().nonnegative(),
  type: z.enum(["expense", "income"]),
  description: z.string().min(1),
  category: z.string().min(1),
  date: z.string().optional(),
});

export const parsedTransactionsSchema = z.object({
  transactions: z.array(transactionSchema),
});

export type ParsedTransaction = z.infer<typeof transactionSchema>;
