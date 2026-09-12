/**
 * Utilidades puras de formato y saneamiento.
 * Sin dependencias del DOM ni del estado global.
 */

/** Escapa caracteres peligrosos para insertar texto en HTML. */
export function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Escapa comillas y backslash para usar un valor dentro de un onclick inline. */
export function escapeString(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/** Fecha en formato YYYY-MM-DD. */
export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().split('T')[0];
}

/** Fecha y hora en formato YYYY-MM-DD HH:mm. */
export function formatDateTime(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Valor monetario con 2 decimales. */
export function formatMoney(val) {
  const num = Number(val);
  if (val === null || val === undefined || isNaN(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
}

/** Porcentaje con 2 decimales. */
export function formatPercent(val) {
  const num = Number(val);
  if (val === null || val === undefined || isNaN(num)) return '-';
  return `${num.toFixed(2)}%`;
}

/** Cantidad numérica sin ceros decimales sobrantes. */
export function formatQty(val) {
  const num = Number(val);
  if (val === null || val === undefined || isNaN(num)) return '-';
  return String(parseFloat(num.toFixed(3)));
}
