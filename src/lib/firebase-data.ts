import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  startAfter,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db, auth } from './firebase';
import type { 
  Restaurant, 
  Reservation, 
  Experience, 
  WaitlistEntry,
  UserProfile,
  NotificationSettings,
  DiningPreferences,
  PaymentMethod
} from './types';

// ============================================
// ERROR HANDLING UTILITIES
// ============================================

/**
 * Check if error is a Firebase offline/network error
 */
function isOfflineError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: string }).code;
    return code === 'unavailable' || code === 'failed-precondition';
  }
  return false;
}

/**
 * Handle Firebase errors with user-friendly messages
 */
function handleFirebaseError(error: unknown, operation: string): void {
  console.error(`Error in ${operation}:`, error);
  
  if (isOfflineError(error)) {
    console.warn(`⚠️ ${operation}: Operating in offline mode. Data will sync when connection is restored.`);
  }
}

// ============================================
// CACHE MANAGEMENT
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCachedData<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCachedData<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

export function clearCache(): void {
  cache.clear();
}

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

/**
 * Fetch user profile from Firestore
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const cacheKey = `user_profile_${uid}`;
  const cached = getCachedData<UserProfile>(cacheKey);
  if (cached) return cached;

  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const profile = userDoc.data() as UserProfile;
      setCachedData(cacheKey, profile);
      return profile;
    }
    return null;
  } catch (error) {
    handleFirebaseError(error, 'fetchUserProfile');
    return null;
  }
}

/**
 * Update user profile in Firestore
 */
export async function updateUserProfile(
  uid: string, 
  updates: Partial<Omit<UserProfile, 'uid' | 'createdAt'>>
): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    // Clear cache for this user
    const cacheKey = `user_profile_${uid}`;
    cache.delete(cacheKey);
    
    return true;
  } catch (error) {
    handleFirebaseError(error, 'updateUserProfile');
    return false;
  }
}

/**
 * Update user notification settings in Firestore
 */
export async function updateNotificationSettings(
  uid: string,
  notificationSettings: NotificationSettings
): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      notificationSettings,
      updatedAt: new Date().toISOString()
    });
    
    // Clear cache for this user
    cache.delete(`user_profile_${uid}`);
    
    return true;
  } catch (error) {
    handleFirebaseError(error, 'updateNotificationSettings');
    return false;
  }
}

/**
 * Update user dining preferences in Firestore
 */
export async function updateDiningPreferences(
  uid: string,
  diningPreferences: DiningPreferences
): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      diningPreferences,
      updatedAt: new Date().toISOString()
    });
    
    // Clear cache for this user
    cache.delete(`user_profile_${uid}`);
    
    return true;
  } catch (error) {
    handleFirebaseError(error, 'updateDiningPreferences');
    return false;
  }
}

/**
 * Update user payment methods in Firestore
 */
export async function updatePaymentMethods(
  uid: string,
  paymentMethods: PaymentMethod[]
): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      paymentMethods,
      updatedAt: new Date().toISOString()
    });
    
    // Clear cache for this user
    cache.delete(`user_profile_${uid}`);
    
    return true;
  } catch (error) {
    handleFirebaseError(error, 'updatePaymentMethods');
    return false;
  }
}

// ============================================
// RESTAURANT FUNCTIONS
// ============================================

