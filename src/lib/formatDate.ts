// Meses fixos para não depender do Intl do Hermes.
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
