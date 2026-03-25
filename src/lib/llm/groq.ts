import Groq from "groq-sdk";

let groqClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groqClient;
}

export async function callGroq(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const client = getGroqClient();
  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.1,
    max_tokens: 1024,
    response_format: { type: "json_object" },
  });
  return completion.choices[0]?.message?.content ?? "{}";
}
