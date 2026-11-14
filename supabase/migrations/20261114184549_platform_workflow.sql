-- Additive upgrade for the existing Ryadom database. No real data is seeded.
alter table public.merchants add column if not exists category text not null default 'Еда';
alter table public.merchants add column if not exists image_url text;
alter table public.merchants add column if not exists hours text not null default '';
alter table public.merchants add column if not exists latitude double precision check(latitude between -90 and 90);
alter table public.merchants add column if not exists longitude double precision check(longitude between -180 and 180);
alter table public.merchants add column if not exists accepts_orders boolean not null default false;
alter table public.merchants add column if not exists pickup_enabled boolean not null default true;
alter table public.merchants add column if not exists delivery_enabled boolean not null default false;
alter table public.merchants add column if not exists cash_enabled boolean not null default false;
alter table public.merchants add column if not exists delivery_kopecks integer not null default 11900 check(delivery_kopecks between 0 and 1000000);
alter table public.products add column if not exists category text not null default 'Меню';
alter table public.orders add column if not exists comment text not null default '';
alter table public.orders add column if not exists cancellation_reason text;
alter table public.order_items add column if not exists product_name text not null default '';
alter table public.order_events add column if not exists note text;
create table public.courier_applications(user_id uuid primary key references auth.users(id),phone text not null,transport text not null,status text not null default 'pending' check(status in ('pending','approved','rejected')),online boolean not null default false,created_at timestamptz not null default now());
create table public.customer_addresses(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id),address text not null check(length(address) between 8 and 500));
create table public.favorites(user_id uuid not null default auth.uid() references auth.users(id),merchant_id uuid not null references public.merchants(id),primary key(user_id,merchant_id));
create table public.support_tickets(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users(id),message text not null check(length(message) between 5 and 3000),reply text,status text not null default 'open' check(status in ('open','closed')),created_at timestamptz not null default now());
create table public.admin_events(id bigint generated always as identity primary key,actor_id uuid default auth.uid(),action text not null,entity_id uuid,detail text,created_at timestamptz not null default now());
alter table public.courier_applications enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.favorites enable row level security;
alter table public.support_tickets enable row level security;
alter table public.admin_events enable row level security;
create policy courier_read on public.courier_applications for select to authenticated using(user_id=auth.uid() or public.has_role('admin') or public.has_role('dispatcher'));
create policy address_self on public.customer_addresses for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy favorite_self on public.favorites for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy support_read on public.support_tickets for select to authenticated using(user_id=auth.uid() or public.has_role('admin'));
create policy support_create on public.support_tickets for insert to authenticated with check(user_id=auth.uid() and reply is null and status='open');
create policy support_reply on public.support_tickets for update to authenticated using(public.has_role('admin')) with check(public.has_role('admin'));
create policy audit_read on public.admin_events for select to authenticated using(public.has_role('admin'));
create policy admin_profiles on public.profiles for select to authenticated using(public.has_role('admin'));
create policy admin_roles on public.user_roles for select to authenticated using(public.has_role('admin') or public.has_role('dispatcher'));
create index if not exists orders_customer_idx on public.orders(customer_id,created_at desc);
create index if not exists orders_merchant_idx on public.orders(merchant_id,state);
create index if not exists orders_courier_idx on public.orders(courier_id,state);
create index if not exists products_merchant_idx on public.products(merchant_id);
create index if not exists events_order_idx on public.order_events(order_id,created_at);

create or replace function public.initialize_user_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',''),80)) on conflict do nothing;
 insert into public.user_roles(user_id,role) values(new.id,'customer') on conflict do nothing;
 return new;
end $$;
drop trigger if exists auth_user_profile_created on auth.users;
create trigger auth_user_profile_created after insert on auth.users for each row execute function public.initialize_user_profile();
create or replace function public.prevent_merchant_privilege_escalation() returns trigger language plpgsql set search_path='' as $$
begin
 if (new.approved is distinct from old.approved or new.active is distinct from old.active or new.owner_id is distinct from old.owner_id) and not public.has_role('admin') then raise exception 'Только администратор может изменить одобрение'; end if;
 return new;
