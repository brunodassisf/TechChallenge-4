import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('formata em pt-BR curto', () => {
    expect(formatDate('2026-10-12T15:00:00.000Z')).toBe('12 out 2026');
  });
  it('devolve vazio para data inválida', () => {
    expect(formatDate('não é data')).toBe('');
  });
});
