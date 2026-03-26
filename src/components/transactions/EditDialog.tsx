"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Transaction, Category } from "@/lib/supabase/types";

export function EditDialog({
  transaction,
  categories,
  onSave,
  onClose,
}: {
  transaction: Transaction;
  categories: Category[];
  onSave: (updates: Partial<Transaction>) => void;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(transaction.description);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [type, setType] = useState(transaction.type);
  const [categoryId, setCategoryId] = useState(
    transaction.category_id ?? ""
  );
  const [date, setDate] = useState(transaction.transaction_date);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const handleSave = () => {
    onSave({
      description,
      amount: parseFloat(amount),
      type,
      category_id: categoryId || null,
      transaction_date: date,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              <label className="text-sm font-medium">Type</label>
              <Select value={type} onValueChange={(v) => setType((v ?? "expense") as "expense" | "income")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors ${
                    categoryId === c.id
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
