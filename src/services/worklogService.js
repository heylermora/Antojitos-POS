// src/services/worklogService.js
import {
  getDocs, collection, doc, setDoc, updateDoc, deleteDoc, query, where, orderBy,
  writeBatch, limit, startAfter
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const COLL = 'worklogs';
const EMP_COLL = 'employees';

/* -------------------------- Helpers comunes -------------------------- */
const toIsoDateKey = (dateLike) => {
  const d = new Date(dateLike);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const computeHours = (startAt, endAt) => {
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  const diffH = (end - start) / 36e5;
  return Math.max(0, Number(diffH.toFixed(2)));
};

const normalize = (raw) => {
  if (!raw) return null;
  // Derivados calculados (no almacenados)
  const hours =
    typeof raw.hours === 'number'
      ? raw.hours
      : (raw.startAt && raw.endAt ? computeHours(raw.startAt, raw.endAt) : 0);
  const dateKey = toIsoDateKey(raw.startAt || raw.endAt);

  return {
    id: raw.id,
    employeeId: raw.employeeId || null,
    startAt: raw.startAt || null,
    endAt: raw.endAt || null,
    hours,
    dateKey,
  };
};

const cryptoRandom = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/* ----------------------------- Worklogs ------------------------------ */
/**
 * Obtiene worklogs con filtros opcionales:
 * { from, to, employeeId }
 * Nota: solo se persiste {id, employeeId, startAt, endAt}. Los derivados se calculan al leer.
 */
export const getWorkLogs = async (filters = {}) => {
  try {
    const baseRef = collection(db, COLL);
    const qParts = [];

    if (filters.employeeId) qParts.push(where('employeeId', '==', filters.employeeId));
    if (filters.from) qParts.push(where('startAt', '>=', filters.from));
    if (filters.to) qParts.push(where('startAt', '<=', filters.to));

    // Si hay rangos en startAt, ordenamos por startAt
    qParts.push(orderBy('startAt', 'desc'));

    const q = query(baseRef, ...qParts);
    const snapshot = await getDocs(q);

    const items = [];
    snapshot.forEach((d) => {
      const data = d.data();
      const withId = data.id ? data : { ...data, id: d.id };
      items.push(normalize(withId));
    });

    return items;
  } catch (err) {
    console.error('[getWorkLogs] Error:', err);
    return [];
  }
};

/**
 * Agrupa worklogs por día (YYYY-MM-DD).
 * getWorkLogsGroupedByDay() | ('EMP_ID') | ({ employeeId, from, to })
 */
export const getWorkLogsGroupedByDay = async (filtersOrEmployeeId = {}) => {
  try {
    const filters = typeof filtersOrEmployeeId === 'string'
      ? { employeeId: filtersOrEmployeeId }
      : (filtersOrEmployeeId || {});

    const logs = await getWorkLogs(filters);
    const map = {};
    logs.forEach((log) => {
      if (!log) return;
      const key = log.dateKey || toIsoDateKey(log.startAt || log.endAt);
      (map[key] ??= []).push(log);
    });
    return map;
  } catch (err) {
    console.error('[getWorkLogsGroupedByDay] Error:', err);
    return {};
  }
};

/** Crea un worklog (persistimos solo lo esencial). */
export const createWorkLog = async (worklog) => {
  try {
    const id = worklog.id || `worklog_${cryptoRandom()}`;
    const docRef = doc(db, COLL, id);

    // Solo campos mínimos
    const payload = {
      id,
      employeeId: worklog.employeeId,
      startAt: worklog.startAt,
      endAt: worklog.endAt,
    };

    await setDoc(docRef, payload);
    // Devolvemos con derivados calculados (no guardados)
    return normalize(payload);
  } catch (err) {
    console.error('[createWorkLog] Error:', err);
    throw err;
  }
};

/** Actualiza un worklog por id (solo los campos que llegan). */
export const updateWorkLog = async (id, updates) => {
  try {
    const docRef = doc(db, COLL, id.startsWith('worklog_') ? id : `worklog_${id}`);
    // No añadimos derivados ni extras aquí; se calculan al leer.
    const patch = {};
    if ('employeeId' in updates) patch.employeeId = updates.employeeId;
    if ('startAt' in updates) patch.startAt = updates.startAt;
    if ('endAt' in updates) patch.endAt = updates.endAt;

    if (Object.keys(patch).length === 0) return; // nada que actualizar
    await updateDoc(docRef, patch);
  } catch (err) {
    console.error('[updateWorkLog] Error:', err);
    throw err;
  }
};

/** Elimina un worklog por id. */
export const deleteWorkLog = async (id) => {
  try {
    const docRef = doc(db, COLL, id.startsWith('worklog_') ? id : `worklog_${id}`);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('[deleteWorkLog] Error:', err);
    throw err;
  }
};

/* ----------------------------- Empleados ----------------------------- */
export const getEmployees = async () => {
  try {
    const q = query(collection(db, EMP_COLL), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach((d) => {
      const data = d.data();
      list.push({
        id: data.id || d.id,
        name: data.name || '',
        phone: data.phone || '',
      });
    });
    return list;
  } catch (err) {
    console.error('[getEmployees] Error:', err);
    return [];
  }
};

export const createEmployee = async (payload) => {
  try {
    const id = payload.id || `emp_${cryptoRandom()}`;
    const ref = doc(db, EMP_COLL, id);
    const data = {
      id,
      name: payload.name || '',
      phone: payload.phone || '',
    };
    await setDoc(ref, data);
    return data;
  } catch (err) {
    console.error('[createEmployee] Error:', err);
    throw err;
  }
};

export const updateEmployee = async (id, payload) => {
  try {
    const empId = id.startsWith('emp_') ? id : `emp_${id}`;
    const ref = doc(db, EMP_COLL, empId);
    const patch = {};
    if ('name' in payload) patch.name = payload.name;
    if ('phone' in payload) patch.phone = payload.phone;
    if (Object.keys(patch).length === 0) return { id: empId };
    await updateDoc(ref, patch);
    return { id: empId, ...patch };
  } catch (err) {
    console.error('[updateEmployee] Error:', err);
    throw err;
  }
};

/**
 * Elimina un empleado y **todas** sus horas asociadas (cascade).
 * - Borra por lotes de hasta 450 documentos para evitar el límite de 500 por batch.
 * - Pagina por startAt para manejar colecciones grandes.
 */
export const deleteEmployee = async (id) => {
  try {
    const empId = id.startsWith('emp_') ? id : `emp_${id}`;

    // 1) Borrar el empleado
    await deleteDoc(doc(db, EMP_COLL, empId));

    // 2) Borrar sus worklogs en cascada (paginado)
    const pageSize = 450;
    let last = null;
    // Para paginar por un campo, necesitamos orderBy. Requiere índice si ya hay filtros por where.
    // orderBy('startAt') es consistente con nuestros queries habituales.
    // Si algunos logs carecen de startAt (no debería), no aparecerán aquí.
    // Asegúrate en UI de siempre guardar startAt.
    // Si necesitas cubrir endAt-only, crea un proceso adicional similar usando endAt.
    // (Mantengo simple y eficiente asumiendo startAt siempre presente).
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const qPage = last
        ? query(
            collection(db, COLL),
            where('employeeId', '==', empId),
            orderBy('startAt', 'asc'),
            startAfter(last),
            limit(pageSize)
          )
        : query(
            collection(db, COLL),
            where('employeeId', '==', empId),
            orderBy('startAt', 'asc'),
            limit(pageSize)
          );

      const snap = await getDocs(qPage);
      if (snap.empty) break;

      const batch = writeBatch(db);
      snap.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();

      last = snap.docs[snap.docs.length - 1];
      if (snap.size < pageSize) break; // última página
    }
  } catch (err) {
    console.error('[deleteEmployee] Error (cascade):', err);
    throw err;
  }
};