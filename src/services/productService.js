import { getDocs, collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCategories } from './categoryService';

export const getProducts = async () => {
  try {
    const [snapshot, savedCategories] = await Promise.all([
      getDocs(collection(db, 'products')),
      getCategories().catch(() => []),
    ]);

    const categoriesMap = Object.fromEntries(
      savedCategories.map((category) => [category.id, { id: category.id, name: category.name, products: [] }])
    );

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const categoryId = data.categoryId || 'sin_categoria';
      const categoryName = data.categoryName || categoriesMap[categoryId]?.name || 'Sin categoría';

      if (!categoriesMap[categoryId]) {
        categoriesMap[categoryId] = {
          id: categoryId,
          name: categoryName,
          products: [],
        };
      }

      categoriesMap[categoryId].products.push({
        id: docSnap.id,
        name: data.name,
        price: Number(data.price) || 0,
        description: data.description || '',
        categoryName,
        categoryId,
      });
    });

    const categories = Object.values(categoriesMap);

    if (!categories.some((category) => category.id === 'other')) {
      categories.push({
        id: 'other',
        name: 'Otro',
        products: [],
      });
    }

    return categories;
  } catch (err) {
    console.error('[getProducts] Error:', err);
    throw err;
  }
};

export const createProduct = async (product) => {
  try {
    const productId = product.id || `product_${Date.now()}`;
    const docRef = doc(db, 'products', productId);
    await setDoc(docRef, {
      ...product,
      id: productId,
      price: Number(product.price) || 0,
    });
    return productId;
  } catch (err) {
    console.error('[createProduct] Error:', err);
    throw err;
  }
};

export const updateProduct = async (id, updates) => {
  try {
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, {
      ...updates,
      price: Number(updates.price) || 0,
    });
  } catch (err) {
    console.error('[updateProduct] Error:', err);
    throw err;
  }
};

export const deleteProduct = async (id) => {
  try {
    const docRef = doc(db, 'products', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('[deleteProduct] Error:', err);
    throw err;
  }
};
