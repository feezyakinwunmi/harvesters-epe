-- ============================================================
-- 0003 FUNCTIONS — check-in, registration, profile updates, admin RPCs.
--
-- Every function is SECURITY DEFINER with an empty search_path, takes
-- identity ONLY from auth.uid() (never from a client-supplied id), and
-- re-checks roles itself. Column whitelists live in the *_apply helpers.
-- ============================================================

-- ----------------------------
-- SMALL HELPERS
-- ----------------------------
create or replace function private.clean_text(p_value text, p_max integer default 200, p_field text default 'value')
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare v text := nullif(btrim(p_value), '');
begin
  if v is not null and length(v) > p_max then
    raise exception '% is too long (max % characters)', p_field, p_max using errcode = '22001';
  end if;
  return v;
end;
$$;

create or replace function private.json_bool(p jsonb, p_key text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare v text := p ->> p_key;
begin
  if v is null or v = '' then return null; end if;
  return v::boolean;
exception when invalid_text_representation then
  raise exception '% must be true or false', p_key using errcode = '22P02';
end;
$$;

create or replace function private.json_date(p jsonb, p_key text)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare v text := nullif(btrim(p ->> p_key), '');
begin
  if v is null then return null; end if;
  return v::date;
exception when others then
  raise exception '% must be a valid date', p_key using errcode = '22007';
end;
$$;

-- Apply whitelisted, self-editable profile fields from JSON onto a member row.
-- Keys that are absent are left unchanged; keys present with '' become NULL.
create or replace function private.member_profile_apply(p jsonb, r public.members)
returns public.members
language plpgsql
stable
set search_path = ''
as $$
begin
  p := coalesce(p, '{}'::jsonb);
  if p ? 'first_name' then r.first_name := private.clean_text(p->>'first_name', 80, 'First name'); end if;
  if p ? 'middle_name' then r.middle_name := private.clean_text(p->>'middle_name', 80, 'Middle name'); end if;
  if p ? 'last_name' then r.last_name := private.clean_text(p->>'last_name', 80, 'Last name'); end if;
  if p ? 'preferred_name' then r.preferred_name := private.clean_text(p->>'preferred_name', 80, 'Preferred name'); end if;
  if p ? 'email' then r.email := lower(private.clean_text(p->>'email', 254, 'Email')); end if;
  if p ? 'phone' then r.phone := private.clean_text(p->>'phone', 32, 'Phone'); end if;
  if p ? 'whatsapp_number' then r.whatsapp_number := private.clean_text(p->>'whatsapp_number', 32, 'WhatsApp number'); end if;
  if p ? 'gender' then r.gender := private.clean_text(p->>'gender', 32, 'Gender'); end if;
  if p ? 'marital_status' then r.marital_status := private.clean_text(p->>'marital_status', 32, 'Marital status'); end if;
  if p ? 'city' then r.city := private.clean_text(p->>'city', 80, 'City'); end if;
  if p ? 'state' then r.state := private.clean_text(p->>'state', 80, 'State'); end if;
  if p ? 'is_student' then r.is_student := coalesce(private.json_bool(p, 'is_student'), false); end if;
  if p ? 'school_name' then r.school_name := private.clean_text(p->>'school_name', 160, 'School'); end if;
  if p ? 'course_or_department' then r.course_or_department := private.clean_text(p->>'course_or_department', 160, 'Course'); end if;
  if p ? 'education_level' then r.education_level := private.clean_text(p->>'education_level', 60, 'Level'); end if;
  if p ? 'graduation_year' then
    r.graduation_year := nullif(btrim(p->>'graduation_year'), '')::integer;
  end if;
  if p ? 'occupation' then r.occupation := private.clean_text(p->>'occupation', 120, 'Occupation'); end if;
  if p ? 'company_or_business' then r.company_or_business := private.clean_text(p->>'company_or_business', 160, 'Company'); end if;
  if p ? 'date_joined_church' then r.date_joined_church := private.json_date(p, 'date_joined_church'); end if;
  if p ? 'church_department' then r.church_department := private.clean_text(p->>'church_department', 120, 'Department'); end if;
  if p ? 'ministry_unit' then r.ministry_unit := private.clean_text(p->>'ministry_unit', 120, 'Unit'); end if;
  if p ? 'usual_service' then r.usual_service := private.clean_text(p->>'usual_service', 120, 'Usual service'); end if;
  if p ? 'previous_church' then r.previous_church := private.clean_text(p->>'previous_church', 160, 'Previous church'); end if;
  if p ? 'is_baptized' then r.is_baptized := private.json_bool(p, 'is_baptized'); end if;
  if p ? 'interested_in_serving' then r.interested_in_serving := private.json_bool(p, 'interested_in_serving'); end if;
  if p ? 'heard_about_church' then r.heard_about_church := private.clean_text(p->>'heard_about_church', 160, 'How you heard'); end if;
  if p ? 'photo_consent' then r.photo_consent := coalesce(private.json_bool(p, 'photo_consent'), false); end if;
  if p ? 'consent_to_contact' then
    if r.consent_to_contact is distinct from coalesce(private.json_bool(p, 'consent_to_contact'), false) then
      r.consent_recorded_at := now();
    end if;
    r.consent_to_contact := coalesce(private.json_bool(p, 'consent_to_contact'), false);
  end if;
  return r;
end;
$$;

create or replace function private.member_private_apply(p jsonb, r public.member_private)
returns public.member_private
language plpgsql
stable
set search_path = ''
as $$
begin
  p := coalesce(p, '{}'::jsonb);
  if p ? 'residential_address' then r.residential_address := private.clean_text(p->>'residential_address', 400, 'Address'); end if;
  if p ? 'date_of_birth' then r.date_of_birth := private.json_date(p, 'date_of_birth'); end if;
  if p ? 'emergency_contact_name' then r.emergency_contact_name := private.clean_text(p->>'emergency_contact_name', 120, 'Emergency contact name'); end if;
  if p ? 'emergency_contact_phone' then r.emergency_contact_phone := private.clean_text(p->>'emergency_contact_phone', 32, 'Emergency contact phone'); end if;
  return r;
end;
$$;

-- Admin-only member fields.
create or replace function private.member_admin_apply(p jsonb, r public.members)
returns public.members
language plpgsql
stable
set search_path = ''
as $$
begin
  p := coalesce(p, '{}'::jsonb);
  if p ? 'membership_status' then
    r.membership_status := (p->>'membership_status')::public.member_status;
  end if;
  if p ? 'is_first_timer' then r.is_first_timer := coalesce(private.json_bool(p, 'is_first_timer'), false); end if;
  return r;
end;
$$;

-- Persist a member row built by the *_apply helpers.
create or replace function private.member_save(r public.members)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.members set
    first_name = r.first_name, middle_name = r.middle_name, last_name = r.last_name,
    preferred_name = r.preferred_name, email = r.email, phone = r.phone,
    whatsapp_number = r.whatsapp_number, gender = r.gender, marital_status = r.marital_status,
    city = r.city, state = r.state, is_student = r.is_student, school_name = r.school_name,
    course_or_department = r.course_or_department, education_level = r.education_level,
    graduation_year = r.graduation_year, occupation = r.occupation,
    company_or_business = r.company_or_business, date_joined_church = r.date_joined_church,
    church_department = r.church_department, ministry_unit = r.ministry_unit,
    usual_service = r.usual_service, previous_church = r.previous_church,
    is_baptized = r.is_baptized, interested_in_serving = r.interested_in_serving,
    heard_about_church = r.heard_about_church, photo_consent = r.photo_consent,
    consent_to_contact = r.consent_to_contact, consent_recorded_at = r.consent_recorded_at,
    membership_status = r.membership_status, is_first_timer = r.is_first_timer,
    profile_photo_path = r.profile_photo_path
  where id = r.id;
end;
$$;

create or replace function private.member_private_save(r public.member_private)
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.member_private as mp
    (member_id, residential_address, date_of_birth, emergency_contact_name, emergency_contact_phone)
  values
    (r.member_id, r.residential_address, r.date_of_birth, r.emergency_contact_name, r.emergency_contact_phone)
  on conflict (member_id) do update set
    residential_address = excluded.residential_address,
    date_of_birth = excluded.date_of_birth,
    emergency_contact_name = excluded.emergency_contact_name,
    emergency_contact_phone = excluded.emergency_contact_phone;
end;
$$;

-- ============================================================
-- CHECK-IN
-- p_token is the raw token from the QR / online link. Identity comes from
-- the caller's JWT. Mode (physical / online) is decided by WHICH token hash
-- matched — never by the client. Duplicate requests are safe: the unique
-- (member_id, service_id) constraint + ON CONFLICT DO NOTHING make the
-- insert idempotent even under concurrent scans.
-- ============================================================
create or replace function public.check_in(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_session public.attendance_sessions%rowtype;
  v_service public.services%rowtype;
  v_member public.members%rowtype;
  v_mode public.attendance_mode;
  v_att public.attendance%rowtype;
  v_ctx jsonb;
  v_count integer;
  v_now timestamptz := now();
begin
  if p_token is null or length(p_token) < 32 or length(p_token) > 128 or p_token !~ '^[A-Za-z0-9_-]+$' then
    return jsonb_build_object('status', 'invalid');
  end if;

  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');

  select * into v_session from public.attendance_sessions where qr_token_hash = v_hash;
  if found then
    v_mode := 'physical';
  else
    select * into v_session from public.attendance_sessions where online_token_hash = v_hash;
    if found then
      v_mode := 'online';
    else
      return jsonb_build_object('status', 'invalid');
    end if;
  end if;

  select * into v_service from public.services where id = v_session.service_id;

  v_ctx := jsonb_build_object(
    'mode', v_mode,
    'service_title', v_service.title,
    'service_starts_at', v_service.starts_at,
    'service_ends_at', v_service.ends_at,
    'location', v_service.location,
    'session_label', v_session.label,
    'session_starts_at', v_session.starts_at,
    'session_ends_at', v_session.ends_at
  );

  if v_service.deleted_at is not null or v_service.status in ('draft', 'cancelled') then
    return v_ctx || jsonb_build_object('status', 'unavailable');
  end if;
  if not v_session.is_enabled or v_service.status = 'closed' then
    return v_ctx || jsonb_build_object('status', 'closed');
  end if;
  if (v_mode = 'physical' and not v_service.allow_physical_attendance)
     or (v_mode = 'online' and not v_service.allow_online_attendance) then
    return v_ctx || jsonb_build_object('status', 'mode_not_allowed');
  end if;
  if v_now < v_session.starts_at then
    return v_ctx || jsonb_build_object('status', 'not_open');
  end if;
  if v_now > v_session.ends_at then
    return v_ctx || jsonb_build_object('status', 'closed');
  end if;

  if v_uid is null then
    return v_ctx || jsonb_build_object('status', 'auth_required');
  end if;

  select * into v_member from public.members
  where auth_user_id = v_uid and deleted_at is null;
  if not found then
    return v_ctx || jsonb_build_object('status', 'needs_registration');
  end if;

  if not private.session_is_trusted() then
    return v_ctx || jsonb_build_object('status', 'reauth_required');
  end if;

  v_ctx := v_ctx || jsonb_build_object(
    'member_first_name', coalesce(v_member.preferred_name, v_member.first_name)
  );

  insert into public.attendance (member_id, service_id, attendance_session_id, mode, method, recorded_by, checked_in_at)
  values (v_member.id, v_service.id, v_session.id, v_mode,
          case when v_mode = 'online' then 'online'::public.attendance_method else 'qr'::public.attendance_method end,
          v_uid, v_now)
  on conflict (member_id, service_id) do nothing
  returning * into v_att;

  if v_att.id is null then
    select * into v_att from public.attendance
    where member_id = v_member.id and service_id = v_service.id;
    return v_ctx || jsonb_build_object(
      'status', 'already_checked_in',
      'checked_in_at', v_att.checked_in_at,
      'recorded_mode', v_att.mode
    );
  end if;

  -- A first-timer who returns becomes a visitor; admins promote further.
  if v_member.membership_status = 'first_timer' then
    select count(*) into v_count from public.attendance where member_id = v_member.id;
    if v_count >= 2 then
      update public.members
        set membership_status = 'visitor', is_first_timer = false
        where id = v_member.id;
    end if;
  end if;

  return v_ctx || jsonb_build_object(
    'status', 'checked_in',
    'checked_in_at', v_att.checked_in_at,
    'recorded_mode', v_att.mode
  );
end;
$$;

-- ============================================================
-- SELF-SERVICE REGISTRATION & PROFILE
-- ============================================================
create or replace function public.register_self(p_profile jsonb, p_private jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_existing public.members%rowtype;
  r public.members%rowtype;
  rp public.member_private%rowtype;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  select * into v_existing from public.members where auth_user_id = v_uid;
  if found then
    return jsonb_build_object('member_id', v_existing.id, 'member_number', v_existing.member_number, 'created', false);
  end if;

  r.id := gen_random_uuid();
  r.is_student := false;
  r.photo_consent := false;
  r.consent_to_contact := false;
  r.membership_status := 'first_timer';
  r.is_first_timer := true;
  r := private.member_profile_apply(p_profile, r);

  if r.first_name is null or r.last_name is null then
    raise exception 'First and last name are required' using errcode = '23502';
  end if;

  insert into public.members (id, auth_user_id, first_name, last_name, consent_to_contact, consent_recorded_at)
  values (r.id, v_uid, r.first_name, r.last_name, r.consent_to_contact, now());

  r.consent_recorded_at := now();
  perform private.member_save(r);

  rp.member_id := r.id;
  rp := private.member_private_apply(p_private, rp);
  perform private.member_private_save(rp);

  return jsonb_build_object(
    'member_id', r.id,
    'member_number', (select member_number from public.members where id = r.id),
    'created', true
  );
end;
$$;

create or replace function public.update_my_profile(p_profile jsonb default '{}'::jsonb, p_private jsonb default '{}'::jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r public.members%rowtype;
  rp public.member_private%rowtype;
begin
  select * into r from public.members where auth_user_id = auth.uid() and deleted_at is null;
  if not found then
    raise exception 'No member profile for this account' using errcode = 'P0002';
  end if;
  r := private.member_profile_apply(p_profile, r);
  perform private.member_save(r);

  select * into rp from public.member_private where member_id = r.id;
  if not found then rp.member_id := r.id; end if;
  rp := private.member_private_apply(p_private, rp);
  perform private.member_private_save(rp);
end;
$$;

-- Photo path must sit in the caller's own avatar folder.
create or replace function public.set_my_profile_photo(p_path text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_path is not null and p_path !~ ('^' || auth.uid()::text || '/[A-Za-z0-9._-]+$') then
    raise exception 'Invalid photo path' using errcode = '22023';
  end if;
  update public.members set profile_photo_path = p_path
  where auth_user_id = auth.uid() and deleted_at is null;
end;
$$;

-- ============================================================
-- ADMIN: MEMBERS
-- ============================================================
-- Create (p_member_id null) or update a member.
--   attendance_admin: create + edit basic profile (usher desk)
--   pastoral/super:   everything incl. private details and status
create or replace function public.admin_save_member(
  p_member_id uuid,
  p_profile jsonb default '{}'::jsonb,
  p_private jsonb default '{}'::jsonb,
  p_admin jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r public.members%rowtype;
  rp public.member_private%rowtype;
  v_pastoral boolean := private.is_pastoral();
begin
  if not private.can_view_members() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if not v_pastoral and (coalesce(p_private, '{}'::jsonb) <> '{}'::jsonb or coalesce(p_admin, '{}'::jsonb) <> '{}'::jsonb) then
    raise exception 'Only pastoral or super admins can edit private details or membership status' using errcode = '42501';
  end if;

  if p_member_id is null then
    r.id := gen_random_uuid();
    r.is_student := false;
    r.photo_consent := false;
    r.consent_to_contact := false;
    r.membership_status := 'first_timer';
    r.is_first_timer := true;
    r := private.member_profile_apply(p_profile, r);
    if r.first_name is null or r.last_name is null then
      raise exception 'First and last name are required' using errcode = '23502';
    end if;
    insert into public.members (id, first_name, last_name, registration_assisted, registration_assisted_by)
    values (r.id, r.first_name, r.last_name, true, auth.uid());
    r.registration_assisted := true;
    r.consent_recorded_at := now();
  else
    select * into r from public.members where id = p_member_id;
    if not found then
      raise exception 'Member not found' using errcode = 'P0002';
    end if;
    r := private.member_profile_apply(p_profile, r);
  end if;

  if v_pastoral then
    r := private.member_admin_apply(p_admin, r);
  end if;
  perform private.member_save(r);

  if v_pastoral and coalesce(p_private, '{}'::jsonb) <> '{}'::jsonb then
    select * into rp from public.member_private where member_id = r.id;
    if not found then rp.member_id := r.id; end if;
    rp := private.member_private_apply(p_private, rp);
    perform private.member_private_save(rp);
  end if;

  return r.id;
end;
$$;

create or replace function public.admin_archive_member(p_member_id uuid, p_archive boolean default true)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not private.is_pastoral() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  update public.members
    set deleted_at = case when p_archive then now() else null end
    where id = p_member_id;
  if not found then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Permanent erasure for data-protection requests. Attendance rows are kept
-- (history totals stay correct) but every personal field is scrubbed.
-- Returns the auth user id so the server can delete the Auth account.
create or replace function public.admin_erase_member(p_member_id uuid, p_confirm text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_auth uuid;
begin
  if not private.is_super_admin() then
    raise exception 'Only a super admin can permanently erase a member' using errcode = '42501';
  end if;
  if p_confirm is distinct from 'DELETE' then
    raise exception 'Type DELETE to confirm' using errcode = '22023';
  end if;

  select auth_user_id into v_auth from public.members where id = p_member_id;
  if not found then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;

  perform set_config('app.audit_reason', 'Permanent erasure', true);

  delete from public.member_private where member_id = p_member_id;
  delete from public.recovery_codes where member_id = p_member_id;
  update public.follow_ups set subject = 'Erased', details = null where member_id = p_member_id;
  update public.member_contact_logs
    set subject = null, message_summary = null, outcome = null, next_step = null
    where member_id = p_member_id;
  update public.member_recognitions set member_id = null where member_id = p_member_id;
  update public.attendance set note = null where member_id = p_member_id;

  update public.members set
    auth_user_id = null, first_name = 'Erased', middle_name = null, last_name = 'Member',
    preferred_name = null, email = null, phone = null, whatsapp_number = null,
    profile_photo_path = null, gender = null, marital_status = null, city = null, state = null,
    is_student = false, school_name = null, course_or_department = null, education_level = null,
    graduation_year = null, occupation = null, company_or_business = null,
    date_joined_church = null, church_department = null, ministry_unit = null,
    usual_service = null, previous_church = null, is_baptized = null,
    interested_in_serving = null, heard_about_church = null,
    consent_to_contact = false, photo_consent = false, membership_status = 'inactive',
    deleted_at = coalesce(deleted_at, now())
  where id = p_member_id;

  return v_auth;
end;
$$;

-- Sign a member out of every device (deletes their Auth sessions; refresh
-- tokens stop working and check-in rejects the old access token at once).
create or replace function public.admin_revoke_member_sessions(p_member_id uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_auth uuid;
  v_count integer;
begin
  if not private.is_super_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  select auth_user_id into v_auth from public.members where id = p_member_id;
  if v_auth is null then
    return 0;
  end if;
  delete from auth.sessions where user_id = v_auth;
  get diagnostics v_count = row_count;
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, summary, metadata)
  values (auth.uid(), 'members.revoke_sessions', 'members', p_member_id,
          'Signed member out of all devices', jsonb_build_object('sessions_revoked', v_count));
  return v_count;
end;
$$;

-- Lightweight member search for any admin (recognitions, role grants, manual
-- attendance). Returns names only — no contact details for content admins.
create or replace function public.admin_member_picker(p_query text, p_limit integer default 15)
returns table (
  id uuid,
  display_name text,
  member_number text,
  photo_consent boolean,
  has_account boolean,
  phone_last4 text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := lower(btrim(coalesce(p_query, '')));
  v_contacts boolean := private.can_view_members();
begin
  if not private.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if length(v_q) < 2 then
    return;
  end if;
  v_q := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');
  return query
    select m.id,
           btrim(coalesce(m.preferred_name, m.first_name) || ' ' || m.last_name),
           m.member_number,
           m.photo_consent,
           m.auth_user_id is not null,
           case when v_contacts and m.phone is not null then right(m.phone, 4) else null end
    from public.members m
    where m.deleted_at is null
      and (
        lower(m.first_name || ' ' || m.last_name) like '%' || v_q || '%'
        or lower(coalesce(m.preferred_name, '') || ' ' || m.last_name) like '%' || v_q || '%'
        or lower(coalesce(m.member_number, '')) like '%' || v_q || '%'
        or (v_contacts and coalesce(m.phone, '') like '%' || v_q || '%')
      )
    order by lower(m.last_name), lower(m.first_name)
    limit least(greatest(coalesce(p_limit, 15), 1), 50);
end;
$$;

-- Distinct values for member list filters.
create or replace function public.member_filter_options()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.can_view_members() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'departments', coalesce((select jsonb_agg(v order by v) from (select distinct church_department v from public.members where church_department is not null and deleted_at is null) s), '[]'::jsonb),
    'units', coalesce((select jsonb_agg(v order by v) from (select distinct ministry_unit v from public.members where ministry_unit is not null and deleted_at is null) s), '[]'::jsonb),
    'schools', coalesce((select jsonb_agg(v order by v) from (select distinct school_name v from public.members where school_name is not null and deleted_at is null) s), '[]'::jsonb),
    'occupations', coalesce((select jsonb_agg(v order by v) from (select distinct occupation v from public.members where occupation is not null and deleted_at is null) s), '[]'::jsonb)
  );
end;
$$;

-- ============================================================
-- ADMIN: ATTENDANCE (manual add / correct / remove — reason required)
-- ============================================================
create or replace function public.admin_record_attendance(
  p_member_id uuid,
  p_service_id uuid,
  p_mode public.attendance_mode,
  p_method public.attendance_method,
  p_reason text,
  p_checked_in_at timestamptz default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_att public.attendance%rowtype;
  v_reason text := private.clean_text(p_reason, 500, 'Reason');
begin
  if not private.can_manage_attendance() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if v_reason is null or length(v_reason) < 3 then
    raise exception 'A reason is required' using errcode = '23502';
  end if;
  if p_method not in ('manual', 'admin_assisted') then
    raise exception 'Manual records must use the manual or admin_assisted method' using errcode = '22023';
  end if;
  if not exists (select 1 from public.members where id = p_member_id and deleted_at is null) then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.services where id = p_service_id and deleted_at is null) then
    raise exception 'Service not found' using errcode = 'P0002';
  end if;

  perform set_config('app.audit_reason', v_reason, true);

  insert into public.attendance (member_id, service_id, mode, method, recorded_by, note, checked_in_at)
  values (p_member_id, p_service_id, p_mode, p_method, auth.uid(), v_reason, coalesce(p_checked_in_at, now()))
  on conflict (member_id, service_id) do nothing
  returning * into v_att;

  if v_att.id is null then
    select * into v_att from public.attendance where member_id = p_member_id and service_id = p_service_id;
    return jsonb_build_object('status', 'already_checked_in', 'attendance_id', v_att.id, 'checked_in_at', v_att.checked_in_at);
  end if;
  return jsonb_build_object('status', 'recorded', 'attendance_id', v_att.id, 'checked_in_at', v_att.checked_in_at);
end;
$$;

create or replace function public.admin_update_attendance(
  p_attendance_id uuid,
  p_mode public.attendance_mode,
  p_checked_in_at timestamptz,
  p_reason text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason text := private.clean_text(p_reason, 500, 'Reason');
begin
  if not private.can_manage_attendance() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if v_reason is null or length(v_reason) < 3 then
    raise exception 'A reason is required' using errcode = '23502';
  end if;
  perform set_config('app.audit_reason', v_reason, true);
  update public.attendance
    set mode = coalesce(p_mode, mode),
        checked_in_at = coalesce(p_checked_in_at, checked_in_at),
        updated_by = auth.uid()
    where id = p_attendance_id;
  if not found then
    raise exception 'Attendance record not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.admin_remove_attendance(p_attendance_id uuid, p_reason text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason text := private.clean_text(p_reason, 500, 'Reason');
begin
  if not private.can_manage_attendance() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if v_reason is null or length(v_reason) < 3 then
    raise exception 'A reason is required' using errcode = '23502';
  end if;
  perform set_config('app.audit_reason', v_reason, true);
  delete from public.attendance where id = p_attendance_id;
  if not found then
    raise exception 'Attendance record not found' using errcode = 'P0002';
  end if;
end;
$$;

-- ============================================================
-- USHER-ASSISTED RECOVERY CODES
-- The server generates the code, shows it once to the usher, and passes
-- only its SHA-256 hash here.
-- ============================================================
create or replace function public.admin_create_recovery_code(p_member_id uuid, p_code_hash text, p_valid_minutes integer default 15)
returns timestamptz
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_expires timestamptz := now() + make_interval(mins => least(greatest(coalesce(p_valid_minutes, 15), 5), 60));
begin
  if not private.can_view_members() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if p_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid code hash' using errcode = '22023';
  end if;
  if not exists (select 1 from public.members where id = p_member_id and deleted_at is null) then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
  -- Only one live code per member.
  update public.recovery_codes set used_at = now()
    where member_id = p_member_id and used_at is null;
  insert into public.recovery_codes (member_id, code_hash, created_by, expires_at)
  values (p_member_id, p_code_hash, auth.uid(), v_expires);
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, summary)
  values (auth.uid(), 'members.recovery_code_issued', 'members', p_member_id, 'Issued an in-person sign-in code');
  return v_expires;
end;
$$;

-- Called ONLY by the server with the service-role key. Atomically consumes
-- a live code and returns who it belongs to.
create or replace function public.redeem_recovery_code(p_code_hash text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_code public.recovery_codes%rowtype;
  v_member public.members%rowtype;
begin
  update public.recovery_codes
    set used_at = now()
    where code_hash = p_code_hash and used_at is null and expires_at > now()
    returning * into v_code;
  if v_code.id is null then
    return jsonb_build_object('status', 'invalid');
  end if;
  select * into v_member from public.members where id = v_code.member_id and deleted_at is null;
  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;
  insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, summary)
  values (v_member.auth_user_id, 'members.recovery_code_redeemed', 'members', v_member.id, 'Signed in with an in-person code');
  return jsonb_build_object(
    'status', 'ok',
    'member_id', v_member.id,
    'auth_user_id', v_member.auth_user_id,
    'email', v_member.email,
    'first_name', coalesce(v_member.preferred_name, v_member.first_name),
    'last_name', v_member.last_name
  );
end;
$$;

-- Service-role only: link a freshly created Auth user to an existing
-- (usher-registered) member that had no account yet.
create or replace function public.link_member_auth_user(p_member_id uuid, p_auth_user_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  update public.members set auth_user_id = p_auth_user_id
  where id = p_member_id and auth_user_id is null;
  if not found then
    raise exception 'Member already linked or not found' using errcode = 'P0002';
  end if;
end;
$$;

-- ============================================================
-- DASHBOARD & PASTORAL QUERIES
-- ============================================================
create or replace function private.safe_tz(p_tz text)
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce((select name from pg_catalog.pg_timezone_names where name = p_tz limit 1), 'Africa/Lagos');
$$;

create or replace function public.admin_dashboard_stats(p_tz text default 'Africa/Lagos')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz text := private.safe_tz(p_tz);
  v_today date := (now() at time zone v_tz)::date;
  v_day_start timestamptz := (v_today::timestamp at time zone v_tz);
  v_day_end timestamptz := ((v_today + 1)::timestamp at time zone v_tz);
  v_result jsonb;
begin
  if not private.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_members', (select count(*) from public.members where deleted_at is null),
    'new_registrations_7d', (select count(*) from public.members where deleted_at is null and created_at >= now() - interval '7 days'),
    'new_registrations_30d', (select count(*) from public.members where deleted_at is null and created_at >= now() - interval '30 days'),
    'present_today', (select count(*) from public.attendance where checked_in_at >= v_day_start and checked_in_at < v_day_end),
    'physical_today', (select count(*) from public.attendance where checked_in_at >= v_day_start and checked_in_at < v_day_end and mode = 'physical'),
    'online_today', (select count(*) from public.attendance where checked_in_at >= v_day_start and checked_in_at < v_day_end and mode = 'online'),
    'first_timers_today', (
      select count(*) from public.attendance a
      where a.checked_in_at >= v_day_start and a.checked_in_at < v_day_end
        and not exists (select 1 from public.attendance e where e.member_id = a.member_id and e.checked_in_at < a.checked_in_at)),
    'first_timers_30d', (
      select count(*) from (
        select member_id, min(checked_in_at) first_at from public.attendance group by member_id
      ) f where f.first_at >= now() - interval '30 days'),
    'open_follow_ups', case when private.is_pastoral()
      then (select count(*) from public.follow_ups where status in ('open','in_progress')) else null end,
    'overdue_follow_ups', case when private.is_pastoral()
      then (select count(*) from public.follow_ups where status in ('open','in_progress') and due_at < now()) else null end,
    'trend', coalesce((
      select jsonb_agg(t order by t.starts_at) from (
        select s.id, s.title, s.starts_at,
          (select count(*) from public.attendance a where a.service_id = s.id and a.mode = 'physical') as physical,
          (select count(*) from public.attendance a where a.service_id = s.id and a.mode = 'online') as online
        from public.services s
        where s.deleted_at is null and s.status not in ('draft','cancelled') and s.starts_at <= now()
        order by s.starts_at desc
        limit 10
      ) t), '[]'::jsonb),
    'upcoming', coalesce((
      select jsonb_agg(u order by u.starts_at) from (
        select s.id, s.title, s.starts_at, s.ends_at, s.location, s.status,
          (select count(*) from public.attendance_sessions x where x.service_id = s.id) as session_count
        from public.services s
        where s.deleted_at is null and s.status not in ('cancelled') and s.ends_at >= now()
        order by s.starts_at
        limit 5
      ) u), '[]'::jsonb),
    'recent_activity', case when private.is_super_admin() then coalesce((
      select jsonb_agg(r order by r.created_at desc) from (
        select l.id, l.action, l.entity_type, l.summary, l.created_at,
          (select btrim(coalesce(m.preferred_name, m.first_name) || ' ' || m.last_name)
             from public.members m where m.auth_user_id = l.actor_user_id limit 1) as actor_name
        from public.audit_logs l
        order by l.created_at desc
        limit 8
      ) r), '[]'::jsonb) else null end
  ) into v_result;

  return v_result;
end;
$$;

-- People who may need a pastoral touch. Neutral language in the UI:
-- "first visit" and "not checked in recently" — never "absent".
create or replace function public.followup_candidates(p_days integer default 28, p_limit integer default 50)
returns table (
  member_id uuid,
  display_name text,
  phone text,
  whatsapp_number text,
  membership_status public.member_status,
  reason text,
  first_attended_at timestamptz,
  last_attended_at timestamptz,
  attendance_count bigint,
  last_contacted_at timestamptz,
  consent_to_contact boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 28), 7), 180);
begin
  if not private.is_pastoral() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  return query
  with stats as (
    select a.member_id, min(a.checked_in_at) first_at, max(a.checked_in_at) last_at, count(*) n
    from public.attendance a group by a.member_id
  ), contact as (
    select c.member_id, max(c.contacted_at) last_contact
    from public.member_contact_logs c group by c.member_id
  )
  select m.id,
         btrim(coalesce(m.preferred_name, m.first_name) || ' ' || m.last_name),
         m.phone, m.whatsapp_number, m.membership_status,
         case when s.n = 1 or s.n is null then 'first_visit' else 'not_checked_in_recently' end,
         s.first_at, s.last_at, coalesce(s.n, 0), c.last_contact, m.consent_to_contact
  from public.members m
  left join stats s on s.member_id = m.id
  left join contact c on c.member_id = m.id
  where m.deleted_at is null
    and (
      -- first-time visitors in the last 14 days who have not been contacted since
      (coalesce(s.n, 0) <= 1 and m.created_at >= now() - interval '14 days'
        and (c.last_contact is null or c.last_contact < coalesce(s.first_at, m.created_at)))
      or
      -- people who came at least twice but have not checked in for p_days
      (s.n >= 2 and s.last_at < now() - make_interval(days => v_days)
        and (c.last_contact is null or c.last_contact < s.last_at)
        and m.membership_status <> 'inactive')
    )
  order by case when coalesce(s.n, 0) <= 1 then 0 else 1 end, coalesce(s.last_at, m.created_at) desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

-- Names of staff who can be assigned follow-ups (pastoral / super admins).
create or replace function public.staff_directory()
returns table (user_id uuid, display_name text, roles public.admin_role[])
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  return query
    select ar.user_id,
           coalesce(
             (select btrim(coalesce(m.preferred_name, m.first_name) || ' ' || m.last_name)
                from public.members m where m.auth_user_id = ar.user_id and m.deleted_at is null limit 1),
             'Staff member'),
           array_agg(ar.role order by ar.role)
    from public.admin_roles ar
    group by ar.user_id
    order by 2;
end;
$$;

-- ============================================================
-- GRANTS FOR FUNCTIONS
-- ============================================================
do $$ declare f text; begin
  -- Revoke the default PUBLIC execute on everything we defined.
  for f in
    select p.oid::regprocedure::text from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.proname in (
        'clean_text','json_bool','json_date','member_profile_apply','member_private_apply',
        'member_admin_apply','member_save','member_private_save','safe_tz',
        'check_in','register_self','update_my_profile','set_my_profile_photo',
        'admin_save_member','admin_archive_member','admin_erase_member','admin_revoke_member_sessions',
        'admin_member_picker','member_filter_options','admin_record_attendance','admin_update_attendance',
        'admin_remove_attendance','admin_create_recovery_code','redeem_recovery_code',
        'link_member_auth_user','admin_dashboard_stats','followup_candidates','staff_directory'
      )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

grant execute on function public.check_in(text) to anon, authenticated;
grant execute on function public.register_self(jsonb, jsonb) to authenticated;
grant execute on function public.update_my_profile(jsonb, jsonb) to authenticated;
grant execute on function public.set_my_profile_photo(text) to authenticated;
grant execute on function public.admin_save_member(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.admin_archive_member(uuid, boolean) to authenticated;
grant execute on function public.admin_erase_member(uuid, text) to authenticated;
grant execute on function public.admin_revoke_member_sessions(uuid) to authenticated;
grant execute on function public.admin_member_picker(text, integer) to authenticated;
grant execute on function public.member_filter_options() to authenticated;
grant execute on function public.admin_record_attendance(uuid, uuid, public.attendance_mode, public.attendance_method, text, timestamptz) to authenticated;
grant execute on function public.admin_update_attendance(uuid, public.attendance_mode, timestamptz, text) to authenticated;
grant execute on function public.admin_remove_attendance(uuid, text) to authenticated;
grant execute on function public.admin_create_recovery_code(uuid, text, integer) to authenticated;
grant execute on function public.admin_dashboard_stats(text) to authenticated;
grant execute on function public.followup_candidates(integer, integer) to authenticated;
grant execute on function public.staff_directory() to authenticated;
-- redeem_recovery_code and link_member_auth_user: service_role only (granted above).
-- Internal helpers stay callable from within definer functions (owner privileges).