end $$;
drop trigger if exists merchant_approval_guard on public.merchants;
create trigger merchant_approval_guard before update on public.merchants for each row execute function public.prevent_merchant_privilege_escalation();

create or replace function public.request_merchant(p_name text,p_address text,p_description text default '') returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception 'Войдите в аккаунт'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,1));
 if length(trim(coalesce(p_name,''))) not between 2 and 120 or length(trim(coalesce(p_address,''))) not between 5 and 300 then raise exception 'Проверьте название и адрес'; end if;
 if (select count(*) from public.merchants where owner_id=v_user and created_at>now()-interval '1 day')>=3 then raise exception 'Лимит заявок на сегодня'; end if;
 insert into public.merchants(name,address,description,owner_id) values(trim(p_name),trim(p_address),left(coalesce(p_description,''),1000),v_user) returning id into v_id;
 insert into public.user_roles values(v_user,'merchant') on conflict do nothing;
 return v_id;
end $$;

-- Prices and availability are locked in the same transaction as order creation.
create or replace function public.place_order(p_merchant uuid,p_lines jsonb,p_fulfillment text,p_address text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_id uuid; m public.merchants%rowtype; p public.products%rowtype; x jsonb; q integer; subtotal bigint:=0;
begin
 if v_user is null then raise exception 'Войдите в аккаунт'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,2));
 if (select count(*) from public.orders where customer_id=v_user and created_at>now()-interval '1 minute')>=3 then raise exception 'Слишком много заказов. Подождите минуту'; end if;
 if p_fulfillment is null or p_fulfillment not in ('pickup','delivery') then raise exception 'Укажите способ получения'; end if;
 if p_fulfillment='delivery' and length(trim(coalesce(p_address,''))) not between 8 and 500 then raise exception 'Укажите адрес доставки'; end if;
 if jsonb_typeof(p_lines) is distinct from 'array' then raise exception 'Некорректная корзина'; end if;
 if jsonb_array_length(p_lines) not between 1 and 30 then raise exception 'В корзине должно быть от 1 до 30 позиций'; end if;
 if exists(select 1 from jsonb_array_elements(p_lines) v group by v->>'product_id' having count(*)>1) then raise exception 'Повтор товара в корзине'; end if;
 select * into m from public.merchants where id=p_merchant for share;
 if not found or not m.approved or not m.active or not m.accepts_orders or not m.cash_enabled then raise exception 'Заведение сейчас не принимает заказы'; end if;
 if (p_fulfillment='pickup' and not m.pickup_enabled) or (p_fulfillment='delivery' and not m.delivery_enabled) then raise exception 'Способ получения недоступен'; end if;
 -- Consistent lock order avoids deadlocks for concurrent baskets.
 perform 1 from public.products where id in (select (v->>'product_id')::uuid from jsonb_array_elements(p_lines) v) order by id for share;
 for x in select value from jsonb_array_elements(p_lines) loop
  if coalesce(x->>'quantity','') !~ '^[0-9]{1,2}$' then raise exception 'Некорректное количество'; end if;
  q:=(x->>'quantity')::integer;
  if q not between 1 and 99 then raise exception 'Некорректное количество'; end if;
  select * into p from public.products where id=(x->>'product_id')::uuid and merchant_id=p_merchant and available;
  if not found then raise exception 'Товар недоступен'; end if;
  subtotal:=subtotal+p.price_kopecks::bigint*q;
 end loop;
 if subtotal>100000000 then raise exception 'Превышена сумма заказа'; end if;
 insert into public.orders(customer_id,merchant_id,fulfillment,delivery_address,subtotal_kopecks,delivery_kopecks) values(v_user,p_merchant,p_fulfillment,case when p_fulfillment='delivery' then trim(p_address) end,subtotal::integer,case when p_fulfillment='delivery' then m.delivery_kopecks else 0 end) returning id into v_id;
 for x in select value from jsonb_array_elements(p_lines) loop
  select * into p from public.products where id=(x->>'product_id')::uuid;
  insert into public.order_items(order_id,merchant_id,product_id,quantity,unit_price_kopecks,product_name) values(v_id,p_merchant,p.id,(x->>'quantity')::integer,p.price_kopecks,p.name);
 end loop;
 insert into public.order_events(order_id,actor_id,state) values(v_id,v_user,'new');
 return v_id;
