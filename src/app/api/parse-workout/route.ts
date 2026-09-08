import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/accounts/server-client";
import { parseWorkoutText } from "@/lib/activities/import/parse-workout";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const sb = getServerClient(token);
  const { data: userData, error: authError } = await sb.auth.getUser(token);
  const user = userData?.user;
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "Paste a workout first." }, { status: 400 });
  }

  // Known-exercise list comes from the user's own history rather than a
  // fixed catalog — STRENGTH_EXERCISE_PRESETS is just 8 starter names, and
  // real logs (see backlog.ts) use dozens of specific machine/exercise
  // names that only exist in what's actually been logged.
  const { data: setRows } = await sb
    .from("fit_strength_sets")
    .select("exercise")
    .eq("user_id", user.id)
    .limit(1000);
  const knownExercises = Array.from(new Set((setRows || []).map((r) => r.exercise).filter(Boolean))).sort();

  // Rotation seed: count today's parse+chat requests isn't tracked here
  // (no persistent state across serverless invocations, same as
  // coach-chat) — use a coarse per-minute value so repeated requests
  // don't all hammer the same provider first.
  const rotationSeed = Math.floor(Date.now() / 60_000);

  const result = await parseWorkoutText(text, knownExercises, rotationSeed);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ workout: result.workout, provider: result.provider });
}
