// Type definitions for environment variables
interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_DATABASE_URL: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// User Profile Interface
export interface UserProfile {
  uid: string;
  email: string;
  username: string; // Unique username for the user
  displayName: string; // Full name
  createdAt: string;
  updatedAt?: string;
  role: 'diner' | 'restaurant' | 'admin';
  photoURL?: string;
  phoneNumber?: string;
  preferences?: {
    cuisine?: string[];
    dietaryRestrictions?: string[];
    priceRange?: number;
    favoriteRestaurants?: string[];
  };
  stats?: {
    totalReservations?: number;
    upcomingReservations?: number;
    cancelledReservations?: number;
    noShowCount?: number;
  };
}

// Reservation Interface
export interface Reservation {
  id: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage?: string;
  date: string;
  time: string;
  partySize: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no-show';
  specialRequests?: string;
  createdAt: string;
  updatedAt?: string;
}

// Restaurant Interface
export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string[];
  priceRange: number; // 1-4 ($-$$$$)
  rating: number;
  reviewCount: number;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  images: string[];
  hours: {
    [key: string]: { open: string; close: string } | 'closed';
  };
  amenities: string[];
  dietaryOptions: string[];
  createdAt: string;
  updatedAt?: string;
}

// Experience Interface
export interface Experience {
  id: string;
  restaurantId: string;
  restaurantName: string;
  title: string;
  description: string;
  price: number;
  duration: string; // e.g., "2 hours"
  images: string[];
  availableDates: string[];
  maxPartySize: number;
  included: string[];
  tags: string[];
  createdAt: string;
}

// Waitlist Entry Interface
export interface WaitlistEntry {
  id: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  partySize: number;
  estimatedWaitTime: number; // in minutes
  status: 'waiting' | 'ready' | 'seated' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
}