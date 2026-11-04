export type Category =
  | 'MATEMATICA' | 'PORTUGUES' | 'CIENCIAS' | 'HISTORIA' | 'GEOGRAFIA'
  | 'INGLES' | 'ARTES' | 'EDUCACAO_FISICA' | 'GERAL';

export type CategoryInfo = { value: Category; label: string; color: string };

export const CATEGORIES: readonly CategoryInfo[] = [
  { value: 'MATEMATICA', label: 'Matemática', color: '#FFD84D' },
  { value: 'PORTUGUES', label: 'Português', color: '#FF9EC4' },
  { value: 'CIENCIAS', label: 'Ciências', color: '#8CF0C6' },
  { value: 'HISTORIA', label: 'História', color: '#FFB36B' },
  { value: 'GEOGRAFIA', label: 'Geografia', color: '#7FD3FF' },
  { value: 'INGLES', label: 'Inglês', color: '#C3A6FF' },
  { value: 'ARTES', label: 'Artes', color: '#FF8A7A' },
  { value: 'EDUCACAO_FISICA', label: 'Educação Física', color: '#B8F06A' },
  { value: 'GERAL', label: 'Geral', color: '#E6E4F5' },
];

const GERAL = CATEGORIES[CATEGORIES.length - 1];

export function getCategory(value: string | null | undefined): CategoryInfo {
  return CATEGORIES.find((c) => c.value === value) ?? GERAL;
}

export const colors = {
  background: '#14123A',
  surface: '#211E52',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.7)',
  textFaint: 'rgba(255,255,255,0.55)',
  onCard: '#14123A',
  onCardMuted: 'rgba(20,18,58,0.8)',
  tagBackground: 'rgba(20,18,58,0.12)',
  field: 'rgba(255,255,255,0.08)',
  fieldBorder: 'rgba(255,255,255,0.16)',
  subtle: 'rgba(255,255,255,0.12)',
  overlay: 'rgba(8,7,25,0.72)',
  accent: '#FFD84D',
  danger: '#FF8A7A',
  success: '#8CF0C6',
  admin: '#C3A6FF',
} as const;

// Nomes = chaves passadas ao useFonts no _layout.
export const fonts = {
  display500: 'BricolageGrotesque_500Medium',
  display700: 'BricolageGrotesque_700Bold',
  display800: 'BricolageGrotesque_800ExtraBold',
  body400: 'Inter_400Regular',
  body500: 'Inter_500Medium',
  body700: 'Inter_700Bold',
} as const;

export const radius = { card: 22, hero: 26, field: 16, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
