// Print the factory state an agent needs at the start of a run. npm run status
import { loadApps, loadConfig, readJson, STATUSES } from './lib.mjs';

const config = loadConfig();
const apps = loadApps();
const ideas = readJson('registry/ideas.json');
const runs = readJson('registry/runs.json');
const pipeline = readJson('registry/pipeline-status.json');
const live = readJson('registry/live-check.json');

const by = Object.fromEntries(STATUSES.map((s) => [s, apps.filter((a) => a.status === s)]));
const liveCount = by.live.length;
const stage = [...config.stage_thresholds].reverse().find((s) => liveCount >= s.until_live) || config.stage_thresholds[0];
const nextStage = config.stage_thresholds.find((s) => s.until_live > liveCount);

console.log('=== Micro-App Factory status ===');
console.log(`target ${config.target_app_count} | completed(live) ${liveCount} | stage ${stage.stage} reached, next: ${nextStage ? `${nextStage.name} (${nextStage.until_live})` : 'TARGET REACHED'}`);
console.log(`production_paused: ${config.production_paused}${config.paused_reason ? ' — ' + config.paused_reason : ''} | apps_per_run: ${config.apps_per_run}`);
for (const s of STATUSES) if (by[s].length) console.log(`  ${s.padEnd(12)} ${by[s].length}: ${by[s].map((a) => `${a.id}:${a.slug}${a.attempts ? `(attempts ${a.attempts})` : ''}`).join(', ')}`);
console.log(`ideas queued: ${ideas.filter((i) => i.status === 'queued').length} | taken: ${ideas.filter((i) => i.status === 'taken').length} | rejected: ${ideas.filter((i) => i.status === 'rejected').length}`);
console.log(`last live check: ${live.checked_at || 'never'}${live.checked_at ? ` dashboard_ok=${live.dashboard_ok}` : ''}`);
for (const [slug, r] of Object.entries(live.results || {})) if (!r.ok) console.log(`  LIVE FAIL ${r.id} ${slug}: ${r.failures.slice(0, 2).join(' | ')}`);
console.log(`last pipeline: ${pipeline.last ? `${pipeline.last.at} ${pipeline.last.ref} ${pipeline.last.result} ${pipeline.last.note || ''}` : 'never'}`);
for (const h of (pipeline.history || []).slice(-5).reverse()) if (h.result !== 'success') console.log(`  pipeline ${h.result}: ${h.at} ${h.ref} ${h.note || ''} ${h.run_url || ''}`);
const owner = readJson('registry/owner-requests.json').filter((r) => r.status === 'open');
console.log(`owner requests open: ${owner.length}${owner.map((r) => `
  ${r.id} ${r.title} — blocking: ${r.blocking || '-'}`).join('')}`);
console.log('recent runs:');
for (const r of runs.slice(-5)) console.log(`  ${r.started_at} ${r.result} ${r.summary}`);
if (liveCount >= config.target_app_count) console.log('\n>>> TARGET REACHED: stop producing new apps; maintenance only (CLAUDE.md §9).');
