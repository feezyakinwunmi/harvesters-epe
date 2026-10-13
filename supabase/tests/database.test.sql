-- ============================================================
-- DATABASE TESTS — check-in, duplicates, expiry, registration, RLS/roles,
-- audit immutability, recovery codes, storage policies.
--
-- Runs inside ONE transaction and rolls back, leaving no data behind.
--   Local:   see scripts/test-db-local.sh (plain Postgres + shim)
--   Staging: psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/database.test.sql
-- Any failed assertion raises an exception and stops the run.
-- Never run against production data.
-- ============================================================
\set ON_ERROR_STOP 1
begin;

create schema tests;
grant usage on schema tests to public;

create function tests.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin
  if p_cond is distinct from true then
    raise exception 'FAIL: %', p_msg;
  end if;
  raise notice 'ok - %', p_msg;
end $$;

-- Run p_sql as the CURRENT role and require it to fail with p_state.
create function tests.throws(p_sql text, p_state text, p_msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate = p_state then
      raise notice 'ok - %', p_msg;
      return;
    end if;
    raise exception 'FAIL: % (expected %, got %: %)', p_msg, p_state, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL: % (expected error %, statement succeeded)', p_msg, p_state;
end $$;

grant execute on all functions in schema tests to public;

-- ------------------------------------------------------------
-- FIXTURES (as the migration owner)
-- ------------------------------------------------------------
insert into auth.users (id, email) values
  ('a0000000-0000-4000-8000-000000000001', 'super@test.local'),
  ('a0000000-0000-4000-8000-000000000002', 'usher@test.local'),
  ('a0000000-0000-4000-8000-000000000003', 'content@test.local'),
  ('a0000000-0000-4000-8000-000000000004', 'pastor@test.local'),
  ('b0000000-0000-4000-8000-000000000001', 'm1@test.local'),
  ('b0000000-0000-4000-8000-000000000002', 'm2@test.local'),
  ('b0000000-0000-4000-8000-000000000003', 'new@test.local');

insert into auth.sessions (id, user_id, created_at) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', now()),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', now()),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000003', now()),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000004', now()),
  ('c1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', now() - interval '30 days'),
  ('c1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', now() - interval '400 days'),
  ('c1000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', now());

insert into public.admin_roles (user_id, role) values
  ('a0000000-0000-4000-8000-000000000001', 'super_admin'),
  ('a0000000-0000-4000-8000-000000000002', 'attendance_admin'),
  ('a0000000-0000-4000-8000-000000000003', 'content_admin'),
  ('a0000000-0000-4000-8000-000000000004', 'pastoral_admin');

insert into public.members (id, auth_user_id, first_name, last_name, phone, consent_to_contact, photo_consent) values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Ada', 'Okafor', '+2348030000001', true, false),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Tunde', 'Bello', '+2348030000002', true, true);
insert into public.member_private (member_id, residential_address) values
  ('d0000000-0000-4000-8000-000000000001', '1 Secret Street, Epe'),
  ('d0000000-0000-4000-8000-000000000002', '2 Hidden Road, Epe');

insert into public.services (id, title, starts_at, ends_at, status, allow_online_attendance) values
  ('e0000000-0000-4000-8000-000000000001', 'Sunday Service (open)',   now() - interval '30 minutes', now() + interval '90 minutes', 'active', true),
  ('e0000000-0000-4000-8000-000000000002', 'Last Week (closed)',      now() - interval '7 days', now() - interval '7 days' + interval '2 hours', 'scheduled', false),
  ('e0000000-0000-4000-8000-000000000003', 'Next Week (not open)',    now() + interval '7 days', now() + interval '7 days 2 hours', 'scheduled', false),
  ('e0000000-0000-4000-8000-000000000004', 'Midweek (disabled QR)',   now() - interval '10 minutes', now() + interval '2 hours', 'scheduled', false),
  ('e0000000-0000-4000-8000-000000000005', 'Prayer (physical only)',  now() - interval '10 minutes', now() + interval '2 hours', 'scheduled', false);