end $$;
create function public.set_order_comment(p_order uuid,p_comment text) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.orders set comment=left(coalesce(p_comment,''),1000) where id=p_order and customer_id=auth.uid() and state='new';
 if not found then raise exception 'Комментарий недоступен'; end if;
end $$;
create or replace function public.transition_order(p_order uuid,p_next public.order_state) returns void language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype; u uuid:=auth.uid(); owner boolean; staff boolean;
begin
 if u is null or p_next is null then raise exception 'Нет доступа'; end if;
 select * into o from public.orders where id=p_order for update;
 if not found then raise exception 'Заказ не найден'; end if;
 owner:=public.owns_merchant(o.merchant_id); staff:=public.has_role('admin') or public.has_role('dispatcher');
 if p_next='accepted' and o.state='new' and (owner or staff) then null;
 elsif p_next='preparing' and o.state='accepted' and (owner or staff) then null;
 elsif p_next='ready' and o.state='preparing' and (owner or staff) then null;
 elsif p_next='picked_up' and o.state='assigned' and u=o.courier_id and public.has_role('courier') then null;
 elsif p_next='delivered' and o.state='picked_up' and u=o.courier_id and public.has_role('courier') then null;
 elsif p_next='delivered' and o.state='ready' and o.fulfillment='pickup' and (owner or staff) then null;
 else raise exception 'Недопустимый переход статуса'; end if;
 update public.orders set state=p_next where id=p_order;
 insert into public.order_events(order_id,actor_id,state) values(p_order,u,p_next);
