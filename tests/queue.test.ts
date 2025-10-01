import { describe, expect, it } from 'vitest';
import { applyWeights, buildQueue, type Candidate } from '../src/queue/builder.js';
import type { Config } from '../src/types.js';

const baseConfig: Config = {
  run: {
    mode: 'safe',
    headless: false,
    daily_cap: 5,
    min_interval_sec: 1,
    max_interval_sec: 2,
    jitter: 0.1,
    blackout: [],
    max_errors_per_hour: 3,
    hard_stop_on_error: true
  },
  browser: {
    executable_path: './browsers/chromium/chrome.exe',
    storage_state: './data/session.json'
  },
  credentials: {
    applicationId: 'app',
    affiliateId: 'aff'
  },
  sources: {
    keywords: ['test']
  },
  ranking: {
    genre_weights: {
      default: 1,
      'A': 2
    },
    genre_quotas: {
      default: 0,
      A: 2,
      B: 1,
      others: 2
    }
  },
  shops: {},
  policy: {},
  copy: {
    variants_per_item: 1,
    add_pr_tag: true,
    banned_phrases_file: './templates/banned_phrases.txt',
    hashtag_presets_file: './templates/hashtags.yaml'
  },
  etl: {
    enabled: false,
    watch_dir: './drop',
    schedule: 'manual',
    csv_mapping: {}
  }
};

describe('queue builder', () => {
  const sample: Candidate[] = [
    { itemCode: '1', genreId: 'A', baseScore: 10 },
    { itemCode: '2', genreId: 'A', baseScore: 9 },
    { itemCode: '3', genreId: 'B', baseScore: 8 },
    { itemCode: '4', genreId: 'B', baseScore: 7 },
    { itemCode: '5', genreId: 'C', baseScore: 6 },
    { itemCode: '6', genreId: 'C', baseScore: 5 }
  ];

  it('applies genre weights to compute final scores', () => {
    const weighted = applyWeights(sample.map((c) => ({ ...c })), baseConfig);
    const top = weighted[0];
    expect(top.genreId).toBe('A');
    expect(top.finalScore).toBe(20);
  });

  it('honors quotas and fills remaining slots', () => {
    const weighted = applyWeights(sample.map((c) => ({ ...c })), baseConfig);
    const queue = buildQueue(weighted, baseConfig, 5);
    expect(queue).toHaveLength(5);
    const genreCounts = queue.reduce<Record<string, number>>((acc, cand) => {
      const key = cand.genreId ?? 'others';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    expect(genreCounts['A']).toBeLessThanOrEqual(2);
    expect(genreCounts['B']).toBeLessThanOrEqual(1);
  });
});
