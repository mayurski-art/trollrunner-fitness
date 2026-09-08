// Free-tier LLM providers for coach chat's generated text (conversational
// replies and workout-paste parsing). Ported from trollrunner-terminal's
// lib/freeProviders.ts, which already solved the "free tier is flaky"
// problem — round-robin across three providers so no single rate limit
// takes the coach down, next provider tried on any failure. There is
// deliberately no paid-Claude fallback here; if every free provider is
// down, callers should degrade gracefully (see generateFreeReply's return
// type), not pay for a reply.
//
// Same three providers, same env var names as terminal, so the existing
// GROQ_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY values already
// configured for trollrunner-terminal can be reused here — just copy them
// into this project's .env.local and Vercel env.

export type ChatTurn = { role: "user" | "assistant"; content: string };

type FreeProvider = {
  name: string;
  enabled: () => boolean;
  generate: (system: string, history: ChatTurn[], maxTokens: number, signal: AbortSignal) => Promise<string | null>;
};

// See terminal's freeProviders.ts for why this exists: none of the three
// providers time out on their own, so a slow (not failing) response would
// otherwise hang with no escape hatch.
const PROVIDER_TIMEOUT_MS = 15_000;

// Several free-tier models are reasoning models that spend part of this
// budget on invisible "thinking" before the visible answer — a tight
// budget silently truncates replies to nothing. Coach replies run longer
// than terminal's "1-4 short lines" persona, so the default is higher.
const MAX_OUTPUT_TOKENS = 900;

// Workout-paste parsing needs to emit a full JSON object (title, notes,
// every set) — more room than a conversational reply.
export const MAX_OUTPUT_TOKENS_PARSE = 1500;

async function callGroq(
  system: string,
  history: ChatTurn[],
  maxTokens: number,
  signal: AbortSignal
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      // Kept in sync with terminal's choice — see its freeProviders.ts note
      // on why plain-instruct Llama models were dropped from Groq's catalog.
      model: "groq/compound-mini",
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, ...history],
    }),
  });
  if (!res.ok) throw new Error(`groq ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function callOpenRouter(
  system: string,
  history: ChatTurn[],
  maxTokens: number,
  signal: AbortSignal
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      // Kept in sync with terminal's choice — check openrouter.ai/models?max_price=0
      // and re-verify actual output before swapping if this 404s.
      model: "minimax/minimax-m2.7:free",
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, ...history],
    }),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function callGemini(
  system: string,
  history: ChatTurn[],
  maxTokens: number,
  signal: AbortSignal
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch(
    // Kept in sync with terminal's choice — check ai.google.dev/gemini-api/docs/models
    // if this 404s (Google deprecates model ids on a real cadence).
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: history.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
  return text?.trim() || null;
}

const PROVIDERS: FreeProvider[] = [
  { name: "groq", enabled: () => !!process.env.GROQ_API_KEY, generate: callGroq },
  { name: "gemini", enabled: () => !!process.env.GEMINI_API_KEY, generate: callGemini },
  { name: "openrouter", enabled: () => !!process.env.OPENROUTER_API_KEY, generate: callOpenRouter },
];

export type FreeReplyResult = { content: string; provider: string } | null;

/**
 * Round-robin across enabled free providers, trying the next one on any
 * failure (bad status, timeout, or a response that fails `validate`).
 * `rotationSeed` is caller-supplied (e.g. today's message count) rather
 * than tracked here — no persistent state across serverless invocations.
 */
export async function generateFreeReply(
  system: string,
  history: ChatTurn[],
  rotationSeed: number,
  maxTokens: number = MAX_OUTPUT_TOKENS,
  validate: (content: string) => boolean = () => true
): Promise<FreeReplyResult> {
  const enabledProviders = PROVIDERS.filter((p) => p.enabled());
  if (enabledProviders.length === 0) return null;

  const startIndex = ((rotationSeed % enabledProviders.length) + enabledProviders.length) % enabledProviders.length;

  for (let i = 0; i < enabledProviders.length; i++) {
    const provider = enabledProviders[(startIndex + i) % enabledProviders.length];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
    try {
      const content = await provider.generate(system, history, maxTokens, controller.signal);
      if (content && validate(content)) return { content, provider: provider.name };
      console.error(
        `[freeProviders] ${provider.name} returned ${content ? "an unusable response" : "no content"}`
      );
    } catch (err) {
      const label = (err as Error).name === "AbortError" ? "timed out" : (err as Error).message;
      console.error(`[freeProviders] ${provider.name} failed:`, label);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
