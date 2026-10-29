/**
 * Seul point d'accès de l'interface à l'API (standard v3.2, section 6.2).
 * Session par cookie HttpOnly SameSite=Strict posé par le serveur : aucun jeton en localStorage ni dans une URL.
 * Toute écriture porte X-CSRF-Token, jeton propre à la session rendu par la connexion et par /api/auth/me ; il reste en mémoire.
 * Réponses à l'enveloppe { data, meta, pagination } reconnue par meta.envelope === 1.
 */
let csrfToken: string | null = null;
export function setCsrfToken(t: string | null | undefined) { csrfToken = t || null; }
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: string[]) {
    super(message);
  }
}

export interface Page<T> { data: T[]; pagination: { total: number; limit: number; offset: number }; meta?: Record<string, unknown> }

async function request<T>(method: string, path: string, body?: unknown): Promise<{ data: T; pagination?: Page<T>['pagination']; meta?: Record<string, unknown> }> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api${path}`, { method, headers, credentials: 'same-origin', body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.error) {
    if (res.status === 401 && path !== '/auth/login' && path !== '/auth/me') window.dispatchEvent(new Event('app-unauthorized'));
    throw new ApiError(res.status, json?.code || 'INTERNAL', json?.message || res.statusText, json?.details);
  }
  if (json.meta?.envelope !== 1) throw new ApiError(res.status, 'INTERNAL', 'Réponse hors enveloppe');
  if (json.data && typeof json.data === 'object' && 'csrf_token' in json.data) setCsrfToken(json.data.csrf_token);
  return json;
}

/** Dépôt d'un fichier en corps binaire (photo d'un lieu) : même cookie, même jeton anti-CSRF, même enveloppe. */
async function upload<T>(path: string, blob: Blob): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', 'Content-Type': blob.type };
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  const res = await fetch(`/api${path}`, { method: 'POST', headers, credentials: 'same-origin', body: blob });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json || json.error) {
    if (res.status === 401) window.dispatchEvent(new Event('app-unauthorized'));
    throw new ApiError(res.status, json?.code || 'INTERNAL', json?.message || res.statusText, json?.details);
  }
  return json.data as T;
}

export const api = {
  upload,
  get: <T>(path: string) => request<T>('GET', path).then((r) => r.data),
  page: <T>(path: string) => request<T[]>('GET', path).then((r): Page<T> => ({ data: r.data, pagination: r.pagination!, meta: r.meta })),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body).then((r) => r.data),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body).then((r) => r.data),
  del: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body ?? {}).then((r) => r.data),
};

export function qs(params: Record<string, string | number | undefined>) {
  const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]);
  return p.length ? `?${new URLSearchParams(p).toString()}` : '';
}

export default api;
