import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy notice" };

// Plain-language notice. Have the church's data-protection lead review it
// against the Nigeria Data Protection Act 2023 before launch.
export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="text-h1 text-ink">How we use your details</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">
        Harvesters Epe Campus collects a small amount of information so we can welcome you, record service attendance and care for our church family.
      </p>

      <div className="mt-10 space-y-10 text-[16px] leading-[1.75] text-text">
        <section>
          <h2 className="text-h3 text-ink">What we collect</h2>
          <p className="mt-2">
            Your name and phone number are required. Everything else is optional: email, gender, date of birth, marital status, address, school or work,
            church involvement, an emergency contact and a profile photo. When you scan a service code we record which service you attended, the time and
            whether you attended in person or online.
          </p>
        </section>
        <section>
          <h2 className="text-h3 text-ink">Who can see it</h2>
          <p className="mt-2">
            Only church staff with a specific role. Ushers can look up names and phone numbers to help with check-in. Pastoral staff can see private details
            such as your address, date of birth and emergency contact so they can care for you. Media volunteers cannot see your contact details. Every
            administrative change is recorded in an audit log.
          </p>
        </section>
        <section>
          <h2 className="text-h3 text-ink">Your choices</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li><strong>Contact:</strong> we only reach out if you tick &ldquo;You may contact me&rdquo;. We never send bulk messages without a staff member reviewing them first.</li>
            <li><strong>Photos and recognitions:</strong> we only feature you publicly if you tick the photo consent box.</li>
            <li>You can change either choice anytime from your profile.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-h3 text-ink">Staying signed in</h2>
          <p className="mt-2">
            After you register or confirm a one-time code, your phone stays signed in for up to 12 months so check-in is a single scan. Use
            &ldquo;Sign out&rdquo; or &ldquo;Not me&rdquo; on your profile on a shared phone.
          </p>
        </section>
        <section>
          <h2 className="text-h3 text-ink">Keeping or deleting your data</h2>
          <p className="mt-2">
            We never sell or share your information. You can ask the church office to correct or delete your record at any time. If your record is deleted,
            your personal details are erased; anonymous attendance totals are kept so service statistics stay accurate.
          </p>
        </section>
      </div>
    </article>
  );
}
