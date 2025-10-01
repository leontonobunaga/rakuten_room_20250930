import type { Config } from '../types.js';

export interface Candidate {
  id?: number;
  itemCode: string;
  genreId?: string | null;
  baseScore: number;
  finalScore?: number;
  [key: string]: unknown;
}

export function applyWeights(candidates: Candidate[], cfg: Config): Candidate[] {
  const weights = cfg.ranking.genre_weights ?? {};
  for (const cand of candidates) {
    const genreKey = String(cand.genreId ?? 'others');
    const weight = weights[genreKey] ?? weights.default ?? 1;
    cand.finalScore = (cand.baseScore ?? 0) * weight;
  }
  return candidates.sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));
}

function withinQuota(genre: string, counts: Map<string, number>, quotas: Record<string, number | undefined>): boolean {
  const limit = quotas[genre];
  if (limit == null) return true;
  const current = counts.get(genre) ?? 0;
  return current < limit;
}

export function buildQueue(candidates: Candidate[], cfg: Config, dailyCap: number): Candidate[] {
  if (dailyCap <= 0) {
    return [];
  }
  const quotas = cfg.ranking.genre_quotas ?? {};
  const counts = new Map<string, number>();
  const byGenre = new Map<string, Candidate[]>();
  for (const cand of candidates) {
    const key = String(cand.genreId ?? 'others');
    if (!byGenre.has(key)) {
      byGenre.set(key, []);
    }
    byGenre.get(key)!.push(cand);
  }

  for (const bucket of byGenre.values()) {
    bucket.sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));
  }

  const queue: Candidate[] = [];

  const takeFrom = (genre: string): Candidate | undefined => {
    if (!withinQuota(genre, counts, quotas)) {
      return undefined;
    }
    const bucket = byGenre.get(genre);
    if (!bucket || bucket.length === 0) return undefined;
    const next = bucket.shift();
    if (!next) return undefined;
    counts.set(genre, (counts.get(genre) ?? 0) + 1);
    return next;
  };

  for (const [genre, quota] of Object.entries(quotas)) {
    if (genre === 'others' || genre === 'default') continue;
    let remaining = quota ?? 0;
    while (remaining > 0 && queue.length < dailyCap) {
      const picked = takeFrom(genre);
      if (!picked) break;
      queue.push(picked);
      remaining -= 1;
    }
  }

  const othersQuota = quotas.others ?? Math.max(0, dailyCap - queue.length);
  let pickedCount = 0;
  const genreKeys = Array.from(byGenre.keys());
  while (pickedCount < othersQuota && queue.length < dailyCap) {
    let progress = false;
    for (const genre of genreKeys) {
      const picked = takeFrom(genre);
      if (!picked) continue;
      queue.push(picked);
      pickedCount += 1;
      progress = true;
      if (pickedCount >= othersQuota || queue.length >= dailyCap) {
        break;
      }
    }
    if (!progress) {
      break;
    }
  }

  if (queue.length < dailyCap) {
    const leftovers: Candidate[] = [];
    for (const [genre, bucket] of byGenre.entries()) {
      if (!withinQuota(genre, counts, quotas)) continue;
      leftovers.push(...bucket);
    }
    leftovers.sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));
    for (const cand of leftovers) {
      const genre = String(cand.genreId ?? 'others');
      if (!withinQuota(genre, counts, quotas)) {
        continue;
      }
      queue.push(cand);
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
      if (queue.length >= dailyCap) break;
    }
  }

  return queue.slice(0, dailyCap);
}
