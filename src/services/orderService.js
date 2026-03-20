import { doc, collection, addDoc, getDocs, query, orderBy, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getOrderTimestamp } from '../utils/costing';

const normalizeOrder = (docSnap) => ({
  id: docSnap.id,
  ...docSnap.data(),
});

export const getOrders = async (startDate, endDate) => {
  try {
    const ordersRef = collection(db, 'orders');
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
    return snapshot.docs.map(normalizeOrder);
  } catch (error) {
    console.error('[getOrders] Error al obtener las órdenes:', error);
    return [];
  }
};

export const getPaidOrdersGroupedByDay = async () => {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('timestamp'));
    const snapshot = await getDocs(q);

    const paidOrders = snapshot.docs
      .map(normalizeOrder)
      .filter((order) => order.status === 'Pagada')
      .sort((left, right) => (getOrderTimestamp(right)?.getTime() || 0) - (getOrderTimestamp(left)?.getTime() || 0));

    const grouped = {};

    paidOrders.forEach((order) => {
      const ts = getOrderTimestamp(order);
      if (!ts) return;
      const dateKey = ts.toLocaleDateString('es-ES');
      (grouped[dateKey] ??= []).push(order);
    });

    return grouped;
  } catch (err) {
    console.error('[getPaidOrdersGroupedByDay] Error:', err);
    return {};
  }
};

export const getPaidOrders = async () => {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('timestamp'));
    const snapshot = await getDocs(q);

    const paidOrders = snapshot.docs
      .map(normalizeOrder)
      .filter((order) => order.status === 'Pagada');

    return paidOrders.sort((left, right) => (getOrderTimestamp(right)?.getTime() || 0) - (getOrderTimestamp(left)?.getTime() || 0));
  } catch (err) {
    console.error('[getPaidOrders] Error:', err);
    return [];
  }
};

export const saveOrder = async (orderData) => {
  try {
    const orderedAt = orderData.orderedAt || orderData.timestamp || new Date().toISOString();
    const docRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
      orderedAt,
      timestamp: orderedAt,
      statusTimeline: {
        orderedAt,
      },
    });
    return docRef.id;
  } catch (error) {
    console.error('[saveOrder] Error al guardar la orden:', error);
    throw new Error(error.message || 'Error al guardar la orden');
  }
};

export const updateOrderStatus = async (orderId, newStatus, paymentMethod = null) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const now = new Date().toISOString();
    const patch = {
      status: newStatus,
      [`statusTimeline.${newStatus}`]: now,
    };

    if (newStatus === 'Realizada') {
      patch.preparedAt = now;
    }

    if (newStatus === 'Pagada') {
      patch.paidAt = now;
      patch.paymentMethod = paymentMethod;
      patch.createdAt = now; // compatibilidad con registros/consultas antiguas
    }

    await updateDoc(orderRef, patch);
  } catch (error) {
    console.error('[updateOrderStatus] Error al actualizar el estado:', error);
    throw error;
  }
};

export const deleteOrder = async (orderId) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await deleteDoc(orderRef);
  } catch (error) {
    console.error('[deleteOrder] Error al eliminar la orden:', error);
    throw error;
  }
};
