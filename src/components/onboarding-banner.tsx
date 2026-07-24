"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/lib/accounts/session-context";
import { getOnboardingStatus } from "@/lib/onboarding/api";

export function OnboardingBanner() {
  const { status, session } = useSession();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (status !== "authed" || !session) return;
    let cancelled = false;
    void getOnboardingStatus(session.userId).then((result) => {
      if (!cancelled) setNeedsOnboarding(result !== "complete");
    });
    return () => {
      cancelled = true;
    };
  }, [status, session]);

  if (status !== "authed" || !needsOnboarding) return null;

  return (
    <Link
      href="/onboarding"
      className="flex items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm transition-colors hover:border-brand"
    >
      <span className="font-medium text-foreground">
        🧌 Tell us about your goals — takes about 3 minutes.
      </span>
      <span className="shrink-0 font-semibold text-brand">Start →</span>
    </Link>
  );
}
