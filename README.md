# Harvesters Epe — registration, QR attendance & member platform

Next.js 15 (App Router) · TypeScript (strict) · Supabase (Postgres, Auth, Storage) · Tailwind CSS v4 · shadcn-style components (Radix + Lucide)

Members register once on their phone, then a single scan of the service QR code checks them in. Staff get a role-scoped admin for members, attendance, services & printable QR sheets, follow-up, the Today page, news, events and recognitions.

---

## 1. What's verified, and what isn't

| Area | How it was checked |
|---|---|
| SQL migrations, RLS policies, check-in logic, role restrictions, audit immutability, recovery codes, storage policies | **113 assertions** run against real PostgreSQL 16 with a Supabase auth/storage shim (`npm run test:db`). Migrations are also re-applied to prove they're re-runnable. |
| Concurrency | 30 simultaneous scans by one member → exactly **1** attendance row (29 × "already checked in"). |
| QR tokens, permissions matrix, device cookie, phone/CSV/redirect helpers, time-zone maths | **39 unit tests** with Node's test runner (`npm test`). The token hash is cross-checked byte-for-byte against Postgres' `sha256()`. |
| React/Next code | Type-checked against generated database types with approximate stubs for Next/React/Supabase. **Not compiled with the real packages** — the build environment had no npm access. Your first `npm install && npm run build` is the real compile check. |

---

## 2. Review of the supplied schema — corrections made

The starter SQL was a good base but had real security gaps. All are fixed in `supabase/migrations/`:

1. **Members could change their own `membership_status`, `admin_notes`, `member_number`** — the self-update policy had no column guard. → Members/attendance have **no direct write grants**; all writes go through `SECURITY DEFINER` functions that whitelist columns.
2. **Content admins could read every member's address, emergency contact and admin notes** (`is_admin()` was used for member reads). → Sensitive fields moved to `member_private` (self + pastoral/super only); member rows readable by super/pastoral/attendance admins only; `admin_notes` removed (members could read notes about themselves).
3. **Any admin role could create QR sessions, insert/edit attendance and create services.** → Restricted to `attendance_admin` / `super_admin`.
4. **Any admin could insert audit rows with any `actor_user_id`** (forgery), and nothing prevented deleting/altering them. → Audit rows are written only by triggers stamped with `auth.uid()`; an immutability trigger blocks UPDATE/DELETE/TRUNCATE for everyone, including the database owner.
5. **Nothing stopped removal of the last super admin.** → Guard trigger.
6. **"Store only a hash" conflicted with "reprint the same QR later".** → Tokens are `HMAC-SHA256(QR_TOKEN_SECRET, kind:session:nonce)`. The DB stores the SHA-256 hash and the nonce; the server can regenerate the identical QR, but a database leak alone can't.
7. **`consent_to_contact` defaulted to `true`.** → Defaults to `false`; consent is an explicit tick with a timestamp.
8. **Anonymous users could list every file in the public bucket.** → Listing restricted to content admins; public URLs still work. Uploads must sit under `content/` or `recognitions/`.
9. **Recognitions exposed `member_id` publicly and had no consent check.** → Public `display_name` snapshot; a trigger refuses to publish a recognition for a member without photo/recognition consent.
10. **Publishing photos of people had no consent step.** → A trigger requires `people_consent_confirmed` before photo/video/highlight posts with media can be published.
11. **No explicit grants** (newer Supabase projects may not auto-expose tables). → Explicit least-privilege grants.
12. Added: separate **online check-in token** per session, member numbers (`HCE-00001`), usher **recovery codes** (hashed, single-use, 15 min), session **revocation**, follow-up `next_step`/linking, indexes, and `attendance_report` / `admin_role_assignments` views (`security_invoker`).

---

## 3. Architecture

