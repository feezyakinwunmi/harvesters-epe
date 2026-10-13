import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export type ChurchSettings = {
  name: string;
  campus: string;
  short_name: string;
  timezone: string;
  support_contact: string;
};

export type CheckInSettings = {
  opens_minutes_before: number;
  closes_minutes_after: number;
};

const DEFAULT_CHURCH: ChurchSettings = {
  name: "Harvesters International Christian Centre",
  campus: "Epe Campus",
  short_name: "Harvesters Epe",
  timezone: "Africa/Lagos",
  support_contact: "",
};

const DEFAULT_CHECK_IN: CheckInSettings = { opens_minutes_before: 45, closes_minutes_after: 90 };

const DEFAULT_CATEGORIES = ["Most Dressed", "Most Engaged", "Most Prayerful", "Best Energy"];

// Public settings rarely change: cache them across requests for 5 minutes.
// Saving settings calls revalidateTag(SETTINGS_TAG) so edits show at once.
export const SETTINGS_TAG = "settings";

const loadSettingRows = unstable_cache(
  async () => {
    const { data } = await createPublicClient().from("app_settings").select("key, value").in("key", ["church", "recognition_categories", "check_in"]);
    return data ?? [];
  },
  ["public-settings"],
  { tags: [SETTINGS_TAG], revalidate: 300 },
);

export const getSettings = cache(async () => {
  const data = await loadSettingRows();
  const map = new Map(data.map((r) => [r.key, r.value]));

  const church = { ...DEFAULT_CHURCH, ...((map.get("church") as Partial<ChurchSettings> | undefined) ?? {}) };
  const checkInRaw = (map.get("check_in") as Partial<CheckInSettings> | undefined) ?? {};
  const checkIn: CheckInSettings = {
    opens_minutes_before: Number(checkInRaw.opens_minutes_before ?? DEFAULT_CHECK_IN.opens_minutes_before),
    closes_minutes_after: Number(checkInRaw.closes_minutes_after ?? DEFAULT_CHECK_IN.closes_minutes_after),
  };
  const cats = map.get("recognition_categories");
  const recognitionCategories = Array.isArray(cats) ? cats.filter((c): c is string => typeof c === "string") : DEFAULT_CATEGORIES;

  return { church, checkIn, recognitionCategories };
});
