import type { ParsedTransaction } from "@/lib/schemas/transaction";

const AMOUNT_PATTERN = /(.+?)\s*\$(\d+(?:\.\d{1,2})?)/;

export function fallbackParse(input: string): ParsedTransaction[] {
  const entries = input.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
  const results: ParsedTransaction[] = [];

  for (const entry of entries) {
    const match = entry.match(AMOUNT_PATTERN);
    if (match) {
      const description = match[1].trim();
      const amount = parseFloat(match[2]);
      const isIncome = /salary|income|paid|earned|freelance/i.test(description);
      results.push({
        amount,
        type: isIncome ? "income" : "expense",
        description,
        category: isIncome ? "Income" : "Other",
      });
    }
  }

  return results;
}