```
app/
  (public)/            Home, register, sign-in, me, me/edit, today, news, events, privacy
  c/[token]/           QR / online-link check-in (no site chrome — fast on phones)
  admin/               Role-gated admin (sidebar layout)
    members/ attendance/ services/ follow-up/ today/ news/ events/
    content/ recognitions/ roles/ settings/ audit/
  print/qr/[id]/       A4 print sheet (own layout: no admin navigation prints)
  api/qr/[id]/         PNG / SVG download
components/            ui/ (design system), admin/, auth/, checkin/, register/, site/, forms/, me/
lib/
  actions/             Server Actions (every one re-checks permission server-side)
  auth/                session helpers, permissions matrix, device cookie
  data/                server-side queries
  qr/                  token derivation, QR rendering
  supabase/            server / browser / service-role clients
  validation/          zod schemas shared by client and server
supabase/
  migrations/          0001 schema · 0002 security · 0003 functions · 0004 audit & guards · 0005 storage
  tests/               database.test.sql (+ local shim)
  seed/demo.sql        optional, every row titled [DEMO]
tests/unit/            Node test runner
```

**Security layering.** Every admin page and Server Action checks the role in TypeScript (`requirePermission`), *and* the database enforces the same rules through RLS and `SECURITY DEFINER` functions. Hiding a button is never the control. The service-role key is used in exactly four places (all server-only): creating Auth users, redeeming usher codes, reading an account's email to send a code, and deleting an erased account.

### Role matrix

| | super | attendance | pastoral | content |
|---|:-:|:-:|:-:|:-:|
| Dashboard | ✓ | ✓ | ✓ | ✓ (no activity feed / follow-up counts) |
| Members: names, phones | ✓ | ✓ | ✓ | — (name search only, for recognitions) |
| Address, DOB, emergency contact | ✓ | — | ✓ | — |
| Services, QR sessions, manual attendance | ✓ | ✓ | view attendance | — |
| Follow-up & contact log | ✓ | — | ✓ | — |
| Today, media, news, events, recognitions | ✓ | — | — | ✓ |
| Roles, settings, audit log, permanent deletion, sign members out | ✓ | — | — | — |

---

## 4. Sign-in and the "12-month trusted device"

**Nobody invents a password.**

- **Registering:** the server creates a Supabase Auth user with a random 256-bit password, uses it once to open a session, and discards it. People without an email get an undeliverable internal address (`…@no-email.harvesters-epe.invalid`).
- **Scanning with a valid session:** the database identifies them from the JWT and records attendance immediately. No "Continue as" screen.
- **Session missing/expired:** a signed, httpOnly "remember this device" cookie shows **Continue as Ada O.** It is *not* a credential — continuing sends a one-time code to their email. "Not Ada? Use another account" clears it.
- **Recovery options:** email one-time code (Supabase OTP), SMS code (only if you configure an SMS provider), or an **8-character code an usher issues** after confirming the person face-to-face (single-use, 15 minutes, only its hash stored). Surname is never used as authentication.
- **12 months:** auth cookies are set for 365 days and Supabase refresh tokens keep the session alive. The database additionally refuses check-in for sessions older than 365 days (`private.session_is_trusted`), and super admins can **sign a member out of all devices**, which takes effect at the next scan.

**Platform limits, honestly:**
- A browser can clear cookies at any time (private mode, iOS storage pressure, user action). Then the person re-verifies with a code.
- Supabase's hard session cap ("Time-box user sessions") is a **Pro-plan** setting. On the free plan the 12-month cap is enforced by the app/database check above, not by Supabase Auth itself.
- Supabase's built-in email sender is heavily rate-limited (a few emails per hour). **Configure custom SMTP** (e.g. Resend, Postmark, Zoho) before launch.
- SMS needs a paid provider (Twilio, MessageBird, Vonage, Textlocal). Families sharing a phone can't both use SMS sign-in; they use email or an usher code.
- If Supabase ever stopped letting the database owner read `auth.sessions`, `session_is_trusted` falls back to trusting the (still verified) JWT and logs a warning, so Sunday check-in keeps working. Identity is unaffected; only the 12-month cap and instant revocation would be skipped.

