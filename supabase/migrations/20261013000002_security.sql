-- ============================================================
-- 0002 SECURITY — role helpers, table privileges, RLS policies, views.
--
-- Principles
--  * Least privilege: anon/authenticated get only the table privileges
--    they need; every row is then filtered by RLS.
--  * Writes to members, member_private and attendance happen ONLY through
--    security-definer functions (0003) that re-check roles and whitelist
--    columns. There are no direct INSERT/UPDATE grants on those tables.
--  * Role matrix
--      super_admin       everything
--      attendance_admin  services, QR sessions, attendance, member lookup
--                        (no addresses / DOB / emergency contacts / pastoral)
--      pastoral_admin    members incl. private details, follow-up, contact log
--      content_admin     Today/media/news/events/recognitions only — no member PII
-- ============================================================

-- ----------------------------
-- ROLE HELPERS
-- ----------------------------
create or replace function private.has_admin_role(allowed_roles public.admin_role[] default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_roles ar
    where ar.user_id = (select auth.uid())
      and (allowed_roles is null or ar.role = any(allowed_roles))
  );
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.has_admin_role(null); $$;

create or replace function private.is_super_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.has_admin_role(array['super_admin']::public.admin_role[]); $$;

-- Name/contact lookup of members (not private details).
create or replace function private.can_view_members()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.has_admin_role(array['super_admin','pastoral_admin','attendance_admin']::public.admin_role[]); $$;

-- Address, date of birth, emergency contact, follow-up and contact logs.
create or replace function private.is_pastoral()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.has_admin_role(array['super_admin','pastoral_admin']::public.admin_role[]); $$;

create or replace function private.can_manage_attendance()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.has_admin_role(array['super_admin','attendance_admin']::public.admin_role[]); $$;

create or replace function private.can_manage_content()
returns boolean language sql stable security definer set search_path = ''
as $$ select private.has_admin_role(array['super_admin','content_admin']::public.admin_role[]); $$;

-- The non-deleted member row linked to the signed-in user, if any.
create or replace function private.current_member_id()
returns uuid language sql stable security definer set search_path = ''
as $$
  select m.id from public.members m
  where m.auth_user_id = (select auth.uid()) and m.deleted_at is null
  limit 1;
$$;

-- Is the caller's Supabase Auth session still present and younger than
-- 12 months? A revoked session (row deleted from auth.sessions) fails this
-- immediately even while its short-lived access token is still valid.
create or replace function private.session_is_trusted()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sid uuid;
  v_created timestamptz;
begin
  begin
    v_sid := nullif((select auth.jwt()) ->> 'session_id', '')::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  if v_sid is null then
    return false;
  end if;
  begin
    select s.created_at into v_created from auth.sessions s
    where s.id = v_sid and s.user_id = (select auth.uid());
  exception when insufficient_privilege or undefined_table then
    -- If the platform ever stops letting the function owner read
    -- auth.sessions, fall back to trusting the (still verified) JWT rather
    -- than blocking every Sunday check-in. Identity is unaffected; only the
    -- 12-month cap and instant revocation are skipped. See README.
    raise warning 'session_is_trusted: auth.sessions not readable; falling back to JWT trust';
    return true;
  end;
  if v_created is null then
    return false;
  end if;
  return v_created > now() - interval '365 days';
end;
$$;

do $$ declare f text; begin
  foreach f in array array[
    'private.has_admin_role(public.admin_role[])', 'private.is_admin()', 'private.is_super_admin()',
    'private.can_view_members()', 'private.is_pastoral()', 'private.can_manage_attendance()',
    'private.can_manage_content()', 'private.current_member_id()', 'private.session_is_trusted()'
  ] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated, service_role', f);
  end loop;
end $$;

-- ----------------------------
-- TABLE PRIVILEGES
-- Start from nothing, then grant precisely. RLS still applies on top.
-- ----------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Public website content
grant select on public.content_posts, public.member_recognitions, public.app_settings to anon;

