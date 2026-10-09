// Structural + policy validation of the registry and every app directory.
// Exit code 1 on any error. Run: npm run validate
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, APPS_DIR, STATUSES, PUBLISHED, ID_RE, SLUG_RE, readJson } from './lib.mjs';

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const REQUIRED_APP_FIELDS = ['id', 'slug', 'title', 'category', 'function_key', 'summary', 'spec', 'status', 'created_at', 'updated_at', 'history'];
const REQUIRED_FILES = ['index.html', 'app.js', 'logic.js', 'logic.test.js', 'e2e.json'];
const STEP_KEYS = ['fill', 'select', 'click', 'check', 'uncheck', 'press', 'expectText', 'expectValue', 'expectVisible', 'expectHidden', 'expectCount', 'wait'];
const MAX_FILE_BYTES = 200 * 1024;

function load(file) {
  try { return readJson(file); } catch (e) { err(`${file}: cannot parse JSON (${e.message})`); return null; }
}

const config = load('registry/config.json');
const apps = load('registry/apps.json') || [];
const ideas = load('registry/ideas.json') || [];
load('registry/runs.json');
load('registry/live-check.json');
load('registry/pipeline-status.json');
const ownerReq = load('registry/owner-requests.json');
if (ownerReq && !Array.isArray(ownerReq)) err('registry/owner-requests.json must be an array');

if (config && !/^https:\/\/.+\/$/.test(config.site_base_url || '')) err('config.site_base_url must be https and end with /');

// ---- registry entries
const seen = { id: new Map(), slug: new Map(), function_key: new Map() };
if (!Array.isArray(apps)) err('registry/apps.json must be an array');
for (const a of apps) {
  const tag = a.id || a.slug || JSON.stringify(a).slice(0, 40);
  for (const f of REQUIRED_APP_FIELDS) if (a[f] === undefined || a[f] === '') err(`${tag}: missing field "${f}"`);
  if (a.id && !ID_RE.test(a.id)) err(`${tag}: id must match A0000`);
  if (a.slug && !SLUG_RE.test(a.slug)) err(`${tag}: slug must be kebab-case ascii`);
  if (a.status && !STATUSES.includes(a.status)) err(`${tag}: unknown status "${a.status}"`);
  if (!Array.isArray(a.history)) err(`${tag}: history must be an array`);
  for (const k of ['id', 'slug', 'function_key']) {
    if (!a[k]) continue;
    const key = String(a[k]).toLowerCase();
    if (seen[k].has(key)) err(`${tag}: duplicate ${k} "${a[k]}" (also ${seen[k].get(key)})`);
    seen[k].set(key, tag);
  }
}

// ---- ideas backlog
if (!Array.isArray(ideas)) err('registry/ideas.json must be an array');
const ideaKeys = new Set();
for (const i of ideas) {
  if (!i.function_key || !i.title || !i.status) err(`idea ${i.title || '?'}: needs function_key, title, status`);
  if (ideaKeys.has(i.function_key)) err(`idea duplicate function_key "${i.function_key}"`);
  ideaKeys.add(i.function_key);
  if (!['queued', 'taken', 'rejected'].includes(i.status)) err(`idea ${i.function_key}: bad status ${i.status}`);
}

// ---- app directories
const dirs = fs.readdirSync(APPS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name !== '_shared').map((d) => d.name);
const bySlug = new Map(apps.map((a) => [a.slug, a]));
for (const d of dirs) if (!bySlug.has(d)) err(`apps/${d}: directory has no registry entry`);

