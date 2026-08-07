import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInAnonymously, signOut, User } from 'firebase/auth';
import { initializeFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';

import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId || undefined,
};

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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
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
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        displayName: user.displayName || 'User',
        email: user.email || '',
        photoURL: user.photoURL || '',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
    return user;
  } catch (err: any) {
    console.warn('Google Sign-In notice:', err?.code || err?.message || err);
    try {
      const anonResult = await signInAnonymously(auth);
      const anonUser = anonResult.user;
      if (anonUser) {
        await setDoc(doc(db, 'users', anonUser.uid), {
          uid: anonUser.uid,
          displayName: 'Guest Flow User',
          email: 'guest@flowboard.app',
          photoURL: '',
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      }
      return anonUser;
    } catch (fallbackErr: any) {
      console.warn('Firebase Anonymous auth disabled or domain restricted. Operating in local guest mode.');
      return null;
    }
  }
}

export async function logoutUser() {
  await signOut(auth);
}

// Sync project to Firestore under user ID
export async function syncProjectToFirebase(project: any, userId?: string) {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return;

  const path = `projects/${project.id}`;
  try {
    const projectData = {
      ...project,
      userId: uid,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'projects', project.id), projectData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
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
