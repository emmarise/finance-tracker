"use client";

import { useState, useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        'Welcome! Type expenses like "Coffee $5, Lunch $12" to track them, or ask "How much did I spend this month?" to analyze your spending.',
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load chat history
    fetch("/api/chat/history")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Message[]) => {
        if (data.length > 0) {
          setMessages((prev) => [...prev, ...data]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Determine intent: correction, delete/undo, question, or new transaction
      const isCorrection =
        /\b(no[,.]?\s*(that|it|the last)|wrong|not correct|incorrect|should (be|have been)|actually it was|that was|fix (it|that|the last)|更正|改成|不对|错了)\b/i.test(text);
      const isDelete =
        !isCorrection &&
        /\b(undo|revert|delete|remove|取消|撤销|删除)\b/i.test(text);
      const isQuestion =
        !isDelete &&
        !isCorrection &&
        /\?|how much|what|which|show|compare|trend|top|ratio|average|total/i.test(
          text
        );
      const endpoint = isCorrection
        ? "/api/chat/correct"
        : isDelete
          ? "/api/chat/delete"
          : isQuestion
            ? "/api/chat/ask"
            : "/api/chat/parse";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply || data.error || "Something went wrong.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3 max-w-2xl mx-auto">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-4 py-2.5 text-sm text-muted-foreground">
                Thinking...
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
