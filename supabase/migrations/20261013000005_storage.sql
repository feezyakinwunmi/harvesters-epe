-- ============================================================
-- 0005 STORAGE — buckets and object policies
--
-- church-public-media   PUBLIC bucket for approved, published media only.
--                       Objects are served by public URL; CHANGED: anonymous
--                       users can no longer LIST the bucket (the starter
--                       schema's select policy allowed that).
-- member-avatars        PRIVATE. <auth_uid>/<file>. Served via signed URLs.
-- church-private-files  PRIVATE. Pastoral / super admins only.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('church-public-media', 'church-public-media', true, 15728640,
   array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm']),
  ('member-avatars', 'member-avatars', false, 5242880,
   array['image/jpeg','image/png','image/webp']),
  ('church-private-files', 'church-private-files', false, 10485760,
   array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Remove starter-schema policies by name if present.
drop policy if exists "church_public_media_read" on storage.objects;
drop policy if exists "church_public_media_upload" on storage.objects;
drop policy if exists "church_public_media_update" on storage.objects;
drop policy if exists "church_public_media_delete" on storage.objects;
drop policy if exists "member_avatars_read" on storage.objects;
drop policy if exists "member_avatars_insert" on storage.objects;
drop policy if exists "member_avatars_update" on storage.objects;
drop policy if exists "member_avatars_delete" on storage.objects;
drop policy if exists "church_private_files_admin_all" on storage.objects;

-- PUBLIC MEDIA ---------------------------------------------------
-- Uploads must live under content/ or recognitions/.
drop policy if exists "hc_public_media_select" on storage.objects;
create policy "hc_public_media_select" on storage.objects
for select to authenticated
using (bucket_id = 'church-public-media' and (select private.can_manage_content()));

drop policy if exists "hc_public_media_insert" on storage.objects;
create policy "hc_public_media_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'church-public-media'
  and (storage.foldername(name))[1] in ('content', 'recognitions')
  and (select private.can_manage_content())
);

drop policy if exists "hc_public_media_update" on storage.objects;
create policy "hc_public_media_update" on storage.objects
for update to authenticated
using (bucket_id = 'church-public-media' and (select private.can_manage_content()))
with check (
  bucket_id = 'church-public-media'
  and (storage.foldername(name))[1] in ('content', 'recognitions')
  and (select private.can_manage_content())
);

drop policy if exists "hc_public_media_delete" on storage.objects;
create policy "hc_public_media_delete" on storage.objects
for delete to authenticated
using (bucket_id = 'church-public-media' and (select private.can_manage_content()));

-- MEMBER AVATARS ------------------------------------------------
-- Read: the owner, and admins who may look up members (not content admins).
drop policy if exists "hc_avatars_select" on storage.objects;
create policy "hc_avatars_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'member-avatars'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select private.can_view_members())
  )
);

-- Write: only into your own folder (pastoral/super may manage any).
drop policy if exists "hc_avatars_insert" on storage.objects;
create policy "hc_avatars_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'member-avatars'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_pastoral()))
);

drop policy if exists "hc_avatars_update" on storage.objects;
create policy "hc_avatars_update" on storage.objects
for update to authenticated
using (
  bucket_id = 'member-avatars'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_pastoral()))
)
with check (
  bucket_id = 'member-avatars'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_pastoral()))
);

drop policy if exists "hc_avatars_delete" on storage.objects;
create policy "hc_avatars_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'member-avatars'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_pastoral()))
);

-- PRIVATE CHURCH FILES -----------------------------------------
drop policy if exists "hc_private_files_all" on storage.objects;
create policy "hc_private_files_all" on storage.objects
for all to authenticated
using (bucket_id = 'church-private-files' and (select private.is_pastoral()))
with check (bucket_id = 'church-private-files' and (select private.is_pastoral()));
