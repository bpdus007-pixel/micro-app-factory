import { $, showError, onSubmit, formatNumber } from '../_shared/ui.js';
import { diffDates, addDays } from './logic.js';

const pad = (n) => String(n).padStart(2, '0');
function todayIso() {
  const t = new Date();
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

function line(text, testid, big = false) {
  const p = document.createElement('p');
  p.textContent = text;
  if (testid) p.dataset.testid = testid;
  if (big) p.className = 'big';
  return p;
}

onSubmit($('#form-diff'), () => {
  const resultEl = $('#result');
  const errorEl = $('#error');
  const r = diffDates({ start: $('#start').value, end: $('#end').value, includeStart: $('#include-start').checked });
  resultEl.replaceChildren();
  if (!r.ok) return showError(errorEl, r.error);
  showError(errorEl, '');
  const dirText = r.direction === 'after' ? '종료일은 시작일로부터' : r.direction === 'before' ? '종료일은 시작일보다 앞서며 그 차이는' : '두 날짜가 같습니다. 간격은';
  resultEl.append(
    line(`${r.startLabel} → ${r.endLabel}`),
    line(dirText),
    line(`${formatNumber(r.days, 0)}일`, 'days-total', true),
    line(`${formatNumber(r.weeks, 0)}주 ${r.weekRest}일 · ${formatNumber(r.months, 0)}개월 ${r.monthRest}일`, 'days-detail'),
  );
});

onSubmit($('#form-add'), () => {
  const resultEl = $('#result-add');
  const errorEl = $('#error-add');
  const r = addDays({ base: $('#base').value, days: $('#days').value, countBaseAsDay1: $('#day1').checked });
  resultEl.replaceChildren();
  if (!r.ok) return showError(errorEl, r.error);
  showError(errorEl, '');
  resultEl.append(
    line(`${r.baseLabel}에서 ${r.offset >= 0 ? `${formatNumber(r.offset, 0)}일 뒤` : `${formatNumber(-r.offset, 0)}일 전`}`),
    line(r.label, 'add-date', true),
  );
});

$('#start-today').addEventListener('click', () => { $('#start').value = todayIso(); });
$('#start').value = todayIso();
$('#base').value = todayIso();
