export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;
  /** Corpo JSON da resposta de erro (ou null quando não era JSON). */
  body: unknown;

  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>, body: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.body = body;
  }
}

export const REQUEST_TIMEOUT_MS = 15000;
export const INVALID_RESPONSE = 'Resposta inválida do servidor.';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  query?: Record<string, string | undefined>;
};

function getApiUrl(): string {
  // Acesso literal: o Expo só embute EXPO_PUBLIC_* escrito assim.
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new ApiError(0, 'Endereço da API não configurado (EXPO_PUBLIC_API_URL no .env).');
  }
  return url.replace(/\/+$/, '');
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(opts.query ?? {})) {
    const v = value?.trim();
    if (v) params.set(key, v);
  }
  const qs = params.toString();
  const url = `${getApiUrl()}${path}${qs ? `?${qs}` : ''}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  // Sem timeout, o Android espera indefinidamente por um host inalcançável.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      // A API também define cookie de sessão; o app usa só o token.
      credentials: 'omit',
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor.');
  } finally {
    clearTimeout(timer);
  }

  const parsed: { ok: true; data: unknown } | { ok: false } = await res
    .json()
    .then((data: unknown) => ({ ok: true as const, data }))
    .catch(() => ({ ok: false as const }));
  const data = parsed.ok ? parsed.data : null;

  if (res.ok && !parsed.ok) {
    // Ex.: portal de Wi-Fi ou outro servidor respondendo HTML com 200.
    throw new ApiError(res.status, INVALID_RESPONSE);
  }

  if (!res.ok) {
    const obj = (data && typeof data === 'object' ? data : {}) as {
      error?: unknown;
      errors?: Record<string, string[]>;
    };
    const fieldErrors = obj.errors && typeof obj.errors === 'object' ? obj.errors : undefined;
    const message =
      typeof obj.error === 'string' && obj.error
        ? obj.error
        : fieldErrors
          ? 'Confira os campos destacados.'
          : res.status >= 500
            ? `Erro ${res.status} no servidor.`
            : `Erro ${res.status}.`;
    throw new ApiError(res.status, message, fieldErrors, data);
  }

  return data as T;
}
