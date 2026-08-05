import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc, getDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore';

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

// Initialize Firestore with specific database ID from environment or config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
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
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client offline status:', error);
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
    console.warn('Google Sign-In Notice:', err?.code || err?.message || err);
    if (err?.code === 'auth/unauthorized-domain') {
      alert(
        'Google Sign-In Notice:\n\n' +
        'The current domain (' + window.location.hostname + ') is not yet added to Authorized Domains in your Firebase console.\n\n' +
        'To enable Google Auth for this custom domain, add ' + window.location.hostname + ' under:\n' +
        'Firebase Console -> Authentication -> Settings -> Authorized Domains.\n\n' +
        'You can continue using FlowBoard AI as a guest!'
      );
    } else if (err?.code === 'auth/popup-blocked') {
      alert('Popup was blocked by your browser. Please allow popups for this site to sign in with Google.');
    }
    throw err;
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
