import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import type {User, UserCredential } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  role: 'diner' | 'restaurant' | 'admin';
  preferences?: {
    cuisine?: string[];
    dietaryRestrictions?: string[];
    priceRange?: number;
  };
}

/**
 * Get error message from Firebase error
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}

/**
 * Sign up a new user with email and password
 */
export async function signUpWithEmail(
  email: string, 
  password: string, 
  displayName: string
): Promise<{ user: User; profile: UserProfile }> {
  try {
    // Create user account
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user: User = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName });

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || email,
      displayName,
      createdAt: new Date().toISOString(),
      role: 'diner', // Default role
      preferences: {}
    };

    await setDoc(doc(db, 'users', user.uid), userProfile);

    return { user, profile: userProfile };
  } catch (error) {
    console.error('Sign up error:', error);
    const message = getErrorMessage(error);
    throw new Error(message || 'Failed to create account');
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string, 
  password: string
): Promise<{ user: User; profile: UserProfile | null }> {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    const user: User = userCredential.user;

    // Fetch user profile from Firestore
    const profile = await getUserProfile(user.uid);

    return { user, profile };
  } catch (error) {
    console.error('Sign in error:', error);
    const message = getErrorMessage(error);
    throw new Error(message || 'Failed to sign in');
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<{ user: User; profile: UserProfile }> {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential: UserCredential = await signInWithPopup(auth, provider);
    const user: User = userCredential.user;

    // Check if user profile exists
    let profile = await getUserProfile(user.uid);

    // If profile doesn't exist, create one
    if (!profile) {
      profile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'User',
        createdAt: new Date().toISOString(),
        role: 'diner',
        preferences: {}
      };
      await setDoc(doc(db, 'users', user.uid), profile);
    }

    return { user, profile };
  } catch (error) {
    console.error('Google sign in error:', error);
    const message = getErrorMessage(error);
    throw new Error(message || 'Failed to sign in with Google');
  }
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    const message = getErrorMessage(error);
    throw new Error(message || 'Failed to sign out');
  }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  uid: string, 
  updates: Partial<UserProfile>
): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, updates, { merge: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    const message = getErrorMessage(error);
    throw new Error(message || 'Failed to update profile');
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset error:', error);
    const message = getErrorMessage(error);
    throw new Error(message || 'Failed to send password reset email');
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}