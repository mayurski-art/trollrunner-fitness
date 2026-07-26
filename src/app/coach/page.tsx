import type { Metadata } from "next";
import { CoachClient } from "./coach-client";

export const metadata: Metadata = { title: "Coach" };

export default function CoachPage() {
  return <CoachClient />;
}
