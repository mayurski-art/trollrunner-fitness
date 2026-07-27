import type { Metadata } from "next";
import { CoachAdminClient } from "./coach-admin-client";

export const metadata: Metadata = { title: "Coach — unanswered questions" };

export default function CoachAdminPage() {
  return <CoachAdminClient />;
}
