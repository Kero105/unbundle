-- Storage policies for the private `bills` bucket.
-- Objects must live under a folder named for the owner's user id:
--   bills/<user_id>/<...>
-- Authenticated users can only select, insert, and delete their own objects.
-- No update policy: objects are immutable; replace by delete + insert.

create policy bills_objects_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'bills'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy bills_objects_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'bills'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy bills_objects_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'bills'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