---

## 5. Setup

### 5.1 Install

Requires **Node 22.6+**.

```bash
npm install
cp .env.example .env.local
```

Exact packages (already in `package.json`):

```bash
npm install next@^15.5.4 react@^19.1.1 react-dom@^19.1.1 \
  @supabase/ssr@^0.7.0 @supabase/supabase-js@^2.57.4 \
  zod@^4.1.11 react-hook-form@^7.63.0 qrcode@^1.5.4 server-only \
  @radix-ui/react-alert-dialog @radix-ui/react-checkbox @radix-ui/react-dialog \
  @radix-ui/react-label @radix-ui/react-slot @radix-ui/react-switch \
  class-variance-authority clsx tailwind-merge lucide-react sonner
npm install -D typescript @types/node @types/react @types/react-dom @types/qrcode \
  tailwindcss@^4.1.13 @tailwindcss/postcss@^4.1.13
```

### 5.2 Environment variables

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `…_ANON_KEY`) | browser + server | safe to expose; RLS protects data |
| `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) | **server only** | never `NEXT_PUBLIC_`, never commit |
| `NEXT_PUBLIC_SITE_URL` | both | **the final domain** — it's printed inside every QR |
| `QR_TOKEN_SECRET` | server only | 32+ random chars. Rotating it invalidates all printed QRs |
| `DEVICE_COOKIE_SECRET` | server only | 32+ random chars, different from the above |
| `NEXT_PUBLIC_SMS_OTP_ENABLED` | both | `true` only after configuring an SMS provider |
| `NEXT_PUBLIC_APP_TIMEZONE` | both | default `Africa/Lagos` |

Generate secrets: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

### 5.3 Database — run order

Run in the Supabase SQL editor **in this order** (or `supabase db push` with the CLI):

1. `supabase/migrations/20261013000001_schema.sql`
2. `supabase/migrations/20261013000002_security.sql`
3. `supabase/migrations/20261013000003_functions.sql`
4. `supabase/migrations/20261013000004_audit_and_guards.sql`
5. `supabase/migrations/20261013000005_storage.sql`
6. *(staging only, optional)* `supabase/seed/demo.sql`

Use a **new project** rather than one that already ran the starter schema. (The migrations do drop the starter's policies, but the starter's `members` table has columns this schema moved.)

### 5.4 Supabase dashboard settings

1. **Authentication → Sign In / Providers:** keep **Email** enabled. Turn **off "Allow new users to sign up"** — the app creates accounts server-side (the admin API still works), so this stops anyone creating accounts directly with the public key.
2. **Authentication → Email templates → Magic Link:** include the code, e.g. `Your Harvesters Epe sign-in code is {{ .Token }}`. Without `{{ .Token }}` people receive a link instead of a code.
3. **Authentication → SMTP:** configure a custom SMTP sender.
4. **Authentication → URL configuration:** Site URL = your domain.
5. *(Pro plan)* **Authentication → Sessions:** time-box sessions to 8760 hours.
6. *(Optional)* **SMS provider**, then set `NEXT_PUBLIC_SMS_OTP_ENABLED=true`.

### 5.5 Create the first super admin (safely)

1. Deploy (or `npm run dev`) and **register yourself** at `/register` with your real email.
2. In the SQL editor, find your account and grant the role — run it by email so you can't paste the wrong UUID:

```sql
insert into public.admin_roles (user_id, role)
select id, 'super_admin' from auth.users where email = 'you@example.com'
on conflict (user_id, role) do nothing;
```

3. Sign in again and open `/admin`. Grant every other role from **Admin users & roles** — never by SQL — so changes are audited.

### 5.6 Run

```bash
npm run dev        # http://localhost:3000
npm run build && npm start
```

On Vercel, set the env vars and make sure `NEXT_PUBLIC_SITE_URL` is the production domain **before printing QR sheets**.

---

## 6. Tests

```bash
npm test                                   # unit tests (Node test runner)
PGURL=postgres://postgres@localhost:5432/postgres npm run test:db   # local Postgres 15+
psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/database.test.sql   # real Supabase staging
```

The DB suite runs in one transaction and rolls back. **Never run it against production.** Never run `supabase/tests/local/supabase_shim.sql` on a real Supabase project (it refuses to, but don't try).

`npm run db:types` regenerates `types/database.generated.ts` from your project — diff it against `types/database.ts` after schema changes.

---

## 7. Manual test script (do this on staging before Sunday)

| # | Flow | Steps | Expect |
|---|---|---|---|
| 1 | Registration | Phone in a private window → `/register`, name + phone only, tick privacy | Lands on `/me` "You're registered"; member number `HCE-…` |
| 2 | QR printing | Admin → Services → New service (keep "Create the QR code now") → **Print A4** | Clean A4 sheet: church, service, date/time, QR, three steps; no admin nav in print preview. Reprint later gives the identical code |
| 3 | Valid-session check-in | Scan the printed QR with the phone from step 1 during the window | "You're in, Ada." immediately — no confirmation screen |
| 4 | Duplicate | Scan again | "You're already checked in" with the original time; still one row in Attendance |
| 5 | New visitor via QR | New private window, scan | "First time here? Register" → after registering, returns to the QR and is checked in without re-scanning |
| 6 | Expired/missing session | Clear the site's `sb-…` cookies (keep `hc_device`), scan | "Continue as Ada O." → code emailed → enter code → checked in |
| 7 | Not me | On step 6 screen tap "Not Ada? Use another account" | Device forgotten; register / sign-in options shown |
| 8 | Usher code | Admin → member → **Sign-in code** → on a fresh device: scan → "I have a code from an usher" | Signed in and checked in; reusing the code fails |
| 9 | Closed / not open | Pause the session, scan; or scan a future session | "Check-in … closed / hasn't opened" with usher guidance; **no** attendance row |
| 10 | Manual attendance | Admin → Attendance → Record attendance, leave reason blank, then with a reason | Blank reason refused; with reason → recorded, audit log shows actor + reason |
| 11 | Online | Enable online on a service, copy the online link, open it signed in | Recorded as Online, separate from in-person |
| 12 | Role restriction | Give a test account only `content_admin` | Sidebar shows content only; `/admin/members` shows "no access"; member search shows names but no phone digits |
| 13 | Media upload | Content → Add photos, upload, try **Publish** without the consent tick | Refused until consent is ticked; published photos appear on `/today` |
| 14 | Deletion confirmation | As super admin, member → **Erase permanently**, type `delete` | Button stays disabled until exactly `DELETE`; afterwards personal data gone, attendance totals kept, audit entry written |
| 15 | Export | Attendance → filter by service → Export CSV | Opens cleanly in Excel (UTF-8, no formula injection) |

---

## 8. Remaining limitations (honest list)

- **Not compiled here** (no npm access in the build environment). Expect the first `npm run build` to surface small type mismatches, most likely around Supabase's embedded-select typing (`services(...)`, `members(...)`), Radix prop types, or zod v4 edge cases. The SQL and pure logic *are* tested.
- **Rate limiting.** The registration Server Action creates Auth users; it has a honeypot but no IP rate limit. Add Vercel Firewall / Upstash rate limiting before a public launch.
- **Orphaned uploads.** Files uploaded and then abandoned before saving a post stay in the bucket. Removed files *are* deleted on save. A periodic clean-up job is a good follow-up.
- **Videos** are capped at 15 MB (bucket limit). Use YouTube for full-service recordings and link them in the body.
- **Messaging** is deliberately manual: WhatsApp/call links per person, no bulk sending.
- **Member directory** is staff-only. A members-can-see-members directory has privacy implications; add it only with explicit opt-in.
- **Time zone** is one setting for the whole app (Africa/Lagos).
- The privacy notice is plain-language; have your data-protection lead review it against the **Nigeria Data Protection Act 2023** before launch.