insert into public.attendance_sessions (id, service_id, qr_token_hash, qr_token_nonce, online_token_hash, online_token_nonce, starts_at, ends_at, is_enabled) values
  ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
     encode(sha256(convert_to('TOKEN_PHYSICAL_OPEN_aaaaaaaaaaaaaaaaaaaaaa', 'UTF8')), 'hex'), 'n1',
     encode(sha256(convert_to('TOKEN_ONLINE_OPEN_bbbbbbbbbbbbbbbbbbbbbbbb', 'UTF8')), 'hex'), 'n1o',
     now() - interval '1 hour', now() + interval '2 hours', true),
  ('f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002',
     encode(sha256(convert_to('TOKEN_PHYSICAL_CLOSED_cccccccccccccccccccc', 'UTF8')), 'hex'), 'n2', null, null,
     now() - interval '7 days 1 hour', now() - interval '7 days' + interval '3 hours', true),
  ('f0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000003',
     encode(sha256(convert_to('TOKEN_PHYSICAL_FUTURE_dddddddddddddddddddd', 'UTF8')), 'hex'), 'n3', null, null,
     now() + interval '7 days', now() + interval '7 days 3 hours', true),
  ('f0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004',
     encode(sha256(convert_to('TOKEN_PHYSICAL_DISABLED_eeeeeeeeeeeeeeeeee', 'UTF8')), 'hex'), 'n4', null, null,
     now() - interval '1 hour', now() + interval '3 hours', false),
  ('f0000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000005',
     encode(sha256(convert_to('TOKEN_PHYSICAL_PRAYER_ffffffffffffffffffff', 'UTF8')), 'hex'), 'n5',
     encode(sha256(convert_to('TOKEN_ONLINE_PRAYER_gggggggggggggggggggggg', 'UTF8')), 'hex'), 'n5o',
     now() - interval '1 hour', now() + interval '3 hours', true);

insert into public.content_posts (content_type, title, slug, status) values
  ('news', 'Published news', 'published-news', 'published'),
  ('news', 'Draft news', 'draft-news', 'draft');

-- JWT claim payloads
\set jwt_super   '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"c0000000-0000-4000-8000-000000000001"}'
\set jwt_usher   '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"c0000000-0000-4000-8000-000000000002"}'
\set jwt_content '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated","session_id":"c0000000-0000-4000-8000-000000000003"}'
\set jwt_pastor  '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated","session_id":"c0000000-0000-4000-8000-000000000004"}'
\set jwt_m1      '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated","session_id":"c1000000-0000-4000-8000-000000000001"}'
\set jwt_m1_nosid '{"sub":"b0000000-0000-4000-8000-000000000001","role":"authenticated"}'
\set jwt_m2_stale '{"sub":"b0000000-0000-4000-8000-000000000002","role":"authenticated","session_id":"c1000000-0000-4000-8000-000000000002"}'
\set jwt_new     '{"sub":"b0000000-0000-4000-8000-000000000003","role":"authenticated","session_id":"c1000000-0000-4000-8000-000000000003"}'

-- ============================================================
-- 1. QR CHECK-IN
-- ============================================================
-- Anonymous visitor scanning a valid code
reset role; set local role anon; select set_config('request.jwt.claims', '', true);
select tests.ok((public.check_in('TOKEN_PHYSICAL_OPEN_aaaaaaaaaaaaaaaaaaaaaa') ->> 'status') = 'auth_required',
  'anonymous scan of an open session asks for sign-in/registration');
select tests.ok((public.check_in('TOKEN_PHYSICAL_OPEN_aaaaaaaaaaaaaaaaaaaaaa') ->> 'service_title') = 'Sunday Service (open)',
  'anonymous scan shows which service the QR belongs to');
select tests.ok((public.check_in('not-a-real-token-but-long-enough-0000000000') ->> 'status') = 'invalid',
  'unknown token is rejected');
select tests.ok((public.check_in('short') ->> 'status') = 'invalid', 'malformed token is rejected');
select tests.ok((public.check_in('TOKEN_PHYSICAL_OPEN_aaaaaaaaaaaaaaaaaaaaaa'' or 1=1 --') ->> 'status') = 'invalid',
  'token with SQL metacharacters is rejected');
select tests.throws($$select count(*) from public.attendance_sessions$$, '42501', 'anon cannot read attendance sessions');
select tests.throws($$select count(*) from public.members$$, '42501', 'anon cannot read members');

-- Signed-in member, valid trusted session
reset role; set local role authenticated; select set_config('request.jwt.claims', :'jwt_m1', true);
select tests.ok((public.check_in('TOKEN_PHYSICAL_OPEN_aaaaaaaaaaaaaaaaaaaaaa') ->> 'status') = 'checked_in',
  'member with valid session is checked in immediately');
