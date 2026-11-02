// Na web o expo-secure-store não existe; o Metro escolhe este arquivo.
const KEY = 'tc4.session';

export async function loadRaw(): Promise<string | null> {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function saveRaw(value: string): Promise<void> {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    // modo privado ou armazenamento bloqueado: segue só em memória
  }
}

export async function clearRaw(): Promise<void> {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // idem
  }
}
