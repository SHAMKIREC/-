insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('merchant-media','merchant-media',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy merchant_media_read on storage.objects for select to anon,authenticated using(bucket_id='merchant-media');
create policy merchant_media_insert on storage.objects for insert to authenticated with check(bucket_id='merchant-media' and exists(select 1 from public.merchants m where m.id::text=(storage.foldername(name))[1] and (m.owner_id=auth.uid() or public.has_role('admin'))));
-- Files are immutable. Replacement uploads get a new UUID; no overwriting another image.
create function public.log_admin_mutation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if public.has_role('admin') then
  insert into public.admin_events(actor_id,action,entity_id) values(auth.uid(),tg_table_name||':'||tg_op,coalesce(new.id,old.id));
 end if;
 return coalesce(new,old);
end $$;
revoke all on function public.log_admin_mutation() from public,anon,authenticated;
create trigger merchant_audit after update on public.merchants for each row execute function public.log_admin_mutation();
create trigger product_audit after insert or update or delete on public.products for each row execute function public.log_admin_mutation();
create trigger support_audit after update on public.support_tickets for each row execute function public.log_admin_mutation();
