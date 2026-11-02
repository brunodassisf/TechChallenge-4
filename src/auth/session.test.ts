import { isExpired, parseStoredSession } from './session';

const now = new Date('2026-11-02T12:00:00Z');
const valid = {
  token: 'tok',
  expiresAt: '2026-11-09T12:00:00Z',
  user: { id: 'u1', name: 'Ana', role: 'AUTHOR', authorId: 'a1' },
};

describe('isExpired', () => {
  it('vence quando expiresAt chega ou é inválido', () => {
    expect(isExpired({ expiresAt: '2026-11-09T12:00:00Z' }, now)).toBe(false);
    expect(isExpired({ expiresAt: '2026-11-02T12:00:00Z' }, now)).toBe(true);
    expect(isExpired({ expiresAt: 'nunca' }, now)).toBe(true);
  });
});

describe('parseStoredSession', () => {
  it('aceita sessão válida', () => {
    expect(parseStoredSession(JSON.stringify(valid), now)).toEqual(valid);
  });
  it('descarta sessão vencida', () => {
    expect(parseStoredSession(JSON.stringify({ ...valid, expiresAt: '2026-11-01T00:00:00Z' }), now)).toBeNull();
  });
  it('descarta nulo, JSON quebrado e campos faltando', () => {
    expect(parseStoredSession(null, now)).toBeNull();
    expect(parseStoredSession('{quebrado', now)).toBeNull();
    expect(parseStoredSession(JSON.stringify({ token: 'tok' }), now)).toBeNull();
    expect(parseStoredSession(JSON.stringify({ ...valid, user: { ...valid.user, role: 'HACKER' } }), now)).toBeNull();
    expect(parseStoredSession(JSON.stringify({ ...valid, expiresAt: 'nunca' }), now)).toBeNull();
  });
});
