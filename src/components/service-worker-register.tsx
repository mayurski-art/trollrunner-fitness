"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js. See that file for why it exists — a no-op
 * service worker purely so iOS exempts this origin's localStorage (where
 * the login session lives) from its 7-day storage-eviction cap. Renders
 * nothing; this is a side effect only.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failure shouldn't break the app — worst case we're
        // back to the pre-fix eviction behavior.
      });
    }
  }, []);

  return null;
}
