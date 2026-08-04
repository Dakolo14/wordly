import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
}

// Lazy getters — only initialize when actually called at runtime, 
// NOT at build time when env vars don't exist yet.
let _db: Firestore;
let _auth: Auth;

export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    if (!_db) {
      ensureInitialized();
      _db = getFirestore();
    }
    return (_db as any)[prop];
  }
});

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    if (!_auth) {
      ensureInitialized();
      _auth = getAuth();
    }
    return (_auth as any)[prop];
  }
});


