"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EditDialog } from "./EditDialog";
import type { Transaction, Category } from "@/lib/supabase/types";

export function TransactionTable({
  transactions,
  categories,
  onUpdate,
  onDelete,
}: {
  transactions: Transaction[];
  categories: Category[];
  onUpdate: (id: string, updates: Partial<Transaction>) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Transaction | null>(null);

  return (
    <>
      <div className="rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Description</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-right p-3 font-medium">Amount</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="p-3 text-muted-foreground whitespace-nowrap">
                    {t.transaction_date}
                    <span className="ml-1 text-xs">
                      {new Date(t.transaction_date + "T00:00:00").toLocaleDateString("zh-CN", { weekday: "short" })}
                    </span>
                  </td>
                  <td className="p-3">{t.description}</td>
                  <td className="p-3">
                    {t.category && (
                      <Badge
                        variant="secondary"
                        style={{ borderColor: t.category.color }}
                      >
                        {t.category.icon} {t.category.name}
                      </Badge>
                    )}
                  </td>
                  <td
                    className={`p-3 text-right font-medium ${
                      t.type === "income" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}$
                    {Number(t.amount).toFixed(2)}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditing(t)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => onDelete(t.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No transactions yet. Use the chat to add some!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditDialog
          transaction={editing}
          categories={categories}
          onSave={(updates) => {
            onUpdate(editing.id, updates);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
