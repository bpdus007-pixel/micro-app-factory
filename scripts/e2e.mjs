// Browser tests for every published app, driven by each app's e2e.json.
//   npm run e2e                 -> serve _site locally and test (run `npm run build` first)
//   npm run e2e -- --only slug  -> one app
//   npm run e2e:live -- --write -> test the public URLs, update registry/live-check.json + app statuses
// Per app and per viewport (mobile 390px, desktop 1280px): HTTP 200, no console/page errors,
// no requests to other origins, no horizontal overflow on mobile, then every e2e case.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import { SITE_OUT, loadApps, loadConfig, writeJson, PUBLISHED, nowIso, parseArgs } from './lib.mjs';

const args = parseArgs();
const LIVE = !!args.live;
const config = loadConfig();
const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: 'desktop', width: 1280, height: 800 },
];
const TIMEOUT = 8000;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png' };

function serve(dir) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(dir, p);
    if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function runStep(page, s) {
  const loc = (sel) => page.locator(sel).first();
  if ('fill' in s) return loc(s.fill).fill(String(s.value), { timeout: TIMEOUT });
  if ('select' in s) return loc(s.select).selectOption(String(s.value), { timeout: TIMEOUT });
  if ('click' in s) return loc(s.click).click({ timeout: TIMEOUT });
  if ('check' in s) return loc(s.check).check({ timeout: TIMEOUT });
  if ('uncheck' in s) return loc(s.uncheck).uncheck({ timeout: TIMEOUT });
  if ('press' in s) return loc(s.press).press(String(s.key), { timeout: TIMEOUT });
  if ('wait' in s) return page.waitForTimeout(Math.min(Number(s.wait) || 0, 2000));
  if ('expectVisible' in s) return loc(s.expectVisible).waitFor({ state: 'visible', timeout: TIMEOUT });
  if ('expectHidden' in s) return loc(s.expectHidden).waitFor({ state: 'hidden', timeout: TIMEOUT });
  if ('expectCount' in s) {
    const n = await page.locator(s.expectCount).count();
    if (n !== s.count) throw new Error(`expectCount ${s.expectCount}: got ${n}, want ${s.count}`);
    return;
  }
  if ('expectText' in s || 'expectValue' in s) {
    const sel = s.expectText ?? s.expectValue;
    const read = () => ('expectText' in s ? loc(sel).textContent() : loc(sel).inputValue());
    const ok = (t) => {
      const v = (t ?? '').trim();
      if ('equals' in s) return v === String(s.equals);
      if ('contains' in s) return v.includes(String(s.contains));
      if ('matches' in s) return new RegExp(s.matches).test(v);
      return v.length > 0;
    };
    const deadline = Date.now() + TIMEOUT;
    let last;
    while (Date.now() < deadline) {
      last = await read();
      if (ok(last)) return;
      await page.waitForTimeout(100);
    }
    throw new Error(`${'expectText' in s ? 'expectText' : 'expectValue'} ${sel}: got ${JSON.stringify((last ?? '').trim().slice(0, 200))}, want ${JSON.stringify(s.equals ?? s.contains ?? s.matches ?? '(non-empty)')}`);
  }
  throw new Error(`unknown step ${JSON.stringify(s)}`);
}

async function testApp(browser, base, app, spec) {
  const url = new URL(`apps/${app.slug}/`, base).href;
  const origin = new URL(base).origin;
  const failures = [];
  for (const vp of VIEWPORTS) {
    const cases = [{ name: '(load)', steps: [] }, ...spec.cases];
    for (const c of cases) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, locale: 'ko-KR' });
      const page = await ctx.newPage();
      const problems = [];
      page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
      page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
      page.on('request', (r) => { if (!r.url().startsWith(origin) && !r.url().startsWith('data:')) problems.push(`external request: ${r.url()}`); });
      try {
        const resp = await page.goto(url, { waitUntil: 'load', timeout: 20000 });
        if (!resp || resp.status() !== 200) throw new Error(`HTTP ${resp && resp.status()}`);
        if (c.name === '(load)' && vp.name === 'mobile') {
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          if (overflow > 1) throw new Error(`horizontal overflow ${overflow}px on mobile`);
        }
        for (const s of c.steps) await runStep(page, s);
        if (problems.length) throw new Error(problems.join(' | '));
      } catch (e) {
        failures.push(`[${vp.name}] ${c.name}: ${e.message.split('\n')[0]}`);
      } finally {
        await ctx.close();
      }
    }
  }
  return failures;
}

