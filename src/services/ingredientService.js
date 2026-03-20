import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { recordAuditEvent } from './auditService';

const INGREDIENTS_COLLECTION = 'ingredients';

const normalizeCategories = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return ['General'];
};

const normalizeSuppliers = (value, fallback = '') => {
  const supplierNames = Array.isArray(value)
    ? value.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  if (!supplierNames.length && fallback) {
    return [fallback];
  }

  return [...new Set(supplierNames)];
};

const normalizeIngredient = (docSnap) => {
  const data = docSnap.data() || {};
  const categories = normalizeCategories(data.categories || data.category);
  const supplierNames = normalizeSuppliers(data.supplierNames, data.supplierName);

  return {
    id: docSnap.id,
    name: data.name || '',
    category: categories[0] || 'General',
    categories,
    baseUnit: data.baseUnit || 'unit',
    currentUnitCost: Number(data.currentUnitCost) || 0,
    supplierName: supplierNames[0] || data.supplierName || '',
    supplierNames,
    active: data.active !== false,
    lastPurchaseAt: data.lastPurchaseAt || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
};

const buildIngredientPayload = (ingredient = {}, { includeCreateTimestamps = false } = {}) => {
  const categories = normalizeCategories(ingredient.categories || ingredient.category);
  const supplierNames = normalizeSuppliers(ingredient.supplierNames, ingredient.supplierName);

  return {
    ...ingredient,
    category: categories[0] || 'General',
    categories,
    currentUnitCost: Number(ingredient.currentUnitCost) || 0,
    supplierName: supplierNames[0] || '',
    supplierNames,
    active: ingredient.active !== false,
    ...(includeCreateTimestamps ? { createdAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  };
};

export const getIngredients = async () => {
  const snapshot = await getDocs(query(collection(db, INGREDIENTS_COLLECTION), orderBy('name')));
  return snapshot.docs.map(normalizeIngredient);
};

export const createIngredient = async (ingredient) => {
  const docRef = await addDoc(collection(db, INGREDIENTS_COLLECTION), buildIngredientPayload(ingredient, { includeCreateTimestamps: true }));
  await recordAuditEvent({
    action: 'create',
    entityType: 'ingredient',
    entityId: docRef.id,
    entityLabel: ingredient.name || docRef.id,
    summary: `Creó el insumo ${ingredient.name || docRef.id}.`,
    details: { categories: ingredient.categories || [], baseUnit: ingredient.baseUnit || '' },
  });
  return docRef.id;
};

export const updateIngredient = async (id, ingredient) => {
  await updateDoc(doc(db, INGREDIENTS_COLLECTION, id), buildIngredientPayload(ingredient));
  await recordAuditEvent({
    action: 'update',
    entityType: 'ingredient',
    entityId: id,
    entityLabel: ingredient.name || id,
    summary: `Actualizó el insumo ${ingredient.name || id}.`,
    details: { categories: ingredient.categories || [], active: ingredient.active !== false },
  });
};

export const saveIngredient = async (ingredient) => {
  if (ingredient?.id) {
    await updateIngredient(ingredient.id, ingredient);
    return ingredient.id;
  }

  const ref = doc(collection(db, INGREDIENTS_COLLECTION));
  await setDoc(ref, buildIngredientPayload(ingredient, { includeCreateTimestamps: true }));
  return ref.id;
};

export const deleteIngredient = async (id) => {
  await deleteDoc(doc(db, INGREDIENTS_COLLECTION, id));
  await recordAuditEvent({
    action: 'delete',
    entityType: 'ingredient',
    entityId: id,
    entityLabel: id,
    summary: `Eliminó el insumo ${id}.`,
  });
};

export const applyIngredientCostUpdate = async ({ ingredientId, supplierName, supplierNames = [], unitCost, purchasedAt }) => {
  if (!ingredientId) return;

  const normalizedSuppliers = normalizeSuppliers(supplierNames, supplierName);

  await updateDoc(doc(db, INGREDIENTS_COLLECTION, ingredientId), {
    currentUnitCost: Number(unitCost) || 0,
    supplierName: normalizedSuppliers[0] || '',
    supplierNames: normalizedSuppliers,
    lastPurchaseAt: purchasedAt || new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
};

export const clearIngredientCostUpdate = async (ingredientId) => {
  if (!ingredientId) return;

  await updateDoc(doc(db, INGREDIENTS_COLLECTION, ingredientId), {
    currentUnitCost: 0,
    supplierName: '',
    supplierNames: [],
    lastPurchaseAt: null,
    updatedAt: serverTimestamp(),
  });
};
