// Portfolio home + operations dashboard. Reads data/dashboard.json produced by scripts/build-site.mjs.
// Only measured values are shown; anything not connected is labelled "측정되지 않음".
const $ = (s) => document.querySelector(s);
const NA = '측정되지 않음';
const STATUS_KO = {
  building: '제작 중', ready: '배포 대기·검증 중', live: '정상 공개', live_failed: '공개 URL 검증 실패',
  on_hold: '보류', quarantined: '격리', retired: '종료',
};

function el(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v; else n.setAttribute(k, v);
  }
  for (const c of children) n.append(c instanceof Node ? c : document.createTextNode(c ?? ''));
  return n;
}

function kpi(label, value) {
  const v = value === null ? el('div', { class: 'v na' }, NA) : el('div', { class: 'v' }, String(value));
  return el('div', { class: 'kpi' }, v, el('div', { class: 'k' }, label));
}

function renderTools(apps) {
  const q = $('#q').value.trim().toLowerCase();
  const list = apps
    .filter((a) => a.url && (a.status === 'live' || a.status === 'ready'))
    .filter((a) => !q || `${a.title} ${a.summary} ${a.category}`.toLowerCase().includes(q));
  $('#tools').replaceChildren(
    ...list.map((a) =>
      el('a', { class: 'card tool', href: `apps/${a.slug}/` },
        el('span', { class: 'tag' }, a.category),
        el('h3', {}, a.title),
        el('p', {}, a.summary))),
  );
  $('#tools-empty').hidden = list.length > 0;
}

async function main() {
  let data;
  try {
    const res = await fetch('data/dashboard.json', { cache: 'no-store' });
    data = await res.json();
  } catch {
    $('#tools-empty').hidden = false;
    $('#tools-empty').textContent = '목록을 불러오지 못했습니다.';
    return;
  }
  const { apps, runs, config, pipeline } = data;
  renderTools(apps);
  $('#q').addEventListener('input', () => renderTools(apps));

  const count = (s) => apps.filter((a) => s.includes(a.status)).length;
  const live = count(['live']);
  const lastRun = runs.at(-1);
  $('#kpis').replaceChildren(
    kpi('목표 앱 수', config.target_app_count.toLocaleString('ko-KR')),
    kpi('제작 완료(공개 URL 검증 통과)', live),
    kpi('제작·검증 진행 중', count(['building', 'ready'])),
    kpi('실패·보류·격리', count(['live_failed', 'on_hold', 'quarantined'])),
    kpi('정상 공개 중', live),
    kpi('방문 통계', null),
    kpi('수익', null),
    kpi('확인된 월 운영비', `${(config.monthly_spend_krw || 0).toLocaleString('ko-KR')}원`),
    kpi('소유자 조치 필요', (data.owner_requests || []).length ? `${data.owner_requests.length}건: ${data.owner_requests.map((r) => r.title).join(', ')}` : '없음'),
    kpi('최근 자동 실행', lastRun ? `${lastRun.result}` : '없음'),
    kpi('예약 실행', config.production_paused ? `중지됨: ${config.paused_reason || ''}` : config.schedule_note),
  );
  const pct = Math.min(100, (live / config.target_app_count) * 100);
  $('#progress').style.width = `${pct}%`;
  $('#progress-label').textContent = `진행률 ${live} / ${config.target_app_count} (${pct.toFixed(1)}%)`;

  $('#runs').replaceChildren(
    ...[...runs].reverse().slice(0, 15).map((r) =>
      el('tr', {}, el('td', {}, (r.started_at || '').replace('T', ' ').replace('Z', '')), el('td', {}, r.result), el('td', {}, r.summary || ''))),
  );
  if (!runs.length) $('#runs').append(el('tr', {}, el('td', { colspan: '3' }, '아직 기록 없음')));

  const p = pipeline.last;
  $('#pipeline').textContent = p ? `${p.at} · ${p.ref} · ${p.result}${p.note ? ' · ' + p.note : ''}` : '아직 기록 없음';

  $('#all').replaceChildren(
    ...apps.map((a) => {
      const cls = a.status === 'live' ? 's-live' : ['live_failed', 'quarantined', 'on_hold'].includes(a.status) ? 's-bad' : '';
      const name = a.url ? el('a', { href: `apps/${a.slug}/` }, a.title) : el('span', {}, a.title);
      return el('tr', {}, el('td', {}, a.id), el('td', {}, name), el('td', { class: cls }, STATUS_KO[a.status] || a.status), el('td', {}, a.verified_at || '-'));
    }),
  );
  $('#generated').textContent = `데이터 생성: ${data.generated_at}`;
  if (location.hash === '#ops') $('#ops').open = true;
}

main();