-- Signed-in users: reads are RLS-filtered
grant select on
  public.members, public.member_private, public.admin_roles, public.services,
  public.attendance_sessions, public.attendance, public.follow_ups,
  public.member_contact_logs, public.content_posts, public.member_recognitions,
  public.audit_logs, public.app_settings
to authenticated;

-- Direct writes only where an RLS policy also allows them.
grant insert, update, delete on public.admin_roles to authenticated;
grant insert, update, delete on public.services to authenticated;
grant insert, update, delete on public.attendance_sessions to authenticated;
grant insert, update, delete on public.follow_ups to authenticated;
grant insert, update, delete on public.member_contact_logs to authenticated;
grant insert, update, delete on public.content_posts to authenticated;
grant insert, update, delete on public.member_recognitions to authenticated;
grant insert, update on public.app_settings to authenticated;
-- NOT granted: members / member_private / attendance writes (RPC only),
-- audit_logs writes (triggers only), recovery_codes (functions only).

-- ----------------------------
-- ENABLE RLS
-- ----------------------------
alter table public.members enable row level security;
alter table public.member_private enable row level security;
alter table public.admin_roles enable row level security;
alter table public.services enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance enable row level security;
alter table public.recovery_codes enable row level security;
alter table public.follow_ups enable row level security;
alter table public.member_contact_logs enable row level security;
alter table public.content_posts enable row level security;
alter table public.member_recognitions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;

-- Drop the starter schema's policies if this runs on a project that used it.
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- MEMBERS ------------------------------------------------------
create policy members_select on public.members
for select to authenticated
using (auth_user_id = (select auth.uid()) or (select private.can_view_members()));

-- MEMBER PRIVATE -----------------------------------------------
create policy member_private_select on public.member_private
for select to authenticated
using (member_id = (select private.current_member_id()) or (select private.is_pastoral()));

-- ADMIN ROLES --------------------------------------------------
-- Everyone can see their own roles (to render the right UI); only
-- super admins can see or change everyone's.
create policy admin_roles_select on public.admin_roles
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_super_admin()));

create policy admin_roles_insert on public.admin_roles
for insert to authenticated with check ((select private.is_super_admin()));

create policy admin_roles_update on public.admin_roles
for update to authenticated
using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

create policy admin_roles_delete on public.admin_roles
for delete to authenticated using ((select private.is_super_admin()));

-- SERVICES -----------------------------------------------------
create policy services_select on public.services
for select to authenticated
using ((deleted_at is null and status <> 'draft') or (select private.is_admin()));

create policy services_insert on public.services
for insert to authenticated with check ((select private.can_manage_attendance()));

create policy services_update on public.services
for update to authenticated
using ((select private.can_manage_attendance())) with check ((select private.can_manage_attendance()));

create policy services_delete on public.services
for delete to authenticated using ((select private.is_super_admin()));

-- ATTENDANCE SESSIONS ------------------------------------------
create policy attendance_sessions_select on public.attendance_sessions
for select to authenticated using ((select private.can_manage_attendance()));

create policy attendance_sessions_insert on public.attendance_sessions
for insert to authenticated with check ((select private.can_manage_attendance()));

create policy attendance_sessions_update on public.attendance_sessions
for update to authenticated
using ((select private.can_manage_attendance())) with check ((select private.can_manage_attendance()));

create policy attendance_sessions_delete on public.attendance_sessions
for delete to authenticated using ((select private.is_super_admin()));

-- ATTENDANCE (read-only through RLS; writes via RPC) ------------
create policy attendance_select on public.attendance
for select to authenticated
using (member_id = (select private.current_member_id()) or (select private.can_view_members()));

-- FOLLOW-UP & CONTACT LOG (pastoral only) -----------------------
create policy follow_ups_select on public.follow_ups
for select to authenticated using ((select private.is_pastoral()));
create policy follow_ups_insert on public.follow_ups
for insert to authenticated with check ((select private.is_pastoral()));
create policy follow_ups_update on public.follow_ups
for update to authenticated using ((select private.is_pastoral())) with check ((select private.is_pastoral()));
create policy follow_ups_delete on public.follow_ups
for delete to authenticated using ((select private.is_super_admin()));

