import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGroq } from "@/lib/llm/groq";

const SYSTEM_PROMPT = `You are a financial transaction deletion assistant. The user wants to undo or delete transactions they previously entered.

Analyze the user's message and determine which transactions to delete. Return JSON in this format:
{
  "action": "delete",
  "criteria": {
    "date_start": "YYYY-MM-DD or null",
    "date_end": "YYYY-MM-DD or null",
    "descriptions": ["keyword1", "keyword2"] or null,
    "last_n": number or null
  },
  "confirm_message": "Human-readable description of what will be deleted"
}

Rules:
- For "undo last entry" or "undo last 3", set last_n
- For "delete everything from Feb 23 to Feb 28", set date_start and date_end
- For "delete the McDonald's transaction", set descriptions to ["McDonald"]
- For Chinese dates like "2月23日", convert to the current year's YYYY-MM-DD format (use 2026 as current year)
- descriptions should be loose keywords to match against (partial match), not exact strings
- You can combine criteria (e.g., date range + description)
- Always set confirm_message to describe what will be deleted in natural language`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message } = await request.json();

  await supabase.from("chat_messages").insert({
    user_id: user.id,
    role: "user",
    content: message,
  });

  let criteria;
  try {
    const response = await callGroq(SYSTEM_PROMPT, message);
    criteria = JSON.parse(response);
  } catch {
    const reply = "I couldn't understand what you want to delete. Try: \"undo last entry\", \"delete McDonald's from Feb 28\", or \"delete everything from 2月23日 to 2月28日\".";
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "assistant",
      content: reply,
    });
    return NextResponse.json({ reply });
  }

  // Build the delete query
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id);

  const c = criteria.criteria;

  if (c.date_start && c.date_end) {
    query = query.gte("transaction_date", c.date_start).lte("transaction_date", c.date_end);
  } else if (c.date_start) {
    query = query.eq("transaction_date", c.date_start);
  }

  if (c.last_n) {
    query = query.order("created_at", { ascending: false }).limit(c.last_n);
  } else {
    query = query.order("transaction_date", { ascending: false });
  }

  const { data: matches } = await query;
  let toDelete = matches ?? [];

  // Filter by description keywords if provided
  if (c.descriptions && c.descriptions.length > 0) {
    const keywords = c.descriptions.map((k: string) => k.toLowerCase());
    toDelete = toDelete.filter((t) =>
      keywords.some((k: string) => t.description.toLowerCase().includes(k))
    );
  }

  if (toDelete.length === 0) {
    const reply = "No matching transactions found to delete.";
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "assistant",
      content: reply,
    });
    return NextResponse.json({ reply });
  }

  // Delete them
  const ids = toDelete.map((t) => t.id);
  const { error } = await supabase
    .from("transactions")
    .delete()
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lines = toDelete.map(
    (t) => `  -$${Number(t.amount).toFixed(2)} ${t.description} (${t.transaction_date})`
  );
  const reply = `Deleted ${toDelete.length} transaction${toDelete.length > 1 ? "s" : ""}:\n${lines.join("\n")}`;

  await supabase.from("chat_messages").insert({
    user_id: user.id,
    role: "assistant",
    content: reply,
    metadata: { deleted_ids: ids },
  });

  return NextResponse.json({ reply, deleted: toDelete });
}
