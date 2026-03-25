import type { SupabaseClient } from "@supabase/supabase-js";

export async function getTransactions(
  supabase: SupabaseClient,
  userId: string,
  options?: { start?: string; end?: string; limit?: number; offset?: number }
) {
  let query = supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("user_id", userId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (options?.start)
    query = query.gte("transaction_date", options.start);
  if (options?.end)
    query = query.lte("transaction_date", options.end);
  if (options?.limit)
    query = query.limit(options.limit);
  if (options?.offset)
    query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);

  return query;
}

export async function getCategories(
  supabase: SupabaseClient,
  userId: string
) {
  return supabase
    .from("categories")
    .select("*")
    .eq("user_id", userId)
    .order("name");
}
