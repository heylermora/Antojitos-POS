import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
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
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
};

export const getIngredients = async () => {
  const snapshot = await getDocs(query(collection(db, INGREDIENTS_COLLECTION), orderBy('name')));
  return snapshot.docs.map(normalizeIngredient);
};

export const createIngredient = async (ingredient) => {
  await addDoc(collection(db, INGREDIENTS_COLLECTION), {
    ...ingredient,
    currentUnitCost: Number(ingredient.currentUnitCost) || 0,
    active: ingredient.active !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateIngredient = async (id, ingredient) => {
  await updateDoc(doc(db, INGREDIENTS_COLLECTION, id), {
    ...ingredient,
    currentUnitCost: Number(ingredient.currentUnitCost) || 0,
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
    ...ingredient,
    currentUnitCost: Number(ingredient.currentUnitCost) || 0,
    active: ingredient.active !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const deleteIngredient = async (id) => {
  await deleteDoc(doc(db, INGREDIENTS_COLLECTION, id));
};

export const applyIngredientCostUpdate = async ({ ingredientId, supplierName, unitCost, purchasedAt }) => {
  if (!ingredientId) return;

  await updateDoc(doc(db, INGREDIENTS_COLLECTION, ingredientId), {
    currentUnitCost: Number(unitCost) || 0,
    supplierName: supplierName || '',
    lastPurchaseAt: purchasedAt || new Date().toISOString(),
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
