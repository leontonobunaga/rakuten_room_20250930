import { describe, expect, it } from 'vitest';
import { checkAndFix } from '../src/policy/checker.js';
import type { PolicyConfig } from '../src/types.js';

describe('policy checker', () => {
  const basePolicy: PolicyConfig = {
    exceptions: {
      terms: ['医薬部外品']
    },
    banned: [
      {
        id: 'overclaim',
        label: '誇大表現',
        type: 'regex',
        pattern: '(必ず|絶対)',
        severity: 'replace',
        replace: 'おすすめ'
      },
      {
        id: 'yakuki',
        label: '薬機',
        type: 'regex',
        pattern: '(治る|完治)',
        severity: 'block'
      },
      {
        id: '誘導',
        label: '誘導',
        type: 'terms',
        terms: ['クリックして'],
        severity: 'warn'
      }
    ]
  };

  it('replaces expressions flagged for replace', () => {
    const result = checkAndFix('絶対おすすめです', basePolicy);
    expect(result.outText).toBe('おすすめおすすめです');
    expect(result.blocked).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatchObject({ id: 'overclaim', severity: 'replace' });
  });

  it('blocks when block severity hits', () => {
    const result = checkAndFix('これで完治します', basePolicy);
    expect(result.blocked).toBe(true);
    expect(result.violations.some((v) => v.id === 'yakuki')).toBe(true);
  });

  it('respects exception terms', () => {
    const result = checkAndFix('医薬部外品なので完治という表記は含まない', basePolicy);
    expect(result.blocked).toBe(true); // because 完治 is outside exception range
    const safeResult = checkAndFix('医薬部外品だから安心', basePolicy);
    expect(safeResult.blocked).toBe(false);
  });

  it('warns on terms and preserves text when not replacing', () => {
    const result = checkAndFix('ぜひクリックしてください', basePolicy);
    expect(result.blocked).toBe(false);
    expect(result.outText).toContain('クリック');
    expect(result.violations.some((v) => v.severity === 'warn')).toBe(true);
  });
});
