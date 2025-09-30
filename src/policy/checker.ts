import type { PolicyConfig, PolicyRule, PolicyRuleSeverity } from '../types.js';

interface CompiledRegexRule {
  type: 'regex';
  id: string;
  label: string;
  severity: PolicyRuleSeverity;
  note?: string;
  replace?: string;
  re: RegExp;
}

interface CompiledTermsRule {
  type: 'terms';
  id: string;
  label: string;
  severity: PolicyRuleSeverity;
  note?: string;
  replace?: string;
  terms: string[];
}

type CompiledRule = CompiledRegexRule | CompiledTermsRule;

export interface Violation {
  id: string;
  text: string;
  severity: PolicyRuleSeverity;
  label?: string;
}

export interface PolicyResult {
  blocked: boolean;
  outText: string;
  violations: Violation[];
}

function compileRule(rule: PolicyRule): CompiledRule {
  if (rule.type === 'regex') {
    return {
      ...rule,
      re: new RegExp(rule.pattern, 'giu')
    } satisfies CompiledRegexRule;
  }
  return {
    ...rule,
    terms: (rule.terms ?? []).map((t) => t.toLowerCase())
  } satisfies CompiledTermsRule;
}

function rangesOverlap(range: [number, number], target: [number, number]): boolean {
  return !(range[1] <= target[0] || target[1] <= range[0]);
}

function collectExceptionRanges(text: string, cfg: PolicyConfig['exceptions']): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  if (!cfg) return ranges;
  if (cfg.terms) {
    const lowerSource = text.toLowerCase();
    for (const term of cfg.terms) {
      const lower = term.toLowerCase();
      let idx = -1;
      while ((idx = lowerSource.indexOf(lower, idx + 1)) !== -1) {
        ranges.push([idx, idx + lower.length]);
      }
    }
  }
  if (cfg.regex) {
    for (const pattern of cfg.regex) {
      const re = new RegExp(pattern, 'giu');
      let match: RegExpExecArray | null;
      while ((match = re.exec(text))) {
        ranges.push([match.index, match.index + match[0].length]);
      }
    }
  }
  return ranges;
}

function adjustRanges(ranges: Array<[number, number]>, span: [number, number], delta: number): void {
  if (delta === 0) return;
  for (const range of ranges) {
    if (range[0] >= span[1]) {
      range[0] += delta;
      range[1] += delta;
    }
  }
}

export function checkAndFix(text: string, policy: PolicyConfig): PolicyResult {
  const exceptions = collectExceptionRanges(text, policy.exceptions);
  const compiledRules = (policy.banned ?? []).map(compileRule);
  let out = text;
  const violations: Violation[] = [];

  for (const rule of compiledRules) {
    if (rule.type === 'regex') {
      rule.re.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = rule.re.exec(out))) {
        const span: [number, number] = [match.index, match.index + match[0].length];
        if (exceptions.some((ex) => rangesOverlap(span, ex))) {
          continue;
        }
        violations.push({ id: rule.id, text: match[0], severity: rule.severity, label: rule.label });
        if (rule.severity === 'replace' && rule.replace != null) {
          out = out.slice(0, span[0]) + rule.replace + out.slice(span[1]);
          const delta = rule.replace.length - (span[1] - span[0]);
          adjustRanges(exceptions, span, delta);
          rule.re.lastIndex = span[0] + rule.replace.length;
        }
      }
    } else {
      for (const term of rule.terms) {
        let searchFrom = 0;
        while (searchFrom <= out.length) {
          const lowerOut = out.toLowerCase();
          const idx = lowerOut.indexOf(term, searchFrom);
          if (idx === -1) break;
          const span: [number, number] = [idx, idx + term.length];
          if (!exceptions.some((ex) => rangesOverlap(span, ex))) {
            const matchedText = out.slice(span[0], span[1]);
            violations.push({ id: rule.id, text: matchedText, severity: rule.severity, label: rule.label });
            if (rule.severity === 'replace' && rule.replace != null) {
              out = out.slice(0, span[0]) + rule.replace + out.slice(span[1]);
              const delta = rule.replace.length - (span[1] - span[0]);
              adjustRanges(exceptions, span, delta);
              searchFrom = span[0] + rule.replace.length;
              continue;
            }
          }
          searchFrom = span[1];
        }
      }
    }
  }

  return {
    blocked: violations.some((v) => v.severity === 'block'),
    outText: out,
    violations
  };
}
