// Thin fetch wrapper: adds the admin token, parses the API's error format
// {"error": {"code", "message", "details"}} and signs out on 401.

import type { AdminUser } from './types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const API = `${BASE}/api/v1`;
export const ADMIN = `${API}/admin`;

const TOKEN_KEY = 'loan_admin_token';
const USER_KEY = 'loan_admin_user';

function storage(): Storage | null {
  try { return window.sessionStorage; } catch { return null; }
}

export const session = {
  get token(): string | null { return storage()?.getItem(TOKEN_KEY) ?? null; },
  get user(): AdminUser | null {
    try { return JSON.parse(storage()?.getItem(USER_KEY) ?? 'null'); } catch { return null; }
  },
  save(token: string, user: AdminUser) {
    try { storage()?.setItem(TOKEN_KEY, token); storage()?.setItem(USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
  },
  saveUser(user: AdminUser) {
    try { storage()?.setItem(USER_KEY, JSON.stringify(user)); } catch { /* ignore */ }
  },
  clear() {
    try { storage()?.removeItem(TOKEN_KEY); storage()?.removeItem(USER_KEY); } catch { /* ignore */ }
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) { super(message); }
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
export function onUnauthorized(fn: Listener) {
  unauthorizedListeners.add(fn);
  return () => { unauthorizedListeners.delete(fn); };
}

type Query = Record<string, string | number | boolean | null | undefined>;

function withQuery(url: string, query?: Query) {
  if (!query) return url;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `${url}?${s}` : url;
}

async function request<T>(method: string, url: string, opts: { body?: unknown; query?: Query; form?: FormData; raw?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = session.token;
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(withQuery(url, opts.query), { method, headers, body });
  } catch {
    throw new ApiError(0, 'network_error', 'Server is not reachable');
  }
  if (res.status === 401 && token && !url.endsWith('/auth/login')) {
    session.clear();
    unauthorizedListeners.forEach((fn) => fn());
  }
  if (!res.ok) {
    let code = 'error';
    let message = res.statusText || 'Request failed';
    let details: Record<string, unknown> | undefined;
    try {
      const j = await res.json();
      code = j?.error?.code ?? code;
      message = j?.error?.message ?? message;
      details = j?.error?.details;
    } catch { /* not JSON */ }
    throw new ApiError(res.status, code, message, details);
  }
  if (opts.raw) return res as unknown as T;
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', ADMIN + path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', ADMIN + path, { body: body ?? {} }),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', ADMIN + path, { body }),
  del: (path: string) => request<void>('DELETE', ADMIN + path),
  upload: <T>(method: 'POST' | 'PUT', path: string, form: FormData) => request<T>(method, ADMIN + path, { form }),
  /** Downloads a protected file (token in header) and opens or saves it. */
  async file(path: string, fileName: string, inline: boolean) {
    const res = await request<Response>('GET', ADMIN + path, { query: inline ? { inline: true } : undefined, raw: true });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (inline) {
      window.open(url, '_blank', 'noopener');
    } else {
      const a = document.createElement('a');
      a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  },
};
