/**
 * Storage utilities for simple auth simulation.
 */

export interface User {
  name: string;
  email: string;
  password: string;
}

const USERS_KEY = 'asl_users';
const CURRENT_USER_KEY = 'asl_current_user';

function getUsers(): User[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function registerUser(name: string, email: string, password: string): boolean {
  const users = getUsers();
  if (users.find(u => u.email === email)) return false; // already exists
  users.push({ name, email, password });
  saveUsers(users);
  return true;
}

export function loginUser(email: string, password: string): User | null {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return null;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  return user;
}

export function logoutUser(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function getCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return !!getCurrentUser();
}