select tests.ok((public.check_in('TOKEN_PHYSICAL_OPEN_aaaaaaaaaaaaaaaaaaaaaa') ->> 'status') = 'already_checked_in',
  'second scan reports already checked in');
select tests.ok((public.check_in('TOKEN_PHYSICAL_OPEN_aaaaaaaaaaaaaaaaaaaaaa') ->> 'checked_in_at') is not null,
  'already-checked-in response includes the recorded time');
select tests.ok((public.check_in('TOKEN_ONLINE_OPEN_bbbbbbbbbbbbbbbbbbbbbbbb') ->> 'status') = 'already_checked_in',
  'online link for the same service does not create a second record');
select tests.ok((select count(*) from public.attendance where service_id = 'e0000000-0000-4000-8000-000000000001') = 1,
  'exactly one attendance row per member per service');
select tests.ok((select mode::text from public.attendance where service_id = 'e0000000-0000-4000-8000-000000000001') = 'physical',
  'mode recorded from the matched token (physical)');

-- Online link records online mode
select tests.ok((public.check_in('TOKEN_ONLINE_PRAYER_gggggggggggggggggggggg') ->> 'status') = 'mode_not_allowed',
  'online link is refused when the service does not allow online attendance');
select tests.ok((public.check_in('TOKEN_PHYSICAL_PRAYER_ffffffffffffffffffff') ->> 'status') = 'checked_in',
  'physical QR works on a physical-only service');

-- Window and status checks
select tests.ok((public.check_in('TOKEN_PHYSICAL_CLOSED_cccccccccccccccccccc') ->> 'status') = 'closed', 'expired session is closed');
select tests.ok((public.check_in('TOKEN_PHYSICAL_FUTURE_dddddddddddddddddddd') ->> 'status') = 'not_open', 'future session is not open yet');
select tests.ok((public.check_in('TOKEN_PHYSICAL_DISABLED_eeeeeeeeeeeeeeeeee') ->> 'status') = 'closed', 'disabled session is closed');
select tests.ok(not exists (select 1 from public.attendance where service_id in
  ('e0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000003','e0000000-0000-4000-8000-000000000004')),
  'closed / future / disabled sessions never create attendance');

-- Members cannot write attendance directly or forge it for someone else
select tests.throws($$insert into public.attendance (member_id, service_id) values ('d0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000002')$$,
  '42501', 'member cannot insert attendance directly');
select tests.throws($$update public.attendance set checked_in_at = now() - interval '1 day'$$, '42501', 'member cannot edit attendance times');

-- Session without a session_id claim / stale session / revoked session
select set_config('request.jwt.claims', :'jwt_m1_nosid', true);
select tests.ok((public.check_in('TOKEN_PHYSICAL_PRAYER_ffffffffffffffffffff') ->> 'status') = 'reauth_required',
  'token without a session id must re-verify');
select set_config('request.jwt.claims', :'jwt_m2_stale', true);
select tests.ok((public.check_in('TOKEN_PHYSICAL_OPEN_aaaaaaaaaaaaaaaaaaaaaa') ->> 'status') = 'reauth_required',
  'session older than 12 months must re-verify');
select tests.ok((select count(*) from public.attendance where member_id = 'd0000000-0000-4000-8000-000000000002') = 0,
  'stale session did not record attendance');

-- ============================================================
-- 2. FIRST-TIME VISITOR REGISTRATION → CHECK-IN
-- ============================================================
select set_config('request.jwt.claims', :'jwt_new', true);
select tests.ok((public.check_in('TOKEN_PHYSICAL_OPEN_aaaaaaaaaaaaaaaaaaaaaa') ->> 'status') = 'needs_registration',
  'signed-in user without a profile is sent to registration');
select tests.ok((public.register_self(
    '{"first_name":" Chidi ","last_name":"Eze","phone":"+2348030000003","consent_to_contact":true,
      "membership_status":"member","auth_user_id":"a0000000-0000-4000-8000-000000000001","member_number":"HACK"}'::jsonb,
    '{"residential_address":"3 New Lane"}'::jsonb) ->> 'created')::boolean,
  'register_self creates the member');
select tests.ok((select membership_status::text from public.members where auth_user_id = 'b0000000-0000-4000-8000-000000000003') = 'first_timer',
  'registration ignores a client-supplied membership_status');
