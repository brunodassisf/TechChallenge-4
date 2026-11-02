import { excerpt } from './excerpt';

describe('excerpt', () => {
  it('junta espaços e quebras de linha', () => {
    expect(excerpt('  Olá\n\n  mundo\tbonito ')).toBe('Olá mundo bonito');
  });
  it('não corta texto curto', () => {
    expect(excerpt('Curto', 10)).toBe('Curto');
  });
  it('corta no fim de palavra e põe reticências', () => {
    expect(excerpt('uma pizza para quatro amigos', 14)).toBe('uma pizza…');
  });
  it('corta no limite quando não há espaço', () => {
    expect(excerpt('abcdefghij', 4)).toBe('abcd…');
  });
});
