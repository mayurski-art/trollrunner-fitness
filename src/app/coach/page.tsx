import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "Coach" };

export default function CoachPage() {
  return (
    <PlaceholderPage
      title="Coach"
      phase="Phase 6 + 13"
      description="The brains of the operation: training load, race predictions, overtraining warnings, and plan adjustments — every recommendation with a plain-English why. A conversational coach joins later."
    />
  );
}