const BANNED_JS = [
  [/\beval\s*\(/, 'eval()'],
  [/new\s+Function\s*\(/, 'new Function()'],
  [/document\.write\s*\(/, 'document.write()'],
  [/\b(fetch|XMLHttpRequest|WebSocket|EventSource)\b|sendBeacon/, 'network access (set "network_allowed": true in registry with justification)'],
  [/(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}/i, 'possible hard-coded secret'],
];

for (const a of apps) {
  const dir = path.join(APPS_DIR, a.slug || '');
  const mustExist = PUBLISHED.has(a.status) || a.status === 'building';
  if (!fs.existsSync(dir)) {
    if (mustExist) err(`${a.id}: apps/${a.slug} missing`);
    continue;
  }
  for (const f of REQUIRED_FILES) if (!fs.existsSync(path.join(dir, f))) err(`${a.id}: missing apps/${a.slug}/${f}`);

  for (const f of fs.readdirSync(dir, { recursive: true })) {
    const full = path.join(dir, f);
    if (!fs.statSync(full).isFile()) continue;
    if (fs.statSync(full).size > MAX_FILE_BYTES) err(`${a.id}: ${f} exceeds ${MAX_FILE_BYTES} bytes`);
    if (/\.js$/.test(f) && !/\.test\.js$/.test(f)) {
      const src = fs.readFileSync(full, 'utf8');
      for (const [re, what] of BANNED_JS) {
        if (what.startsWith('network') && a.network_allowed) continue;
        if (re.test(src)) err(`${a.id}: ${f} uses ${what}`);
      }
    }
  }

  const htmlPath = path.join(dir, 'index.html');
  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    if (!/<html[^>]+lang="[a-z-]+"/i.test(html)) err(`${a.id}: index.html needs <html lang>`);
    if (!/<meta[^>]+name="viewport"/i.test(html)) err(`${a.id}: index.html needs viewport meta`);
    if (!/<title>[^<]{4,}<\/title>/i.test(html)) err(`${a.id}: index.html needs a <title>`);
    if (!/<meta[^>]+name="description"[^>]+content="[^"]{20,}"/i.test(html)) err(`${a.id}: index.html needs a meta description (20+ chars)`);
    if (!/href="\.\.\/_shared\/style\.css"/.test(html)) err(`${a.id}: index.html must link ../_shared/style.css`);
    if (/<(script|link|img|iframe)[^>]+(src|href)="(https?:)?\/\//i.test(html)) err(`${a.id}: index.html loads an external resource (not allowed)`);
    if (/<form[^>]+action=/i.test(html)) err(`${a.id}: forms must not submit to a server (no action=)`);
    if (/\son[a-z]+="/i.test(html)) err(`${a.id}: inline event handler attributes are not allowed`);
  }

  const e2ePath = path.join(dir, 'e2e.json');
  if (fs.existsSync(e2ePath)) {
    let spec;
    try { spec = JSON.parse(fs.readFileSync(e2ePath, 'utf8')); } catch (e) { err(`${a.id}: e2e.json invalid JSON`); }
    if (spec) {
      const cases = spec.cases || [];
      const kinds = new Set(cases.map((c) => c.kind));
      for (const k of ['normal', 'boundary', 'invalid']) if (!kinds.has(k)) err(`${a.id}: e2e.json needs at least one "${k}" case`);
      for (const c of cases) {
        if (!c.name || !Array.isArray(c.steps) || c.steps.length === 0) err(`${a.id}: e2e case needs name and steps`);
        if (!(c.steps || []).some((s) => Object.keys(s).some((k) => k.startsWith('expect')))) err(`${a.id}: e2e case "${c.name}" has no expectation`);
        for (const s of c.steps || []) {
          const k = Object.keys(s).find((key) => STEP_KEYS.includes(key));
          if (!k) err(`${a.id}: e2e case "${c.name}" has unknown step ${JSON.stringify(s)}`);
        }
      }
    }
  }

  const testPath = path.join(dir, 'logic.test.js');
  if (fs.existsSync(testPath)) {
    const t = fs.readFileSync(testPath, 'utf8');
    const n = (t.match(/\btest\s*\(/g) || []).length;
    if (n < 3) err(`${a.id}: logic.test.js needs >= 3 tests (normal, boundary, invalid); found ${n}`);
  }
}

for (const w of warnings) console.warn('WARN', w);
if (errors.length) {
  for (const e of errors) console.error('ERROR', e);
  console.error(`\nvalidate: ${errors.length} error(s)`);
  process.exit(1);
}
console.log(`validate: OK — ${apps.length} app(s) in registry, ${dirs.length} app dir(s), ${ideas.length} idea(s)`);
