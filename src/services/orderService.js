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
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('timestamp'));
    const snapshot = await getDocs(q);

    const paidOrders = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(order => order.status === 'Pagada');

    const grouped = {};

    paidOrders.forEach(order => {
      const dateKey = new Date(order.timestamp.seconds * 1000 + order.timestamp.nanoseconds / 1000000).toLocaleDateString('es-ES');
      //const dateKey = dateObject.toDateString();
      
      //console.log("Tipo:", typeof dateObject);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(order);
    });

    return grouped;

  } catch (error) {
    console.error('[getPaidOrdersGroupedByDay] Error al obtener órdenes:', error);
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