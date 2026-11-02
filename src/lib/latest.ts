/** Marca como "stale" a resposta de uma chamada que foi superada por outra mais nova. */
export function createLatest() {
  let current = 0;
  return async function latest<T>(promise: Promise<T>): Promise<{ stale: boolean; value: T }> {
    const id = ++current;
    const value = await promise;
    return { stale: id !== current, value };
  };
}
