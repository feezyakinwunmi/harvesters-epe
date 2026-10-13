import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Lock, UserRoundPen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth/session";
import { updateMyProfile } from "@/lib/actions/profile";
import { MemberProfileForm } from "@/components/forms/member-profile-form";
import { PageHero } from "@/components/site/page-hero";

export const metadata: Metadata = { title: "Edit profile", robots: { index: false } };

export default async function EditProfilePage() {
  const member = await getCurrentMember();
  if (!member) redirect("/register?next=/me/edit");
  const supabase = await createClient();
  const { data: priv } = await supabase.from("member_private").select("*").eq("member_id", member.id).maybeSingle();

  return (
    <>
      <PageHero
        eyebrow="Edit profile"
        icon={<UserRoundPen aria-hidden />}
        title={<>Tell us a little <span className="hc-gold-text">more.</span></>}
        description="Everything except your name is optional. Add what you are comfortable sharing."
      >
        <Link href="/me" className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-sm font-semibold text-white/80 hover:border-gold/50 hover:text-white">
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden /> Back to my profile
        </Link>
      </PageHero>
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <div className="hc-rise relative -mt-10 rounded-md border border-line bg-surface p-6 shadow-lift sm:p-10">
          <p className="mb-8 flex items-start gap-2.5 rounded-sm bg-accent-soft px-4 py-3 text-sm text-text">
            <Lock className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            Only authorised church staff can see these details. We never sell or share them.
          </p>
          <MemberProfileForm action={updateMyProfile} member={member} privateDetails={priv} showPrivate showAdmin={false} />
        </div>
      </div>
    </>
  );
}
