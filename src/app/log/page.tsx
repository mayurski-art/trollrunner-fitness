import type { Metadata } from "next";
import { Suspense } from "react";
import { LogClient } from "./log-client";

export const metadata: Metadata = { title: "Log activity" };

export default function LogPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
      <LogClient />
    </Suspense>
  );
}
