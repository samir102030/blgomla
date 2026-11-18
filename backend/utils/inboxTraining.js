import { normalizeArabic } from "./supportTools.js";

export const trainingKey = (text) => normalizeArabic(text)
  .replace(/[\u0624]/g, "و")
  .replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export function relatedTrainingExamples(examples, text) {
  const words = new Set(trainingKey(text).split(" ").filter((word) => word.length > 2));
  return examples.flatMap((example) => {
    const shared = new Set(trainingKey(example.question).split(" ").filter((word) => words.has(word)));
    return shared.size >= 2 ? [{ example, score: shared.size }] : [];
  }).sort((left, right) => right.score - left.score).slice(0, 3).map(({ example }) => example);
}
