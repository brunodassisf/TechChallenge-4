import { initials } from './initials';

describe('initials', () => {
  it('primeira e última palavra', () => {
    expect(initials('Ana Maria Lima')).toBe('AL');
  });
  it('uma palavra só', () => {
    expect(initials('carlos')).toBe('C');
  });
  it('vazio vira ?', () => {
    expect(initials('  ')).toBe('?');
    expect(initials(undefined)).toBe('?');
  });
});
