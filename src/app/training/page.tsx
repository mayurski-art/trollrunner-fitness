import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "Training" };

export default function TrainingPage() {
  return (
    <PlaceholderPage
      title="Training"
      phase="Phase 6–7"
      description="Your adaptive plan lives here: periodized running blocks (5K to marathon), strength programs with progressive overload, and a calendar that reshuffles itself around how you actually train."
    />
  );
}
