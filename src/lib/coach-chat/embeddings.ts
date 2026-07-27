import { pipeline } from "@huggingface/transformers";

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

type Extractor = (text: string, options: { pooling: string; normalize: boolean }) => Promise<{ data: Float32Array }>;

let extractorPromise: Promise<Extractor> | null = null;

function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL_ID) as unknown as Promise<Extractor>;
  }
  return extractorPromise;
}

export async function embedText(text: string): Promise<Float32Array> {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return output.data as Float32Array;
}

export async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  const extractor = await getExtractor();
  const results: Float32Array[] = [];
  for (const text of texts) {
    const output = await extractor(text, { pooling: "mean", normalize: true });
    results.push(output.data as Float32Array);
  }
  return results;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  // Both vectors are already normalized (normalize: true above), so the dot
  // product alone is the cosine similarity.
  return dot;
}