export interface PaginatedResult<T> {
  data: T[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * Fetch restaurants with pagination
 * Note: restaurant-owners collection is keyed by userId (restaurant owner's ID)
 * Each document represents one restaurant owner's restaurant
 */
export async function fetchRestaurantsPaginated(
  pageSize: number = 20,
  lastDoc?: QueryDocumentSnapshot
): Promise<PaginatedResult<Restaurant>> {
  try {
    console.log('🔍 Fetching restaurants (paginated) from collection: restaurant-owners');
    console.log('📝 Note: Collection is keyed by restaurant owner userId');
    console.log('🔐 Current auth user:', auth.currentUser ? auth.currentUser.uid : 'NONE');
    
    const restaurantsRef = collection(db, 'restaurant-owners');
    // Don't order by 'name' field - it might not exist. Order by document ID instead or remove ordering
    let q = query(restaurantsRef, limit(pageSize + 1));
    
    if (lastDoc) {
      console.log('📄 Continuing from last document:', lastDoc.id);
      q = query(restaurantsRef, startAfter(lastDoc), limit(pageSize + 1));
    }
    
    console.log('📤 Executing query...');
    const querySnapshot = await getDocs(q);
    
    console.log('📥 Query complete. Documents found:', querySnapshot.size);
    
    const restaurants: Restaurant[] = [];
    querySnapshot.forEach((doc) => {
      console.log('  📄 Processing doc (userId):', doc.id);
      const data = doc.data();
      console.log('  📝 Document data keys:', Object.keys(data));
      console.log('  📝 restaurantName:', data.restaurantName);
      console.log('  📝 cuisineType:', data.cuisineType);
      console.log('  📝 photos:', data.photos);
      
      // Map the actual Firebase fields to our Restaurant interface
      const restaurant: Restaurant = {
        id: doc.id, // Note: This is the restaurant owner's userId
        name: data.restaurantName || data.name || 'Unknown Restaurant',
        description: data.description || '',
        cuisine: data.cuisineType ? [data.cuisineType] : (Array.isArray(data.cuisine) ? data.cuisine : []),
        priceRange: data.priceRange || 2,
        rating: data.rating || 4.0,
        reviewCount: data.reviewCount || 0,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zipCode || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website,
        images: Array.isArray(data.photos) ? data.photos : (Array.isArray(data.images) ? data.images : []),
        hours: data.openingHours || data.hours || {},
        amenities: Array.isArray(data.amenities) ? data.amenities : [],
        dietaryOptions: Array.isArray(data.dietaryOptions) ? data.dietaryOptions : [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt
      };
      
      console.log('  ✅ Mapped restaurant:', restaurant.name, '| Cuisine:', restaurant.cuisine, '| Images:', restaurant.images.length);
      restaurants.push(restaurant);
    });
    
    console.log('✅ Successfully processed restaurants:', restaurants.length);
    
    return {
      data: restaurants,
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null,
      hasMore: querySnapshot.docs.length > pageSize
    };
  } catch (error) {
    handleFirebaseError(error, 'fetchRestaurantsPaginated');
    return { data: [], lastDoc: null, hasMore: false };
  }
}

/**
 * Fetch all restaurants from Firestore (with caching)
 * Note: restaurant-owners collection is keyed by userId (restaurant owner's ID)
 * Each document represents one restaurant owner's restaurant
 */
export async function fetchRestaurants(): Promise<Restaurant[]> {
  const cacheKey = 'all_restaurants';
  const cached = getCachedData<Restaurant[]>(cacheKey);
  if (cached) {
    console.log('✅ Returning cached restaurants:', cached.length);
    return cached;
  }

  try {
    console.log('🔍 Fetching restaurants from collection: restaurant-owners');
    console.log('📝 Note: Collection is keyed by restaurant owner userId');
    console.log('🔐 Current auth user:', auth.currentUser ? auth.currentUser.uid : 'NONE');
    
    const restaurantsRef = collection(db, 'restaurant-owners');
    // Don't use orderBy since 'name' field might not exist
    const q = query(restaurantsRef);
    
    console.log('📤 Executing query...');
    const querySnapshot = await getDocs(q);
    
    console.log('📥 Query complete. Documents found:', querySnapshot.size);
    
    const restaurants: Restaurant[] = [];
    querySnapshot.forEach((doc) => {
      console.log('  📄 Processing doc (userId):', doc.id);
      const data = doc.data();
      console.log('  📝 Document data keys:', Object.keys(data));
      console.log('  📝 restaurantName:', data.restaurantName);
      console.log('  📝 cuisineType:', data.cuisineType);
      console.log('  📝 photos:', data.photos);
      
      // Map the actual Firebase fields to our Restaurant interface
      const restaurant: Restaurant = {
        id: doc.id, // Note: This is the restaurant owner's userId
        name: data.restaurantName || data.name || 'Unknown Restaurant',
        description: data.description || '',
        cuisine: data.cuisineType ? [data.cuisineType] : (Array.isArray(data.cuisine) ? data.cuisine : []),
        priceRange: data.priceRange || 2,
        rating: data.rating || 4.0,
        reviewCount: data.reviewCount || 0,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zipCode || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website,
        images: Array.isArray(data.photos) ? data.photos : (Array.isArray(data.images) ? data.images : []),
        hours: data.openingHours || data.hours || {},
        amenities: Array.isArray(data.amenities) ? data.amenities : [],
        dietaryOptions: Array.isArray(data.dietaryOptions) ? data.dietaryOptions : [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt
      };
      
      console.log('  ✅ Mapped restaurant:', restaurant.name, '| Cuisine:', restaurant.cuisine, '| Images:', restaurant.images.length);
      restaurants.push(restaurant);
    });
    
    console.log('✅ Successfully fetched restaurants:', restaurants.length);
    setCachedData(cacheKey, restaurants);
    return restaurants;
  } catch (error) {
    handleFirebaseError(error, 'fetchRestaurants');
    return [];
  }
}

/**
 * Fetch a single restaurant by ID
 * Note: The ID is actually the restaurant owner's userId
 */
export async function fetchRestaurantById(restaurantId: string): Promise<Restaurant | null> {
  const cacheKey = `restaurant_${restaurantId}`;
  const cached = getCachedData<Restaurant>(cacheKey);
  if (cached) {
    console.log('✅ Returning cached restaurant:', restaurantId);
    return cached;
  }

  try {
    console.log('🔍 Fetching restaurant by ID (owner userId):', restaurantId);
    console.log('📝 Note: ID is the restaurant owner\'s userId in restaurant-owners collection');
    console.log('🔐 Current auth user:', auth.currentUser ? auth.currentUser.uid : 'NONE');
    
    const restaurantDoc = await getDoc(doc(db, 'restaurant-owners', restaurantId));
    
    if (restaurantDoc.exists()) {
      console.log('✅ Restaurant found for owner userId:', restaurantId);
      const data = restaurantDoc.data();
      console.log('  📝 Document data keys:', Object.keys(data));
      console.log('  📝 restaurantName:', data.restaurantName);
      console.log('  📝 cuisineType:', data.cuisineType);
      console.log('  📝 photos:', data.photos);
      
      // Map the actual Firebase fields to our Restaurant interface
      const restaurant: Restaurant = {
        id: restaurantDoc.id, // This is the restaurant owner's userId
        name: data.restaurantName || data.name || 'Unknown Restaurant',
        description: data.description || '',
        cuisine: data.cuisineType ? [data.cuisineType] : (Array.isArray(data.cuisine) ? data.cuisine : []),
        priceRange: data.priceRange || 2,
        rating: data.rating || 4.0,
        reviewCount: data.reviewCount || 0,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        zipCode: data.zipCode || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website,
        images: Array.isArray(data.photos) ? data.photos : (Array.isArray(data.images) ? data.images : []),
        hours: data.openingHours || data.hours || {},
        amenities: Array.isArray(data.amenities) ? data.amenities : [],
        dietaryOptions: Array.isArray(data.dietaryOptions) ? data.dietaryOptions : [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt
      };
      
      console.log('  ✅ Mapped restaurant:', restaurant.name, '| Cuisine:', restaurant.cuisine, '| Images:', restaurant.images.length);
      setCachedData(cacheKey, restaurant);
      return restaurant;
    }
    
    console.warn('⚠️ Restaurant not found:', restaurantId);
    return null;
  } catch (error) {
    handleFirebaseError(error, 'fetchRestaurantById');
    return null;
  }
}

// ============================================
// RESERVATION FUNCTIONS
// ============================================

/**
 * Fetch user's reservations from Firestore
 */
export async function fetchUserReservations(userId: string): Promise<Reservation[]> {
  const cacheKey = `user_reservations_${userId}`;
  const cached = getCachedData<Reservation[]>(cacheKey);
  if (cached) return cached;

  try {
    const reservationsRef = collection(db, 'reservations');
    // Simple query without orderBy to avoid composite index requirement
    const q = query(
      reservationsRef, 
      where('userId', '==', userId)
    );
    console.log('[fetchUserReservations] Executing query for userId:', userId);
    const querySnapshot = await getDocs(q);
    console.log('[fetchUserReservations] Query successful, docs count:', querySnapshot.size);
    
    const reservations: Reservation[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reservations.push({
        id: doc.id,
        userId: data.userId || userId,
        restaurantId: data.restaurantId || '',
        restaurantName: data.restaurantName || '',
        restaurantImage: data.restaurantImage,
        date: data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date,
        time: data.time || '',
        partySize: data.partySize || 2,
        status: data.status || 'pending',
        specialRequests: data.specialRequests,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as Reservation);
    });
    
    // Sort by date in JavaScript (descending - newest first)
    reservations.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    
    setCachedData(cacheKey, reservations);
    return reservations;
  } catch (error) {
    handleFirebaseError(error, 'fetchUserReservations');
    return [];
  }
}

/**
 * Fetch user's reservations with pagination
 */
export async function fetchUserReservationsPaginated(
  userId: string,
  pageSize: number = 10,
  lastDoc?: QueryDocumentSnapshot
): Promise<PaginatedResult<Reservation>> {
  try {
    const reservationsRef = collection(db, 'reservations');
    let q = query(
      reservationsRef,
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(pageSize + 1)
    );
    
    if (lastDoc) {
      q = query(
        reservationsRef,
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        startAfter(lastDoc),
        limit(pageSize + 1)
      );
    }
    
    const querySnapshot = await getDocs(q);
    const reservations: Reservation[] = [];
    const docs = querySnapshot.docs;
    
    const hasMore = docs.length > pageSize;
    const limitedDocs = hasMore ? docs.slice(0, pageSize) : docs;
    
    limitedDocs.forEach((doc) => {
      const data = doc.data();
      reservations.push({
        id: doc.id,
        userId: data.userId || userId,
        restaurantId: data.restaurantId || '',
        restaurantName: data.restaurantName || '',
        restaurantImage: data.restaurantImage,
        date: data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date,
        time: data.time || '',
        partySize: data.partySize || 2,
        status: data.status || 'pending',
        specialRequests: data.specialRequests,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as Reservation);
    });
    
    return {
      data: reservations,
      lastDoc: limitedDocs[limitedDocs.length - 1] || null,
      hasMore
    };
  } catch (error) {
    handleFirebaseError(error, 'fetchUserReservationsPaginated');
    return { data: [], lastDoc: null, hasMore: false };
  }
}

/**
 * Create a new reservation in Firestore
 */
export async function createReservation(reservation: Omit<Reservation, 'id'>): Promise<string | null> {
  try {
    const reservationsRef = collection(db, 'reservations');
    const now = new Date().toISOString();
    
    // Filter out undefined values to avoid Firebase errors
    const cleanedReservation = Object.fromEntries(
      Object.entries(reservation).filter(([, value]) => value !== undefined)
    );
    
    const docRef = await addDoc(reservationsRef, {
      ...cleanedReservation,
      date: reservation.date,
      createdAt: now,
      updatedAt: now,
    });
    
    // Clear cache for this user's reservations
    cache.delete(`user_reservations_${reservation.userId}`);
    
    // Create a confirmation message (optional - only if messages are enabled)
    try {
      const { createMessage } = await import('./firebase-messages');
      await createMessage(
        reservation.userId,
        reservation.restaurantId,
        reservation.restaurantName,
        'Reservation Confirmed',
        `Your reservation for ${reservation.partySize} guest${reservation.partySize !== 1 ? 's' : ''} on ${reservation.date} at ${reservation.time} has been confirmed. We look forward to serving you!`,
        'confirmation',
        {
          restaurantImage: reservation.restaurantImage,
          reservationId: docRef.id,
          priority: 'normal'
        }
      );
      console.log('✅ Confirmation message created for reservation:', docRef.id);
    } catch (msgError) {
      // Don't fail the reservation if message creation fails
      console.warn('⚠️ Could not create confirmation message:', msgError);
    }
    
    return docRef.id;
  } catch (error) {
    handleFirebaseError(error, 'createReservation');
    return null;
  }
}

/**
 * Update a reservation in Firestore
 */
export async function updateReservation(reservationId: string, updates: Partial<Reservation>, userId?: string): Promise<boolean> {
  try {
    const reservationRef = doc(db, 'reservations', reservationId);
    
    // Prepare updates with timestamp
    const updateData = { 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    
    console.log('Updating reservation:', reservationId, 'with data:', updateData);
    await updateDoc(reservationRef, updateData);
    console.log('Reservation updated successfully');
    
    // Clear relevant cache - use provided userId or userId from updates
    const cacheUserId = userId || updates.userId;
    if (cacheUserId) {
      cache.delete(`user_reservations_${cacheUserId}`);
      console.log('Cache cleared for user:', cacheUserId);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating reservation:', error);
    handleFirebaseError(error, 'updateReservation');
    return false;
  }
}

/**
 * Cancel a reservation in Firestore
 */
export async function cancelReservation(reservationId: string, userId: string): Promise<boolean> {
  try {
    const reservationRef = doc(db, 'reservations', reservationId);
    await updateDoc(reservationRef, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
    
    // Clear cache
    cache.delete(`user_reservations_${userId}`);
    
    return true;
  } catch (error) {
    handleFirebaseError(error, 'cancelReservation');
    return false;
  }
}

// ============================================
// EXPERIENCE FUNCTIONS
// ============================================

/**
 * Fetch user's saved experiences from Firestore
 */
export async function fetchUserExperiences(userId: string): Promise<Experience[]> {
  const cacheKey = `user_experiences_${userId}`;
  const cached = getCachedData<Experience[]>(cacheKey);
  if (cached) return cached;

  try {
    const experiencesRef = collection(db, 'experiences');
    const q = query(
      experiencesRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const experiences: Experience[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      experiences.push({
        id: doc.id,
        restaurantId: data.restaurantId || '',
        restaurantName: data.restaurantName || '',
        title: data.title || '',
        description: data.description || '',
        price: data.price || 0,
        duration: data.duration || '',
        images: Array.isArray(data.images) ? data.images : [],
        availableDates: Array.isArray(data.availableDates) ? data.availableDates : [],
        maxPartySize: data.maxPartySize || 2,
        included: Array.isArray(data.included) ? data.included : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      } as Experience);
    });
    
    setCachedData(cacheKey, experiences);
    return experiences;
  } catch (error) {
    handleFirebaseError(error, 'fetchUserExperiences');
    return [];
  }
}

/**
 * Fetch all experiences (public)
 */
export async function fetchAllExperiences(): Promise<Experience[]> {
  const cacheKey = 'all_experiences';
  const cached = getCachedData<Experience[]>(cacheKey);
  if (cached) return cached;

  try {
    const experiencesRef = collection(db, 'experiences');
    const q = query(experiencesRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const experiences: Experience[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      experiences.push({
        id: doc.id,
        restaurantId: data.restaurantId || '',
        restaurantName: data.restaurantName || '',
        title: data.title || '',
        description: data.description || '',
        price: data.price || 0,
        duration: data.duration || '',
        images: Array.isArray(data.images) ? data.images : [],
        availableDates: Array.isArray(data.availableDates) ? data.availableDates : [],
        maxPartySize: data.maxPartySize || 2,
        included: Array.isArray(data.included) ? data.included : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      } as Experience);
    });
    
    setCachedData(cacheKey, experiences);
    return experiences;
  } catch (error) {
    handleFirebaseError(error, 'fetchAllExperiences');
    return [];
  }
}

/**
 * Add restaurant to user's saved experiences
 */
export async function saveExperience(experience: Omit<Experience, 'id'>): Promise<string | null> {
  try {
    const experiencesRef = collection(db, 'experiences');
    const docRef = await addDoc(experiencesRef, {
      ...experience,
      createdAt: new Date().toISOString(),
    });
    
    // Clear cache
    cache.delete('all_experiences');
    
    return docRef.id;
  } catch (error) {
    handleFirebaseError(error, 'saveExperience');
    return null;
  }
}

/**
 * Remove experience from user's saved list
 */
export async function removeExperience(experienceId: string, userId: string): Promise<boolean> {
  try {
    const experienceRef = doc(db, 'experiences', experienceId);
    await deleteDoc(experienceRef);
    
    // Clear cache
    cache.delete(`user_experiences_${userId}`);
    cache.delete('all_experiences');
    
    return true;
  } catch (error) {
    handleFirebaseError(error, 'removeExperience');
    return false;
  }
}

// ============================================
// WAITLIST FUNCTIONS
// ============================================

/**
 * Fetch user's waitlist entries from Firestore
 */
export async function fetchUserWaitlist(userId: string): Promise<WaitlistEntry[]> {
  const cacheKey = `user_waitlist_${userId}`;
  const cached = getCachedData<WaitlistEntry[]>(cacheKey);
  if (cached) return cached;

  try {
    const waitlistRef = collection(db, 'waitlist');
    // Simple query without orderBy to avoid composite index requirement
    const q = query(
      waitlistRef,
      where('userId', '==', userId)
    );
    console.log('[fetchUserWaitlist] Executing query for userId:', userId);
    const querySnapshot = await getDocs(q);
    console.log('[fetchUserWaitlist] Query successful, docs count:', querySnapshot.size);
    
    const waitlist: WaitlistEntry[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      waitlist.push({
        id: doc.id,
        userId: data.userId || userId,
        restaurantId: data.restaurantId || '',
        restaurantName: data.restaurantName || '',
        partySize: data.partySize || 2,
        estimatedWaitTime: data.estimatedWaitTime || 0,
        status: data.status || 'waiting',
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      } as WaitlistEntry);
    });
    
    // Sort by createdAt in JavaScript (descending - newest first)
    waitlist.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
    
    setCachedData(cacheKey, waitlist);
    return waitlist;
  } catch (error) {
    handleFirebaseError(error, 'fetchUserWaitlist');
    return [];
  }
}

/**
 * Join a waitlist
 */
export async function joinWaitlist(waitlistEntry: Omit<WaitlistEntry, 'id'>): Promise<string | null> {
  try {
    const waitlistRef = collection(db, 'waitlist');
    const docRef = await addDoc(waitlistRef, {
      ...waitlistEntry,
      createdAt: new Date().toISOString(),
    });
    
    // Clear cache
    cache.delete(`user_waitlist_${waitlistEntry.userId}`);
    
    return docRef.id;
  } catch (error) {
    handleFirebaseError(error, 'joinWaitlist');
    return null;
  }
}

/**
 * Leave a waitlist
 */
export async function leaveWaitlist(waitlistId: string, userId: string): Promise<boolean> {
  try {
    const waitlistRef = doc(db, 'waitlist', waitlistId);
    await updateDoc(waitlistRef, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
    
    // Clear cache
    cache.delete(`user_waitlist_${userId}`);
    
    return true;
  } catch (error) {
    handleFirebaseError(error, 'leaveWaitlist');
    return false;
  }
}

// ============================================
// SEARCH & FILTER FUNCTIONS
// ============================================

/**
 * Search restaurants by query (client-side filtering)
 */
export async function searchRestaurants(searchQuery: string): Promise<Restaurant[]> {
  try {
    const restaurants = await fetchRestaurants();
    
    if (!searchQuery.trim()) {
      return restaurants;
    }
    
    const searchLower = searchQuery.toLowerCase();
    return restaurants.filter((restaurant) => {
      const cuisineString = Array.isArray(restaurant.cuisine) 
        ? restaurant.cuisine.join(' ').toLowerCase() 
        : '';
      
      return (
        (restaurant.name?.toLowerCase() || '').includes(searchLower) ||
        cuisineString.includes(searchLower) ||
        (restaurant.description?.toLowerCase() || '').includes(searchLower) ||
        (restaurant.city?.toLowerCase() || '').includes(searchLower) ||
        (restaurant.address?.toLowerCase() || '').includes(searchLower)
      );
    });
  } catch (error) {
    handleFirebaseError(error, 'searchRestaurants');
    return [];
  }
}

// ============================================
// FAVORITE RESTAURANTS FUNCTIONS
// ============================================

/**
 * Fetch user's favorite restaurants
 */
export async function fetchFavoriteRestaurants(userId: string): Promise<Restaurant[]> {
  try {
    const profile = await fetchUserProfile(userId);
    if (!profile?.preferences?.favoriteRestaurants || profile.preferences.favoriteRestaurants.length === 0) {
      return [];
    }

    const favoriteIds = profile.preferences.favoriteRestaurants;
    const allRestaurants = await fetchRestaurants();
    
    return allRestaurants.filter(restaurant => favoriteIds.includes(restaurant.id));
  } catch (error) {
    handleFirebaseError(error, 'fetchFavoriteRestaurants');
    return [];
  }
}

/**
 * Add restaurant to user's favorites
 */
export async function addFavoriteRestaurant(userId: string, restaurantId: string): Promise<boolean> {
  try {
    const profile = await fetchUserProfile(userId);
    const currentFavorites = profile?.preferences?.favoriteRestaurants || [];
    
    if (currentFavorites.includes(restaurantId)) {
      return true; // Already in favorites
    }

    const updatedFavorites = [...currentFavorites, restaurantId];
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'preferences.favoriteRestaurants': updatedFavorites,
      updatedAt: new Date().toISOString()
    });
    
    // Clear cache
    cache.delete(`user_profile_${userId}`);
    
    return true;
  } catch (error) {
    handleFirebaseError(error, 'addFavoriteRestaurant');
    return false;
  }
}

/**
 * Remove restaurant from user's favorites
 */
export async function removeFavoriteRestaurant(userId: string, restaurantId: string): Promise<boolean> {
  try {
    const profile = await fetchUserProfile(userId);
    const currentFavorites = profile?.preferences?.favoriteRestaurants || [];
    
    const updatedFavorites = currentFavorites.filter(id => id !== restaurantId);
    
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'preferences.favoriteRestaurants': updatedFavorites,
      updatedAt: new Date().toISOString()
    });
    
    // Clear cache
    cache.delete(`user_profile_${userId}`);
    
    return true;
  } catch (error) {
    handleFirebaseError(error, 'removeFavoriteRestaurant');
    return false;
  }
}

/**
 * Check if restaurant is in user's favorites
 */
export async function isRestaurantFavorite(userId: string, restaurantId: string): Promise<boolean> {
  try {
    const profile = await fetchUserProfile(userId);
    const currentFavorites = profile?.preferences?.favoriteRestaurants || [];
    return currentFavorites.includes(restaurantId);
  } catch (error) {
    handleFirebaseError(error, 'isRestaurantFavorite');
    return false;
  }
}

/**
 * Filter restaurants by cuisine
 * Note: restaurant-owners collection is keyed by userId
 */
export async function fetchRestaurantsByCuisine(cuisine: string): Promise<Restaurant[]> {
  const cacheKey = `restaurants_cuisine_${cuisine}`;
  const cached = getCachedData<Restaurant[]>(cacheKey);
  if (cached) return cached;

  try {
    const restaurantsRef = collection(db, 'restaurant-owners');
    const q = query(restaurantsRef, where('cuisine', 'array-contains', cuisine));
    const querySnapshot = await getDocs(q);
    
    const restaurants: Restaurant[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      restaurants.push({ 
        id: doc.id, // This is the restaurant owner's userId
        ...data,
        cuisine: Array.isArray(data.cuisine) ? data.cuisine : [data.cuisine],
        images: Array.isArray(data.images) ? data.images : [data.images],
      } as Restaurant);
    });
    
    setCachedData(cacheKey, restaurants);
    return restaurants;
  } catch (error) {
    handleFirebaseError(error, 'fetchRestaurantsByCuisine');
    return [];
  }
}

/**
 * Fetch featured/popular restaurants
 */
export async function fetchFeaturedRestaurants(): Promise<Restaurant[]> {
  const cacheKey = 'featured_restaurants';
  const cached = getCachedData<Restaurant[]>(cacheKey);
  if (cached) return cached;

  try {
    const restaurantsRef = collection(db, 'restaurant-owners');
    const q = query(restaurantsRef, where('featured', '==', true), limit(10));
    const querySnapshot = await getDocs(q);
    
    const restaurants: Restaurant[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      restaurants.push({ 
        id: doc.id, 
        ...data,
        name: data.restaurantName || data.name || 'Unknown Restaurant',
        cuisine: data.cuisineType ? [data.cuisineType] : (Array.isArray(data.cuisine) ? data.cuisine : []),
        images: Array.isArray(data.photos) ? data.photos : (Array.isArray(data.images) ? data.images : []),
      } as Restaurant);
    });
    
    // If no featured restaurants, return top-rated ones
    if (restaurants.length === 0) {
      const topRatedQuery = query(restaurantsRef, orderBy('rating', 'desc'), limit(10));
      const topRatedSnapshot = await getDocs(topRatedQuery);
      topRatedSnapshot.forEach((doc) => {
        const data = doc.data();
        restaurants.push({ 
          id: doc.id, 
          ...data,
          name: data.restaurantName || data.name || 'Unknown Restaurant',
          cuisine: data.cuisineType ? [data.cuisineType] : (Array.isArray(data.cuisine) ? data.cuisine : []),
          images: Array.isArray(data.photos) ? data.photos : (Array.isArray(data.images) ? data.images : []),
        } as Restaurant);
      });
    }
    
    setCachedData(cacheKey, restaurants);
    return restaurants;
  } catch (error) {
    handleFirebaseError(error, 'fetchFeaturedRestaurants');
    return [];
  }
}