select tests.ok((select member_number from public.members where auth_user_id = 'b0000000-0000-4000-8000-000000000003') like 'HCE-%',
  'registration ignores a client-supplied member_number');
select tests.ok((select first_name from public.members where auth_user_id = 'b0000000-0000-4000-8000-000000000003') = 'Chidi',
  'names are trimmed');
select tests.ok(not (public.register_self('{"first_name":"Again","last_name":"Twice"}'::jsonb) ->> 'created')::boolean,
  'registering twice returns the existing member');
select tests.ok((public.check_in('TOKEN_PHYSICAL_OPEN_aaaaaaaaaaaaaaaaaaaaaa') ->> 'status') = 'checked_in',
  'new visitor is checked in after registering, without repeating anything');

-- ============================================================
-- 3. MEMBER SELF-SERVICE & PRIVACY
-- ============================================================
select set_config('request.jwt.claims', :'jwt_m1', true);
select tests.ok((select count(*) from public.members) = 1, 'member sees only their own member row');
select tests.ok((select count(*) from public.member_private) = 1, 'member sees only their own private details');
select tests.ok((select count(*) from public.attendance_report) = 2, 'member attendance history shows only their own rows');
select tests.ok((select count(*) from public.attendance_sessions) = 0, 'member cannot see attendance sessions / token hashes');
select tests.throws($$update public.members set membership_status = 'member'$$, '42501', 'member cannot update members table directly');
select public.update_my_profile('{"city":"Epe","membership_status":"member"}'::jsonb, '{"residential_address":"9 Updated Close"}'::jsonb);
select tests.ok((select city from public.members) = 'Epe', 'member can update their own profile');
select tests.ok((select membership_status::text from public.members) = 'visitor',
  'member cannot promote themselves (still visitor: auto-promoted from first_timer after a 2nd check-in)');
select tests.ok((select residential_address from public.member_private) = '9 Updated Close', 'member can update their own private details');
select tests.throws($$select public.set_my_profile_photo('a0000000-0000-4000-8000-000000000001/x.png')$$, '22023',
  'member cannot point their photo at another user''s folder');
select tests.throws($$select public.admin_dashboard_stats()$$, '42501', 'member cannot read dashboard stats');
select tests.throws($$select * from public.admin_member_picker('Bello')$$, '42501', 'member cannot search other members');
select tests.throws($$select * from public.staff_directory()$$, '42501', 'member cannot list staff');
select tests.ok((select count(*) from public.audit_logs) = 0, 'member cannot read audit logs');
select tests.ok((select count(*) from public.follow_ups) = 0, 'member cannot read follow-ups');

-- ============================================================
-- 4. CONTENT ADMIN — no member PII, no attendance powers
-- ============================================================
reset role; set local role authenticated; select set_config('request.jwt.claims', :'jwt_content', true);
select tests.ok((select count(*) from public.members) = 0, 'content admin cannot read member records');
select tests.ok((select count(*) from public.member_private) = 0, 'content admin cannot read addresses / emergency contacts');
select tests.ok((select count(*) from public.attendance) = 0, 'content admin cannot read attendance');
select tests.ok((select count(*) from public.follow_ups) = 0, 'content admin cannot read follow-ups');
select tests.throws($$insert into public.attendance_sessions (service_id, qr_token_hash, qr_token_nonce, starts_at, ends_at)
  values ('e0000000-0000-4000-8000-000000000001', repeat('a', 64), 'x', now(), now() + interval '1 hour')$$,
  '42501', 'content admin cannot create QR sessions');
select tests.throws($$insert into public.services (title, starts_at, ends_at) values ('Hack', now(), now() + interval '1 hour')$$,
  '42501', 'content admin cannot create services');
select tests.throws($$select public.admin_record_attendance('d0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000001','physical','manual','because')$$,
  '42501', 'content admin cannot record attendance');
select tests.ok((select phone_last4 from public.admin_member_picker('Bello') limit 1) is null,
  'member picker hides phone digits from content admins');
select tests.ok((select count(*) from public.admin_member_picker('Bello')) = 1, 'content admin can find a member by name for recognitions');
insert into public.content_posts (content_type, title, slug) values ('announcement', 'Choir rehearsal', 'choir-rehearsal');
select tests.ok((select created_by from public.content_posts where slug = 'choir-rehearsal') = 'a0000000-0000-4000-8000-000000000003',
  'content creator is stamped from the session, not the client');