create policy contact_logs_select on public.member_contact_logs
for select to authenticated using ((select private.is_pastoral()));
create policy contact_logs_insert on public.member_contact_logs
for insert to authenticated with check ((select private.is_pastoral()));
create policy contact_logs_update on public.member_contact_logs
for update to authenticated using ((select private.is_pastoral())) with check ((select private.is_pastoral()));
create policy contact_logs_delete on public.member_contact_logs
for delete to authenticated using ((select private.is_super_admin()));

-- CONTENT ------------------------------------------------------
create policy content_select on public.content_posts
for select to anon, authenticated
using (
  (status = 'published' and deleted_at is null and (published_at is null or published_at <= now()))
  or (select private.can_manage_content())
);
create policy content_insert on public.content_posts
for insert to authenticated with check ((select private.can_manage_content()));
create policy content_update on public.content_posts
for update to authenticated
using ((select private.can_manage_content())) with check ((select private.can_manage_content()));
create policy content_delete on public.content_posts
for delete to authenticated using ((select private.is_super_admin()));

-- RECOGNITIONS -------------------------------------------------
create policy recognitions_select on public.member_recognitions
for select to anon, authenticated
using (status = 'published' or (select private.can_manage_content()));
create policy recognitions_insert on public.member_recognitions
for insert to authenticated with check ((select private.can_manage_content()));
create policy recognitions_update on public.member_recognitions
for update to authenticated
using ((select private.can_manage_content())) with check ((select private.can_manage_content()));
create policy recognitions_delete on public.member_recognitions
for delete to authenticated using ((select private.can_manage_content()));

-- AUDIT LOG (no write policies; rows come from triggers) -------
create policy audit_logs_select on public.audit_logs
for select to authenticated
using ((select private.is_super_admin()) or (actor_user_id = (select auth.uid()) and (select private.is_admin())));

-- APP SETTINGS -------------------------------------------------
create policy app_settings_select on public.app_settings
for select to anon, authenticated
using (key in ('church','recognition_categories','check_in') or (select private.is_admin()));
create policy app_settings_insert on public.app_settings
for insert to authenticated with check ((select private.is_super_admin()));
create policy app_settings_update on public.app_settings
for update to authenticated
using ((select private.is_super_admin())) with check ((select private.is_super_admin()));

-- RECOVERY CODES: RLS on, no policies → no API access at all.

-- ----------------------------
-- VIEWS (security_invoker: the caller's RLS applies to every joined table)
-- ----------------------------
create or replace view public.attendance_report
with (security_invoker = on) as
select
  a.id,
  a.member_id,
  a.service_id,
  a.attendance_session_id,
  a.mode,
  a.method,
  a.checked_in_at,
  a.note,
  a.recorded_by,
  a.updated_at,
  m.member_number,
  m.first_name,
  m.last_name,
  m.preferred_name,
  m.phone,
  m.gender,
  m.membership_status,
  m.church_department,
  m.ministry_unit,
  s.title as service_title,
  s.service_type,
  s.starts_at as service_starts_at,
  not exists (
    select 1 from public.attendance earlier
    where earlier.member_id = a.member_id and earlier.checked_in_at < a.checked_in_at
  ) as is_first_attendance
from public.attendance a
join public.members m on m.id = a.member_id
join public.services s on s.id = a.service_id;

create or replace view public.admin_role_assignments
with (security_invoker = on) as
select
  ar.id,
  ar.user_id,
  ar.role,
  ar.granted_by,
  ar.created_at,
  m.id as member_id,
  m.first_name,
  m.last_name,
  m.email,
  m.member_number
from public.admin_roles ar
left join public.members m on m.auth_user_id = ar.user_id and m.deleted_at is null;

revoke all on public.attendance_report, public.admin_role_assignments from anon, authenticated;
grant select on public.attendance_report, public.admin_role_assignments to authenticated;
grant select on public.attendance_report, public.admin_role_assignments to service_role;
