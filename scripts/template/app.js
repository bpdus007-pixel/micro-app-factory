import { $, showError, onSubmit, formatNumber } from '../_shared/ui.js';
import { compute } from './logic.js';

const errorEl = $('#error');
const resultEl = $('#result');

onSubmit($('#form'), () => {
  const res = compute({ x: $('#x').value });
  resultEl.textContent = '';
  if (!res.ok) return showError(errorEl, res.error);
  showError(errorEl, '');
  resultEl.textContent = `결과: ${formatNumber(res.value)}`;
});
