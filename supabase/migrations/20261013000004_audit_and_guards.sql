-- ============================================================
-- 0004 AUDIT TRIGGERS & BUSINESS GUARDS
--
-- Audit rows are written by triggers (not by the app), stamped with
-- auth.uid(), and are immutable: no role — not even service_role through
-- the API — can update or delete them.
-- Values are NOT copied into the log (to avoid duplicating personal data);
-- only changed column names, ids and a few safe descriptors.
-- ============================================================

create or replace function private.audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_old jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  v_new jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  v_changed text[];
  v_action text;
  v_meta jsonb := '{}'::jsonb;
  v_summary text;
  v_entity uuid;
  v_reason text := nullif(current_setting('app.audit_reason', true), '');
  v_is_admin boolean := private.is_admin();
begin
  -- Self-service activity by ordinary members is not admin activity.
  if tg_table_name in ('members', 'member_private') and not v_is_admin and v_actor is not null then
    return null;
  end if;
  -- (row fields are read via jsonb because NEW's shape differs per table)
  if tg_table_name = 'attendance' and tg_op = 'INSERT'
     and (v_new ->> 'method') in ('qr', 'online')
     and (v_new ->> 'recorded_by') is not distinct from v_actor::text then
    return null;
  end if;
  -- check_in() auto-promotes first_timer -> visitor; that is system, not admin.
  if tg_table_name = 'members' and not v_is_admin then
    return null;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(k order by k), '{}') into v_changed
    from jsonb_object_keys(v_new) k
    where k not in ('updated_at', 'updated_by') and v_new -> k is distinct from v_old -> k;
    if cardinality(v_changed) = 0 then
      return null;
    end if;
    v_meta := v_meta || jsonb_build_object('changed', to_jsonb(v_changed));
  end if;

  v_action := tg_table_name || '.' || lower(tg_op);
  v_entity := nullif(coalesce(v_row ->> 'id', v_row ->> 'member_id'), '')::uuid;

  case tg_table_name
    when 'admin_roles' then
      v_meta := v_meta || jsonb_build_object('role', v_row ->> 'role', 'user_id', v_row ->> 'user_id');
      v_action := case tg_op when 'INSERT' then 'roles.grant' when 'DELETE' then 'roles.revoke' else 'roles.update' end;
      v_summary := format('%s role %s', case tg_op when 'INSERT' then 'Granted' when 'DELETE' then 'Revoked' else 'Changed' end, v_row ->> 'role');
    when 'attendance' then
      v_meta := v_meta || jsonb_build_object(
        'member_id', v_row ->> 'member_id', 'service_id', v_row ->> 'service_id',
        'mode', v_row ->> 'mode', 'method', v_row ->> 'method',
        'previous_mode', v_old ->> 'mode', 'previous_checked_in_at', v_old ->> 'checked_in_at');
      v_summary := case tg_op
        when 'INSERT' then format('Recorded %s attendance (%s)', v_row ->> 'mode', v_row ->> 'method')
        when 'UPDATE' then 'Corrected attendance record'
        else 'Removed attendance record' end;
    when 'services' then
      v_meta := v_meta || jsonb_build_object('title', v_row ->> 'title', 'status', v_row ->> 'status');
      v_summary := format('%s service "%s"', initcap(lower(tg_op)) || 'd', v_row ->> 'title');
    when 'attendance_sessions' then
      v_meta := v_meta || jsonb_build_object('service_id', v_row ->> 'service_id', 'label', v_row ->> 'label', 'is_enabled', v_row ->> 'is_enabled');
      v_summary := format('%s attendance session "%s"', initcap(lower(tg_op)) || 'd', v_row ->> 'label');
    when 'content_posts' then
      v_meta := v_meta || jsonb_build_object('content_type', v_row ->> 'content_type', 'status', v_row ->> 'status', 'title', v_row ->> 'title');
      if tg_op = 'UPDATE' and (v_old ->> 'status') is distinct from (v_new ->> 'status') then
        v_action := 'content_posts.' || (v_new ->> 'status');
      end if;
      v_summary := format('%s %s "%s"', initcap(lower(tg_op)) || 'd', replace(v_row ->> 'content_type', '_', ' '), v_row ->> 'title');
    when 'member_recognitions' then
      v_meta := v_meta || jsonb_build_object('title', v_row ->> 'recognition_title', 'status', v_row ->> 'status');
      v_summary := format('%s recognition "%s"', initcap(lower(tg_op)) || 'd', v_row ->> 'recognition_title');
    when 'members' then
      v_summary := case
        when tg_op = 'UPDATE' and (v_old ->> 'deleted_at') is null and (v_new ->> 'deleted_at') is not null then 'Archived member'
        when tg_op = 'UPDATE' and (v_old ->> 'deleted_at') is not null and (v_new ->> 'deleted_at') is null then 'Restored member'
        else initcap(lower(tg_op)) || 'd member profile' end;
      v_meta := v_meta || jsonb_build_object('member_number', v_row ->> 'member_number');
    when 'member_private' then
      v_summary := 'Changed private member details';
    when 'follow_ups' then
      v_meta := v_meta || jsonb_build_object('member_id', v_row ->> 'member_id', 'status', v_row ->> 'status');
      v_summary := format('%s follow-up', initcap(lower(tg_op)) || 'd');
    when 'member_contact_logs' then
      v_meta := v_meta || jsonb_build_object('member_id', v_row ->> 'member_id', 'channel', v_row ->> 'channel');
      v_summary := format('%s contact log', initcap(lower(tg_op)) || 'd');
    when 'app_settings' then
      v_entity := null;
      v_meta := v_meta || jsonb_build_object('key', v_row ->> 'key');
      v_summary := format('Changed setting "%s"', v_row ->> 'key');
    else
      v_summary := tg_table_name || ' ' || lower(tg_op);
  end case;

  if v_reason is not null then
    v_meta := v_meta || jsonb_build_object('reason', v_reason);
  end if;

  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, summary, metadata)
  values (v_actor, v_action, tg_table_name, v_entity, v_summary, v_meta);
  return null;
