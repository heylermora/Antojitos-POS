const mockGetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockDeleteDoc = jest.fn();
const mockCollection = jest.fn(() => 'collection-ref');
const mockDoc = jest.fn((...args) => ({ path: args.join('/') }));
const mockOrderBy = jest.fn(() => 'order-by');
const mockQuery = jest.fn(() => 'query-ref');
const mockServerTimestamp = jest.fn(() => 'server-timestamp');

const mockApplyIngredientCostUpdate = jest.fn();
const mockClearIngredientCostUpdate = jest.fn();

const mockAddDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  addDoc: (...args) => mockAddDoc(...args),
  collection: (...args) => mockCollection(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  orderBy: (...args) => mockOrderBy(...args),
  query: (...args) => mockQuery(...args),
  serverTimestamp: (...args) => mockServerTimestamp(...args),
}));

jest.mock('../lib/firebase', () => ({
  db: 'db-instance',
}));

jest.mock('./ingredientService', () => ({
  applyIngredientCostUpdate: (...args) => mockApplyIngredientCostUpdate(...args),
  clearIngredientCostUpdate: (...args) => mockClearIngredientCostUpdate(...args),
}));

import { createPurchaseInvoice, deletePurchaseInvoice } from './purchaseInvoiceService';

const makeDoc = (id, data) => ({
  id,
  data: () => data,
});

describe('deletePurchaseInvoice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reapplies the most recent remaining invoice cost for affected ingredients', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'invoice-new',
      data: () => ({
        supplierName: 'Proveedor nuevo',
        invoiceDate: '2026-03-10',
        lines: [
          { ingredientId: 'ingredient-1', unitCost: 2.5 },
        ],
      }),
    });

    mockGetDocs.mockResolvedValue({
      docs: [
        makeDoc('invoice-old', {
          supplierName: 'Proveedor anterior',
          invoiceDate: '2026-03-01',
          createdAt: { toMillis: () => 1 },
          lines: [
            { ingredientId: 'ingredient-1', unitCost: 1.75 },
          ],
        }),
      ],
    });

    await deletePurchaseInvoice('invoice-new');

    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
    expect(mockApplyIngredientCostUpdate).toHaveBeenCalledWith({
      ingredientId: 'ingredient-1',
      supplierName: 'Proveedor anterior',
      unitCost: 1.75,
      purchasedAt: '2026-03-01',
    });
    expect(mockClearIngredientCostUpdate).not.toHaveBeenCalled();
  });

  it('clears ingredient costing when the deleted invoice was the last purchase record', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'invoice-only',
      data: () => ({
        supplierName: 'Proveedor único',
        invoiceDate: '2026-03-10',
        lines: [
          { ingredientId: 'ingredient-2', unitCost: 3.2 },
        ],
      }),
    });

    mockGetDocs.mockResolvedValue({
      docs: [],
    });

    await deletePurchaseInvoice('invoice-only');

    expect(mockClearIngredientCostUpdate).toHaveBeenCalledWith('ingredient-2');
    expect(mockApplyIngredientCostUpdate).not.toHaveBeenCalled();
  });

  it('does nothing else when the invoice no longer exists', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false,
    });

    await deletePurchaseInvoice('missing-invoice');

    expect(mockDeleteDoc).not.toHaveBeenCalled();
    expect(mockGetDocs).not.toHaveBeenCalled();
    expect(mockApplyIngredientCostUpdate).not.toHaveBeenCalled();
    expect(mockClearIngredientCostUpdate).not.toHaveBeenCalled();
  });
});


describe('createPurchaseInvoice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores only the selected supplier name on the invoice', async () => {
    mockAddDoc.mockResolvedValue({ id: 'invoice-created' });

    const result = await createPurchaseInvoice({
      supplierName: 'Distribuidora Central',
      invoiceNumber: 'FC-101',
      invoiceDate: '2026-03-15',
      subtotal: 100,
      tax: 13,
      total: 113,
      notes: 'Entrega semanal',
      lines: [
        {
          ingredientId: 'ingredient-1',
          ingredientName: 'Queso',
          quantityPurchased: 2,
          purchaseUnit: 'kg',
          baseQuantity: 2000,
          lineCost: 100,
          unitCost: 0.05,
        },
      ],
    });

    expect(result).toBe('invoice-created');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc.mock.calls[0][1]).toMatchObject({
      supplierName: 'Distribuidora Central',
      invoiceNumber: 'FC-101',
    });
    expect(mockAddDoc.mock.calls[0][1].supplierContactName).toBeUndefined();
    expect(mockAddDoc.mock.calls[0][1].supplierPhone).toBeUndefined();
    expect(mockAddDoc.mock.calls[0][1].supplierEmail).toBeUndefined();
    expect(mockApplyIngredientCostUpdate).toHaveBeenCalledWith({
      ingredientId: 'ingredient-1',
      supplierName: 'Distribuidora Central',
      unitCost: 0.05,
      purchasedAt: '2026-03-15',
    });
  });
});
