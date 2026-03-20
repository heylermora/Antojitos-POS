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
const OPERATOR_NAME_KEY = 'app.auth.operatorName';
const DEFAULT_ROLE = 'collaborator';

// 🔹 Config de sesión máxima
const SESSION_EXPIRES_AT_KEY = 'app.auth.expiresAt';
const MAX_SESSION_MS = 12 * 60 * 60 * 1000; // 12 horas

/* -------------------------- Persistencia sesión -------------------------- */
// Asegura que la sesión persista en localStorage (sobrevive recargas)
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

// 🔹 Helpers de expiración
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
  // Si ya venció, limpiamos y hacemos signOut "fire and forget"
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

/* ------------------------------ API pública ----------------------------- */
export async function login({ email, password }) {
  await ensurePersistence();
  const cred = await signInWithEmailAndPassword(auth, email, password);

  // 🔹 Arranca ventana de 12 horas
  setSessionExpiration();

  const userLite = toUserLite(cred.user);
  store.save(userLite);
  return { user: userLite };
}

/** Registro opcional (si lo necesitas) */
export async function register({ email, password, displayName }) {
  await ensurePersistence();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }

  // 🔹 También aplica ventana de 12 horas al registrarse
  setSessionExpiration();

  const userLite = toUserLite(cred.user);
  store.save(userLite);
  return { user: userLite };
}

export async function logout() {
  await fbSignOut(auth);
  store.clear();
  clearSessionExpiration(); // 🔹 limpiar expiración
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(OPERATOR_NAME_KEY);
}

/** Usuario actual (lite) desde memoria o localStorage */
export function getCurrentUser() {
  if (!ensureSessionNotExpired()) return null; // 🔹 corta si ya venció

  const u = auth.currentUser ? toUserLite(auth.currentUser) : store.load();
  return u;
}

/** ¿Hay sesión activa? */
export function isAuthenticated() {
  if (!ensureSessionNotExpired()) return false; // 🔹 no autenticado si venció
  return !!(auth.currentUser || store.load());
}

/** Token Firebase ID (útil para llamar a tu API protegida vía Bearer) */
export async function getAccessToken(forceRefresh = false) {
  if (!ensureSessionNotExpired()) return null; // 🔹 no dar token si venció

  const u = auth.currentUser;
  if (!u) return null;
  return getIdToken(u, forceRefresh);
}

/** Decodifica claims del ID token (roles/claims personalizados si los usas) */
export async function getAccessTokenInfo(forceRefresh = false) {
  if (!ensureSessionNotExpired()) return null; // 🔹 igual aquí

  const u = auth.currentUser;
  if (!u) return null;
  return getIdTokenResult(u, forceRefresh);
}

/** Escuchar cambios de sesión y mantener store en sync */
export function subscribeAuth(listener) {
  return onAuthStateChanged(auth, (fbUser) => {
    // 🔹 Si la sesión está vencida, limpiamos todo
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

/** Rehidratar al boot (sin llamadas extras, sólo sincroniza store) */
export async function hydrateAuthOnBoot() {
  await ensurePersistence();

  if (!ensureSessionNotExpired()) {
    return { isAuthenticated: false, user: null }; // 🔹 ya vencida al boot
  }

  // Forzamos una lectura para poblar store si ya hay sesión
  const u = auth.currentUser ? toUserLite(auth.currentUser) : store.load();
  if (u) store.save(u);
  return { isAuthenticated: !!u, user: u };
}

/** Recuperación de contraseña */
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
  return true;
}

export function setCurrentRole(role) {
  const nextRole = role === 'cook' ? 'cook' : DEFAULT_ROLE;
  localStorage.setItem(ROLE_KEY, nextRole);
  return nextRole;
}

export function getCurrentRole() {
  return localStorage.getItem(ROLE_KEY) || DEFAULT_ROLE;
}


export function setCurrentOperatorName(name) {
  const cleanName = String(name || '').trim();
  localStorage.setItem(OPERATOR_NAME_KEY, cleanName);
  return cleanName;
}

export function getCurrentOperatorName() {
  return localStorage.getItem(OPERATOR_NAME_KEY) || '';
}

export function getAuditActorProfile() {
  const user = getCurrentUser();
  const role = getCurrentRole();
  const operatorName = getCurrentOperatorName();

  return {
    uid: user?.uid || '',
    email: user?.email || '',
    displayName: user?.displayName || '',
    operatorName,
    role,
    roleLabel: role === 'cook' ? 'Cocinero' : 'Colaborador',
  };
}