end;
$$;

revoke all on function private.audit_change() from public, anon, authenticated;

do $$ declare t text; begin
  foreach t in array array[
    'admin_roles','attendance','services','attendance_sessions','content_posts',
    'member_recognitions','members','member_private','follow_ups','member_contact_logs','app_settings'
  ] loop
    execute format('drop trigger if exists audit_change on public.%I', t);
    execute format(
      'create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()', t
    );
  end loop;
end $$;

-- Immutable audit log -------------------------------------------
create or replace function private.audit_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Audit log entries cannot be changed or deleted' using errcode = '42501';
end;
$$;

drop trigger if exists audit_logs_no_update on public.audit_logs;
create trigger audit_logs_no_update before update or delete on public.audit_logs
for each row execute function private.audit_logs_immutable();
drop trigger if exists audit_logs_no_truncate on public.audit_logs;
create trigger audit_logs_no_truncate before truncate on public.audit_logs
for each statement execute function private.audit_logs_immutable();

-- Admin role guards ---------------------------------------------
create or replace function private.admin_roles_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.granted_by := coalesce(auth.uid(), new.granted_by);
    return new;
  end if;
  -- UPDATE or DELETE of a super_admin row: never leave the system without one.
  if old.role = 'super_admin'
     and (tg_op = 'DELETE' or new.role <> 'super_admin' or new.user_id <> old.user_id)
     and not exists (
       select 1 from public.admin_roles
       where role = 'super_admin' and id <> old.id
     ) then
    raise exception 'Cannot remove the last super admin' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists admin_roles_guard on public.admin_roles;
create trigger admin_roles_guard before insert or update or delete on public.admin_roles
for each row execute function private.admin_roles_guard();

-- Content publishing guards --------------------------------------
create or replace function private.content_publish_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' then
    if new.content_type in ('service_photo', 'service_video', 'highlight')
       and (coalesce(cardinality(new.media_paths), 0) > 0 or new.cover_image_path is not null)
       and not new.people_consent_confirmed then
      raise exception 'Confirm that people shown have consented before publishing photos or videos'
        using errcode = '23514';
    end if;
    if new.published_at is null then
      new.published_at := now();
    end if;
  end if;
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  end if;
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists content_publish_guard on public.content_posts;
create trigger content_publish_guard before insert or update on public.content_posts
for each row execute function private.content_publish_guard();

-- Recognitions require the member's consent to public photos/recognition.
create or replace function private.recognition_consent_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' and new.member_id is not null
     and not exists (
       select 1 from public.members m
       where m.id = new.member_id and m.photo_consent and m.deleted_at is null
     ) then
    raise exception 'This member has not consented to public recognition' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  end if;
  return new;
end;
$$;

drop trigger if exists recognition_consent_guard on public.member_recognitions;
create trigger recognition_consent_guard before insert or update on public.member_recognitions
for each row execute function private.recognition_consent_guard();

-- Stamp creators on services / sessions / follow-ups / contact logs.
create or replace function private.stamp_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by := coalesce(auth.uid(), new.created_by);
  return new;
end;
$$;

do $$ declare t text; begin
  foreach t in array array['services','attendance_sessions','follow_ups'] loop
    execute format('drop trigger if exists stamp_created_by on public.%I', t);
    execute format('create trigger stamp_created_by before insert on public.%I for each row execute function private.stamp_created_by()', t);
  end loop;
end $$;

create or replace function private.stamp_contacted_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.contacted_by := coalesce(new.contacted_by, auth.uid());
  return new;
end;
$$;
drop trigger if exists stamp_contacted_by on public.member_contact_logs;
create trigger stamp_contacted_by before insert on public.member_contact_logs
for each row execute function private.stamp_contacted_by();

-- Session tokens are immutable once created (rotate by making a new session).
create or replace function private.session_token_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.qr_token_hash is distinct from old.qr_token_hash
     or new.qr_token_nonce is distinct from old.qr_token_nonce
     or new.service_id is distinct from old.service_id
     or (old.online_token_hash is not null and new.online_token_hash is distinct from old.online_token_hash) then
    raise exception 'QR tokens cannot be changed; create a new attendance session instead' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists session_token_guard on public.attendance_sessions;
create trigger session_token_guard before update on public.attendance_sessions
for each row execute function private.session_token_guard();
