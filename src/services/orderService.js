import { doc, collection, addDoc, getDocs, query, orderBy, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const ORDERS_COLLECTION = 'orders';

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') {
    return new Date(value.seconds * 1000 + (value.nanoseconds || 0) / 1e6);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateToken = (date = new Date()) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');

const buildOrderNumber = (date, id = '') => {
  const suffix = (id || 'TEMP').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase().padEnd(4, 'X');
  return `TKT-${formatDateToken(date)}-${suffix}`;
};

const normalizeOrder = (snapshotDoc) => {
  const data = snapshotDoc.data();

  return {
    id: snapshotDoc.id,
    ...data,
    customerName: data.customerName || '',
    customerPhone: data.customerPhone || '',
    serviceType: data.serviceType || 'Salón',
    orderNotes: data.orderNotes || '',
    paymentSummary: data.paymentSummary || null,
    paymentMethod: Array.isArray(data.paymentMethod) ? data.paymentMethod : data.paymentMethod || null,
  };
};

export const getOrderDisplayNumber = (order) => order?.orderNumber || order?.folio || order?.id || '—';

export const getOrderEventDate = (order) =>
  toDate(order?.paidAt) || toDate(order?.createdAt) || toDate(order?.timestamp);

export const getOrders = async (startDate, endDate) => {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    let q = query(ordersRef, orderBy('timestamp', 'desc'));

    const filters = [];
    if (startDate) {
      filters.push(where('timestamp', '>=', startDate));
    }

    if (endDate) {
      filters.push(where('timestamp', '<=', endDate));
    }
    
    if (filters.length > 0) {
        q = query(ordersRef, ...filters, orderBy('timestamp', 'desc'));
    }

    const snapshot = await getDocs(q);
    const orders = snapshot.docs.map(normalizeOrder);
    return orders;
  } catch (error) {
    console.error('[getOrders] Error al obtener las órdenes:', error);
    return [];
  }
};

export const getPaidOrdersGroupedByDay = async () => {
  try {
    console.log('[getPaidOrdersGroupedByDay] Starting fetch...');

    const ordersRef = collection(db, ORDERS_COLLECTION);
    const q = query(ordersRef, orderBy('timestamp'));

    const snapshot = await getDocs(q);
    console.log('[getPaidOrdersGroupedByDay] Documents fetched:', snapshot.size);

    const allOrders = snapshot.docs.map(normalizeOrder);
    console.log('[getPaidOrdersGroupedByDay] All orders parsed:', allOrders.length);

    const paidOrders = allOrders.filter(order => order.status === 'Pagada');
    console.log('[getPaidOrdersGroupedByDay] Paid orders filtered:', paidOrders.length);

    const ordered = [...paidOrders].sort((left, right) => {
      const leftDate = getOrderEventDate(left)?.getTime() || 0;
      const rightDate = getOrderEventDate(right)?.getTime() || 0;
      return rightDate - leftDate;
    });
    console.log('[getPaidOrdersGroupedByDay] Orders sorted (recent first).');

    const grouped = {};

    ordered.forEach(order => {
      const eventDate = getOrderEventDate(order);
      if (!eventDate) return;

      const dateKey = eventDate.toLocaleDateString('es-ES');

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
        console.log(`[getPaidOrdersGroupedByDay] Created group for date: ${dateKey}`);
      }

      grouped[dateKey].push(order);
    });

    console.log('[getPaidOrdersGroupedByDay] Final grouped result:', grouped);

    return grouped;

  } catch (err) {
    console.error('[getPaidOrdersGroupedByDay] Error:', err);
    return {};
  }
};

export const getPaidOrders = async () => {
  try {
    console.log('[getPaidOrders] Starting fetch...');

    const ordersRef = collection(db, ORDERS_COLLECTION);
    const q = query(ordersRef, orderBy('timestamp'));

    const snapshot = await getDocs(q);
    console.log('[getPaidOrders] Documents fetched:', snapshot.size);

    const allOrders = snapshot.docs.map(normalizeOrder);
    console.log('[getPaidOrders] All orders parsed:', allOrders.length);

    const paidOrders = allOrders.filter(order => order.status === 'Pagada');
    console.log('[getPaidOrders] Paid orders filtered:', paidOrders.length);

    return paidOrders.sort((left, right) => {
      const leftDate = getOrderEventDate(left)?.getTime() || 0;
      const rightDate = getOrderEventDate(right)?.getTime() || 0;
      return rightDate - leftDate;
    });
  } catch (err) {
    console.error('[getPaidOrders] Error:', err);
    return [];
  }
};

export const saveOrder = async (orderData) => {
  try {
    const createdDate = new Date();
    const createdAt = createdDate.toISOString();
    const temporaryOrderNumber = buildOrderNumber(createdDate);
    const docRef = await addDoc(collection(db, ORDERS_COLLECTION), {
      ...orderData,
      customerName: orderData.customerName || '',
      customerPhone: orderData.customerPhone || '',
      serviceType: orderData.serviceType || 'Salón',
      orderNotes: orderData.orderNotes || '',
      orderNumber: temporaryOrderNumber,
      createdAt,
      updatedAt: createdAt,
      paidAt: null,
    });
    console.log('[saveOrder] Orden guardada con ID:', docRef.id);
    const orderNumber = buildOrderNumber(createdDate, docRef.id);

    try {
      await updateDoc(doc(db, ORDERS_COLLECTION, docRef.id), {
        orderNumber,
        updatedAt: new Date().toISOString(),
      });
    } catch (updateError) {
      console.error(
        '[saveOrder] La orden se creó, pero no se pudo actualizar el número definitivo. Se conserva el temporal.',
        updateError
      );

      return {
        id: docRef.id,
        orderNumber: temporaryOrderNumber,
      };
    }

    return {
      id: docRef.id,
      orderNumber,
    };
  } catch (error) {
    console.error('[saveOrder] Error al guardar la orden:', error);
    throw new Error(error.message || 'Error al guardar la orden');    
  }
};

export const updateOrderStatus = async (orderId, newStatus, paymentPayload = null) => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const payload = {
      updatedAt: new Date().toISOString(),
      status: newStatus,
    };

    if (Array.isArray(paymentPayload)) {
      payload.paymentMethod = paymentPayload;
    } else if (paymentPayload && typeof paymentPayload === 'object') {
      if (Array.isArray(paymentPayload.payments)) {
        payload.paymentMethod = paymentPayload.payments;
      }
      if (paymentPayload.paymentSummary) {
        payload.paymentSummary = paymentPayload.paymentSummary;
      }
    } else if (paymentPayload !== null) {
      payload.paymentMethod = paymentPayload;
    }

    if (newStatus === 'Pagada') {
      payload.paidAt = new Date().toISOString();
    }

    await updateDoc(orderRef, payload);
    console.log(`[updateOrderStatus] Estado actualizado a "${newStatus}" para la orden ${orderId}`);
  } catch (error) {
    console.error('[updateOrderStatus] Error al actualizar el estado:', error);
  }
};

export const deleteOrder = async (orderId) => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await deleteDoc(orderRef);
    console.log(`[deleteOrder] Orden ${orderId} eliminada correctamente`);
  } catch (error) {
    console.error('[deleteOrder] Error al eliminar la orden:', error);
    throw error;
  }
};
