// Scaffold a new app from scripts/template and register it with status "building".
// npm run new-app -- --id A0002 --slug bmi-free-thing --title "제목" --category "생활" \
//   --function-key "unit-price-comparison" --summary "한 줄 설명" --spec "입력/처리/출력 요약"
// --id is optional (defaults to next free id in registry/apps.json; see CLAUDE.md §6 for in-flight ids).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, APPS_DIR, SLUG_RE, ID_RE, loadApps, writeJson, readJson, nextAppId, nowIso, parseArgs } from './lib.mjs';

const a = parseArgs();
const need = ['slug', 'title', 'category', 'function-key', 'summary', 'spec'];
const missing = need.filter((k) => !a[k] || a[k] === true);
if (missing.length) { console.error(`missing: ${missing.map((k) => '--' + k).join(' ')}`); process.exit(1); }
if (!SLUG_RE.test(a.slug)) { console.error('slug must be kebab-case ascii'); process.exit(1); }

const apps = loadApps();
const id = a.id || nextAppId(apps);
if (!ID_RE.test(id)) { console.error('id must look like A0001'); process.exit(1); }
for (const x of apps) {
  if (x.id === id) { console.error(`id ${id} already used by ${x.slug}`); process.exit(1); }
  if (x.slug === a.slug) { console.error(`slug ${a.slug} already used by ${x.id}`); process.exit(1); }
  if (x.function_key === a['function-key']) { console.error(`function_key already used by ${x.id} ${x.slug} — duplicate function`); process.exit(1); }
}

const dir = path.join(APPS_DIR, a.slug);
if (fs.existsSync(dir)) { console.error(`apps/${a.slug} already exists`); process.exit(1); }
fs.cpSync(path.join(ROOT, 'scripts', 'template'), dir, { recursive: true });
for (const f of fs.readdirSync(dir)) {
  const p = path.join(dir, f);
  const src = fs.readFileSync(p, 'utf8')
    .replaceAll('__ID__', id)
    .replaceAll('__TITLE__', a.title)
    .replaceAll('__SUMMARY__', a.summary);
  fs.writeFileSync(p, src);
}

const now = nowIso();
apps.push({
  id,
  slug: a.slug,
  title: a.title,
  category: a.category,
  function_key: a['function-key'],
  summary: a.summary,
  spec: a.spec,
  status: 'building',
  network_allowed: false,
  created_at: now,
  updated_at: now,
  tested_at: null,
  verified_at: null,
  attempts: 0,
  history: [{ at: now, event: 'created', note: 'scaffolded' }],
});
writeJson('registry/apps.json', apps);

// Mark matching backlog idea as taken.
const ideas = readJson('registry/ideas.json');
const idea = ideas.find((i) => i.function_key === a['function-key']);
if (idea) { idea.status = 'taken'; idea.app_id = id; writeJson('registry/ideas.json', ideas); }

console.log(`created ${id} apps/${a.slug} (status building). Now edit logic.js, logic.test.js, index.html, app.js, e2e.json.`);
