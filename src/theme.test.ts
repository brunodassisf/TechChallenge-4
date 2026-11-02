import { CATEGORIES, getCategory } from './theme';

describe('getCategory', () => {
  it('devolve rótulo e cor da matéria', () => {
    expect(getCategory('EDUCACAO_FISICA')).toEqual({
      value: 'EDUCACAO_FISICA',
      label: 'Educação Física',
      color: '#B8F06A',
    });
  });

  it('cai em Geral para valor desconhecido, vazio ou nulo', () => {
    for (const v of ['QUIMICA', '', null, undefined]) {
      expect(getCategory(v).value).toBe('GERAL');
    }
  });

  it('tem as 9 matérias do spec', () => {
    expect(CATEGORIES.map((c) => c.value)).toEqual([
      'MATEMATICA', 'PORTUGUES', 'CIENCIAS', 'HISTORIA', 'GEOGRAFIA',
      'INGLES', 'ARTES', 'EDUCACAO_FISICA', 'GERAL',
    ]);
  });
});
