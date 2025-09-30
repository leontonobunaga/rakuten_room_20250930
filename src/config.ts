import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AjvModule, { type ErrorObject, type JSONSchemaType, type ValidateFunction } from 'ajv';
import addFormatsModule from 'ajv-formats';
import YAML from 'yaml';
import type { Config } from './types.js';

const AjvCtor: any = (AjvModule as any).default ?? AjvModule;
const addFormats: any = (addFormatsModule as any).default ?? addFormatsModule;

const schemaDefinition = {
  $id: 'https://rakuten-room.dev/config.schema.json',
  type: 'object',
  properties: {
    run: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['safe', 'full_auto'] },
        headless: { type: 'boolean' },
        daily_cap: { type: 'integer', minimum: 1 },
        min_interval_sec: { type: 'integer', minimum: 1 },
        max_interval_sec: { type: 'integer', minimum: 1 },
        jitter: { type: 'number', minimum: 0, maximum: 1 },
        blackout: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              start: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
              end: { type: 'string', pattern: '^\\d{2}:\\d{2}$' }
            },
            required: ['start', 'end'],
            additionalProperties: false
          },
          nullable: true
        },
        max_errors_per_hour: { type: 'integer', minimum: 1 },
        hard_stop_on_error: { type: 'boolean' }
      },
      required: [
        'mode',
        'headless',
        'daily_cap',
        'min_interval_sec',
        'max_interval_sec',
        'jitter',
        'max_errors_per_hour',
        'hard_stop_on_error'
      ],
      additionalProperties: false
    },
    browser: {
      type: 'object',
      properties: {
        executable_path: { type: 'string' },
        storage_state: { type: 'string' }
      },
      required: ['executable_path', 'storage_state'],
      additionalProperties: false
    },
    credentials: {
      type: 'object',
      properties: {
        applicationId: { type: 'string', minLength: 1 },
        affiliateId: { type: 'string', nullable: true }
      },
      required: ['applicationId'],
      additionalProperties: false
    },
    sources: {
      type: 'object',
      properties: {
        keywords: { type: 'array', items: { type: 'string' }, minItems: 1 },
        exclude_keywords: { type: 'array', items: { type: 'string' }, nullable: true },
        genre_ids: { type: 'array', items: { type: 'string' }, nullable: true },
        min_price: { type: 'integer', nullable: true },
        max_price: { type: 'integer', nullable: true },
        min_review_count: { type: 'integer', nullable: true },
        min_review_average: { type: 'number', nullable: true },
        availability_only: { type: 'boolean', nullable: true }
      },
      required: ['keywords'],
      additionalProperties: false
    },
    ranking: {
      type: 'object',
      properties: {
        genre_weights: {
          type: 'object',
          propertyNames: { type: 'string' },
          additionalProperties: { type: 'number' },
          nullable: true
        },
        genre_quotas: {
          type: 'object',
          propertyNames: { type: 'string' },
          additionalProperties: { type: 'integer' },
          nullable: true
        },
        sale_profiles: {
          type: 'object',
          propertyNames: { type: 'string' },
          additionalProperties: {
            type: 'object',
            properties: {
              weights: {
                type: 'object',
                propertyNames: { type: 'string' },
                additionalProperties: { type: 'number' },
                nullable: true
              },
              quotas: {
                type: 'object',
                propertyNames: { type: 'string' },
                additionalProperties: { type: 'integer' },
                nullable: true
              }
            },
            required: [],
            additionalProperties: false
          },
          nullable: true
        }
      },
      required: [],
      additionalProperties: false
    },
    shops: {
      type: 'object',
      properties: {
        allowlist: { type: 'array', items: { type: 'string' }, nullable: true },
        denylist: { type: 'array', items: { type: 'string' }, nullable: true }
      },
      required: [],
      additionalProperties: false
    },
    policy: {
      type: 'object',
      properties: {
        exceptions: {
          type: 'object',
          properties: {
            terms: { type: 'array', items: { type: 'string' }, nullable: true },
            regex: { type: 'array', items: { type: 'string' }, nullable: true }
          },
          required: [],
          additionalProperties: false,
          nullable: true
        },
        banned: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              label: { type: 'string' },
              type: { type: 'string', enum: ['regex', 'terms'] },
              severity: { type: 'string', enum: ['block', 'warn', 'replace'] },
              pattern: { type: 'string', nullable: true },
              terms: { type: 'array', items: { type: 'string' }, nullable: true },
              replace: { type: 'string', nullable: true },
              note: { type: 'string', nullable: true }
            },
            required: ['id', 'label', 'type', 'severity'],
            additionalProperties: false,
            allOf: [
              {
                if: { properties: { type: { const: 'regex' } } },
                then: { required: ['pattern'] }
              },
              {
                if: { properties: { type: { const: 'terms' } } },
                then: { required: ['terms'] }
              }
            ]
          },
          nullable: true
        }
      },
      required: [],
      additionalProperties: false
    },
    copy: {
      type: 'object',
      properties: {
        variants_per_item: { type: 'integer', minimum: 1 },
        add_pr_tag: { type: 'boolean' },
        banned_phrases_file: { type: 'string' },
        hashtag_presets_file: { type: 'string' }
      },
      required: [
        'variants_per_item',
        'add_pr_tag',
        'banned_phrases_file',
        'hashtag_presets_file'
      ],
      additionalProperties: false
    },
    etl: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        watch_dir: { type: 'string' },
        schedule: { type: 'string', enum: ['monthly', 'manual'] },
        csv_mapping: {
          type: 'object',
          propertyNames: { type: 'string' },
          additionalProperties: { type: 'string' }
        }
      },
      required: ['enabled', 'watch_dir', 'schedule', 'csv_mapping'],
      additionalProperties: false
    }
  },
  required: [
    'run',
    'browser',
    'credentials',
    'sources',
    'ranking',
    'shops',
    'policy',
    'copy',
    'etl'
  ],
  additionalProperties: false
};

const ajv = new AjvCtor({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);
const validate = ajv.compile(schemaDefinition as unknown as JSONSchemaType<Config>) as ValidateFunction<Config>;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function loadConfig(filePath: string): Config {
  const resolved = resolve(filePath);
  const raw = readFileSync(resolved, 'utf-8');
  const parsed = YAML.parse(raw) as unknown;
  if (!validate(parsed)) {
    const details = (validate.errors ?? [])
      .map((err: ErrorObject) => `${err.instancePath || '(root)'} ${err.message ?? ''}`.trim())
      .join('\n');
    throw new ConfigError(`Invalid configuration:\n${details}`);
  }
  return parsed as Config;
}

export function loadConfigFromCwd(file = 'config.yaml'): Config {
  return loadConfig(resolve(process.cwd(), file));
}
