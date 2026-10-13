-- ============================================================
-- HARVESTER'S CHURCH EPE CAMPUS — 0001 SCHEMA
-- Tables, enums, indexes and housekeeping triggers.
-- Security (grants, RLS) lives in 0002, business functions in 0003,
-- audit triggers in 0004 and storage in 0005.
--
-- Differences from the supplied starter schema are marked "CHANGED:".
-- ============================================================

create schema if not exists private;
-- RLS policies call role-check helpers in this schema; they return booleans only.
grant usage on schema private to anon, authenticated;

-- ----------------------------
-- ENUM TYPES
-- ----------------------------
do $$ begin
  create type public.member_status as enum
    ('first_timer', 'visitor', 'regular_attendee', 'member', 'inactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendance_mode as enum ('physical', 'online');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendance_method as enum ('qr', 'online', 'manual', 'admin_assisted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.service_status as enum ('draft', 'scheduled', 'active', 'closed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.content_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.admin_role as enum
    ('super_admin', 'attendance_admin', 'content_admin', 'pastoral_admin');
exception when duplicate_object then null; end $$;

-- ----------------------------
-- MEMBERS
-- CHANGED: sensitive fields (address, date of birth, emergency contact)
-- moved to public.member_private so they can be protected separately.
-- CHANGED: admin_notes removed — a member could read their own notes.
-- Pastoral notes live in follow_ups / member_contact_logs.
-- CHANGED: consent_to_contact defaults to false (consent must be explicit).
-- ----------------------------
create sequence if not exists public.member_number_seq start 1;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  member_number text unique,
  first_name text not null check (length(trim(first_name)) between 1 and 80),
  middle_name text check (middle_name is null or length(middle_name) <= 80),
  last_name text not null check (length(trim(last_name)) between 1 and 80),
  preferred_name text check (preferred_name is null or length(preferred_name) <= 80),
  email text check (email is null or (length(email) <= 254 and email like '%_@_%')),
  phone text check (phone is null or length(phone) <= 32),
  whatsapp_number text check (whatsapp_number is null or length(whatsapp_number) <= 32),
  profile_photo_path text,
  gender text check (gender is null or gender in ('female','male','prefer_not_to_say','other')),
  marital_status text check (marital_status is null or marital_status in ('single','married','engaged','widowed','divorced','prefer_not_to_say')),
  city text,
  state text,
  is_student boolean not null default false,
  school_name text,
  course_or_department text,
  education_level text,
  graduation_year integer check (graduation_year is null or graduation_year between 1950 and 2150),
  occupation text,
  company_or_business text,
  date_joined_church date,
  church_department text,
  ministry_unit text,
  usual_service text,
  previous_church text,
  is_baptized boolean,
  interested_in_serving boolean,
  heard_about_church text,
  membership_status public.member_status not null default 'first_timer',
  is_first_timer boolean not null default true,
  registration_assisted boolean not null default false,
  registration_assisted_by uuid references auth.users(id) on delete set null,
  consent_to_contact boolean not null default false,
  consent_recorded_at timestamptz,
  photo_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists members_name_idx
  on public.members (lower(last_name), lower(first_name));
create index if not exists members_status_idx on public.members (membership_status);
create index if not exists members_department_idx on public.members (church_department);
create index if not exists members_unit_idx on public.members (ministry_unit);
create index if not exists members_school_idx on public.members (school_name);
create index if not exists members_created_at_idx on public.members (created_at desc);
create index if not exists members_phone_idx on public.members (phone);
create index if not exists members_email_idx on public.members (lower(email));
create index if not exists members_active_idx on public.members (deleted_at) where deleted_at is null;

-- Sensitive 1:1 details. Readable only by the member, super_admin and pastoral_admin.
create table if not exists public.member_private (
  member_id uuid primary key references public.members(id) on delete cascade,
  residential_address text check (residential_address is null or length(residential_address) <= 400),
  date_of_birth date check (date_of_birth is null or date_of_birth between date '1900-01-01' and date '2100-01-01'),
  emergency_contact_name text check (emergency_contact_name is null or length(emergency_contact_name) <= 120),
  emergency_contact_phone text check (emergency_contact_phone is null or length(emergency_contact_phone) <= 32),
  updated_at timestamptz not null default now()
);

-- ----------------------------
-- ADMIN ROLES
-- ----------------------------
create table if not exists public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.admin_role not null,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index if not exists admin_roles_user_idx on public.admin_roles (user_id);

-- ----------------------------
-- SERVICES / ATTENDANCE SESSIONS
-- CHANGED: tokens are derived server-side as
--   HMAC-SHA256(QR_TOKEN_SECRET, kind:session_id:nonce)
-- Only the SHA-256 hash of the token and the random nonce are stored, so a
-- database leak alone cannot reproduce a QR code, yet the server can reprint
-- the identical QR later. CHANGED: a separate online link token per session.
-- ----------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 2 and 160),
  description text,
  service_type text not null default 'sunday_service',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  status public.service_status not null default 'scheduled',
  allow_physical_attendance boolean not null default true,
  allow_online_attendance boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint services_time_check check (ends_at > starts_at)
);
create index if not exists services_starts_at_idx on public.services (starts_at desc);
create index if not exists services_status_idx on public.services (status);

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete restrict,
  label text not null default 'Main attendance' check (length(label) between 1 and 120),
  qr_token_hash text not null unique check (qr_token_hash ~ '^[0-9a-f]{64}$'),
  qr_token_nonce text not null,
  online_token_hash text unique check (online_token_hash is null or online_token_hash ~ '^[0-9a-f]{64}$'),
  online_token_nonce text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_sessions_time_check check (ends_at > starts_at),
  constraint attendance_sessions_online_pair check ((online_token_hash is null) = (online_token_nonce is null))
);
create index if not exists attendance_sessions_service_idx on public.attendance_sessions (service_id);
create index if not exists attendance_sessions_window_idx on public.attendance_sessions (starts_at, ends_at);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  attendance_session_id uuid references public.attendance_sessions(id) on delete set null,
  mode public.attendance_mode not null default 'physical',
  method public.attendance_method not null default 'qr',
  checked_in_at timestamptz not null default now(),
  recorded_by uuid references auth.users(id) on delete set null,
  note text check (note is null or length(note) <= 500),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (member_id, service_id)
);
create index if not exists attendance_service_idx on public.attendance (service_id);
create index if not exists attendance_member_idx on public.attendance (member_id, checked_in_at desc);
create index if not exists attendance_checked_in_idx on public.attendance (checked_in_at desc);
create index if not exists attendance_mode_idx on public.attendance (mode);

