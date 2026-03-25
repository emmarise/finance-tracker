-- Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'USD',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Categories table
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  icon text not null default '📁',
  color text not null default '#6B7280',
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;
create policy "Users can view own categories" on public.categories for select using (auth.uid() = user_id);
create policy "Users can insert own categories" on public.categories for insert with check (auth.uid() = user_id);
create policy "Users can update own categories" on public.categories for update using (auth.uid() = user_id);
create policy "Users can delete own categories" on public.categories for delete using (auth.uid() = user_id);

create index idx_categories_user on public.categories(user_id);

-- Recurring expenses table
create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  description text not null,
  category_id uuid references public.categories(id) on delete set null,
  day_of_month integer not null check (day_of_month between 1 and 28),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recurring_expenses enable row level security;
create policy "Users can view own recurring" on public.recurring_expenses for select using (auth.uid() = user_id);
create policy "Users can insert own recurring" on public.recurring_expenses for insert with check (auth.uid() = user_id);
create policy "Users can update own recurring" on public.recurring_expenses for update using (auth.uid() = user_id);
create policy "Users can delete own recurring" on public.recurring_expenses for delete using (auth.uid() = user_id);

create index idx_recurring_user_active on public.recurring_expenses(user_id, is_active);

-- Transactions table
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  type text not null check (type in ('expense', 'income')),
  description text not null,
  transaction_date date not null default current_date,
  category_id uuid references public.categories(id) on delete set null,
  raw_input text,
  recurring_expense_id uuid references public.recurring_expenses(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions enable row level security;
create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id);
create policy "Users can delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

create index idx_transactions_user_date on public.transactions(user_id, transaction_date desc);
create index idx_transactions_user_category on public.transactions(user_id, category_id);

-- Chat messages table
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;
create policy "Users can view own messages" on public.chat_messages for select using (auth.uid() = user_id);
create policy "Users can insert own messages" on public.chat_messages for insert with check (auth.uid() = user_id);

create index idx_chat_user on public.chat_messages(user_id, created_at desc);

-- Seed categories function
create or replace function public.seed_user_categories()
returns trigger as $$
begin
  insert into public.categories (user_id, name, icon, color, is_system) values
    (new.id, 'Food & Dining', '🍔', '#EF4444', true),
    (new.id, 'Transportation', '🚗', '#F97316', true),
    (new.id, 'Housing', '🏠', '#EAB308', true),
    (new.id, 'Utilities', '💡', '#84CC16', true),
    (new.id, 'Entertainment', '🎬', '#22C55E', true),
    (new.id, 'Shopping', '🛍️', '#14B8A6', true),
    (new.id, 'Healthcare', '🏥', '#3B82F6', true),
    (new.id, 'Education', '📚', '#6366F1', true),
    (new.id, 'Income', '💰', '#10B981', true),
    (new.id, 'Other', '📦', '#6B7280', true);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.seed_user_categories();

-- Spending by category function
create or replace function public.spending_by_category(
  p_user_id uuid,
  p_start date,
  p_end date
)
returns table (
  category_name text,
  category_icon text,
  category_color text,
  total numeric,
  percentage numeric
) as $$
  with totals as (
    select
      c.name as category_name,
      c.icon as category_icon,
      c.color as category_color,
      coalesce(sum(t.amount), 0) as total
    from public.categories c
    left join public.transactions t
      on t.category_id = c.id
      and t.type = 'expense'
      and t.transaction_date between p_start and p_end
    where c.user_id = p_user_id
    group by c.name, c.icon, c.color
    having coalesce(sum(t.amount), 0) > 0
  ),
  grand_total as (
    select sum(total) as gt from totals
  )
  select
    t.category_name,
    t.category_icon,
    t.category_color,
    t.total,
    round(t.total / nullif(g.gt, 0) * 100, 1) as percentage
  from totals t, grand_total g
  order by t.total desc;
$$ language sql security definer;
