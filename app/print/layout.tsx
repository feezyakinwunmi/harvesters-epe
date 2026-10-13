import type { Metadata } from "next";

export const metadata: Metadata = { title: "Print", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Bare layout: no site header or admin navigation, so only the sheet prints.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-fill print:bg-white">{children}</div>;
}
