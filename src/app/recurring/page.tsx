"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { LoginPage } from "@/components/LoginPage";
import { NavBar } from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Pause, Play } from "lucide-react";
import type { RecurringExpense, Category } from "@/lib/supabase/types";

export default function RecurringPage() {
  const { user, loading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);

  const fetchExpenses = useCallback(async () => {
    const res = await fetch("/api/recurring");
    if (res.ok) setExpenses(await res.json());
  }, []);

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
      fetchExpenses();
      fetchCategories();
    }
  }, [user, fetchExpenses, fetchCategories]);

  const handleAdd = async (data: {
    description: string;
    amount: number;
    day_of_month: number;
    category_id: string | null;
  }) => {
    await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setShowAdd(false);
    fetchExpenses();
  };

  const handleUpdate = async (
    id: string,
    updates: Partial<RecurringExpense>
  ) => {
    await fetch("/api/recurring", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    setEditing(null);
    fetchExpenses();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/recurring", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchExpenses();
  };

  const handleToggle = async (exp: RecurringExpense) => {
    await handleUpdate(exp.id, { is_active: !exp.is_active });
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
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Recurring Expenses</h1>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {expenses.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No recurring expenses yet. Add one to auto-track monthly bills.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {expenses.map((exp) => (
                <Card key={exp.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {exp.description}
                          {!exp.is_active && (
                            <Badge variant="secondary">Paused</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${Number(exp.amount).toFixed(2)} on the{" "}
                          {exp.day_of_month}
                          {ordinalSuffix(exp.day_of_month)} of each month
                          {exp.category && (
                            <span>
                              {" "}
                              - {exp.category.icon} {exp.category.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggle(exp)}
                        title={exp.is_active ? "Pause" : "Resume"}
                      >
                        {exp.is_active ? (
                          <Pause className="h-3.5 w-3.5" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditing(exp)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(exp.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {(showAdd || editing) && (
        <RecurringDialog
          expense={editing}
          categories={categories}
          onSave={(data) => {
            if (editing) {
              handleUpdate(editing.id, data);
            } else {
              handleAdd(
                data as {
                  description: string;
                  amount: number;
                  day_of_month: number;
                  category_id: string | null;
                }
              );
            }
          }}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function ordinalSuffix(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function RecurringDialog({
  expense,
  categories,
  onSave,
  onClose,
}: {
  expense: RecurringExpense | null;
  categories: Category[];
  onSave: (data: Partial<RecurringExpense>) => void;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(expense?.description ?? "");
  const [amount, setAmount] = useState(String(expense?.amount ?? ""));
  const [day, setDay] = useState(String(expense?.day_of_month ?? "1"));
  const [categoryId, setCategoryId] = useState(expense?.category_id ?? "");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {expense ? "Edit" : "Add"} Recurring Expense
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Rent"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Day of Month (1-28)</label>
              <Input
                type="number"
                min="1"
                max="28"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Category</label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                description,
                amount: parseFloat(amount),
                day_of_month: parseInt(day),
                category_id: categoryId || null,
              })
            }
            disabled={!description || !amount}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
