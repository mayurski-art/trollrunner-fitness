// Turns a freeform pasted workout (however the user happens to write it —
// "x2 35 lbs each side 8 reps", "3x65 for 11", "to failure", stray notes
// mixed in) into structured sets, via the same free-tier LLM round-robin
// coach chat uses. Regex/pattern matching was considered and rejected: the
// backlog transcription this mirrors (src/lib/activities/import/backlog.ts)
// shows just how irregular the real notation is session to session.
//
// Parsing and saving are deliberately separate steps — this never writes to
// the DB. Callers always show the result for the user to confirm/edit
// before calling logStrength(), so a bad parse can't silently corrupt
// history.

import { generateFreeReply, MAX_OUTPUT_TOKENS_PARSE } from "@/lib/coach-chat/free-providers";

export type ParsedSet = { exercise: string; weightLb: string; reps: string };

export type ParsedWorkout = {
  title: string;
  notes: string;
  sets: ParsedSet[];
  /** Exercise names the model wasn't confident matched a known name. */
  warnings: string[];
};

const SYSTEM_PROMPT = `You convert a freeform strength-workout note into JSON. Reply with ONLY a JSON object, no markdown fences, no commentary.

Shape:
{
  "title": string,       // short session title, e.g. "Legs and arms"
  "notes": string,       // freeform commentary from the text (form notes, how it felt, plateaus) — keep the user's own words, don't invent any
  "sets": [{ "exercise": string, "weightLb": string, "reps": string }],
  "warnings": string[]   // exercise names you weren't confident matched a KNOWN_EXERCISES entry (new exercise, or possible typo) — name the exercise, not a sentence
}

Rules:
- One entry in "sets" per individual set actually performed. "x3 65 lbs 11 reps" means three separate set objects, each {"exercise": "...", "weightLb": "65", "reps": "11"}.
- Weight is TOTAL load on the body, not per side. "35 lbs each side" on a machine with two weight stacks (hack squat, leg press) means weightLb "70". A single-number machine stack (leg curl, leg extension, cable) is already total — use it as written.
- Prefer an exact match from KNOWN_EXERCISES when the text is clearly the same exercise under a different phrasing (e.g. "regular dumbbell hammer curls" -> "Hammer Curl" if that's the known name, vs "Hammer Curl (Cross Body)" if the text says cross-body). If nothing in KNOWN_EXERCISES is a confident match, use a reasonable Title Case name from the text and add it to "warnings".
- If reps is a range or "to failure" or missing, put exactly what was written (e.g. "to failure", "") in "reps" — never invent a number.
- Fold any commentary that isn't a set (how it felt, plateaus, form notes) into "notes", not into an exercise name.`;

function extractJson(raw: string): string {
  // Strip ```json fences if the model added them despite instructions.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : raw;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return body.trim();
  return body.slice(start, end + 1);
}

function isValidShape(value: unknown): value is ParsedWorkout {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.title !== "string" || typeof v.notes !== "string") return false;
  if (!Array.isArray(v.sets)) return false;
  return v.sets.every(
    (s) =>
      s &&
      typeof s === "object" &&
      typeof (s as ParsedSet).exercise === "string" &&
      typeof (s as ParsedSet).weightLb === "string" &&
      typeof (s as ParsedSet).reps === "string"
  );
}

export type ParseWorkoutResult =
  | { ok: true; workout: ParsedWorkout; provider: string }
  | { ok: false; error: string };

export async function parseWorkoutText(
  rawText: string,
  knownExercises: string[],
  rotationSeed: number
): Promise<ParseWorkoutResult> {
  const text = rawText.trim();
  if (!text) return { ok: false, error: "Paste a workout first." };

  const system = `${SYSTEM_PROMPT}\n\nKNOWN_EXERCISES:\n${knownExercises.join(", ") || "(none logged yet)"}`;

  const result = await generateFreeReply(
    system,
    [{ role: "user", content: text }],
    rotationSeed,
    MAX_OUTPUT_TOKENS_PARSE,
    (content) => {
      try {
        return isValidShape(JSON.parse(extractJson(content)));
      } catch {
        return false;
      }
    }
  );

  if (!result) {
    return { ok: false, error: "Couldn't reach a parser right now — try again in a moment, or use the manual form." };
  }

  try {
    const parsed = JSON.parse(extractJson(result.content));
    if (!isValidShape(parsed)) throw new Error("malformed shape");
    return {
      ok: true,
      workout: { ...parsed, warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [] },
      provider: result.provider,
    };
  } catch {
    return { ok: false, error: "Got a reply but couldn't read it as a workout — try rephrasing or use the manual form." };
  }
}
