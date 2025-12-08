import { getDocs, collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const getProducts = async () => {
  try {
    console.log('[getProducts] Fetching products from Firestore...');
    const snapshot = await getDocs(collection(db, 'products'));

    if (snapshot.empty) {
      console.warn('[getProducts] No se encontraron productos en Firestore.');
      throw new Error('No se encontraron productos en la base de datos.');
    }

    const categoriesMap = {};

    snapshot.forEach(doc => {
      const data = doc.data();

      const categoryId = data.categoryId || 'sin_categoria';
      const categoryName = data.categoryName || 'Sin categoría';

      if (!categoriesMap[categoryId]) {
        categoriesMap[categoryId] = {
          id: categoryId,
          name: categoryName,
          products: []
        };
      }

      categoriesMap[categoryId].products.push({
        id: doc.id,                    // usamos el id del documento
        name: data.name,
        price: Number(data.price) || 0,
        description: data.description || '',
        categoryName
      });
    });

    const categories = Object.values(categoriesMap);

    const alreadyHasOther = categories.some(c => c.id === 'other');
    if (!alreadyHasOther) {
      categories.push({
        id: 'other',
        name: 'Otro',
        products: []
      });
    }

    console.log('[getProducts] Categories parsed:', categories);
    return categories;
  } catch (err) {
    console.error('[getProducts] Error:', err);
    throw err;
  }
};

export const createProduct = async (product) => {
  try {
    const docRef = doc(db, 'products', `product_${product.id}`);
    await setDoc(docRef, product);
    console.log('[createProduct] Product created:', product);
  } catch (err) {
    console.error('[createProduct] Error:', err);
  }
};

export const updateProduct = async (id, updates) => {
  try {
    const docRef = doc(db, 'products', `product_${id}`);
    await updateDoc(docRef, updates);
    console.log('[updateProduct] Product updated:', id, updates);
  } catch (err) {
    console.error('[updateProduct] Error:', err);
  }
};

export const deleteProduct = async (id) => {
  try {
    const docRef = doc(db, 'products', `product_${id}`);
    await deleteDoc(docRef);
    console.log('[deleteProduct] Product deleted:', id);
  } catch (err) {
    console.error('[deleteProduct] Error:', err);
  }
};