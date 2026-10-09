import { $, $$, showError, onSubmit, formatNumber } from '../_shared/ui.js';
import { compareUnitPrices, MAX_ITEMS } from './logic.js';

const rowsEl = $('#rows');
const errorEl = $('#error');
const resultEl = $('#result');
const tpl = $('#row-tpl');

function addRow() {
  const count = $$('.item', rowsEl).length;
  if (count >= MAX_ITEMS) {
    showError(errorEl, `상품은 최대 ${MAX_ITEMS}개까지 추가할 수 있습니다.`);
    return;
  }
  const node = tpl.content.firstElementChild.cloneNode(true);
  const n = count + 1;
  node.querySelector('.item-legend').textContent = `상품 ${n}`;
  for (const f of ['name', 'price', 'amount', 'unit', 'pack']) {
    const el = node.querySelector(`.f-${f}`);
    el.id = `${f}-${n}`;
    el.dataset.testid = `${f}-${n}`;
    el.closest('div').querySelector('label').htmlFor = el.id;
  }
  rowsEl.append(node);
}

function readRows() {
  return $$('.item', rowsEl).map((item) => ({
    name: item.querySelector('.f-name').value,
    price: item.querySelector('.f-price').value,
    amount: item.querySelector('.f-amount').value,
    unit: item.querySelector('.f-unit').value,
    pack: item.querySelector('.f-pack').value,
  }));
}

function render(res) {
  resultEl.replaceChildren();
  if (!res.ok) {
    showError(errorEl, res.error);
    return;
  }
  showError(errorEl, '');
  const head = document.createElement('p');
  head.innerHTML = '가장 저렴한 상품: <span class="big" data-testid="cheapest"></span>';
  head.querySelector('.big').textContent = res.cheapest.join(', ');
  const wrap = document.createElement('div');
  wrap.className = 'table-scroll';
  const table = document.createElement('table');
  table.innerHTML = `<thead><tr><th>순위</th><th>상품</th><th>${res.basisLabel} 가격</th><th>최저가 대비</th></tr></thead>`;
  const tbody = document.createElement('tbody');
  for (const it of [...res.items].sort((a, b) => a.rank - b.rank)) {
    const tr = document.createElement('tr');
    const cells = [
      `${it.rank}`,
      it.name,
      `${formatNumber(it.perUnit, 2)}원`,
      it.isCheapest ? '최저가' : `+${formatNumber(it.diffPct, 1)}%`,
    ];
    for (const c of cells) {
      const td = document.createElement('td');
      td.textContent = c;
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);
  wrap.append(table);
  resultEl.append(head, wrap);
}

onSubmit($('#form'), () => render(compareUnitPrices(readRows())));
$('#add').addEventListener('click', addRow);
$('#reset').addEventListener('click', () => {
  rowsEl.replaceChildren();
  resultEl.replaceChildren();
  showError(errorEl, '');
  addRow();
  addRow();
});

addRow();
addRow();
