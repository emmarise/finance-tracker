import type { ParsedTransaction } from "@/lib/schemas/transaction";

// Matches: "description: $amount" or "description $amount" with optional parens/Chinese
const AMOUNT_PATTERN = /(.+?)\s*[:：]?\s*\$(\d+(?:\.\d{1,2})?)/;

// Matches Chinese date headers like "1月26日" or "12月3日"
const CN_DATE_PATTERN = /(\d{1,2})月(\d{1,2})日/;

// Lines to skip: totals, headers, empty days, commentary
const SKIP_PATTERNS = [
  /当日总计/,
  /花费\s*[:：]/,
  /事件\s*[:：]/,
  /（无记录）/,
  /^\s*$/,
];

function parseCnDate(line: string, fallbackYear: number): string | undefined {
  const match = line.match(CN_DATE_PATTERN);
  if (!match) return undefined;
  const month = match[1].padStart(2, "0");
  const day = match[2].padStart(2, "0");
  return `${fallbackYear}-${month}-${day}`;
}

export function fallbackParse(input: string): ParsedTransaction[] {
  const lines = input.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const results: ParsedTransaction[] = [];
  const currentYear = new Date().getFullYear();
  let currentDate: string | undefined;

  for (const line of lines) {
    // Check for date header
    const dateFromLine = parseCnDate(line, currentYear);
    if (dateFromLine && !AMOUNT_PATTERN.test(line)) {
      currentDate = dateFromLine;
      continue;
    }

    // Skip non-transaction lines
    if (SKIP_PATTERNS.some((p) => p.test(line))) continue;

    const match = line.match(AMOUNT_PATTERN);
    if (match) {
      const description = match[1].replace(/^[-•*]\s*/, "").trim();
      const amount = parseFloat(match[2]);
      const isIncome = /salary|income|paid|earned|freelance/i.test(description);
      results.push({
        amount,
        type: isIncome ? "income" : "expense",
        description,
        category: isIncome ? "Income" : "Other",
        ...(currentDate ? { date: currentDate } : {}),
      });
    }
  }

  return results;
}
