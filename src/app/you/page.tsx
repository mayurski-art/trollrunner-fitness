import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata: Metadata = { title: "You" };

export default function YouPage() {
  return (
    <PlaceholderPage
      title="You"
      phase="Phase 1–2"
      description="Sign in with your TrollRunner account, run the onboarding questionnaire, and this becomes your profile: goals, PRs, streaks, badges, and everything the coach knows about you."
    />
  );
}
