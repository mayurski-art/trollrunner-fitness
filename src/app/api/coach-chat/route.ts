import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getServerClient } from "@/lib/accounts/server-client";
import { buildCoachContext } from "@/lib/coach-chat/context";

export const runtime = "nodejs";

type ChatTurn = { role: "user" | "assistant"; text: string };

const SYSTEM_TEMPLATE = (username: string, context: string) => `You are the AI coach inside TrollRunner Fitness, talking to ${username}.
You have their real training data below — reason from it, don't guess.

${context}

Be direct and specific: reference their actual numbers rather than generic advice. Keep replies short — a few sentences, not an essay, this is a chat not a report. You can explain the "why" behind a training-load or recovery recommendation, help interpret a plateau, or answer questions about their plan. This is educational fitness coaching, not medical advice — if something sounds like a medical question (pain, injury, a health condition), say so plainly and suggest a doctor rather than diagnosing.`;

export async function POST(req: NextRequest) {
  // Flag-gated: disabled until a Claude API key exists in Vercel's env vars.
  // No separate feature flag needed — absence of the key IS the gate.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply:
        "The AI coach chat isn't turned on yet — this feature needs an Anthropic API key configured on the server first.",
    });
  }

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
  const history: ChatTurn[] = Array.isArray(body?.history) ? body.history : [];
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const { data: profile } = await sb
    .from("troll_profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  const username = profile?.username || "runner";

  const context = await buildCoachContext(sb, user.id);

  const anthropic = new Anthropic({ apiKey });
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-5",
    max_tokens: 512,
    output_config: { effort: "low" },
    system: [
      {
        type: "text",
        text: SYSTEM_TEMPLATE(username, context),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      ...history.slice(-10).map((turn) => ({
        role: turn.role,
        content: turn.text,
      })),
      { role: "user" as const, content: message },
    ],
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      try {
        stream.on("text", (delta) => {
          controller.enqueue(encoder.encode(delta));
        });
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(
            encoder.encode("I can't help with that one — try rephrasing, or ask something else about your training.")
          );
        }
      } catch {
        controller.enqueue(encoder.encode("Couldn't reach the coach — try again in a moment."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
