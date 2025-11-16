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
import { db } from './firebase';
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
    console.error('Error fetching user profile:', error);
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
    console.error('Error updating user profile:', error);
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
    console.error('Error updating notification settings:', error);
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
    console.error('Error updating dining preferences:', error);
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
    console.error('Error updating payment methods:', error);
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
 */
export async function fetchRestaurantsPaginated(
  pageSize: number = 20,
  lastDoc?: QueryDocumentSnapshot
): Promise<PaginatedResult<Restaurant>> {
  try {
    const restaurantsRef = collection(db, 'restaurants');
    let q = query(restaurantsRef, orderBy('name', 'asc'), limit(pageSize + 1));
    
    if (lastDoc) {
      q = query(restaurantsRef, orderBy('name', 'asc'), startAfter(lastDoc), limit(pageSize + 1));
    }
    
    const querySnapshot = await getDocs(q);
    const restaurants: Restaurant[] = [];
    const docs = querySnapshot.docs;
    
    const hasMore = docs.length > pageSize;
    const limitedDocs = hasMore ? docs.slice(0, pageSize) : docs;
    
    limitedDocs.forEach((doc) => {
      const data = doc.data();
      restaurants.push({ 
        id: doc.id, 
        ...data,
        cuisine: Array.isArray(data.cuisine) ? data.cuisine : [data.cuisine],
        images: Array.isArray(data.images) ? data.images : [data.images],
      } as Restaurant);
    });
    
    return {
      data: restaurants,
      lastDoc: limitedDocs[limitedDocs.length - 1] || null,
      hasMore
    };
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return { data: [], lastDoc: null, hasMore: false };
  }
}

/**
 * Fetch all restaurants from Firestore (with caching)
 */
export async function fetchRestaurants(): Promise<Restaurant[]> {
  const cacheKey = 'all_restaurants';
  const cached = getCachedData<Restaurant[]>(cacheKey);
  if (cached) return cached;

  try {
    const restaurantsRef = collection(db, 'restaurants');
    const q = query(restaurantsRef, orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const restaurants: Restaurant[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      restaurants.push({ 
        id: doc.id, 
        ...data,
        cuisine: Array.isArray(data.cuisine) ? data.cuisine : [data.cuisine],
        images: Array.isArray(data.images) ? data.images : [data.images],
      } as Restaurant);
    });
    
    setCachedData(cacheKey, restaurants);
    return restaurants;
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return [];
  }
}

/**
 * Fetch a single restaurant by ID
 */
export async function fetchRestaurantById(restaurantId: string): Promise<Restaurant | null> {
  const cacheKey = `restaurant_${restaurantId}`;
  const cached = getCachedData<Restaurant>(cacheKey);
  if (cached) return cached;

  try {
    const restaurantDoc = await getDoc(doc(db, 'restaurants', restaurantId));
    if (restaurantDoc.exists()) {
      const data = restaurantDoc.data();
      const restaurant = { 
        id: restaurantDoc.id, 
        ...data,
        cuisine: Array.isArray(data.cuisine) ? data.cuisine : [data.cuisine],
        images: Array.isArray(data.images) ? data.images : [data.images],
      } as Restaurant;
      setCachedData(cacheKey, restaurant);
      return restaurant;
    }
    return null;
  } catch (error) {
    console.error('Error fetching restaurant:', error);
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
    console.error('Error fetching reservations:', error);
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
    console.error('Error fetching reservations:', error);
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
    const docRef = await addDoc(reservationsRef, {
      ...reservation,
      date: reservation.date,
      createdAt: now,
      updatedAt: now,
    });
    
    // Clear cache for this user's reservations
    cache.delete(`user_reservations_${reservation.userId}`);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating reservation:', error);
    return null;
  }
}

/**
 * Update a reservation in Firestore
 */
export async function updateReservation(reservationId: string, updates: Partial<Reservation>): Promise<boolean> {
  try {
    const reservationRef = doc(db, 'reservations', reservationId);
    await updateDoc(reservationRef, { ...updates, updatedAt: new Date().toISOString() });
    
    // Clear relevant cache
    if (updates.userId) {
      cache.delete(`user_reservations_${updates.userId}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating reservation:', error);
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
    console.error('Error cancelling reservation:', error);
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
    console.error('Error fetching experiences:', error);
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
    console.error('Error fetching experiences:', error);
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
    console.error('Error saving experience:', error);
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
    console.error('Error removing experience:', error);
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
    console.error('Error fetching waitlist:', error);
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
    console.error('Error joining waitlist:', error);
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
    console.error('Error leaving waitlist:', error);
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
    console.error('Error searching restaurants:', error);
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
    console.error('Error fetching favorite restaurants:', error);
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
    console.error('Error adding favorite restaurant:', error);
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
    console.error('Error removing favorite restaurant:', error);
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
    console.error('Error checking favorite status:', error);
    return false;
  }
}

/**
 * Filter restaurants by cuisine
 */
export async function fetchRestaurantsByCuisine(cuisine: string): Promise<Restaurant[]> {
  const cacheKey = `restaurants_cuisine_${cuisine}`;
  const cached = getCachedData<Restaurant[]>(cacheKey);
  if (cached) return cached;

  try {
    const restaurantsRef = collection(db, 'restaurants');
    const q = query(restaurantsRef, where('cuisine', 'array-contains', cuisine));
    const querySnapshot = await getDocs(q);
    
    const restaurants: Restaurant[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      restaurants.push({ 
        id: doc.id, 
        ...data,
        cuisine: Array.isArray(data.cuisine) ? data.cuisine : [data.cuisine],
        images: Array.isArray(data.images) ? data.images : [data.images],
      } as Restaurant);
    });
    
    setCachedData(cacheKey, restaurants);
    return restaurants;
  } catch (error) {
    console.error('Error fetching restaurants by cuisine:', error);
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
    const restaurantsRef = collection(db, 'restaurants');
    const q = query(restaurantsRef, where('featured', '==', true), limit(10));
    const querySnapshot = await getDocs(q);
    
    const restaurants: Restaurant[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      restaurants.push({ 
        id: doc.id, 
        ...data,
        cuisine: Array.isArray(data.cuisine) ? data.cuisine : [data.cuisine],
        images: Array.isArray(data.images) ? data.images : [data.images],
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
          cuisine: Array.isArray(data.cuisine) ? data.cuisine : [data.cuisine],
          images: Array.isArray(data.images) ? data.images : [data.images],
        } as Restaurant);
      });
    }
    
    setCachedData(cacheKey, restaurants);
    return restaurants;
  } catch (error) {
    console.error('Error fetching featured restaurants:', error);
    return [];
  }
}