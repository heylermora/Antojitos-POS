import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const SUPPLIERS_COLLECTION = 'suppliers';

const normalizeSupplier = (docSnap) => {
  const data = docSnap.data() || {};
  return {
    id: docSnap.id,
    name: data.name || '',
    contactName: data.contactName || '',
    phone: data.phone || '',
    email: data.email || '',
    notes: data.notes || '',
    active: data.active !== false,
  };
};

export const getSuppliers = async () => {
  const snapshot = await getDocs(query(collection(db, SUPPLIERS_COLLECTION), orderBy('name')));
  return snapshot.docs.map(normalizeSupplier);
};

export const createSupplier = async (supplier) => {
  const payload = {
    name: supplier.name || '',
    contactName: supplier.contactName || '',
    phone: supplier.phone || '',
    email: supplier.email || '',
    notes: supplier.notes || '',
    active: supplier.active !== false,
  };

  const docRef = await addDoc(collection(db, SUPPLIERS_COLLECTION), payload);
  return docRef.id;
};

export const updateSupplier = async (id, supplier) => {
  await updateDoc(doc(db, SUPPLIERS_COLLECTION, id), {
    name: supplier.name || '',
    contactName: supplier.contactName || '',
    phone: supplier.phone || '',
    email: supplier.email || '',
    notes: supplier.notes || '',
    active: supplier.active !== false,
  });
};

export const deleteSupplier = async (id) => {
  await deleteDoc(doc(db, SUPPLIERS_COLLECTION, id));
};
