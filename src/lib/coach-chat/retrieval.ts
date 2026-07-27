import { ANSWER_LIBRARY } from "./answer-library";
import type { CoachFacts } from "./context";
import { embedText, cosineSimilarity } from "./embeddings";
import type { LearnedAnswer } from "./learned-answers";

/**
 * Below this, don't guess — queue the question instead. Above SINGLE_MATCH,
 * a clause's top hit is confident enough to answer alone without checking
 * for a second topic.
 */
const MATCH_THRESHOLD = 0.55;
const SINGLE_MATCH_THRESHOLD = 0.72;
const MAX_COMPOSED_TOPICS = 3;

/**
 * Splits an explicitly multi-part question ("does X and how do Y") into
 * separate clauses so each can be matched against its own topic — a single
 * embedding vector for the whole compound sentence tends to collapse onto
 * whichever topic dominates semantically, silently dropping the other half
 * of the question. This is the "reasoning across topics" step: not true
 * reasoning, just deciding there's more than one question here and handling
 * each on its own before recombining.
 */
function splitClauses(message: string): string[] {
  const bySentence = message
    .split(/[?.!]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const clauses = bySentence.flatMap((s) => s.split(/\s+and\s+(?=how|what|why|does|is|are|should|can|will|do)/i));
  const trimmed = clauses.map((c) => c.trim()).filter((c) => c.split(/\s+/).length >= 3);
  return trimmed.length > 1 ? trimmed : [message];
}

type Candidate = {
  score: number;
  topic: string;
  reply: string;
};

type IndexedSample = {
  vector: Float32Array;
  topic: string;
  render: (facts: CoachFacts) => string;
};

let staticIndexPromise: Promise<IndexedSample[]> | null = null;

function buildStaticIndex(): Promise<IndexedSample[]> {
  return Promise.all(
    ANSWER_LIBRARY.flatMap((entry) =>
      entry.samples.map(async (sample) => ({
        vector: await embedText(sample),
        topic: entry.topic,
        render: entry.render,
      }))
    )
  );
}

function getStaticIndex(): Promise<IndexedSample[]> {
  if (!staticIndexPromise) staticIndexPromise = buildStaticIndex();
  return staticIndexPromise;
}

export type RetrievalResult = { reply: string } | null;

/** Keeps only the highest-scoring candidate per topic, then sorts best-first. */
function bestPerTopic(candidates: Candidate[]): Candidate[] {
  const byTopic = new Map<string, Candidate>();
  for (const c of candidates) {
    const existing = byTopic.get(c.topic);
    if (!existing || c.score > existing.score) byTopic.set(c.topic, c);
  }
  return [...byTopic.values()].sort((a, b) => b.score - a.score);
}

/** Best match (by topic) for a single clause against the static + learned libraries. */
async function bestMatchForClause(clause: string, facts: CoachFacts, learned: LearnedAnswer[]): Promise<Candidate | null> {
  const queryVector = await embedText(clause);
  const staticIndex = await getStaticIndex();

  const candidates: Candidate[] = staticIndex.map((sample) => ({
    score: cosineSimilarity(queryVector, sample.vector),
    topic: sample.topic,
    reply: sample.render(facts),
  }));

  for (const entry of learned) {
    const vector = await embedText(entry.question);
    candidates.push({
      score: cosineSimilarity(queryVector, vector),
      topic: `learned:${entry.question}`,
      reply: entry.answer,
    });
  }

  const ranked = bestPerTopic(candidates);
  if (ranked.length === 0 || ranked[0].score < MATCH_THRESHOLD) return null;
  return ranked[0];
}

export async function findAnswer(message: string, facts: CoachFacts, learned: LearnedAnswer[]): Promise<RetrievalResult> {
  const clauses = splitClauses(message);

  if (clauses.length === 1) {
    const clauseVector = await embedText(clauses[0]);
    const staticIndex = await getStaticIndex();
    const candidates: Candidate[] = staticIndex.map((sample) => ({
      score: cosineSimilarity(clauseVector, sample.vector),
      topic: sample.topic,
      reply: sample.render(facts),
    }));
    for (const entry of learned) {
      const vector = await embedText(entry.question);
      candidates.push({
        score: cosineSimilarity(clauseVector, vector),
        topic: `learned:${entry.question}`,
        reply: entry.answer,
      });
    }
    const ranked = bestPerTopic(candidates);
    if (ranked.length === 0 || ranked[0].score < MATCH_THRESHOLD) return null;
    if (ranked[0].score >= SINGLE_MATCH_THRESHOLD) return { reply: ranked[0].reply };

    // A single sentence can still touch more than one topic (e.g. "should I
    // rest given my recovery and training load") — compose across topics
    // that also clear the bar.
    const relevant = ranked.filter((c) => c.score >= MATCH_THRESHOLD).slice(0, MAX_COMPOSED_TOPICS);
    if (relevant.length === 1) return { reply: relevant[0].reply };
    return { reply: relevant.map((c) => c.reply).join("\n\n") };
  }

  // Explicit multi-part question — answer each clause independently, then
  // combine the distinct-topic answers.
  const perClause = await Promise.all(clauses.map((c) => bestMatchForClause(c, facts, learned)));
  const matched = perClause.filter((c): c is Candidate => c !== null);
  if (matched.length === 0) return null;

  const deduped = bestPerTopic(matched).slice(0, MAX_COMPOSED_TOPICS);
  if (deduped.length === 1) return { reply: deduped[0].reply };
  return { reply: deduped.map((c) => c.reply).join("\n\n") };
}