-- Usher-issued, single-use recovery codes. Only a hash is stored.
-- No RLS policies: accessed exclusively through security-definer functions.
create table if not exists public.recovery_codes (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists recovery_codes_member_idx on public.recovery_codes (member_id);

-- ----------------------------
-- FOLLOW-UP / PASTORAL CONTACT LOG
-- ----------------------------
create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  subject text not null check (length(trim(subject)) between 2 and 200),
  details text,
  status text not null default 'open'
    check (status in ('open','in_progress','completed','cancelled')),
  priority text not null default 'normal'
    check (priority in ('low','normal','high')),
  due_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists follow_ups_status_due_idx on public.follow_ups (status, due_at);
create index if not exists follow_ups_member_idx on public.follow_ups (member_id);
create index if not exists follow_ups_assigned_idx on public.follow_ups (assigned_to);

create table if not exists public.member_contact_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete restrict,
  follow_up_id uuid references public.follow_ups(id) on delete set null,
  channel text not null check (channel in ('whatsapp','phone','sms','email','in_person','other')),
  subject text,
  message_summary text,
  outcome text,
  next_step text,
  contacted_by uuid references auth.users(id) on delete set null,
  contacted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
-- CHANGED: the starter schema had no index here.
create index if not exists contact_logs_member_idx on public.member_contact_logs (member_id, contacted_at desc);

-- ----------------------------
-- CONTENT
-- ----------------------------
create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  content_type text not null
    check (content_type in ('today_message','service_photo','service_video','highlight','news','announcement','event')),
  title text not null check (length(trim(title)) between 2 and 200),
  slug text unique check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  summary text,
  body text,
  key_takeaways text[] not null default '{}',
  cover_image_path text,
  media_paths text[] not null default '{}',
  speaker_name text,
  scripture_reference text,
  event_starts_at timestamptz,
  event_ends_at timestamptz,
  event_location text,
  status public.content_status not null default 'draft',
  is_featured boolean not null default false,
  display_order integer not null default 0,
  -- CHANGED: publishing people-media requires an explicit consent confirmation.
  people_consent_confirmed boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint content_event_time_check check (event_ends_at is null or event_starts_at is null or event_ends_at >= event_starts_at)
);
create index if not exists content_posts_type_status_idx
  on public.content_posts (content_type, status, published_at desc);
create index if not exists content_posts_event_date_idx on public.content_posts (event_starts_at);
create index if not exists content_posts_featured_idx on public.content_posts (is_featured, display_order);

-- Member recognitions are curated by admins, never inferred automatically.
-- CHANGED: display_name is a snapshot shown publicly, so anonymous visitors
-- never need read access to the members table.
create table if not exists public.member_recognitions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete set null,
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  recognition_title text not null check (length(trim(recognition_title)) between 2 and 80),
  description text,
  image_path text,
  service_id uuid references public.services(id) on delete set null,
  display_date date not null default current_date,
  display_order integer not null default 0,
  status public.content_status not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists member_recognitions_date_idx
  on public.member_recognitions (display_date desc, status);

-- ----------------------------
-- AUDIT LOG (immutable — see 0004)
-- Never log passwords, raw tokens, or secret credentials here.
-- ----------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_user_id, created_at desc);

-- ----------------------------
-- APP SETTINGS
-- ----------------------------
create table if not exists public.app_settings (
  key text primary key check (key ~ '^[a-z0-9_]{2,64}$'),
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('church', jsonb_build_object(
     'name', 'Harvesters International Christian Centre',
     'campus', 'Epe Campus',
     'short_name', 'Harvesters Epe',
     'timezone', 'Africa/Lagos',
     'support_contact', '')),
  ('recognition_categories', '["Most Dressed","Most Engaged","Most Prayerful","Best Energy","Most Welcoming","Faithful Volunteer"]'::jsonb),
  ('check_in', jsonb_build_object('opens_minutes_before', 45, 'closes_minutes_after', 90))
on conflict (key) do nothing;

-- ----------------------------
-- HOUSEKEEPING TRIGGERS
-- ----------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare t text; begin
  foreach t in array array[
    'members','member_private','services','attendance_sessions','attendance','follow_ups',
    'content_posts','member_recognitions','app_settings'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t
    );
  end loop;
end $$;

-- Human-friendly member numbers: HCE-00001
create or replace function private.assign_member_number()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.member_number is null then
    new.member_number := 'HCE-' || lpad(nextval('public.member_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists assign_member_number on public.members;
create trigger assign_member_number before insert on public.members
for each row execute function private.assign_member_number();
