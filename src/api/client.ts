export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
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

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      // A API também define cookie de sessão; o app usa só o token.
      credentials: 'omit',
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor.');
  }

  const data: unknown = await res.json().catch(() => null);

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
    throw new ApiError(res.status, message, fieldErrors);
  }

  return data as T;
}
