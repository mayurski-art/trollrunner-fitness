import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@/lib/accounts/server-client";
import { buildCoachFacts } from "@/lib/coach-chat/context";
import { findAnswer } from "@/lib/coach-chat/retrieval";
import { listLearnedAnswers, queueQuestion } from "@/lib/coach-chat/learned-answers";

export const runtime = "nodejs";

const NO_MATCH_REPLY =
  "I don't have a stored answer for that yet — I've sent your question to Troll Runner, and it'll be added here once answered.";

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
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const [facts, learned] = await Promise.all([buildCoachFacts(sb, user.id), listLearnedAnswers(sb)]);
  const match = await findAnswer(message, facts, learned);

  if (match) {
    return NextResponse.json({ reply: match.reply });
  }

  await queueQuestion(sb, user.id, message);
  return NextResponse.json({ reply: NO_MATCH_REPLY });
}
