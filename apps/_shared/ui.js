// Shared browser helpers for micro apps. Pure parsing helpers live in num.js so tests can import them.
export { parseNumber, formatNumber } from './num.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Show an error message in the element (empty string clears it). */
export function showError(el, message) {
  el.textContent = message || '';
  el.setAttribute('role', message ? 'alert' : '');
}

/** Escape text for safe insertion into innerHTML. Prefer textContent where possible. */
export function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Run handler on submit of a form (prevents navigation). */
export function onSubmit(form, handler) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handler(e);
  });
}

/** Copy text to clipboard; resolves true on success. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
