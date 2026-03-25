export type Profile = {
  id: string;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  is_system: boolean;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  amount: number;
  type: "expense" | "income";
  description: string;
  transaction_date: string;
  category_id: string | null;
  raw_input: string | null;
  recurring_expense_id: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
};

export type RecurringExpense = {
  id: string;
  user_id: string;
  amount: number;
  description: string;
  category_id: string | null;
  day_of_month: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
};

export type ChatMessage = {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SpendingByCategory = {
  category_name: string;
  category_icon: string;
  category_color: string;
  total: number;
  percentage: number;
};
