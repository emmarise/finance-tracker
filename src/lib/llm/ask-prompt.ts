export function buildAskPrompt(categoryNames: string[]): string {
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.substring(0, 7);
  const [year, month] = currentMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const monthStart = `${currentMonth}-01`;
  const monthEnd = `${currentMonth}-${lastDay}`;

  return `You are a financial analytics assistant. Convert the user's natural language question into a structured query specification.

Available categories: ${categoryNames.join(", ")}
Today's date: ${today}
Current month range: ${monthStart} to ${monthEnd}

Query types:
- "ratio": Calculate spending ratio for a category (e.g., "What percentage is food?")
- "comparison": Compare two periods (e.g., "How does this month compare to last?")
- "total": Get total spending/income (e.g., "How much did I spend this month?")
- "trend": Show spending over time (e.g., "Show my spending trend")
- "top_n": Top categories by spending (e.g., "What are my top expenses?")

Respond with valid JSON:
{
  "query_type": "total",
  "category": "Food & Dining",
  "period": { "start": "${monthStart}", "end": "${monthEnd}" },
  "comparison_period": { "start": "...", "end": "..." },
  "limit": 5
}

Only include fields relevant to the query. Always include period.`;
}
