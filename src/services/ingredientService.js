import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const INGREDIENTS_COLLECTION = 'ingredients';

const normalizeIngredient = (docSnap) => {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    name: data.name || '',
    category: data.category || 'General',
    baseUnit: data.baseUnit || 'unit',
    currentUnitCost: Number(data.currentUnitCost) || 0,
    supplierName: data.supplierName || '',
    active: data.active !== false,
    lastPurchaseAt: data.lastPurchaseAt || null,
    onHandQuantity: Number(data.onHandQuantity) || 0,
    reorderPoint: Number(data.reorderPoint) || 0,
    wastePercent: Number(data.wastePercent) || 0,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
};

const toPayload = (ingredient) => ({
  ...ingredient,
  currentUnitCost: Number(ingredient.currentUnitCost) || 0,
  onHandQuantity: Number(ingredient.onHandQuantity) || 0,
  reorderPoint: Number(ingredient.reorderPoint) || 0,
  wastePercent: Number(ingredient.wastePercent) || 0,
  active: ingredient.active !== false,
});

export const getIngredients = async () => {
  const snapshot = await getDocs(query(collection(db, INGREDIENTS_COLLECTION), orderBy('name')));
  return snapshot.docs.map(normalizeIngredient);
};

export const getIngredientById = async (id) => {
  const snapshot = await getDoc(doc(db, INGREDIENTS_COLLECTION, id));
  return snapshot.exists() ? normalizeIngredient(snapshot) : null;
};

export const createIngredient = async (ingredient) => {
  await addDoc(collection(db, INGREDIENTS_COLLECTION), {
    ...toPayload(ingredient),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateIngredient = async (id, ingredient) => {
  await updateDoc(doc(db, INGREDIENTS_COLLECTION, id), {
    ...toPayload(ingredient),
    updatedAt: serverTimestamp(),
  });
};

export const saveIngredient = async (ingredient) => {
  if (ingredient?.id) {
    await updateIngredient(ingredient.id, ingredient);
    return ingredient.id;
  }

  const ref = doc(collection(db, INGREDIENTS_COLLECTION));
  await setDoc(ref, {
    ...toPayload(ingredient),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const deleteIngredient = async (id) => {
  await deleteDoc(doc(db, INGREDIENTS_COLLECTION, id));
};

export const applyInventoryAdjustment = async ({ ingredientId, deltaQuantity = 0 }) => {
  if (!ingredientId) return;
  const ingredient = await getIngredientById(ingredientId);
  if (!ingredient) return;

  await updateDoc(doc(db, INGREDIENTS_COLLECTION, ingredientId), {
    onHandQuantity: Number(ingredient.onHandQuantity || 0) + Number(deltaQuantity || 0),
    updatedAt: serverTimestamp(),
  });
};

export const applyIngredientCostUpdate = async ({ ingredientId, supplierName, unitCost, purchasedAt, deltaQuantity = 0 }) => {
  if (!ingredientId) return;
  const ingredient = await getIngredientById(ingredientId);
  const onHandQuantity = Number(ingredient?.onHandQuantity || 0) + Number(deltaQuantity || 0);

  await updateDoc(doc(db, INGREDIENTS_COLLECTION, ingredientId), {
    currentUnitCost: Number(unitCost) || 0,
    supplierName: supplierName || '',
    lastPurchaseAt: purchasedAt || new Date().toISOString(),
    onHandQuantity,
    updatedAt: serverTimestamp(),
  });
};

export const clearIngredientCostUpdate = async (ingredientId) => {
  if (!ingredientId) return;

  await updateDoc(doc(db, INGREDIENTS_COLLECTION, ingredientId), {
    currentUnitCost: 0,
    supplierName: '',
    lastPurchaseAt: null,
    updatedAt: serverTimestamp(),
  });
};
