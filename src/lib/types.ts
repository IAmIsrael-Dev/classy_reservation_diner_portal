// Payment Method Interface
export interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  expiry: string;
  isDefault: boolean;
}

// Notification Settings Interface
export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  reservationReminders: boolean;
  waitlistUpdates: boolean;
  promotions: boolean;
}

// Dining Preferences Interface
export interface DiningPreferences {
  favoriteCuisines: string[];
  dietaryRestrictions: string[];
  spiceLevel: string;
  seatingPreference: string;
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
  // New settings fields
  notificationSettings?: NotificationSettings;
  diningPreferences?: DiningPreferences;
  paymentMethods?: PaymentMethod[];
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

// Message Interface
export interface Message {
  id: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage?: string;
  subject: string;
  message: string;
  timestamp: string;
  read: boolean;
  reservationId?: string;
  type: 'confirmation' | 'reminder' | 'update' | 'cancellation' | 'general' | 'special_offer';
  priority?: 'low' | 'normal' | 'high';
}