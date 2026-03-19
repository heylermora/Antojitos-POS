import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const RECIPES_COLLECTION = 'recipes';

const normalizeRecipe = (docSnap) => {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    name: data.name || '',
    type: data.type || 'subrecipe',
    productId: data.productId || '',
    productName: data.productName || '',
    yieldQuantity: Number(data.yieldQuantity) || 1,
    yieldUnit: data.yieldUnit || 'portion',
    notes: data.notes || '',
    lines: Array.isArray(data.lines)
      ? data.lines.map((line) => ({
          itemType: line.itemType || 'ingredient',
          itemId: line.itemId || '',
          itemName: line.itemName || '',
          quantity: Number(line.quantity) || 0,
          unit: line.unit || '',
        }))
      : [],
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
};

export const getRecipes = async () => {
  const snapshot = await getDocs(query(collection(db, RECIPES_COLLECTION), orderBy('name')));
  return snapshot.docs.map(normalizeRecipe);
};

export const createRecipe = async (recipe) => {
  await addDoc(collection(db, RECIPES_COLLECTION), {
    ...recipe,
    yieldQuantity: Number(recipe.yieldQuantity) || 1,
    lines: (recipe.lines || []).map((line) => ({
      ...line,
      quantity: Number(line.quantity) || 0,
    })),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateRecipe = async (id, recipe) => {
  await updateDoc(doc(db, RECIPES_COLLECTION, id), {
    ...recipe,
    yieldQuantity: Number(recipe.yieldQuantity) || 1,
    lines: (recipe.lines || []).map((line) => ({
      ...line,
      quantity: Number(line.quantity) || 0,
    })),
    updatedAt: serverTimestamp(),
  });
};

export const saveRecipe = async (recipe) => {
  if (recipe?.id) {
    await updateRecipe(recipe.id, recipe);
    return recipe.id;
  }

  await createRecipe(recipe);
  return null;
};

export const deleteRecipe = async (id) => {
  await deleteDoc(doc(db, RECIPES_COLLECTION, id));
};
