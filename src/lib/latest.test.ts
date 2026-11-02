import { createLatest } from './latest';

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe('createLatest', () => {
  it('marca como velha a resposta que chega depois de uma busca mais nova', async () => {
    const latest = createLatest();
    const a = deferred<string>();
    const b = deferred<string>();
    const ra = latest(a.promise);
    const rb = latest(b.promise);
    b.resolve('nova');
    a.resolve('velha');
    expect(await rb).toEqual({ stale: false, value: 'nova' });
    expect(await ra).toEqual({ stale: true, value: 'velha' });
  });

  it('repassa o erro da busca', async () => {
    const latest = createLatest();
    await expect(latest(Promise.reject(new Error('x')))).rejects.toThrow('x');
  });
});
