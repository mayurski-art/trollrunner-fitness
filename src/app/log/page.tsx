import type { Metadata } from "next";
import { Suspense } from "react";
import { LogClient } from "./log-client";
import { SkeletonPage } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Log activity" };

export default function LogPage() {
  return (
    <Suspense fallback={<SkeletonPage />}>
      <LogClient />
    </Suspense>
  );
}
