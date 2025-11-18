import { getDocs, collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const getProducts = async () => {
  try {
    console.log('[getProducts] Fetching products from Firestore...');
    const snapshot = await getDocs(collection(db, 'products'));

    const categoriesMap = {};

    snapshot.forEach(doc => {
      const product = doc.data();

      const { categoryId, categoryName } = product;

      if (!categoriesMap[categoryId]) {
        categoriesMap[categoryId] = {
          id: categoryId,
          name: categoryName,
          products: []
        };
      }

      categoriesMap[categoryId].products.push({
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description,
        categoryName: categoryName
      });
    });

    const categories = Object.values(categoriesMap);

    console.log("categories", categories);

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
    return [];
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