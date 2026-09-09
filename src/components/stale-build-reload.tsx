"use client";

import { useEffect } from "react";

/**
 * A Home Screen PWA on iOS can sit frozen in the background for days —
 * it never re-fetches the HTML/JS after a new deploy the way a normal
 * browser tab would on next load. So instead of relying on cache
 * headers, check the live build id whenever the app comes back to the
 * foreground and force a real reload if it's changed.
 */
export function StaleBuildReload() {
  useEffect(() => {
    const current = process.env.NEXT_PUBLIC_BUILD_ID;
    if (!current || current === "dev") return;

    async function checkStale() {
      try {
        const res = await fetch("/api/build-id", { cache: "no-store" });
        const data = await res.json();
        if (data.buildId && data.buildId !== current) {
          window.location.reload();
        }
      } catch {
        // Offline or request failed — don't reload on a guess.
      }
    }

    function onVisible() {
      if (document.visibilityState === "visible") void checkStale();
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", checkStale);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", checkStale);
    };
  }, []);

  return null;
}
