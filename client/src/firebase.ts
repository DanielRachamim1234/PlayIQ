// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage'; 


const firebaseConfig = {
  apiKey: "**************",
  authDomain: "**********",
  projectId: "*********",
  storageBucket: "**********", 
  messagingSenderId: "*********",
  appId: "************"
};

const app = initializeApp(firebaseConfig); 


export const db = getFirestore(app);
export const storage = getStorage(app);
