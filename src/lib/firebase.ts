// src/lib/firebase.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  connectFirestoreEmulator,
  enableNetwork,
  disableNetwork 
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Configuración de Firebase con validación
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validar configuración
function validateFirebaseConfig() {
  const requiredFields = [
    'apiKey',
    'authDomain', 
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missing = requiredFields.filter(field => !firebaseConfig[field as keyof typeof firebaseConfig]);
  
  if (missing.length > 0) {
    console.error('❌ Firebase config missing:', missing);
    throw new Error(`Firebase configuration missing: ${missing.join(', ')}`);
  }

  console.log('✅ Firebase config validated successfully');
}

// Validar antes de inicializar
validateFirebaseConfig();

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('🔥 Firebase initialized');
} else {
  app = getApps()[0];
  console.log('🔥 Firebase already initialized');
}

// Initialize Firebase services with error handling
export let auth: Auth;
export let db: Firestore;
export let storage: FirebaseStorage;

try {
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  
  // Habilitar red explícitamente
  enableNetwork(db).catch(console.warn);
  
  console.log('✅ Firebase services initialized');
} catch (error) {
  console.error('❌ Error initializing Firebase services:', error);
  throw error;
}

// Helper para reconectar Firestore
export const reconnectFirestore = async () => {
  try {
    await enableNetwork(db);
    console.log('🔄 Firestore reconnected');
  } catch (error) {
    console.error('❌ Error reconnecting Firestore:', error);
  }
};

export default app;