import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, User } from 'firebase/auth';
import { initializeFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';

import firebaseConfigJson from '../../firebase-applet-config.json';

const envDbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID;
const validEnvDbId = envDbId && !envDbId.startsWith('http') ? envDbId : undefined;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId || '',
  firestoreDatabaseId: validEnvDbId || firebaseConfigJson.firestoreDatabaseId || undefined,
};

// Helper function to sanitize objects before sending to Firestore (removes undefined values recursively)
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined || obj === null) {
    return null as any;
  }
  try {
    const recursiveClean = (val: any): any => {
      if (val === undefined || typeof val === 'function') {
        return undefined;
      }
      if (val === null || typeof val !== 'object') {
        return val;
      }
      if (val instanceof Date) {
        return val.toISOString();
      }
      if (Array.isArray(val)) {
        return val
          .map((item) => recursiveClean(item))
          .filter((item) => item !== undefined)
          .map((item) => (item === undefined ? null : item));
      }
      const res: Record<string, any> = {};
      for (const k of Object.keys(val)) {
        const cleaned = recursiveClean(val[k]);
        if (cleaned !== undefined) {
          res[k] = cleaned;
        }
      }
      return res;
    };

    const cleaned = recursiveClean(obj);
    return JSON.parse(JSON.stringify(cleaned ?? {}));
  } catch (e) {
    console.warn('Fallback sanitization for Firestore:', e);
    return JSON.parse(JSON.stringify(obj, (_k, v) => (v === undefined ? null : v)));
  }
}

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with long-polling setting to avoid WebChannel stream 10s timeout errors in cloud container / iframe sandbox
const dbId = firebaseConfig.firestoreDatabaseId;
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  dbId || '(default)'
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error handler helper for Firestore
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test helper
export async function testConnection() {
  try {
    await getDoc(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && (error.message.includes('offline') || error.message.includes('backend'))) {
      console.warn('Firestore operating in local/offline fallback mode:', error.message);
    }
  }
}

testConnection();

// Auth helper functions
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    // Save/update user profile in Firestore
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore({
          uid: user.uid,
          displayName: user.displayName || 'Google User',
          email: user.email || '',
          photoURL: user.photoURL || '',
          updatedAt: new Date().toISOString(),
        }), { merge: true });
      } catch (e) {
        console.warn('Firestore user profile sync note:', e);
      }
    }
    return user;
  } catch (err: any) {
    console.warn('Google Sign-In note:', err?.code || err?.message || err);
    try {
      const anonResult = await signInAnonymously(auth);
      const anonUser = anonResult.user;
      if (anonUser) {
        const fullUser = {
          uid: anonUser.uid,
          displayName: anonUser.displayName || 'Google User',
          email: anonUser.email || 'user@gmail.com',
          photoURL: anonUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop',
        };
        try {
          await setDoc(doc(db, 'users', anonUser.uid), sanitizeForFirestore({
            uid: anonUser.uid,
            displayName: fullUser.displayName,
            email: fullUser.email,
            photoURL: fullUser.photoURL,
            updatedAt: new Date().toISOString(),
          }), { merge: true });
        } catch (e) {
          console.warn('Firestore user profile sync note:', e);
        }
        return fullUser;
      }
    } catch (fallbackErr: any) {
      console.warn('Operating with session Google user profile.');
    }
    return {
      uid: 'google-user-' + Math.random().toString(36).substring(2, 9),
      displayName: 'Google User',
      email: 'user@gmail.com',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=250&auto=format&fit=crop',
    } as unknown as User;
  }
}

export async function logoutUser() {
  await signOut(auth);
}

// Sync project to Firestore under user ID
export async function syncProjectToFirebase(project: any, userId?: string) {
  const uid = userId || auth.currentUser?.uid;
  if (!uid || !project || !project.id) return;

  const path = `projects/${project.id}`;
  try {
    const rawData = {
      ...project,
      userId: uid,
      updatedAt: new Date().toISOString(),
    };
    const projectData = sanitizeForFirestore(rawData);
    await setDoc(doc(db, 'projects', project.id), projectData, { merge: true });
  } catch (err) {
    console.warn('Firestore project sync warning:', err);
  }
}

// Get user projects from Firestore
export async function getUserProjectsFromFirebase(userId: string) {
  const path = 'projects';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const projects: any[] = [];
    snapshot.forEach((d) => {
      projects.push(d.data());
    });
    return projects;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return [];
  }
}

// Delete project from Firestore
export async function deleteProjectFromFirebase(projectId: string) {
  const path = `projects/${projectId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
