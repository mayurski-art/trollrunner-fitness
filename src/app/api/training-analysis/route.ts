import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/accounts/server-client";
import { buildCoachFacts, fetchActivities } from "@/lib/coach-chat/context";
import { generateFreeReply } from "@/lib/coach-chat/free-providers";
import { detectSplitPattern, type SplitPattern } from "@/lib/strength/detect-pattern";

export const runtime = "nodejs";

const MEDICAL_DISCLAIMER =
  "This is educational fitness coaching, not medical advice — if a specific exercise causes pain, see a doctor rather than pushing through it.";

async function fetchCurrentWeightLb(sb: ReturnType<typeof getServerClient>, userId: string): Promise<number | null> {
  const { data } = await sb
    .from("fit_body_weight")
    .select("weight_lb")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.weight_lb) return data.weight_lb;

  // No hand-logged weigh-in yet — fall back to the onboarding profile value.
  const { data: profile } = await sb.from("fit_profiles").select("weight_kg").eq("user_id", userId).maybeSingle();
  return profile?.weight_kg ? Math.round(profile.weight_kg * 2.20462) : null;
}

function buildAnalysisPrompt(
  pattern: SplitPattern,
  weightLb: number | null,
  goals: string[],
  notes: { date: string; label: string; text: string }[]
): string {
  const daysText = pattern.trainedDays
    .map((d) => `${d.day}: ${d.label} — ${d.exercises.join(", ") || "no exercises classified"}`)
    .join("\n");
  const notesText = notes.length
    ? notes.map((n) => `${n.date} (${n.label}): "${n.text}"`).join("\n")
    : "None logged.";

  return `You are the TrollRunner Fitness coach reviewing an athlete's ACTUAL logged strength split — detected from their real training history, not a generic template. ${MEDICAL_DISCLAIMER}

Be specific and concrete, referencing their real days and muscle groups by name. If a day is flagged as the best open slot for a missing muscle group, explain briefly why it fits (e.g. it sits between two existing training days, giving recovery on both sides). If nothing is missing and the split looks reasonably balanced, say so plainly instead of inventing a problem. Two to four short sentences, plain text, no headers or bullet lists.

DETECTED SPLIT (days with a real recurring pattern):
${daysText || "No recurring day-of-week pattern yet."}
Rest days: ${pattern.restDays.join(", ") || "none"}
Muscle groups never trained in the last 8 weeks: ${pattern.missingGroups.join(", ") || "none — full coverage"}
${pattern.suggestedDay ? `Best open day to add a missing group: ${pattern.suggestedDay}` : ""}

ATHLETE CONTEXT:
Current weight: ${weightLb ? `${weightLb} lb` : "not logged"}
Goals: ${goals.join(", ") || "none set"}
Recent notes (highest-signal — weigh soreness/pain/plateau/"felt easy" mentions heavily):
${notesText}`;
}

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

  const activities = await fetchActivities(sb, user.id);
  const pattern = detectSplitPattern(activities);
  if (!pattern) {
    // Not enough logged strength history yet to detect a real pattern —
    // the canned-template picker on /training is still the right fallback.
    return NextResponse.json({ pattern: null });
  }

  const [weightLb, facts] = await Promise.all([fetchCurrentWeightLb(sb, user.id), buildCoachFacts(sb, user.id)]);

  const rotationSeed = Math.floor(Date.now() / 60_000);
  const system = buildAnalysisPrompt(pattern, weightLb, facts.goals, facts.recentNotes);
  const freeReply = await generateFreeReply(
    system,
    [{ role: "user", content: "Analyze my current split and suggest how to improve it." }],
    rotationSeed
  );

  return NextResponse.json({
    pattern,
    weightLb,
    coachNote: freeReply?.content ?? null,
  });
}
