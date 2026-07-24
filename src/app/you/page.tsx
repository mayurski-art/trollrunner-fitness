import type { Metadata } from "next";
import { YouClient } from "./you-client";

export const metadata: Metadata = { title: "You" };

export default function YouPage() {
  return <YouClient />;
}