select tests.throws($$insert into public.content_posts (content_type, title, media_paths, status)
  values ('service_photo', 'Sunday photos', array['content/2026/10/a.jpg'], 'published')$$,
  '23514', 'cannot publish people photos without confirming consent');
insert into public.content_posts (content_type, title, media_paths, status, people_consent_confirmed)
  values ('service_photo', 'Sunday photos ok', array['content/2026/10/a.jpg'], 'published', true);
select tests.ok((select published_at is not null from public.content_posts where title = 'Sunday photos ok'), 'publishing stamps published_at');
select tests.throws($$insert into public.member_recognitions (member_id, display_name, recognition_title, status)
  values ('d0000000-0000-4000-8000-000000000001', 'Ada O.', 'Most Dressed', 'published')$$,
  '23514', 'cannot publish a recognition for a member without photo/recognition consent');
insert into public.member_recognitions (member_id, display_name, recognition_title, status)
  values ('d0000000-0000-4000-8000-000000000002', 'Tunde B.', 'Best Energy', 'published');
select tests.ok(((public.admin_dashboard_stats()) -> 'recent_activity') = 'null'::jsonb, 'content admin does not see the activity feed');
select tests.ok(((public.admin_dashboard_stats()) -> 'open_follow_ups') = 'null'::jsonb, 'content admin does not see follow-up counts');
-- A DELETE blocked by RLS matches zero rows rather than erroring; verified below.
delete from public.content_posts where slug = 'choir-rehearsal';
reset role;
select tests.ok(exists (select 1 from public.content_posts where slug = 'choir-rehearsal'), 'content admin hard delete affects no rows');

-- Public site sees only published content
set local role anon; select set_config('request.jwt.claims', '', true);
select tests.ok((select count(*) from public.content_posts where slug in ('published-news','draft-news')) = 1, 'anonymous visitors see published content only');
select tests.ok((select count(*) from public.member_recognitions) = 1, 'anonymous visitors see published recognitions');
select tests.ok((select count(*) from storage.objects where bucket_id = 'church-public-media') = 0, 'anonymous visitors cannot list the public bucket');

-- ============================================================
-- 5. ATTENDANCE ADMIN (usher)
-- ============================================================
reset role; set local role authenticated; select set_config('request.jwt.claims', :'jwt_usher', true);
select tests.ok((select count(*) from public.members) = 3, 'attendance admin can look members up');
select tests.ok((select count(*) from public.member_private) = 0, 'attendance admin cannot read private details');
select tests.ok((select count(*) from public.follow_ups) = 0, 'attendance admin cannot read follow-ups');
select tests.throws($$select public.admin_record_attendance('d0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000001','physical','manual','  ')$$,
  '23502', 'manual attendance requires a reason');
select tests.ok((public.admin_record_attendance('d0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000001','physical','admin_assisted','Phone battery died') ->> 'status') = 'recorded',
  'usher can record assisted attendance');
select tests.ok((public.admin_record_attendance('d0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000001','physical','manual','Again') ->> 'status') = 'already_checked_in',
  'manual record is also one-per-service');
select tests.throws($$select public.admin_record_attendance('d0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000003','physical','qr','Forge')$$,
  '22023', 'manual records cannot pretend to be QR scans');
select tests.throws($$select public.admin_save_member(null, '{"first_name":"Usher","last_name":"Made"}'::jsonb, '{"residential_address":"x"}'::jsonb)$$,
  '42501', 'attendance admin cannot write private details');
select tests.ok(public.admin_save_member(null, '{"first_name":"Mama","last_name":"Ngozi","phone":"08030000009"}'::jsonb) is not null,
  'attendance admin can register someone without a phone at the usher desk');
select tests.ok((select registration_assisted from public.members where first_name = 'Mama'), 'assisted registration is flagged');
select tests.throws($$update public.attendance_sessions set qr_token_hash = repeat('b', 64) where id = 'f0000000-0000-4000-8000-000000000001'$$,
  '42501', 'QR token hashes cannot be changed after creation');
update public.attendance_sessions set is_enabled = false where id = 'f0000000-0000-4000-8000-000000000005';
select tests.ok(not (select is_enabled from public.attendance_sessions where id = 'f0000000-0000-4000-8000-000000000005'), 'usher can disable a session');
select tests.throws($$insert into public.admin_roles (user_id, role) values ('a0000000-0000-4000-8000-000000000002', 'super_admin')$$,
  '42501', 'an ordinary admin cannot grant themselves roles');

