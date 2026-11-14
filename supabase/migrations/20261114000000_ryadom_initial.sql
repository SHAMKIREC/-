-- Рядом: начальная схема PostgreSQL/Supabase. Применять после проверки в отдельном проекте.
create extension if not exists pgcrypto;
create type public.app_role as enum ('customer','merchant','courier','dispatcher','admin');
create type public.order_state as enum ('new','accepted','preparing','ready','assigned','picked_up','delivered','cancelled');
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '',
 phone text,
 created_at timestamptz not null default now()
);
create table public.user_roles (
 user_id uuid not null references auth.users(id) on delete cascade,
 role public.app_role not null,
 primary key(user_id,role)
);
create table public.merchants (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 2 and 120),
 address text not null,
 description text not null default '',
 owner_id uuid not null references auth.users(id),
 approved boolean not null default false,
 active boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.products (
 id uuid primary key default gen_random_uuid(),
 merchant_id uuid not null references public.merchants(id) on delete cascade,
 name text not null check(length(trim(name)) between 2 and 150),
 description text not null default '',
 image_url text,
 price_kopecks integer not null check(price_kopecks >= 0),
 available boolean not null default true,
 created_at timestamptz not null default now(),
 unique(id,merchant_id)
);
create table public.orders (
 id uuid primary key default gen_random_uuid(),
 customer_id uuid not null references auth.users(id),
 merchant_id uuid not null references public.merchants(id),
 courier_id uuid references auth.users(id),
 state public.order_state not null default 'new',
 fulfillment text not null check(fulfillment in ('pickup','delivery')),
 delivery_address text,
 subtotal_kopecks integer not null check(subtotal_kopecks >= 0),
 delivery_kopecks integer not null default 0 check(delivery_kopecks >= 0),
 created_at timestamptz not null default now(),
 check(fulfillment='pickup' or nullif(trim(delivery_address),'') is not null)
);
create table public.order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 merchant_id uuid not null,
 product_id uuid not null,
 quantity integer not null check(quantity between 1 and 99),
 unit_price_kopecks integer not null check(unit_price_kopecks >= 0),
 foreign key(product_id,merchant_id) references public.products(id,merchant_id)
);
create table public.order_events (
 id bigint generated always as identity primary key,
 order_id uuid not null references public.orders(id) on delete cascade,
 actor_id uuid references auth.users(id),
 state public.order_state not null,
 created_at timestamptz not null default now()
);
create function public.has_role(r public.app_role) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role=r)
$$;
create function public.owns_merchant(mid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.merchants where id=mid and owner_id=(select auth.uid()))
$$;
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.merchants enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
create policy profile_self on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profile_update_self on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy roles_self on public.user_roles for select to authenticated using(user_id=(select auth.uid()));
create policy merchant_public on public.merchants for select to anon,authenticated using(approved and active);
create policy merchant_owner_read on public.merchants for select to authenticated using(owner_id=(select auth.uid()) or public.has_role('admin'));
create policy merchant_owner_update on public.merchants for update to authenticated using(owner_id=(select auth.uid()) or public.has_role('admin')) with check(owner_id=(select auth.uid()) or public.has_role('admin'));
create policy product_public on public.products for select to anon,authenticated using(available and exists(select 1 from public.merchants m where m.id=merchant_id and m.approved and m.active));
create policy product_owner_read on public.products for select to authenticated using(public.owns_merchant(merchant_id) or public.has_role('admin'));
create policy product_owner_insert on public.products for insert to authenticated with check(public.owns_merchant(merchant_id) or public.has_role('admin'));
create policy product_owner_update on public.products for update to authenticated using(public.owns_merchant(merchant_id) or public.has_role('admin')) with check(public.owns_merchant(merchant_id) or public.has_role('admin'));
create policy product_owner_delete on public.products for delete to authenticated using(public.owns_merchant(merchant_id) or public.has_role('admin'));
create policy order_read on public.orders for select to authenticated using(customer_id=(select auth.uid()) or courier_id=(select auth.uid()) or public.owns_merchant(merchant_id) or public.has_role('dispatcher') or public.has_role('admin'));
create policy item_read on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.customer_id=(select auth.uid()) or o.courier_id=(select auth.uid()) or public.owns_merchant(o.merchant_id) or public.has_role('dispatcher') or public.has_role('admin'))));
create policy events_read on public.order_events for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (o.customer_id=(select auth.uid()) or o.courier_id=(select auth.uid()) or public.owns_merchant(o.merchant_id) or public.has_role('dispatcher') or public.has_role('admin'))));
-- Намеренно нет клиентских INSERT/UPDATE для заказов, ролей и событий:
-- оформление и смена статуса только через серверные функции с проверкой
-- цены, наличия, принадлежности товаров заведению и разрешённых переходов.
-- Никогда не выдавать service_role ключ браузеру.
