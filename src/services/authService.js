// src/services/authService.js
// Autenticación con Firebase (email/password) + helpers de sesión y token

import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile,
  getIdToken,
  getIdTokenResult,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const STORAGE_KEY = 'app.auth.user';

const ROLE_KEY = 'app.auth.role';
const OPERATOR_CONTEXT_KEY = 'app.auth.operatorContext';
const DEFAULT_ROLE = 'collaborator';

// 🔹 Config de sesión máxima
const SESSION_EXPIRES_AT_KEY = 'app.auth.expiresAt';
const MAX_SESSION_MS = 12 * 60 * 60 * 1000; // 12 horas

/* -------------------------- Persistencia sesión -------------------------- */
let _persistenceReady = null;
const ensurePersistence = () => {
  if (!_persistenceReady) {
    _persistenceReady = setPersistence(auth, browserLocalPersistence).catch(() => {});
  }
  return _persistenceReady;
};

/* --------------------------- Store de usuario --------------------------- */
const store = {
  load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
  },
  save(userLite) { localStorage.setItem(STORAGE_KEY, JSON.stringify(userLite || null)); },
  clear() { localStorage.removeItem(STORAGE_KEY); },
};

const setSessionExpiration = () => {
  const expiresAt = Date.now() + MAX_SESSION_MS;
  localStorage.setItem(SESSION_EXPIRES_AT_KEY, expiresAt.toString());
};

const clearSessionExpiration = () => {
  localStorage.removeItem(SESSION_EXPIRES_AT_KEY);
};

const isSessionExpired = () => {
  const raw = localStorage.getItem(SESSION_EXPIRES_AT_KEY);
  if (!raw) return false;
  const expiresAt = Number(raw) || 0;
  return Date.now() > expiresAt;
};

const ensureSessionNotExpired = () => {
  if (!isSessionExpired()) return true;

  store.clear();
  clearSessionExpiration();
  fbSignOut(auth).catch(() => {});
  return false;
};

const toUserLite = (fbUser) => {
  if (!fbUser) return null;
  return {
    uid: fbUser.uid,
    email: fbUser.email || '',
    displayName: fbUser.displayName || '',
    photoURL: fbUser.photoURL || '',
    emailVerified: !!fbUser.emailVerified,
    providerId: (fbUser.providerData?.[0]?.providerId) || 'password',
  };
};

const readOperatorContext = () => {
  try {
    return JSON.parse(localStorage.getItem(OPERATOR_CONTEXT_KEY)) || { name: '', employeeId: '', source: 'manual' };
  } catch {
    return { name: '', employeeId: '', source: 'manual' };
  }
};

export async function login({ email, password }) {
  await ensurePersistence();
  const cred = await signInWithEmailAndPassword(auth, email, password);

  setSessionExpiration();

  const userLite = toUserLite(cred.user);
  store.save(userLite);
  return { user: userLite };
}

export async function register({ email, password, displayName }) {
  await ensurePersistence();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }

  setSessionExpiration();

  const userLite = toUserLite(cred.user);
  store.save(userLite);
  return { user: userLite };
}

export async function logout() {
  await fbSignOut(auth);
  store.clear();
  clearSessionExpiration();
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(OPERATOR_CONTEXT_KEY);
}

export function getCurrentUser() {
  if (!ensureSessionNotExpired()) return null;

  const u = auth.currentUser ? toUserLite(auth.currentUser) : store.load();
  return u;
}

export function isAuthenticated() {
  if (!ensureSessionNotExpired()) return false;
  return !!(auth.currentUser || store.load());
}

export async function getAccessToken(forceRefresh = false) {
  if (!ensureSessionNotExpired()) return null;

  const u = auth.currentUser;
  if (!u) return null;
  return getIdToken(u, forceRefresh);
}

export async function getAccessTokenInfo(forceRefresh = false) {
  if (!ensureSessionNotExpired()) return null;

  const u = auth.currentUser;
  if (!u) return null;
  return getIdTokenResult(u, forceRefresh);
}

export function subscribeAuth(listener) {
  return onAuthStateChanged(auth, (fbUser) => {
    if (isSessionExpired()) {
      store.clear();
      clearSessionExpiration();
      fbSignOut(auth).catch(() => {});
      listener?.(null);
      return;
    }

    const lite = toUserLite(fbUser);
    if (lite) store.save(lite); else store.clear();
    listener?.(lite);
  });
}

export async function hydrateAuthOnBoot() {
  await ensurePersistence();

  if (!ensureSessionNotExpired()) {
    return { isAuthenticated: false, user: null };
  }

  const u = auth.currentUser ? toUserLite(auth.currentUser) : store.load();
  if (u) store.save(u);
  return { isAuthenticated: !!u, user: u };
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
  return true;
}

export function setCurrentRole(role) {
  const nextRole = role === 'admin' ? 'admin' : DEFAULT_ROLE;
  localStorage.setItem(ROLE_KEY, nextRole);
  return nextRole;
}

export function getCurrentRole() {
  return localStorage.getItem(ROLE_KEY) || DEFAULT_ROLE;
}

export function setCurrentOperatorContext(context = {}) {
  const cleanContext = {
    name: String(context.name || '').trim(),
    employeeId: String(context.employeeId || '').trim(),
    source: context.source === 'employee' ? 'employee' : 'manual',
  };

  localStorage.setItem(OPERATOR_CONTEXT_KEY, JSON.stringify(cleanContext));
  return cleanContext;
}

export function getCurrentOperatorContext() {
  return readOperatorContext();
}

export function setCurrentOperatorName(name) {
  return setCurrentOperatorContext({ name, source: 'manual' }).name;
}

export function getCurrentOperatorName() {
  return readOperatorContext().name || '';
}

export function getAuditActorProfile() {
  const user = getCurrentUser();
  const role = getCurrentRole();
  const operator = getCurrentOperatorContext();

  return {
    uid: user?.uid || '',
    email: user?.email || '',
    displayName: user?.displayName || '',
    operatorName: operator.name || '',
    operatorEmployeeId: operator.employeeId || '',
    operatorSource: operator.source || 'manual',
    role,
    roleLabel: role === 'admin' ? 'Administrador' : 'Colaborador',
  };
}