-- Recovery codes
select public.admin_create_recovery_code('d0000000-0000-4000-8000-000000000001', encode(sha256(convert_to('ABCD2345', 'UTF8')), 'hex'), 15);
select tests.throws($$select * from public.recovery_codes$$, '42501', 'recovery codes are not readable through the API');
reset role; set local role service_role;
select tests.ok((public.redeem_recovery_code(encode(sha256(convert_to('ABCD2345', 'UTF8')), 'hex')) ->> 'status') = 'ok', 'a live recovery code can be redeemed once');
select tests.ok((public.redeem_recovery_code(encode(sha256(convert_to('ABCD2345', 'UTF8')), 'hex')) ->> 'status') = 'invalid', 'a used recovery code cannot be reused');
reset role;
insert into public.recovery_codes (member_id, code_hash, expires_at)
  values ('d0000000-0000-4000-8000-000000000001', encode(sha256(convert_to('EXPIRED1', 'UTF8')), 'hex'), now() - interval '1 minute');
set local role service_role;
select tests.ok((public.redeem_recovery_code(encode(sha256(convert_to('EXPIRED1', 'UTF8')), 'hex')) ->> 'status') = 'invalid', 'an expired recovery code is rejected');
reset role; set local role authenticated; select set_config('request.jwt.claims', :'jwt_m1', true);
select tests.throws($$select public.redeem_recovery_code(repeat('a', 64))$$, '42501', 'only the server (service role) can redeem codes');

-- ============================================================
-- 6. PASTORAL ADMIN
-- ============================================================
reset role; set local role authenticated; select set_config('request.jwt.claims', :'jwt_pastor', true);
select tests.ok((select count(*) from public.member_private) >= 2, 'pastoral admin can read private details');
insert into public.follow_ups (member_id, subject) values ('d0000000-0000-4000-8000-000000000001', 'Welcome call');
insert into public.member_contact_logs (member_id, channel, message_summary, outcome, next_step)
  values ('d0000000-0000-4000-8000-000000000001', 'whatsapp', 'Said hello', 'Reached', 'Invite to newcomers lunch');
select tests.ok((select contacted_by from public.member_contact_logs limit 1) = 'a0000000-0000-4000-8000-000000000004', 'contact log is stamped with the staff member');
select public.admin_save_member('d0000000-0000-4000-8000-000000000001', '{}'::jsonb, '{}'::jsonb, '{"membership_status":"member"}'::jsonb);
select tests.ok((select membership_status::text from public.members where id = 'd0000000-0000-4000-8000-000000000001') = 'member', 'pastoral admin can change membership status');
select tests.throws($$select public.admin_erase_member('d0000000-0000-4000-8000-000000000001', 'DELETE')$$, '42501', 'only super admins can erase members');
select tests.ok((select count(*) from public.followup_candidates(28, 50)) >= 1, 'pastoral admin gets follow-up candidates');
select tests.ok(((public.admin_dashboard_stats()) ->> 'open_follow_ups')::int = 1, 'pastoral admin sees follow-up counts');
select tests.ok((select count(*) from public.staff_directory()) = 4, 'staff directory lists admins for follow-up assignment');

-- ============================================================
-- 7. SUPER ADMIN, AUDIT LOG & ROLE SAFETY
-- ============================================================
reset role; set local role authenticated; select set_config('request.jwt.claims', :'jwt_super', true);
select tests.ok(exists (select 1 from public.audit_logs where action = 'attendance.insert' and metadata ->> 'reason' = 'Phone battery died'
  and actor_user_id = 'a0000000-0000-4000-8000-000000000002'), 'manual attendance is audited with actor and reason');
select tests.ok(not exists (select 1 from public.audit_logs where action = 'attendance.insert' and metadata ->> 'method' = 'qr'),
  'members'' own QR check-ins are not logged as admin activity');
select tests.ok(exists (select 1 from public.audit_logs where action = 'members.update'
  and actor_user_id = 'a0000000-0000-4000-8000-000000000004'), 'admin member edits are audited');
select tests.ok(not exists (select 1 from public.audit_logs where metadata::text like '%Secret Street%' or metadata::text like '%Updated Close%'),
  'audit metadata does not copy personal data');
