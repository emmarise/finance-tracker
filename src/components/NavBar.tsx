"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, LayoutDashboard, List, Repeat, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const links = [
  { href: "/", label: "Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: List },
  { href: "/recurring", label: "Recurring", icon: Repeat },
];

export function NavBar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <nav className="border-b bg-background">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <span className="font-semibold mr-4 text-lg">Finance Tracker</span>
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                pathname === href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </div>
        {userEmail && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden md:inline">
              {userEmail}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