async function testDashboard(browser, base) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  try {
    const resp = await page.goto(base, { waitUntil: 'load', timeout: 20000 });
    if (!resp || resp.status() !== 200) errs.push(`HTTP ${resp && resp.status()}`);
    await page.locator('#kpis .kpi').first().waitFor({ state: 'attached', timeout: TIMEOUT });
    await page.locator('#tools .tool').first().waitFor({ timeout: TIMEOUT });
  } catch (e) { errs.push(e.message.split('\n')[0]); }
  await ctx.close();
  return errs;
}

async function main() {
  let apps = loadApps().filter((a) => PUBLISHED.has(a.status));
  if (args.only) apps = apps.filter((a) => a.slug === args.only);
  let server;
  let base;
  if (LIVE) {
    base = config.site_base_url;
  } else {
    if (!fs.existsSync(SITE_OUT)) { console.error('Run `npm run build` first.'); process.exit(1); }
    server = await serve(SITE_OUT);
    base = `http://127.0.0.1:${server.address().port}/`;
  }
  const browser = await chromium.launch();
  const results = {};
  let failed = 0;
  const attempts = LIVE ? Number(args.retries ?? 4) : 1;
  for (const app of apps) {
    const specPath = path.join('apps', app.slug, 'e2e.json');
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    let failures = [];
    for (let i = 1; i <= attempts; i++) {
      failures = await testApp(browser, base, app, spec);
      if (!failures.length || i === attempts) break;
      console.log(`  retry ${app.slug} in 30s (attempt ${i} failed: ${failures[0]})`);
      await new Promise((r) => setTimeout(r, 30000));
    }
    results[app.slug] = { id: app.id, ok: failures.length === 0, failures, checked_at: nowIso() };
    if (failures.length) failed++;
    console.log(`${failures.length ? 'FAIL' : 'PASS'} ${app.id} ${app.slug}${failures.length ? '\n  - ' + failures.join('\n  - ') : ''}`);
  }
  const dash = args.only ? [] : await testDashboard(browser, base);
  if (dash.length) { failed++; console.log(`FAIL dashboard\n  - ${dash.join('\n  - ')}`); } else if (!args.only) console.log('PASS dashboard');
  await browser.close();
  server?.close();

  if (LIVE && args.write) {
    const checkedAt = nowIso();
    writeJson('registry/live-check.json', { checked_at: checkedAt, base_url: base, dashboard_ok: dash.length === 0, results });
    const all = loadApps();
    for (const a of all) {
      const r = results[a.slug];
      if (!r) continue;
      const before = a.status;
      if (r.ok) {
        a.status = 'live';
        a.verified_at = checkedAt;
      } else if (before === 'live' || before === 'ready') {
        a.status = 'live_failed';
      }
      if (before !== a.status) {
        a.updated_at = checkedAt;
        a.history.push({ at: checkedAt, event: `status ${before} -> ${a.status}`, note: r.ok ? 'public URL e2e passed' : r.failures.slice(0, 3).join(' | ') });
      }
    }
    writeJson('registry/apps.json', all);
  }
  console.log(`\ne2e${LIVE ? ' (live)' : ''}: ${apps.length - (failed - (dash.length ? 1 : 0))}/${apps.length} app(s) passed${dash.length ? ', dashboard FAILED' : ''}`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
