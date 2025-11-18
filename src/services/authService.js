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
  const userLite = toUserLite(cred.user);
  store.save(userLite);
  return { user: userLite };
}

export async function logout() {
  await fbSignOut(auth);
  store.clear();
}

/** Usuario actual (lite) desde memoria o localStorage */
export function getCurrentUser() {
  const u = auth.currentUser ? toUserLite(auth.currentUser) : store.load();
  return u;
}

/** ¿Hay sesión activa? */
export function isAuthenticated() {
  return !!(auth.currentUser || store.load());
}

/** Token Firebase ID (útil para llamar a tu API protegida vía Bearer) */
export async function getAccessToken(forceRefresh = false) {
  const u = auth.currentUser;
  if (!u) return null;
  return getIdToken(u, forceRefresh);
}

/** Decodifica claims del ID token (roles/claims personalizados si los usas) */
export async function getAccessTokenInfo(forceRefresh = false) {
  const u = auth.currentUser;
  if (!u) return null;
  return getIdTokenResult(u, forceRefresh);
}

/** Escuchar cambios de sesión y mantener store en sync */
export function subscribeAuth(listener) {
  return onAuthStateChanged(auth, (fbUser) => {
    const lite = toUserLite(fbUser);
    if (lite) store.save(lite); else store.clear();
    listener?.(lite);
  });
}

/** Rehidratar al boot (sin llamadas extras, sólo sincroniza store) */
export async function hydrateAuthOnBoot() {
  await ensurePersistence();
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