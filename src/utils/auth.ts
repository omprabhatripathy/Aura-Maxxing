
const AUTH_KEY = 'aura_authenticated';

export function isAuthenticated(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export function loginUser(): void {
  localStorage.setItem(AUTH_KEY, 'true');
}

export function logoutUser(): void {
  localStorage.removeItem(AUTH_KEY);
}
