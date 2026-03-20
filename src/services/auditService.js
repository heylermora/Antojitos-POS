import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAuditActorProfile } from './authService';

const AUDIT_COLLECTION = 'auditLogs';

const normalizeAuditLog = (docSnap) => {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    action: data.action || '',
    entityType: data.entityType || '',
    entityId: data.entityId || '',
    entityLabel: data.entityLabel || '',
    summary: data.summary || '',
    details: data.details || {},
    actor: data.actor || null,
    createdAt: data.createdAt || null,
    createdAtIso: data.createdAtIso || '',
  };
};

export const getAuditLogs = async ({ maxItems = 200 } = {}) => {
  const snapshot = await getDocs(
    query(collection(db, AUDIT_COLLECTION), orderBy('createdAtIso', 'desc'), limit(maxItems))
  );

  return snapshot.docs.map(normalizeAuditLog);
};

export const recordAuditEvent = async ({
  action,
  entityType,
  entityId = '',
  entityLabel = '',
  summary = '',
  details = {},
}) => {
  try {
    const actor = getAuditActorProfile();
    const createdAtIso = new Date().toISOString();

    const docRef = await addDoc(collection(db, AUDIT_COLLECTION), {
      action: action || 'unknown',
      entityType: entityType || 'unknown',
      entityId,
      entityLabel,
      summary,
      details,
      actor,
      createdAt: serverTimestamp(),
      createdAtIso,
    });

    return docRef.id;
  } catch (error) {
    console.error('[recordAuditEvent] No se pudo registrar la auditoría:', error);
    return null;
  }
};
