export type UserRole = 'guest' | 'customer' | 'admin';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type Session = {
  token: string;
  user: SessionUser;
};

const SESSION_KEY = 'cafeSession';
const GUEST_ID_KEY = 'cafeGuestId';

export function getGuestId(): string {
  if (typeof window === 'undefined') return 'guest';

  const existing = localStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;

  const generated = `guest-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  localStorage.setItem(GUEST_ID_KEY, generated);
  return generated;
}

export function getCartStorageKey(): string {
  if (typeof window === 'undefined') return 'cafeCart:guest';

  const session = getSession();
  const user = session?.user;
  const owner = user?.email ?? user?.id ?? getGuestId();
  return `cafeCart:${String(owner).trim() || 'guest'}`;
}

export function getSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as Session) : null;
}

export function setSession(session: Session) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem('cafeRole', session.user.role);
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('cafeRole');
}

export function getRole(): UserRole {
  const session = getSession();
  return session?.user.role ?? (typeof window !== 'undefined' ? (localStorage.getItem('cafeRole') as UserRole | null) ?? 'guest' : 'guest');
}

export function isAdmin() {
  return getRole() === 'admin';
}
