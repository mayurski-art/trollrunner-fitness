import type { SupabaseClient } from "@supabase/supabase-js";

export type PendingQuestion = {
  id: string;
  question: string;
  createdAt: string;
};

export type LearnedAnswer = {
  question: string;
  answer: string;
};

/**
 * Username allowed to see and answer the unmatched-question queue. Set via
 * env var — the RLS policies in supabase/fit_coach_qa.sql enforce the same
 * check server-side, so this is a UI convenience gate, not the security
 * boundary.
 */
export const COACH_ADMIN_USERNAME = process.env.NEXT_PUBLIC_COACH_ADMIN_USERNAME || "";

export async function queueQuestion(sb: SupabaseClient, userId: string, question: string) {
  await sb.from("fit_coach_questions").insert({ user_id: userId, question });
}

export async function listPendingQuestions(sb: SupabaseClient): Promise<PendingQuestion[]> {
  const { data, error } = await sb
    .from("fit_coach_questions")
    .select("id, question, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    question: row.question,
    createdAt: row.created_at,
  }));
}

export async function answerQuestion(sb: SupabaseClient, id: string, question: string, answer: string) {
  const { error: updateError } = await sb
    .from("fit_coach_questions")
    .update({ status: "answered", answer, answered_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) throw updateError;

  const { error: insertError } = await sb
    .from("fit_coach_learned_answers")
    .insert({ question, answer, source_id: id });
  if (insertError) throw insertError;
}

export async function dismissQuestion(sb: SupabaseClient, id: string) {
  const { error } = await sb.from("fit_coach_questions").update({ status: "dismissed" }).eq("id", id);
  if (error) throw error;
}

export async function listLearnedAnswers(sb: SupabaseClient): Promise<LearnedAnswer[]> {
  const { data, error } = await sb.from("fit_coach_learned_answers").select("question, answer");
  if (error) throw error;
  return (data || []).map((row) => ({ question: row.question, answer: row.answer }));
}
