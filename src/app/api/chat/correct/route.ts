import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGroq } from "@/lib/llm/groq";
import { buildParsePrompt, getLocalDate } from "@/lib/llm/parse-prompt";
import { parsedTransactionsSchema } from "@/lib/schemas/transaction";

const CORRECT_SYSTEM = `You are a financial transaction correction assistant. The user is correcting a previously entered transaction.

Given the user's correction message and the last few transactions for context, determine:
1. Which transaction(s) to delete (by index in the provided list, 0-based)
2. What replacement transaction(s) to create (if any)

Return JSON:
{
  "delete_indices": [0],
  "replacement": {
    "transactions": [
      { "amount": 15.50, "type": "expense", "description": "Corrected item", "category": "Food & Dining", "date": "2026-03-26" }
    ]
  }
}

Rules:
- If the user says "no, that was wrong, it should be X $Y", delete the most recent transaction (index 0) and create a replacement
- If the user says "no, the amount was wrong, it was $Y", delete index 0 and create a replacement with same description but new amount
- If the user just says "no, that was wrong" without a replacement, only delete (empty transactions array)
- delete_indices refers to the position in the recent transactions list provided
- Default to correcting the most recent transaction (index 0) unless the user specifies otherwise
- Support Chinese input naturally`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, timezone } = await request.json();

  await supabase.from("chat_messages").insert({
    user_id: user.id,
    role: "user",
    content: message,
  });

  // Get recent transactions for context
  const { data: recent } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentList = (recent ?? []).map((t, i) => (
    `[${i}] ${t.transaction_date} -$${Number(t.amount).toFixed(2)} ${t.description} (${t.category?.name ?? "Uncategorized"})`
  )).join("\n");

  // Get categories for replacement parsing
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", user.id);

  const categoryMap = new Map(
    (categories ?? []).map((c) => [c.name.toLowerCase(), c.id])
  );

  const prompt = `${CORRECT_SYSTEM}

Available categories: ${(categories ?? []).map((c) => c.name).join(", ")}

Recent transactions:
${recentList}`;

  let correction;
  try {
    const response = await callGroq(prompt, message);
    correction = JSON.parse(response);
  } catch {
    const reply = "I couldn't understand the correction. Try: \"no, that was wrong, it should be Coffee $5\" or \"no, the amount was $12\".";
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "assistant",
      content: reply,
    });
    return NextResponse.json({ reply });
  }

  const replyParts: string[] = [];

  // Delete the specified transactions
  const toDelete = (correction.delete_indices ?? [0])
    .map((i: number) => (recent ?? [])[i])
    .filter(Boolean);

  if (toDelete.length > 0) {
    const ids = toDelete.map((t: { id: string }) => t.id);
    await supabase.from("transactions").delete().in("id", ids);
    const deletedLines = toDelete.map(
      (t: { amount: number; description: string; transaction_date: string }) =>
        `-$${Number(t.amount).toFixed(2)} ${t.description} (${t.transaction_date})`
    );
    replyParts.push(`Removed:\n${deletedLines.join("\n")}`);
  }

  // Insert replacements if any
  const replacements = correction.replacement?.transactions ?? [];
  if (replacements.length > 0) {
    const toInsert = replacements.map((t: { amount: number; type: string; description: string; category: string; date?: string }) => ({
      user_id: user.id,
      amount: t.amount,
      type: t.type,
      description: t.description,
      transaction_date: t.date || getLocalDate(timezone),
      category_id: categoryMap.get(t.category.toLowerCase()) ?? null,
      raw_input: message,
    }));

    const { data: inserted } = await supabase
      .from("transactions")
      .insert(toInsert)
      .select("*, category:categories(*)");

    const addedLines = (inserted ?? []).map(
      (t) => `-$${Number(t.amount).toFixed(2)} ${t.description} (${t.category?.name ?? "Uncategorized"})`
    );
    replyParts.push(`Added:\n${addedLines.join("\n")}`);
  }

  const reply = replyParts.length > 0
    ? replyParts.join("\n\n")
    : "No changes made.";

  await supabase.from("chat_messages").insert({
    user_id: user.id,
    role: "assistant",
    content: reply,
  });

  return NextResponse.json({ reply });
}
