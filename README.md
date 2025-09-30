# ROOMan (Rakuten ROOM Automation for Windows)

This repository contains the TypeScript/Node.js scaffolding for **ROOMan**, an automation toolkit that orchestrates product discovery, scoring, queue management, and Playwright-based posting for Rakuten ROOM on Windows.

## Project Goals

- Automate the daily cycle of research → candidate curation → NG word validation → posting (safe or fully automated).
- Provide user-editable controls for posting cadence, blackout windows, NG words, and priority genres.
- Support monthly CSV-based ETL from Rakuten Affiliate reports to surface performance insights.

The high-level architecture is documented in the accompanying product specification and is reflected in the source tree layout.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Installation

```bash
npm install
```

### Configuration

Copy `config.example.yaml` to `config.yaml` and adjust it to your credentials and operational preferences.

```bash
cp config.example.yaml config.yaml
```

The configuration loader validates against the JSON schema defined in `src/config.ts`, catching missing or malformed fields early.

### Development Commands

| Command            | Description                                        |
| ------------------ | -------------------------------------------------- |
| `npm run build`    | Bundles the CLI entry point with `tsup`.           |
| `npm run test`     | Runs unit tests with Vitest.                       |
| `npm run lint`     | Performs TypeScript type-checking (`tsc --noEmit`).|
| `npm run clean`    | Removes the `dist/` directory.                     |

### Executing the CLI

After creating a valid `config.yaml`, you can run the bootstrap CLI to verify configuration loading:

```bash
node --loader ts-node/esm src/index.ts path/to/config.yaml
```

The current CLI simply loads the configuration and exercises the queue builder to ensure modules are wired correctly. Future milestones will extend the CLI to drive the full automation loop.

## Source Layout

```
src/
  config.ts            # YAML loader + JSON Schema validation
  index.ts             # CLI entry (bootstrap)
  policy/              # NG word policy engine
  queue/               # Candidate weighting & quota-aware queue builder
  scoring/             # (placeholder for scoring logic)
  worker/              # (placeholder for Playwright worker)
  etl/                 # (placeholder for CSV importer)
  ...
```

Tests live under `tests/` and focus on the NG word engine and queue builder logic that underpin safe automation.

## Templates & Assets

- `config.example.yaml` – fully-populated configuration template matching the product specification.
- `templates/banned_phrases.txt`, `templates/hashtags.yaml`, `templates/copy_prompt_jp.txt` – initial resources for copy generation and policy enforcement (placeholders to be expanded during implementation).

## Next Steps

The roadmap, distilled from the specification, includes:

1. Implementing the RWS collectors (ranking/search/genre resolution) with rate-limiting and affiliate URL support.
2. Completing the scorer module and integrating it with the queue builder.
3. Developing the Playwright worker for safe/full-auto posting on Windows, including storage state handling.
4. Building the ETL importer to ingest Rakuten Affiliate CSV reports into SQLite for dashboard analytics.
5. Packaging the runtime as a single Windows executable with the bundled Playwright browser.

Contributions and design discussions are welcome to ensure compliance with Rakuten ROOM guidelines and operational robustness.
