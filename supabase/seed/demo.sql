-- ============================================================
-- OPTIONAL DEMO DATA — for a staging project only.
-- Every row is titled "[DEMO]" so it can't be mistaken for real content.
-- Remove with the DELETE statements at the bottom.
--
-- QR sessions are deliberately NOT seeded: their tokens are derived from
-- QR_TOKEN_SECRET on the server. Open the demo service in /admin/services
-- and click "Create QR session".
-- ============================================================

insert into public.services (title, service_type, starts_at, ends_at, location, status, allow_online_attendance)
values (
  '[DEMO] Sunday Service',
  'sunday_service',
  date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos' + interval '8 hours',
  date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos' + interval '10 hours 30 minutes',
  'Harvesters Epe Campus (demo)',
  'scheduled',
  true
);

insert into public.content_posts (content_type, title, slug, summary, body, key_takeaways, speaker_name, scripture_reference, status)
values
  ('today_message', '[DEMO] Rooted and fruitful', 'demo-rooted-and-fruitful',
   'Demo message used to preview the Today page layout.',
   'This is demo text. Replace it with the real message notes after service.',
   array['Demo takeaway one', 'Demo takeaway two', 'Demo takeaway three'],
   'Demo Speaker', 'John 15:1–8', 'published'),
  ('announcement', '[DEMO] Choir auditions', 'demo-choir-auditions',
   'Demo announcement to preview the news list.', 'Demo body text.', '{}', null, null, 'published');

insert into public.content_posts (content_type, title, slug, summary, event_starts_at, event_ends_at, event_location, status)
values ('event', '[DEMO] Youth hangout', 'demo-youth-hangout', 'Demo event to preview the events page.',
        now() + interval '6 days', now() + interval '6 days 3 hours', 'Epe campus hall (demo)', 'published');

-- Clean-up:
-- delete from public.content_posts where title like '[DEMO]%';
-- update public.services set deleted_at = now(), status = 'cancelled' where title like '[DEMO]%';
