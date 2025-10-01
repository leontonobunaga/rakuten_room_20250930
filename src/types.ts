export type RunMode = 'safe' | 'full_auto';

export interface RunConfig {
  mode: RunMode;
  headless: boolean;
  daily_cap: number;
  min_interval_sec: number;
  max_interval_sec: number;
  jitter: number;
  blackout?: Array<{ start: string; end: string }>;
  max_errors_per_hour: number;
  hard_stop_on_error: boolean;
}

export interface BrowserConfig {
  executable_path: string;
  storage_state: string;
}

export interface CredentialsConfig {
  applicationId: string;
  affiliateId?: string;
}

export interface SourcesConfig {
  keywords: string[];
  exclude_keywords?: string[];
  genre_ids?: string[];
  min_price?: number;
  max_price?: number;
  min_review_count?: number;
  min_review_average?: number;
  availability_only?: boolean;
}

export interface RankingConfig {
  genre_weights?: Record<string, number>;
  genre_quotas?: Record<string, number>;
  sale_profiles?: Record<string, {
    weights?: Record<string, number>;
    quotas?: Record<string, number>;
  }>;
}

export interface ShopPolicyConfig {
  allowlist?: string[];
  denylist?: string[];
}

export interface PolicyExceptionConfig {
  terms?: string[];
  regex?: string[];
}

export type PolicyRuleSeverity = 'block' | 'warn' | 'replace';

export interface PolicyRuleBase {
  id: string;
  label: string;
  severity: PolicyRuleSeverity;
  note?: string;
  replace?: string;
}

export interface PolicyRegexRule extends PolicyRuleBase {
  type: 'regex';
  pattern: string;
}

export interface PolicyTermsRule extends PolicyRuleBase {
  type: 'terms';
  terms: string[];
}

export type PolicyRule = PolicyRegexRule | PolicyTermsRule;

export interface PolicyConfig {
  exceptions?: PolicyExceptionConfig;
  banned?: PolicyRule[];
}

export interface CopyConfig {
  variants_per_item: number;
  add_pr_tag: boolean;
  banned_phrases_file: string;
  hashtag_presets_file: string;
}

export interface EtlConfig {
  enabled: boolean;
  watch_dir: string;
  schedule: 'monthly' | 'manual';
  csv_mapping: Record<string, string>;
}

export interface Config {
  run: RunConfig;
  browser: BrowserConfig;
  credentials: CredentialsConfig;
  sources: SourcesConfig;
  ranking: RankingConfig;
  shops: ShopPolicyConfig;
  policy: PolicyConfig;
  copy: CopyConfig;
  etl: EtlConfig;
}
