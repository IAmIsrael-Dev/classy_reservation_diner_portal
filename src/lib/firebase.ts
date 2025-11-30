import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Safely access environment variables with fallback to hardcoded config
const getEnvVar = (key: string, fallback: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || fallback;
  }
  return fallback;
};

// Firebase configuration object with your project details as defaults
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', 'AIzaSyDtpbLxOG487GanuXEJKbifebGoANNIuas'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', 'classyreserveai.firebaseapp.com'),
  databaseURL: getEnvVar('VITE_FIREBASE_DATABASE_URL', 'https://classyreserveai-default-rtdb.firebaseio.com'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', 'classyreserveai'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', 'classyreserveai.firebasestorage.app'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', '798527729998'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', '1:798527729998:web:f7bc705c4000f9134c6e1f'),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID', 'G-QY70QN5G2W')
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  console.log('✅ Firebase initialized successfully');
  console.log('📍 Project ID:', firebaseConfig.projectId);
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

export { app, auth, db, storage };