"use client";

import { useState, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t bg-background">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder='Try "Coffee $5" or "How much did I spend this week?"'
        disabled={disabled}
        className="flex-1 rounded-lg border border-input bg-background px-4 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        autoFocus
      />
      <Button type="submit" size="icon" disabled={disabled || !value.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
