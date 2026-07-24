import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "Log activity" };

export default function LogPage() {
  return (
    <PlaceholderPage
      title="Log activity"
      phase="Phase 3"
      description="Manual run and strength logging lands here first — distance, time, splits, sets and reps. Strava auto-sync follows in Phase 5 so most days you won't need this page at all."
    />
  );
}
