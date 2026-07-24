import type { Metadata } from "next";
import { LogClient } from "./log-client";

export const metadata: Metadata = { title: "Log activity" };

export default function LogPage() {
  return <LogClient />;
}
