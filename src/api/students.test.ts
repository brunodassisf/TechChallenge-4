import { deleteStudent, getMyProfile, listStudents, resetStudentPassword, updateMyProfile, updateStudent } from './students';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  process.env.EXPO_PUBLIC_API_URL = 'http://api.test:3000';
});

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValue({ ok: status < 300, status, json: async () => body } as Response);
}

const user = { id: 'u1', name: 'Ana', role: 'STUDENT', authorId: null };
const base = { name: 'Ana', email: 'ana@x.com', currentPassword: '', password: '', confirmPassword: '' };

describe('getMyProfile', () => {
  it('GET /api/student/me com o token', async () => {
    respond(200, { name: 'Ana', email: 'ana@x.com' });
    await expect(getMyProfile('tk')).resolves.toEqual({ name: 'Ana', email: 'ana@x.com' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/student/me');
    expect(init).toMatchObject({ method: 'GET', headers: { Authorization: 'Bearer tk' } });
  });
});

describe('updateMyProfile', () => {
  it('PUT com nome e e-mail sem espaços nas pontas e sem campos de senha vazios', async () => {
    respond(200, { user });
    const res = await updateMyProfile({ ...base, name: ' Ana Souza ', email: ' ana@x.com ' }, 'tk');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/student/me');
    expect(init).toMatchObject({ method: 'PUT', headers: { Authorization: 'Bearer tk' } });
    expect(JSON.parse(init.body)).toEqual({ name: 'Ana Souza', email: 'ana@x.com' });
    expect(res).toEqual(user);
  });
  it('envia os campos de senha preenchidos', async () => {
    respond(200, { user });
    await updateMyProfile(
      { ...base, currentPassword: 'atual123', password: 'novasenha', confirmPassword: 'novasenha' },
      'tk',
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      name: 'Ana',
      email: 'ana@x.com',
      currentPassword: 'atual123',
      password: 'novasenha',
      confirmPassword: 'novasenha',
    });
  });
});

describe('listStudents', () => {
  it('GET /api/student com o token', async () => {
    const list = [{ id: 's1', name: 'Ana', email: 'ana@x.com', createdAt: '2026-11-01T00:00:00.000Z' }];
    respond(200, list);
    await expect(listStudents('tk')).resolves.toEqual(list);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/student');
    expect(init).toMatchObject({ method: 'GET', headers: { Authorization: 'Bearer tk' } });
  });
  it('falha quando a resposta não é lista', async () => {
    respond(200, { nope: true });
    await expect(listStudents('tk')).rejects.toThrow();
  });
});

const summary = { id: 's1', name: 'Ana Souza', email: 'ana@x.com', createdAt: '2026-11-01T00:00:00.000Z' };

describe('updateStudent', () => {
  it('PUT /api/student/:id com nome e e-mail sem espaços nas pontas', async () => {
    respond(200, { data: summary });
    await expect(updateStudent('s1', { name: ' Ana Souza ', email: ' ana@x.com ' }, 'tk')).resolves.toEqual(summary);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/student/s1');
    expect(init).toMatchObject({ method: 'PUT', headers: { Authorization: 'Bearer tk' } });
    expect(JSON.parse(init.body)).toEqual({ name: 'Ana Souza', email: 'ana@x.com' });
  });
});

describe('deleteStudent', () => {
  it('DELETE /api/student/:id', async () => {
    respond(200, { message: 'ok' });
    await deleteStudent('s1', 'tk');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/student/s1');
    expect(init).toMatchObject({ method: 'DELETE', headers: { Authorization: 'Bearer tk' } });
  });
});

describe('resetStudentPassword', () => {
  it('POST /api/student/:id/reset-password', async () => {
    respond(200, { message: 'ok' });
    await resetStudentPassword('s1', 'tk');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test:3000/api/student/s1/reset-password');
    expect(init).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer tk' } });
  });
});