end $$;
create function public.cancel_order(p_order uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare o public.orders%rowtype;
begin
 if auth.uid() is null or length(trim(coalesce(p_reason,'')))<3 then raise exception 'Укажите причину отмены'; end if;
 select * into o from public.orders where id=p_order for update;
 if not found or o.state not in ('new','accepted') or not (o.customer_id=auth.uid() or public.owns_merchant(o.merchant_id) or public.has_role('admin') or public.has_role('dispatcher')) then raise exception 'Отмена недоступна'; end if;
 update public.orders set state='cancelled',cancellation_reason=left(trim(p_reason),500) where id=p_order;
 insert into public.order_events(order_id,actor_id,state,note) values(p_order,auth.uid(),'cancelled',left(trim(p_reason),500));
end $$;
create function public.apply_courier(p_phone text,p_transport text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or length(trim(coalesce(p_phone,''))) not between 7 and 30 or p_transport not in ('Пешком','Велосипед','Автомобиль') then raise exception 'Проверьте телефон и транспорт'; end if;
 insert into public.courier_applications(user_id,phone,transport) values(auth.uid(),trim(p_phone),p_transport) on conflict(user_id) do update set phone=excluded.phone,transport=excluded.transport;
end $$;
create function public.set_courier_online(p_online boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.has_role('courier') then raise exception 'Нет доступа'; end if;
 update public.courier_applications set online=coalesce(p_online,false) where user_id=auth.uid() and status='approved';
end $$;
-- Only minimal, non-personal information is exposed before acceptance.
create function public.available_deliveries() returns table(id uuid,merchant_name text,pickup_address text,delivery_kopecks integer) language plpgsql security definer set search_path='' as $$
begin
 if not public.has_role('courier') then raise exception 'Нет доступа'; end if;
 return query select o.id,m.name,m.address,o.delivery_kopecks from public.orders o join public.merchants m on m.id=o.merchant_id where o.state='ready' and o.fulfillment='delivery' and o.courier_id is null and exists(select 1 from public.courier_applications c where c.user_id=auth.uid() and c.status='approved' and c.online);
end $$;
create function public.claim_delivery(p_order uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.has_role('courier') or not exists(select 1 from public.courier_applications where user_id=auth.uid() and status='approved' and online) then raise exception 'Выйдите на линию'; end if;
 update public.orders set courier_id=auth.uid(),state='assigned' where id=p_order and fulfillment='delivery' and state='ready' and courier_id is null;
 if not found then raise exception 'Заказ уже принят другим курьером'; end if;
 insert into public.order_events(order_id,actor_id,state) values(p_order,auth.uid(),'assigned');
end $$;
create function public.review_application(p_id uuid,p_kind text,p_approve boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.has_role('admin') then raise exception 'Нет доступа'; end if;
 if p_kind='merchant' then
  update public.merchants set approved=p_approve,active=p_approve where id=p_id;
 elsif p_kind='courier' then
  update public.courier_applications set status=case when p_approve then 'approved' else 'rejected' end,online=false where user_id=p_id;
  if not found then raise exception 'Заявка не найдена'; end if;
  if p_approve then insert into public.user_roles values(p_id,'courier') on conflict do nothing;
  else delete from public.user_roles where user_id=p_id and role='courier'; end if;
 else raise exception 'Неизвестный тип заявки'; end if;
 insert into public.admin_events(action,entity_id,detail) values('review_'||p_kind,p_id,p_approve::text);
end $$;

-- Explicit grants: RLS still determines row access.
CREATE OR REPLACE FUNCTION public.assign_courier(p_order uuid, p_courier uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_order public.orders%rowtype;
begin
 if auth.uid() is null or not (public.has_role('dispatcher') or public.has_role('admin')) then raise exception 'Forbidden'; end if;
 if not exists(select 1 from public.user_roles where user_id=p_courier and role='courier') then raise exception 'Not an approved courier'; end if;
 select * into v_order from public.orders where id=p_order for update;
 if not found or v_order.state<>'ready' or v_order.fulfillment<>'delivery' then raise exception 'Order not ready for delivery'; end if;
 update public.orders set courier_id=p_courier,state='assigned' where id=p_order;
 insert into public.order_events(order_id,actor_id,state) values(p_order,auth.uid(),'assigned');
end $function$
;
grant select on public.merchants,public.products to anon,authenticated;
grant select on public.profiles,public.user_roles,public.orders,public.order_items,public.order_events,public.courier_applications,public.admin_events to authenticated;
grant update on public.profiles,public.merchants to authenticated;
grant insert,update,delete on public.products to authenticated;
grant select,insert,update,delete on public.customer_addresses,public.favorites to authenticated;
grant select,insert,update on public.support_tickets to authenticated;
revoke all on function public.initialize_user_profile(),public.prevent_merchant_privilege_escalation() from public,anon,authenticated;
revoke execute on function public.place_order(uuid,jsonb,text,text),public.request_merchant(text,text,text),public.transition_order(uuid,public.order_state),public.assign_courier(uuid,uuid),public.has_role(public.app_role),public.owns_merchant(uuid),public.set_order_comment(uuid,text),public.cancel_order(uuid,text),public.apply_courier(text,text),public.set_courier_online(boolean),public.available_deliveries(),public.claim_delivery(uuid),public.review_application(uuid,text,boolean) from public,anon;
grant execute on function public.place_order(uuid,jsonb,text,text),public.request_merchant(text,text,text),public.transition_order(uuid,public.order_state),public.assign_courier(uuid,uuid),public.has_role(public.app_role),public.owns_merchant(uuid),public.set_order_comment(uuid,text),public.cancel_order(uuid,text),public.apply_courier(text,text),public.set_courier_online(boolean),public.available_deliveries(),public.claim_delivery(uuid),public.review_application(uuid,text,boolean) to authenticated;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='orders') then alter publication supabase_realtime add table public.orders; end if;
end $$;
