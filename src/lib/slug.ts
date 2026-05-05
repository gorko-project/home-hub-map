export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function computeComposite(scores: {
  management: number;
  noise: number;
  value: number;
  location: number;
  condition: number;
}): number {
  return (
    scores.management * 0.3 +
    scores.noise * 0.2 +
    scores.value * 0.2 +
    scores.location * 0.15 +
    scores.condition * 0.15
  );
}
