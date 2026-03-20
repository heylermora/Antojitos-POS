import { collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildSlug } from '../utils/taxCatalog';

const PRODUCTS_COLLECTION = 'products';
const PRODUCT_CATEGORIES_COLLECTION = 'productCategories';

const normalizeProduct = (docSnap) => {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    name: data.name || '',
    price: Number(data.price) || 0,
    description: data.description || '',
    categoryId: data.categoryId || 'sin-categoria',
    categoryName: data.categoryName || 'Sin categoría',
    active: data.active !== false,
  };
};

const normalizeCategory = (docSnap) => {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    name: data.name || 'Sin categoría',
    sortOrder: Number(data.sortOrder) || 0,
  };
};

export const getProductCategories = async () => {
  const snapshot = await getDocs(query(collection(db, PRODUCT_CATEGORIES_COLLECTION), orderBy('name')));
  return snapshot.docs.map(normalizeCategory);
};

export const getProducts = async () => {
  const [productSnapshot, categorySnapshot] = await Promise.all([
    getDocs(query(collection(db, PRODUCTS_COLLECTION), orderBy('name'))),
    getDocs(query(collection(db, PRODUCT_CATEGORIES_COLLECTION), orderBy('name'))),
  ]);

  const categoriesMap = new Map(
    categorySnapshot.docs.map((categoryDoc) => {
      const category = normalizeCategory(categoryDoc);
      return [category.id, { ...category, products: [] }];
    })
  );

  productSnapshot.docs.forEach((productDoc) => {
    const product = normalizeProduct(productDoc);

    if (!categoriesMap.has(product.categoryId)) {
      categoriesMap.set(product.categoryId, {
        id: product.categoryId,
        name: product.categoryName || 'Sin categoría',
        sortOrder: Number.MAX_SAFE_INTEGER,
        products: [],
      });
    }

    const category = categoriesMap.get(product.categoryId);
    category.name = product.categoryName || category.name;
    category.products.push(product);
  });

  if (!categoriesMap.size) {
    categoriesMap.set('general', { id: 'general', name: 'General', sortOrder: 0, products: [] });
  }

  return Array.from(categoriesMap.values())
    .map((category) => ({
      ...category,
      products: (category.products || []).sort((left, right) => left.name.localeCompare(right.name)),
    }))
    .sort((left, right) => {
      const sortDiff = (left.sortOrder || 0) - (right.sortOrder || 0);
      if (sortDiff !== 0) return sortDiff;
      return left.name.localeCompare(right.name);
    });
};

export const createProductCategory = async (name) => {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    throw new Error('El nombre de la categoría es requerido.');
  }

  const categoryId = buildSlug(trimmedName) || `categoria-${Date.now()}`;
  await setDoc(
    doc(db, PRODUCT_CATEGORIES_COLLECTION, categoryId),
    {
      name: trimmedName,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  return categoryId;
};

export const createProduct = async (product) => {
  const payload = {
    name: String(product.name || '').trim(),
    price: Number(product.price) || 0,
    description: product.description || '',
    categoryId: product.categoryId || 'sin-categoria',
    categoryName: product.categoryName || 'Sin categoría',
    active: product.active !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = product.id
    ? doc(db, PRODUCTS_COLLECTION, product.id)
    : doc(collection(db, PRODUCTS_COLLECTION));

  await setDoc(docRef, payload, { merge: true });
  return docRef.id;
};

export const updateProduct = async (id, updates) => {
  if (!id) {
    throw new Error('El id del producto es requerido para actualizar.');
  }

  await updateDoc(doc(db, PRODUCTS_COLLECTION, id), {
    name: String(updates.name || '').trim(),
    price: Number(updates.price) || 0,
    description: updates.description || '',
    categoryId: updates.categoryId || 'sin-categoria',
    categoryName: updates.categoryName || 'Sin categoría',
    active: updates.active !== false,
    updatedAt: serverTimestamp(),
  });
};

export const deleteProduct = async (id) => {
  if (!id) return;
  await deleteDoc(doc(db, PRODUCTS_COLLECTION, id));
};
