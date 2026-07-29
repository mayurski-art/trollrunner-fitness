"use client";

import { useState } from "react";
import { getAccessToken } from "@/lib/accounts";

type ChatMessage = { role: "user" | "assistant"; text: string };

export function CoachChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", text }];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);

    try {
      const token = await getAccessToken();
      const res = await fetch("/api/coach-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ message: text, history: messages }),
      });

      const data = await res.json();
      const reply: string = data.reply ?? data.error ?? "Something went wrong — try again.";
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Couldn't reach the coach — try again in a moment." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card rounded-2xl p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="coach-chat-panel"
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold">🧌 Ask your coach</span>
        <span className="text-xs text-muted">{open ? "Hide" : "Chat"}</span>
      </button>

      {open && (
        <div id="coach-chat-panel" className="mt-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted">
              Ask about your training load, why the plan looks the way it does, or what to do
              about a plateau. This is educational coaching, not medical advice.
            </p>
          )}
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-xl px-3 py-2 text-sm ${
                  m.role === "user" ? "ml-6 bg-brand-soft" : "mr-6 bg-raised"
                }`}
              >
                {m.text}
              </div>
            ))}
            {busy && <div className="mr-6 rounded-xl bg-raised px-3 py-2 text-sm text-muted">Thinking…</div>}
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something…"
              className="flex-1 rounded-full border border-line bg-raised px-3.5 py-2 text-sm outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
