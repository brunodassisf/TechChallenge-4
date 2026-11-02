import { splitHighlight } from './highlight';

describe('splitHighlight', () => {
  it('marca o termo sem diferenciar maiúsculas', () => {
    expect(splitHighlight('Profa. Ana Lima', 'ana')).toEqual([
      { text: 'Profa. ', match: false },
      { text: 'Ana', match: true },
      { text: ' Lima', match: false },
    ]);
  });
  it('marca todas as ocorrências', () => {
    expect(splitHighlight('ab ab', 'ab').filter((p) => p.match)).toHaveLength(2);
  });
  it('trata caracteres especiais como texto', () => {
    expect(splitHighlight('Curso de c++ (básico)', 'c++ (')).toEqual([
      { text: 'Curso de ', match: false },
      { text: 'c++ (', match: true },
      { text: 'básico)', match: false },
    ]);
  });
  it('termo vazio ou só espaços não marca nada', () => {
    expect(splitHighlight('texto', '   ')).toEqual([{ text: 'texto', match: false }]);
  });
});
