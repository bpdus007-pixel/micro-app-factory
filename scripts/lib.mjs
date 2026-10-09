// Shared helpers for factory scripts (Node only).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const APPS_DIR = path.join(ROOT, 'apps');
export const REG_DIR = path.join(ROOT, 'registry');
export const SITE_OUT = path.join(ROOT, '_site');

/** Every allowed app status. See CLAUDE.md §5 for meaning. */
export const STATUSES = ['building', 'ready', 'live', 'live_failed', 'on_hold', 'quarantined', 'retired'];
/** Statuses whose app is built and published to the site. */
export const PUBLISHED = new Set(['ready', 'live', 'live_failed']);

export const ID_RE = /^A\d{4}$/;
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

export function writeJson(file, data) {
  fs.writeFileSync(path.join(ROOT, file), JSON.stringify(data, null, 2) + '\n');
}

export const loadApps = () => readJson('registry/apps.json');
export const loadConfig = () => readJson('registry/config.json');

export function publishedApps() {
  return loadApps().filter((a) => PUBLISHED.has(a.status));
}

export function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function nextAppId(apps) {
  const max = apps.reduce((m, a) => Math.max(m, Number(a.id.slice(1)) || 0), 0);
  return 'A' + String(max + 1).padStart(4, '0');
}

export function appUrl(config, slug) {
  return new URL(`apps/${slug}/`, config.site_base_url).href;
}

/** Parse --key value / --flag args. */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}
