-- شغّلي هاد الملف كامل بمحرر SQL بمشروع Supabase تبعك (SQL Editor -> New query)

create table if not exists houses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text,
  phone text,
  description text,
  categories text[] default '{}'::text[],
  created_at timestamptz default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  house_id uuid references houses(id) on delete cascade,
  name text not null,
  category text,
  price numeric default 0,
  qty integer default 0,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  house_id uuid references houses(id) on delete set null,
  house_name text,
  items jsonb,
  total numeric,
  address text,
  note text,
  status text default 'قيد التحضير',
  created_at timestamptz default now()
);

-- تفعيل حماية الصفوف (RLS) مطلوب من Supabase
alter table houses enable row level security;
alter table items enable row level security;
alter table orders enable row level security;

-- سياسات مبسّطة لمرحلة التجربة الأولى: قراءة وكتابة عامة لأي حدا معه رابط الموقع
-- (لاحقًا لما التطبيق يكبر، هاي أول نقطة لازم نرجع نشددها بتسجيل دخول حقيقي)
create policy "public read houses" on houses for select using (true);
create policy "public insert houses" on houses for insert with check (true);

create policy "public read items" on items for select using (true);
create policy "public insert items" on items for insert with check (true);

create policy "public read orders" on orders for select using (true);
create policy "public insert orders" on orders for insert with check (true);
create policy "public update orders" on orders for update using (true);
