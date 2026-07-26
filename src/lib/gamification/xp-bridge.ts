import { getClient } from "@/lib/accounts/client";

/**
 * Bridges into the SHARED TrollRunner XP system (troll_award_xp in the
 * main site's troll_accounts.sql) rather than building a parallel XP
 * economy here — per Decision 2, one account's XP is meant to span every
 * TrollRunner property. troll_award_xp only accepts a fixed allowlist of
 * event names (daily_login, chat_post, game_run, high_score,
 * feedback_post) with server-side cooldowns/caps; adding a fitness-
 * specific event would require editing that other repo's SQL, so this
 * reuses the closest semantic fit instead:
 *   - "game_run"   (5 XP)  → logging any activity today
 *   - "high_score" (20 XP) → setting a new PR
 * Both already have sane per-day caps, so this can't be farmed.
 */
export async function awardActivityXp() {
  const sb = getClient();
  try {
    await sb.rpc("troll_award_xp", { p_event: "game_run", p_source: "fitness" });
  } catch {
    // best-effort — never block the logging flow on this
  }
}

export async function awardPrXp(exercise: string) {
  const sb = getClient();
  try {
    await sb.rpc("troll_award_xp", {
      p_event: "high_score",
      p_source: "fitness-pr",
      p_meta: { exercise },
    });
  } catch {
    // best-effort — never block the logging flow on this
  }
}
