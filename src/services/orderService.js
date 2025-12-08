import { doc, collection, addDoc, getDocs, query, orderBy, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return orders;
  } catch (error) {
    console.error('[getOrders] Error al obtener las órdenes:', error);
    return [];
  }
};

export const getPaidOrdersGroupedByDay = async () => {
  try {
    console.log('[getPaidOrdersGroupedByDay] Starting fetch...');

    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('timestamp'));

    const snapshot = await getDocs(q);
    console.log('[getPaidOrdersGroupedByDay] Documents fetched:', snapshot.size);

    const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('[getPaidOrdersGroupedByDay] All orders parsed:', allOrders.length);

    const paidOrders = allOrders.filter(order => order.status === 'Pagada');
    console.log('[getPaidOrdersGroupedByDay] Paid orders filtered:', paidOrders.length);

    // Recientes primero
    const ordered = paidOrders.reverse();
    console.log('[getPaidOrdersGroupedByDay] Orders sorted (recent first).');

    const grouped = {};

    ordered.forEach(order => {
      const ts = order.timestamp;
      const ms = ts.seconds * 1000 + ts.nanoseconds / 1e6;

      const dateKey = new Date(ms).toLocaleDateString('es-ES');

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

export const saveOrder = async (orderData) => {
  try {
    console.log("orderData", orderData)
    const docRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
    });
    console.log('[saveOrder] Orden guardada con ID:', docRef.id);
  } catch (error) {
    console.error('[saveOrder] Error al guardar la orden:', error);
    throw new Error(error.message || 'Error al guardar la orden');    
  }
};

export const updateOrderStatus = async (orderId, newStatus, paymentMethod = null) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      createdAt: new Date().toISOString(),
      status: newStatus,
      paymentMethod
    });
    console.log(`[updateOrderStatus] Estado actualizado a "${newStatus}" para la orden ${orderId}`);
  } catch (error) {
    console.error('[updateOrderStatus] Error al actualizar el estado:', error);
  }
};

export const deleteOrder = async (orderId) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await deleteDoc(orderRef);
    console.log(`[deleteOrder] Orden ${orderId} eliminada correctamente`);
  } catch (error) {
    console.error('[deleteOrder] Error al eliminar la orden:', error);
    throw error;
  }
};