select tests.throws($$delete from public.audit_logs$$, '42501', 'super admin cannot delete audit rows through the API');
select tests.throws($$update public.audit_logs set summary = 'x'$$, '42501', 'super admin cannot edit audit rows through the API');
select tests.throws($$insert into public.audit_logs (action, entity_type) values ('fake', 'x')$$, '42501', 'nobody can forge audit rows');
select tests.ok(jsonb_array_length((public.admin_dashboard_stats()) -> 'recent_activity') > 0, 'super admin sees the activity feed');
select tests.ok(((public.admin_dashboard_stats()) ->> 'present_today')::int >= 3, 'dashboard counts today''s attendance');

-- Revoke sessions → immediate re-verification at check-in
select tests.ok(public.admin_revoke_member_sessions('d0000000-0000-4000-8000-000000000001') = 1, 'super admin can sign a member out everywhere');
select set_config('request.jwt.claims', :'jwt_m1', true);
select tests.ok((public.check_in('TOKEN_PHYSICAL_OPEN_aaaaaaaaaaaaaaaaaaaaaa') ->> 'status') = 'reauth_required',
  'revoked session cannot check in even with an unexpired access token');

select set_config('request.jwt.claims', :'jwt_super', true);
select tests.throws($$delete from public.admin_roles where role = 'super_admin'$$, '42501', 'the last super admin cannot be removed');
insert into public.admin_roles (user_id, role) values ('a0000000-0000-4000-8000-000000000004', 'super_admin');
select tests.ok((select granted_by from public.admin_roles where user_id = 'a0000000-0000-4000-8000-000000000004' and role = 'super_admin')
  = 'a0000000-0000-4000-8000-000000000001', 'role grants record who granted them');
delete from public.admin_roles where user_id = 'a0000000-0000-4000-8000-000000000004' and role = 'super_admin';
select tests.ok(exists (select 1 from public.audit_logs where action = 'roles.revoke'), 'role changes are audited');

-- Erasure keeps attendance history, removes personal data
select tests.throws($$select public.admin_erase_member('d0000000-0000-4000-8000-000000000002', 'delete')$$, '22023', 'erasure requires typing DELETE exactly');
select public.admin_erase_member('d0000000-0000-4000-8000-000000000002', 'DELETE');
select tests.ok((select first_name = 'Erased' and phone is null and auth_user_id is null from public.members where id = 'd0000000-0000-4000-8000-000000000002'),
  'erased member has no personal data');
select tests.ok((select count(*) from public.attendance where member_id = 'd0000000-0000-4000-8000-000000000002') = 1, 'attendance history survives erasure');
select tests.ok((select count(*) from public.member_recognitions where member_id = 'd0000000-0000-4000-8000-000000000002') = 0, 'recognitions are unlinked on erasure');

-- Even the database owner cannot alter audit history
reset role;
select tests.throws($$delete from public.audit_logs$$, '42501', 'audit rows are immutable even for the database owner');

-- ============================================================
-- 8. STORAGE POLICIES
-- ============================================================
set local role authenticated; select set_config('request.jwt.claims', :'jwt_m1', true);
insert into storage.objects (bucket_id, name) values ('member-avatars', 'b0000000-0000-4000-8000-000000000001/me.webp');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('member-avatars', 'b0000000-0000-4000-8000-000000000002/x.webp')$$,
  '42501', 'member cannot upload into another member''s avatar folder');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('church-public-media', 'content/x.jpg')$$,
  '42501', 'member cannot upload public media');
reset role; set local role authenticated; select set_config('request.jwt.claims', :'jwt_content', true);
select tests.ok((select count(*) from storage.objects where bucket_id = 'member-avatars') = 0, 'content admin cannot see member avatars');
insert into storage.objects (bucket_id, name) values ('church-public-media', 'content/2026/10/ok.jpg');
select tests.throws($$insert into storage.objects (bucket_id, name) values ('church-public-media', 'avatars/leak.jpg')$$,
  '42501', 'public media must be uploaded under content/ or recognitions/');
reset role; set local role authenticated; select set_config('request.jwt.claims', :'jwt_usher', true);
select tests.ok((select count(*) from storage.objects where bucket_id = 'member-avatars') = 1, 'usher can view avatars to identify members');

reset role;
select 'ALL DATABASE TESTS PASSED' as result;
rollback;
