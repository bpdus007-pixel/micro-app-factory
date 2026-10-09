// Record a CI pipeline outcome in registry/pipeline-status.json (called from GitHub Actions).
// node scripts/pipeline-status.mjs --ref claude/app-A0002 --result success|failure|live_failed --note "..." --run-url URL
import { readJson, writeJson, nowIso, parseArgs } from './lib.mjs';

const a = parseArgs();
const s = readJson('registry/pipeline-status.json');
const entry = {
  at: nowIso(),
  ref: a.ref || 'unknown',
  stage: typeof a.stage === 'string' ? a.stage : null,
  result: a.result || 'unknown',
  note: typeof a.note === 'string' ? a.note : null,
  run_url: typeof a['run-url'] === 'string' ? a['run-url'] : null,
};
s.updated_at = entry.at;
s.last = entry;
s.history = [...(s.history || []), entry].slice(-100);
writeJson('registry/pipeline-status.json', s);
console.log('pipeline-status:', JSON.stringify(entry));
