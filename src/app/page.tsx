"use client";

import { useAuth } from "@/components/AuthProvider";
import { LoginPage } from "@/components/LoginPage";
import { NavBar } from "@/components/NavBar";
import { ChatPanel } from "@/components/chat/ChatPanel";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="flex flex-col h-screen">
      <NavBar userEmail={user.email} />
      <main className="flex-1 overflow-hidden">
        <ChatPanel />
      </main>
    </div>
  );
}
