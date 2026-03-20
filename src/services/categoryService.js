import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const CATEGORIES_COLLECTION = 'productCategories';

const slugify = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const getCategories = async () => {
  const snapshot = await getDocs(query(collection(db, CATEGORIES_COLLECTION), orderBy('name', 'asc')));
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
  }));
};

export const saveCategory = async ({ id, name }) => {
  const categoryId = id || `cat-${slugify(name)}`;
  await setDoc(doc(db, CATEGORIES_COLLECTION, categoryId), {
    name: name || '',
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return categoryId;
};
