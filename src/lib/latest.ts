export type LatestResult<T> = { stale: false; value: T } | { stale: true; value?: undefined };

/**
 * Marca como "stale" a resposta (ou a falha) de uma chamada que foi superada
 * por outra mais nova. Só a chamada mais recente pode lançar erro.
 */
export function createLatest() {
  let current = 0;
  return async function latest<T>(promise: Promise<T>): Promise<LatestResult<T>> {
    const id = ++current;
    let value: T;
    try {
      value = await promise;
    } catch (err) {
      if (id !== current) return { stale: true };
      throw err;
    }
    return id === current ? { stale: false, value } : { stale: true };
  };
}
