// Build the static site into _site/ : dashboard + every published app + data snapshots.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, APPS_DIR, SITE_OUT, loadApps, loadConfig, readJson, PUBLISHED, appUrl } from './lib.mjs';

const EXCLUDE = /(\.test\.js|e2e\.json)$/;

fs.rmSync(SITE_OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(SITE_OUT, 'apps'), { recursive: true });
fs.mkdirSync(path.join(SITE_OUT, 'data'), { recursive: true });

const config = loadConfig();
const apps = loadApps();
const published = apps.filter((a) => PUBLISHED.has(a.status));

const copyDir = (src, dst) =>
  fs.cpSync(src, dst, { recursive: true, filter: (p) => !EXCLUDE.test(p) });

copyDir(path.join(APPS_DIR, '_shared'), path.join(SITE_OUT, 'apps', '_shared'));
for (const a of published) copyDir(path.join(APPS_DIR, a.slug), path.join(SITE_OUT, 'apps', a.slug));
copyDir(path.join(ROOT, 'site'), SITE_OUT);

// Data snapshots for the dashboard (public; contains no secrets by design).
const runs = readJson('registry/runs.json');
const data = {
  generated_at: new Date().toISOString(),
  config: {
    target_app_count: config.target_app_count,
    schedule_note: config.schedule_note,
    apps_per_run: config.apps_per_run,
    production_paused: config.production_paused,
    paused_reason: config.paused_reason,
    monthly_spend_krw: config.monthly_spend_krw,
    stage_thresholds: config.stage_thresholds,
  },
  apps: apps.map((a) => ({
    id: a.id, slug: a.slug, title: a.title, category: a.category, summary: a.summary,
    status: a.status, created_at: a.created_at, updated_at: a.updated_at, verified_at: a.verified_at || null,
    url: PUBLISHED.has(a.status) ? appUrl(config, a.slug) : null,
  })),
  runs: runs.slice(-30),
  live_check: readJson('registry/live-check.json'),
  pipeline: readJson('registry/pipeline-status.json'),
  owner_requests: readJson('registry/owner-requests.json').filter((r) => r.status === 'open').map((r) => ({ id: r.id, title: r.title, action: r.action })),
};
fs.writeFileSync(path.join(SITE_OUT, 'data', 'dashboard.json'), JSON.stringify(data));

// Crawl helpers: sitemap lists only real, published tools.
const urls = [config.site_base_url, ...published.map((a) => appUrl(config, a.slug))];
fs.writeFileSync(
  path.join(SITE_OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`,
);
fs.writeFileSync(path.join(SITE_OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${config.site_base_url}sitemap.xml\n`);
fs.writeFileSync(path.join(SITE_OUT, '.nojekyll'), '');

console.log(`build: _site ready — ${published.length} published app(s) of ${apps.length}`);
