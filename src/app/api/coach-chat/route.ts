import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/accounts/server-client";
import { buildCoachFacts, fetchActivities } from "@/lib/coach-chat/context";
import { findAnswer } from "@/lib/coach-chat/retrieval";
import { listLearnedAnswers, queueQuestion } from "@/lib/coach-chat/learned-answers";
import { generateFreeReply, type ChatTurn } from "@/lib/coach-chat/free-providers";
import { parseWorkoutText } from "@/lib/activities/import/parse-workout";
import { summarizeStrengthTrends, renderStrengthTrendsForPrompt } from "@/lib/coach/strength-progress";

export const runtime = "nodejs";

const NO_MATCH_REPLY =
  "I don't have a stored answer for that yet — I've sent your question to Troll Runner, and it'll be added here once answered.";

const MEDICAL_DISCLAIMER =
  "This is educational fitness coaching, not medical advice — if that sounds like pain, an injury, or a health condition, see a doctor rather than pushing through it.";

/**
 * Loose heuristic for "this message is a workout paste, not a question" —
 * two or more weight-ish tokens ("35 lbs", "65lb") and two or more rep-ish
 * tokens ("8 reps", "x11") is enough signal without demanding a rigid
 * format, since the whole point is accepting whatever notation the user
 * actually writes in.
 */
function looksLikeWorkoutPaste(message: string): boolean {
  const weightHits = message.match(/\d+\s*(lbs?|kg)\b/gi)?.length ?? 0;
  const repHits = message.match(/\d+\s*reps?\b/gi)?.length ?? 0;
  return weightHits >= 2 && repHits >= 2;
}

function renderNotesForPrompt(notes: Awaited<ReturnType<typeof buildCoachFacts>>["recentNotes"]): string {
  if (notes.length === 0) return "None logged yet.";
  return notes.map((n) => `${n.date} (${n.label}): "${n.text}"`).join("\n");
}

function buildCoachSystemPrompt(facts: Awaited<ReturnType<typeof buildCoachFacts>>, trendsText: string): string {
  return `You are the TrollRunner Fitness coach — direct, specific, data-driven, no filler. ${MEDICAL_DISCLAIMER}

Answer using ONLY the facts below; never invent a number that isn't given. When asked to analyze training or recommend improvements, look at the strength trend data for exercises marked "down" or "flat" across sessions (stalled/plateaued), obvious imbalances between muscle groups, and volume gaps — name the specific exercise and a concrete thing to try (add a set, change the rep range, adjust the angle/grip), not a generic "lift heavier". Plain text, a few short paragraphs at most, no markdown headers or bullet walls.

The athlete's own notes below are the highest-signal input you have — every numeric fact is derived, but notes are what they actually said about pain, fatigue, form, motivation, and how a session felt. Weigh them heavily: a note mentioning soreness or pain in a specific area should change what you recommend for that area (lighter load, different exercise, more rest) even if the numbers alone would say otherwise; a note like "felt easy" or "could've done more" is a real signal to progress that exercise; a plateau the athlete calls out in their own words should be taken as seriously as one you'd infer from the trend data. If a note describes something injury-like, lead with the medical disclaimer for that specific part of your answer, not just a generic footer.

ATHLETE FACTS:
- Training status: "${facts.loadStatus.label}" — Load Impact ${facts.load.loadImpact}, Base Fitness ${facts.load.baseFitness}, Intensity Trend ${facts.load.intensityTrendPct}%
- Weekly mileage: ${facts.weeklyMileage}, current streak: ${facts.streak} days
- Recovery: ${facts.recoveryStatus.label} (score ${facts.recoveryScore ?? "n/a"})
- Goals: ${facts.goals.join(", ") || "none set"}
- Today's planned workout: ${facts.todayWorkout ? `${facts.todayWorkout.type} — ${facts.todayWorkout.detail}` : "none"}

STRENGTH TRENDS (most recent session first per exercise):
${trendsText}

ATHLETE'S OWN NOTES (newest first — from activity logs and recovery check-ins):
${renderNotesForPrompt(facts.recentNotes)}`;
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

  const body = await req.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const historyIn = Array.isArray(body?.history) ? body.history : [];
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const rotationSeed = Math.floor(Date.now() / 60_000);

  // A pasted workout gets parsed and handed back for review, not answered
  // as a question — same parser /log's paste tab uses, so a paste dropped
  // into chat behaves identically either place.
  if (looksLikeWorkoutPaste(message)) {
    const { data: setRows } = await sb.from("fit_strength_sets").select("exercise").eq("user_id", user.id).limit(1000);
    const knownExercises = Array.from(new Set((setRows || []).map((r) => r.exercise).filter(Boolean))).sort();
    const result = await parseWorkoutText(message, knownExercises, rotationSeed);
    if (result.ok) {
      const setCount = result.workout.sets.length;
      const exerciseCount = new Set(result.workout.sets.map((s) => s.exercise)).size;
      return NextResponse.json({
        reply: `Read that as "${result.workout.title}" — ${setCount} sets across ${exerciseCount} exercises. Tap below to review and save it.`,
        parsedWorkout: result.workout,
      });
    }
    // Parsing failed — fall through and let it be handled as a normal
    // message rather than dead-ending on a parse error.
  }

  const [facts, learned] = await Promise.all([buildCoachFacts(sb, user.id), listLearnedAnswers(sb)]);
  const match = await findAnswer(message, facts, learned);
  if (match) {
    return NextResponse.json({ reply: match.reply });
  }

  const activities = await fetchActivities(sb, user.id);
  const trendsText = renderStrengthTrendsForPrompt(summarizeStrengthTrends(activities));
  const system = buildCoachSystemPrompt(facts, trendsText);
  const history: ChatTurn[] = [
    ...historyIn
      .filter((m: unknown): m is { role: string; text: string } => {
        const row = m as { role?: unknown; text?: unknown };
        return (row.role === "user" || row.role === "assistant") && typeof row.text === "string";
      })
      .map((m: { role: string; text: string }) => ({ role: m.role as "user" | "assistant", content: m.text })),
    { role: "user", content: message },
  ];

  const freeReply = await generateFreeReply(system, history, rotationSeed);
  if (freeReply) {
    return NextResponse.json({ reply: freeReply.content });
  }

  await queueQuestion(sb, user.id, message);
  return NextResponse.json({ reply: NO_MATCH_REPLY });
}
