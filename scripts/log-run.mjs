// Append one routine-run record to registry/runs.json.
// node scripts/log-run.mjs --run-id 2026-10-10-a --started 2026-10-09T18:00:05Z --result success \
//   --summary "A0002 bmi... 제작, 브랜치 푸시" --apps A0002 --next "다음 실행: A0003 아이디어 X"
// result: success | partial | failed | skipped | maintenance
import { readJson, writeJson, nowIso, parseArgs } from './lib.mjs';

const a = parseArgs();
const RESULTS = ['success', 'partial', 'failed', 'skipped', 'maintenance'];
if (!RESULTS.includes(a.result)) { console.error(`--result must be one of ${RESULTS.join(', ')}`); process.exit(1); }
if (!a.summary || a.summary === true) { console.error('--summary required'); process.exit(1); }

const runs = readJson('registry/runs.json');
runs.push({
  run_id: a['run-id'] || nowIso(),
  started_at: a.started || null,
  finished_at: nowIso(),
  result: a.result,
  summary: a.summary,
  apps: typeof a.apps === 'string' ? a.apps.split(',').map((s) => s.trim()) : [],
  next: typeof a.next === 'string' ? a.next : null,
  errors: typeof a.errors === 'string' ? a.errors : null,
});
writeJson('registry/runs.json', runs);
console.log(`logged run (${runs.length} total)`);
