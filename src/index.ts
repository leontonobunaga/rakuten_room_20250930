#!/usr/bin/env node
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadConfigFromCwd } from './config.js';
import { applyWeights, buildQueue, type Candidate } from './queue/builder.js';

export function bootstrap(configPath = 'config.yaml'): void {
  const config = loadConfigFromCwd(configPath);
  console.log('Loaded configuration for ROOMan');
  console.log(`Mode: ${config.run.mode} | Daily Cap: ${config.run.daily_cap}`);

  // Placeholder demonstration for queue building to ensure tree-shaking keeps utilities.
  const sampleCandidates: Candidate[] = [];
  const weighted = applyWeights(sampleCandidates, config);
  buildQueue(weighted, config, config.run.daily_cap);
}

const executedFromCli = (() => {
  if (!process.argv[1]) return false;
  const argvUrl = pathToFileURL(process.argv[1]).href;
  return import.meta.url === argvUrl;
})();

if (executedFromCli) {
  const [, , configPath] = process.argv;
  bootstrap(configPath ?? 'config.yaml');
}

export const __filename = fileURLToPath(import.meta.url);
