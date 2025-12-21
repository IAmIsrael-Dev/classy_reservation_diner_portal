import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, Firestore, memoryLocalCache } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

// Safely access environment variables with fallback to hardcoded config
const getEnvVar = (key: string, fallback: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || fallback;
  }
  return fallback;
};

// Debug: Log environment variable availability
console.log('🔍 Checking environment variables...');
console.log('import.meta.env exists:', typeof import.meta !== 'undefined' && !!import.meta.env);
if (typeof import.meta !== 'undefined' && import.meta.env) {
  console.log('ENV PROJECT_ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
  console.log('ENV API_KEY:', import.meta.env.VITE_FIREBASE_API_KEY ? import.meta.env.VITE_FIREBASE_API_KEY.substring(0, 20) + '...' : 'undefined');
}

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

console.log('🔧 Using Firebase Config:');
console.log('  Project ID:', firebaseConfig.projectId);
console.log('  Auth Domain:', firebaseConfig.authDomain);
console.log('  API Key (first 20 chars):', firebaseConfig.apiKey.substring(0, 20) + '...');

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Initialize Firestore with graceful degradation for persistence
  // Use memory cache to avoid multi-tab persistence conflicts
  db = initializeFirestore(app, {
    localCache: memoryLocalCache()
  });
  
  console.log('✅ Firebase initialized successfully');
  console.log('📍 Project ID:', firebaseConfig.projectId);
  console.log('📦 Using memory cache (avoids multi-tab conflicts)');
  
  storage = getStorage(app);
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

export { app, auth, db, storage };