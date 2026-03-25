"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { LoginPage } from "@/components/LoginPage";
import { NavBar } from "@/components/NavBar";
import { TransactionTable } from "@/components/transactions/TransactionTable";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { Transaction, Category } from "@/lib/supabase/types";

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const fetchTransactions = useCallback(async () => {
    const res = await fetch(
      `/api/transactions?limit=${limit}&offset=${offset}`
    );
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions);
      setTotal(data.total);
    }
  }, [offset]);

  const fetchCategories = useCallback(async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    if (data) setCategories(data);
  }, []);

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchCategories();
    }
  }, [user, fetchTransactions, fetchCategories]);

  const handleUpdate = async (id: string, updates: Partial<Transaction>) => {
    const res = await fetch("/api/transactions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (res.ok) fetchTransactions();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch("/api/transactions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) fetchTransactions();
  };

  const handleExportCSV = () => {
    const header = "Date,Description,Category,Type,Amount\n";
    const rows = transactions
      .map(
        (t) =>
          `${t.transaction_date},"${t.description}","${t.category?.name ?? ""}",${t.type},${t.amount}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <div className="flex flex-col h-screen">
      <NavBar userEmail={user.email} />
      <main className="flex-1 overflow-auto p-4">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Transactions</h1>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>

          <TransactionTable
            transactions={transactions}
            categories={categories}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />

          {total > limit && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground self-center">
                {offset + 1}-{Math.min(offset + limit, total)} of {total}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={offset + limit >= total}
                onClick={() => setOffset(offset + limit)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
