import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callGroq } from "@/lib/llm/groq";
import { buildAskPrompt } from "@/lib/llm/ask-prompt";
import { askQuerySpecSchema } from "@/lib/schemas/llm-response";
import { executeAnalyticsQuery } from "@/lib/queries/analytics";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { message, timezone } = await request.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  await supabase.from("chat_messages").insert({
    user_id: user.id,
    role: "user",
    content: message,
  });

  const { data: categories } = await supabase
    .from("categories")
    .select("name")
    .eq("user_id", user.id);

  const categoryNames = (categories ?? []).map((c) => c.name);

  try {
    const prompt = buildAskPrompt(categoryNames, timezone);
    const response = await callGroq(prompt, message);
    const json = JSON.parse(response);
    const spec = askQuerySpecSchema.parse(json);

    const result = await executeAnalyticsQuery(supabase, user.id, spec);

    // Format result into natural language
    const formatPrompt = `You are a friendly financial assistant. Format this data into a concise, helpful response. Use dollar amounts with $ sign. Be conversational but brief.`;
    const formatted = await callGroq(
      formatPrompt + "\nRespond with JSON: { \"reply\": \"your message\" }",
      `User asked: "${message}"\nData: ${JSON.stringify(result)}`
    );
    const { reply } = JSON.parse(formatted);

    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "assistant",
      content: reply,
      metadata: { query_spec: spec, result },
    });

    return NextResponse.json({ reply, data: result });
  } catch {
    const reply = "Sorry, I couldn't process that question. Try asking something like: 'How much did I spend on food this month?'";
    await supabase.from("chat_messages").insert({
      user_id: user.id,
      role: "assistant",
      content: reply,
    });
    return NextResponse.json({ reply });
  }
}
