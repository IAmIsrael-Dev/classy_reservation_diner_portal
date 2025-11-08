import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Safely access environment variables with fallback to hardcoded config
const getEnvVar = (key: string, fallback: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || fallback;
  }
  return fallback;
};

// Firebase configuration object with your project details as defaults
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', 'AIzaSyBgy6ulDXTfCKPDZPpodpJElOTXf2KF8-o'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', 'demoapp1-65f54.firebaseapp.com'),
  databaseURL: getEnvVar('VITE_FIREBASE_DATABASE_URL', 'https://demoapp1-65f54-default-rtdb.firebaseio.com'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', 'demoapp1-65f54'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', 'demoapp1-65f54.firebasestorage.app'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', '945225510979'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', '1:945225510979:web:988999d61441b035a1a4f6')
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  
  console.log('✅ Firebase initialized successfully');
  console.log('📍 Project ID:', firebaseConfig.projectId);
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

export { app, auth, db };
