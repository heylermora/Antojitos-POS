import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { applyIngredientCostUpdate, clearIngredientCostUpdate } from './ingredientService';

const PURCHASE_INVOICES_COLLECTION = 'purchaseInvoices';

const normalizeInvoiceLine = (line = {}) => ({
  ingredientId: line.ingredientId || '',
  ingredientName: line.ingredientName || '',
  quantityPurchased: Number(line.quantityPurchased) || 0,
  purchaseUnit: line.purchaseUnit || '',
  baseQuantity: Number(line.baseQuantity) || 0,
  lineCost: Number(line.lineCost) || 0,
  unitCost: Number(line.unitCost) || 0,
  taxCode: line.taxCode || 'tax-exempt',
  taxLabel: line.taxLabel || 'Exento',
  taxRate: Number(line.taxRate) || 0,
  taxAmount: Number(line.taxAmount) || 0,
  lineTotal: Number(line.lineTotal) || 0,
});

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
    lines: Array.isArray(data.lines) ? data.lines.map(normalizeInvoiceLine) : [],
    createdAt: data.createdAt || null,
  };
};

export const getPurchaseInvoices = async () => {
  const snapshot = await getDocs(query(collection(db, PURCHASE_INVOICES_COLLECTION), orderBy('invoiceDate', 'desc')));
  return snapshot.docs.map(normalizeInvoice);
};

const toMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const compareInvoices = (left, right) => {
  const dateDiff = toMillis(right.invoiceDate) - toMillis(left.invoiceDate);
  if (dateDiff !== 0) return dateDiff;
  return toMillis(right.createdAt) - toMillis(left.createdAt);
};

const recomputeIngredientCosts = async (ingredientIds) => {
  if (!ingredientIds.length) return;

  const invoices = await getPurchaseInvoices();

  await Promise.all(
    ingredientIds.map(async (ingredientId) => {
      const matches = invoices
        .flatMap((invoice) =>
          (invoice.lines || [])
            .filter((line) => line.ingredientId === ingredientId)
            .map((line) => ({ invoice, line }))
        )
        .sort((left, right) => compareInvoices(left.invoice, right.invoice));

      if (!matches.length) {
        await clearIngredientCostUpdate(ingredientId);
        return;
      }

      const latestMatch = matches[0];
      const supplierNames = [...new Set(matches.map((match) => match.invoice.supplierName).filter(Boolean))];

      await applyIngredientCostUpdate({
        ingredientId,
        supplierName: latestMatch.invoice.supplierName,
        supplierNames,
        unitCost: latestMatch.line.unitCost,
        purchasedAt: latestMatch.invoice.invoiceDate,
      });
    })
  );
};

export const createPurchaseInvoice = async (invoice) => {
  const cleanLines = (invoice.lines || []).map(normalizeInvoiceLine);

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
  const affectedIngredientIds = [...new Set(cleanLines.map((line) => line.ingredientId).filter(Boolean))];
  await recomputeIngredientCosts(affectedIngredientIds);

  return docRef.id;
};

export const deletePurchaseInvoice = async (id) => {
  const invoiceRef = doc(db, PURCHASE_INVOICES_COLLECTION, id);
  const snapshot = await getDoc(invoiceRef);

  if (!snapshot.exists()) {
    return;
  }

  const invoice = normalizeInvoice(snapshot);
  const affectedIngredientIds = [...new Set((invoice.lines || []).map((line) => line.ingredientId).filter(Boolean))];

  await deleteDoc(invoiceRef);
  await recomputeIngredientCosts(affectedIngredientIds);
};
