const mockAddDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockCollection = jest.fn(() => 'orders-collection');
const mockDoc = jest.fn((...args) => ({ path: args.join('/') }));
const mockGetDocs = jest.fn();
const mockQuery = jest.fn(() => 'query-ref');
const mockOrderBy = jest.fn(() => 'order-by');
const mockWhere = jest.fn(() => 'where-clause');
const mockDeleteDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: (...args) => mockDoc(...args),
  collection: (...args) => mockCollection(...args),
  addDoc: (...args) => mockAddDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  query: (...args) => mockQuery(...args),
  orderBy: (...args) => mockOrderBy(...args),
  where: (...args) => mockWhere(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
}));

jest.mock('../lib/firebase', () => ({
  db: 'db-instance',
}));

import { getOrderDisplayNumber, getOrderEventDate, saveOrder, updateOrderStatus } from './orderService';

describe('orderService sprint 1 helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers orderNumber when available', () => {
    expect(getOrderDisplayNumber({ orderNumber: 'TKT-20260319-AB12', id: 'firestore-id' })).toBe('TKT-20260319-AB12');
    expect(getOrderDisplayNumber({ id: 'firestore-id' })).toBe('firestore-id');
  });

  it('prefers paidAt over createdAt and timestamp for event date', () => {
    const timestamp = { seconds: 1000, nanoseconds: 0 };
    const result = getOrderEventDate({
      timestamp,
      createdAt: '2026-03-18T10:00:00.000Z',
      paidAt: '2026-03-19T10:00:00.000Z',
    });

    expect(result.toISOString()).toBe('2026-03-19T10:00:00.000Z');
  });
});

describe('saveOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates createdAt/updatedAt and patches a ticket number after addDoc', async () => {
    mockAddDoc.mockResolvedValue({ id: 'abc12345' });
    mockUpdateDoc.mockResolvedValue();

    const result = await saveOrder({
      customerName: 'Ana',
      status: 'Por Hacer',
      items: [{ name: 'Taco', quantity: 1, price: 1000 }],
      total: 1000,
      timestamp: new Date('2026-03-19T12:00:00.000Z'),
    });

    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockAddDoc.mock.calls[0][1]).toEqual(expect.objectContaining({
      orderNumber: expect.stringMatching(/^TKT-\d{8}-TEMP$/),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      paidAt: null,
    }));
    expect(mockDoc).toHaveBeenCalledWith('db-instance', 'orders', 'abc12345');
    expect(mockUpdateDoc.mock.calls[0][1]).toEqual(expect.objectContaining({
      orderNumber: 'TKT-' + new Date(mockAddDoc.mock.calls[0][1].createdAt).toISOString().slice(0, 10).replace(/-/g, '') + '-ABC1',
      updatedAt: expect.any(String),
    }));
    expect(result).toEqual({
      id: 'abc12345',
      orderNumber: 'TKT-' + new Date(mockAddDoc.mock.calls[0][1].createdAt).toISOString().slice(0, 10).replace(/-/g, '') + '-ABC1',
    });
  });
});

describe('updateOrderStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not overwrite createdAt and stamps paidAt only for paid orders', async () => {
    mockUpdateDoc.mockResolvedValue();

    await updateOrderStatus('order-1', 'Pagada', [{ paymentMethod: 'Efectivo', amount: 1000 }]);

    expect(mockDoc).toHaveBeenCalledWith('db-instance', 'orders', 'order-1');
    expect(mockUpdateDoc.mock.calls[0][1]).toEqual(expect.objectContaining({
      status: 'Pagada',
      paymentMethod: [{ paymentMethod: 'Efectivo', amount: 1000 }],
      updatedAt: expect.any(String),
      paidAt: expect.any(String),
    }));
    expect(mockUpdateDoc.mock.calls[0][1].createdAt).toBeUndefined();
  });
});
