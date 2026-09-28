export interface SessionUser { matricule: string; nom: string; prenom: string; role_stock?: string | null }
type TokenResponse = { access: string; refresh: string };
const ACCESS = 'access_token';
const REFRESH = 'refresh_token';
const USER = 'smmc_user';
const ADMIN = 'smmc_admin_session';
function decodeUser(token: string): SessionUser {
  try {
    const part = token.split('.')[1];
    const data = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as Partial<SessionUser>;
    return { matricule: data.matricule || '', nom: data.nom || '', prenom: data.prenom || '', role_stock: data.role_stock };
  } catch { return { matricule: '', nom: '', prenom: '' }; }
}
export function getAccessToken(): string | null { return localStorage.getItem(ACCESS); }
export function getSessionUser(): SessionUser | null {
  const raw = localStorage.getItem(USER);
  if (!raw) return null;
  try { return JSON.parse(raw) as SessionUser; } catch { return null; }
}
export function isAdminSession(): boolean { return localStorage.getItem(ADMIN) === 'true' && !!getAccessToken(); }
export function logout() { localStorage.removeItem(ACCESS); localStorage.removeItem(REFRESH); localStorage.removeItem(USER); localStorage.removeItem('token'); localStorage.removeItem(ADMIN); }
export async function login(matricule: string, password: string): Promise<SessionUser> {
  const response = await fetch('/api/auth/login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ matricule: matricule.trim(), password }) });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body = data as { detail?: string; matricule?: string[]; password?: string[] } | null;
    throw new Error(body?.detail || body?.matricule?.[0] || body?.password?.[0] || 'Matricule ou mot de passe incorrect.');
  }
  const tokens = data as TokenResponse;
  if (!tokens.access || !tokens.refresh) throw new Error('Réponse de connexion invalide.');
  logout(); localStorage.setItem(ACCESS, tokens.access); localStorage.setItem(REFRESH, tokens.refresh);
  const user = decodeUser(tokens.access); localStorage.setItem(USER, JSON.stringify(user)); return user;
}
let refreshing: Promise<string | null> | null = null;
async function refreshAccess(): Promise<string | null> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refresh = localStorage.getItem(REFRESH); if (!refresh) return null;
    try {
      const response = await fetch('/api/auth/refresh/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh }) });
      if (!response.ok) return null;
      const data = await response.json() as { access: string };
      if (!data.access) return null;
      localStorage.setItem(ACCESS, data.access); return data.access;
    } catch { return null; }
  })();
  try { return await refreshing; } finally { refreshing = null; }
}
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const access = getAccessToken(); if (access) headers.set('Authorization', `Bearer ${access}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status !== 401 || !access) return response;
  const next = await refreshAccess();
  if (!next) { logout(); window.dispatchEvent(new Event('smmc-session-expired')); return response; }
  headers.set('Authorization', `Bearer ${next}`);
  return fetch(input, { ...init, headers });
}

export async function adminLogin(username: string, password: string): Promise<void> {
  const response = await fetch('/api/auth/admin-login/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim(), password }) });
  const body = await response.json().catch(() => null) as { access?: string; refresh?: string; detail?: string } | null;
  if (!response.ok || !body?.access || !body?.refresh) throw new Error(body?.detail || 'Identifiants administrateur incorrects.');
  logout(); localStorage.setItem(ACCESS, body.access); localStorage.setItem(REFRESH, body.refresh); localStorage.setItem(ADMIN, 'true');
}
