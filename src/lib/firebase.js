import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCPKWHMpsEL-byCWO705zbVQ-2l0q5yigo",
  authDomain: "antojitospos.firebaseapp.com",
  projectId: "antojitospos",
  storageBucket: "antojitospos.firebasestorage.app",
  messagingSenderId: "19244608498",
  appId: "1:19244608498:web:059f7016ef98edcadc996b",
  measurementId: "G-P4LVHH40J9"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch(() => {});