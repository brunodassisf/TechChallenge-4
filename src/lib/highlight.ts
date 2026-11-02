export type HighlightPart = { text: string; match: boolean };

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function splitHighlight(text: string, term: string): HighlightPart[] {
  const t = term.trim();
  if (!t) return [{ text, match: false }];
  const re = new RegExp(`(${escapeRegExp(t)})`, 'gi');
  return text
    .split(re)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, match: part.toLowerCase() === t.toLowerCase() }));
}
