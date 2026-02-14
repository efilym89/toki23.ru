-- Supabase schema for ТОКИ23 clone CRM
-- Run in SQL Editor after creating a project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  name text,
  role text not null default 'admin' check (role in ('admin', 'manager', 'cashier')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 999,
  is_active boolean not null default true,
  cover_image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  category_code text not null references public.categories(code) on update cascade,
  price integer not null check (price >= 0),
  old_price integer,
  weight integer,
  calories integer,
  volume integer,
  image_url text,
  images jsonb not null default '[]'::jsonb,
  media jsonb not null default '[]'::jsonb,
  is_available boolean not null default true,
  sort_order integer not null default 999,
  tags jsonb not null default '[]'::jsonb,
  modifications jsonb not null default '[]'::jsonb,
  topping_groups jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  status text not null default 'new' check (status in ('new', 'in_progress', 'ready', 'completed', 'canceled')),
  total integer not null default 0,
  customer_name text not null,
  phone text not null,
  comment text,
  method text not null check (method in ('pickup', 'delivery')),
  address text,
  is_paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid,
  qty integer not null check (qty > 0),
  price_at_order_time integer not null check (price_at_order_time >= 0),
  name_snapshot text not null,
  image_snapshot text,
  modifiers jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.action_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id text,
  user_login text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_category_code on public.products(category_code);
create index if not exists idx_products_sort_order on public.products(sort_order);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_action_logs_created_at on public.action_logs(created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger trg_settings_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.action_logs enable row level security;

-- Public read access for storefront data
create policy "public read settings" on public.settings
for select using (true);

create policy "public read categories" on public.categories
for select using (is_active = true);

create policy "public read products" on public.products
for select using (true);

-- Public order creation
create policy "public insert orders" on public.orders
for insert with check (true);

create policy "public insert order_items" on public.order_items
for insert with check (true);

-- Admin full access
create policy "admin manage profiles" on public.profiles
for all using (public.is_admin()) with check (public.is_admin());

create policy "admin manage settings" on public.settings
for all using (public.is_admin()) with check (public.is_admin());

create policy "admin manage categories" on public.categories
for all using (public.is_admin()) with check (public.is_admin());

create policy "admin manage products" on public.products
for all using (public.is_admin()) with check (public.is_admin());

create policy "admin manage orders" on public.orders
for all using (public.is_admin()) with check (public.is_admin());

create policy "admin manage order_items" on public.order_items
for all using (public.is_admin()) with check (public.is_admin());

create policy "admin manage action_logs" on public.action_logs
for all using (public.is_admin()) with check (public.is_admin());

-- Helper function to seed first admin profile after creating auth user.
create or replace function public.make_me_admin(admin_name text default 'Admin')
returns void
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, name, role)
  values (auth.uid(), auth.email(), admin_name, 'admin')
  on conflict (id) do update set
    role = 'admin',
    name = excluded.name,
    email = excluded.email;
end;
$$;
