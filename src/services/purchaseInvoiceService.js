import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { applyIngredientCostUpdate } from './ingredientService';

const PURCHASE_INVOICES_COLLECTION = 'purchaseInvoices';

const normalizeInvoice = (docSnap) => {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    supplierName: data.supplierName || '',
    invoiceNumber: data.invoiceNumber || '',
    invoiceDate: data.invoiceDate || '',
    currency: data.currency || 'CRC',
    subtotal: Number(data.subtotal) || 0,
    tax: Number(data.tax) || 0,
    total: Number(data.total) || 0,
    notes: data.notes || '',
    lines: Array.isArray(data.lines) ? data.lines : [],
    createdAt: data.createdAt || null,
  };
};

export const getPurchaseInvoices = async () => {
  const snapshot = await getDocs(query(collection(db, PURCHASE_INVOICES_COLLECTION), orderBy('invoiceDate', 'desc')));
  return snapshot.docs.map(normalizeInvoice);
};

export const createPurchaseInvoice = async (invoice) => {
  const cleanLines = (invoice.lines || []).map((line) => ({
    ingredientId: line.ingredientId || '',
    ingredientName: line.ingredientName || '',
    quantityPurchased: Number(line.quantityPurchased) || 0,
    purchaseUnit: line.purchaseUnit || '',
    baseQuantity: Number(line.baseQuantity) || 0,
    lineCost: Number(line.lineCost) || 0,
    unitCost: Number(line.unitCost) || 0,
  }));

  const payload = {
    supplierName: invoice.supplierName || '',
    invoiceNumber: invoice.invoiceNumber || '',
    invoiceDate: invoice.invoiceDate || '',
    currency: invoice.currency || 'CRC',
    subtotal: Number(invoice.subtotal) || 0,
    tax: Number(invoice.tax) || 0,
    total: Number(invoice.total) || 0,
    notes: invoice.notes || '',
    lines: cleanLines,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, PURCHASE_INVOICES_COLLECTION), payload);

  await Promise.all(
    cleanLines.map((line) =>
      applyIngredientCostUpdate({
        ingredientId: line.ingredientId,
        supplierName: payload.supplierName,
        unitCost: line.unitCost,
        purchasedAt: payload.invoiceDate,
      })
    )
  );

  return docRef.id;
};

export const deletePurchaseInvoice = async (id) => {
  await deleteDoc(doc(db, PURCHASE_INVOICES_COLLECTION, id));
};
