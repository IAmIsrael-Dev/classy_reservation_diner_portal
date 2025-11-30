import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  type UserCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import { type UserProfile } from './types';

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
 * Check if username is available
 * Returns true if available, false if taken
 * If Firebase rules aren't configured, it gracefully handles the error
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  try {
    const usernameDoc = await getDoc(doc(db, 'usernames', username.toLowerCase()));
    return !usernameDoc.exists();
  } catch (error: unknown) {
    console.error('Error checking username:', error);
    
    // Check if this is a permission-denied error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('permission-denied') || errorMessage.includes('Missing or insufficient permissions')) {
      console.warn('⚠️ Firebase rules not configured. Skipping username uniqueness check.');
      console.warn('📋 To enable username validation, apply rules from FIREBASE_RULES.md');
      // Return true to allow signup to proceed (username uniqueness won't be enforced)
      return true;
    }
    
    // For other errors, throw
    throw new Error('Unable to check username availability: ' + errorMessage);
  }
}

/**
 * Sign up a new user with email and password
 */
export async function signUpWithEmail(
  email: string, 
  password: string,
  username: string,
  displayName: string
): Promise<{ user: User; profile: UserProfile }> {
  try {
    // Check if username is available
    const available = await isUsernameAvailable(username);
    if (!available) {
      throw new Error('Username is already taken. Please choose another one.');
    }

    // Create user account
    const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user: User = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName });

    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email || email,
      username: username.toLowerCase(),
      displayName,
      createdAt: new Date().toISOString(),
      role: 'diner', // Default role
      preferences: {
        cuisine: [],
        dietaryRestrictions: [],
        priceRange: 2,
        favoriteRestaurants: []
      },
      stats: {
        totalReservations: 0,
        upcomingReservations: 0,
        cancelledReservations: 0,
        noShowCount: 0
      }
    };

    // Save user profile
    await setDoc(doc(db, 'users', user.uid), userProfile);
    
    // Try to reserve username (may fail if rules not configured)
    try {
      await setDoc(doc(db, 'usernames', username.toLowerCase()), {
        uid: user.uid,
        createdAt: new Date().toISOString()
      });
    } catch {
      console.warn('⚠️ Could not reserve username (Firebase rules may not be configured)');
      console.warn('📋 Username uniqueness will not be enforced until rules are applied');
      // Don't fail signup if username reservation fails
    }

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
      // Generate username from email or display name
      const baseUsername = (user.email?.split('@')[0] || user.displayName?.replace(/\s+/g, '') || 'user').toLowerCase();
      let username = baseUsername;
      let counter = 1;
      
      // Find available username
      while (!(await isUsernameAvailable(username))) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      profile = {
        uid: user.uid,
        email: user.email || '',
        username,
        displayName: user.displayName || 'User',
        createdAt: new Date().toISOString(),
        role: 'diner',
        preferences: {
          cuisine: [],
          dietaryRestrictions: [],
          priceRange: 2,
          favoriteRestaurants: []
        },
        stats: {
          totalReservations: 0,
          upcomingReservations: 0,
          cancelledReservations: 0,
          noShowCount: 0
        }
      };
      
      await setDoc(doc(db, 'users', user.uid), profile);
      
      // Try to reserve username (may fail if rules not configured)
      try {
        await setDoc(doc(db, 'usernames', username), {
          uid: user.uid,
          createdAt: new Date().toISOString()
        });
      } catch {
        console.warn('⚠️ Could not reserve username (Firebase rules may not be configured)');
        // Don't fail Google sign-in if username reservation fails
      }
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

/**
 * Upload profile picture to Firebase Storage and return the download URL
 * 
 * IMPORTANT: Firebase Storage security rules must be configured to allow this.
 * Add these rules in Firebase Console > Storage > Rules:
 * 
 * rules_version = '2';
 * service firebase.storage {
 *   match /b/{bucket}/o {
 *     match /profile-pictures/{userId}/{fileName} {
 *       allow read;
 *       allow write: if request.auth != null && request.auth.uid == userId;
 *     }
 *   }
 * }
 * 
 * @throws {StoragePermissionError} When Storage rules are not configured
 */
export async function uploadProfilePicture(
  uid: string,
  file: File
): Promise<string> {
  try {
    // Create a reference to the storage location
    // Using folder structure: profile-pictures/{userId}/profile.{ext}
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const storageRef = ref(storage, `profile-pictures/${uid}/profile.${fileExtension}`);
    
    // Upload the file
    await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    
    // Check if it's a permission error
    if (error instanceof Error && (error.message.includes('unauthorized') || error.message.includes('permission-denied'))) {
      console.error('⚠️ FIREBASE STORAGE PERMISSION ERROR ⚠️');
      console.error('Your Firebase Storage security rules need to be updated.');
      console.error('Go to: Firebase Console > Storage > Rules');
      console.error('Add the following rules:');
      console.error(`
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile-pictures/{userId}/{fileName} {
      allow read;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
      `);
      console.error('📄 See FIREBASE_STORAGE_RULES.md for detailed setup instructions');
      
      // Throw specific error type that can be caught
      const storageError = new Error('STORAGE_PERMISSION_DENIED');
      storageError.name = 'StoragePermissionError';
      throw storageError;
    }
    
    const message = getErrorMessage(error);
    throw new Error(message || 'Failed to upload profile picture');
  }
}