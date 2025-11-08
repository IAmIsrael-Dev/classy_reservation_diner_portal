import type { UserProfile, Reservation, Restaurant, Experience, WaitlistEntry } from './types';

/**
 * Demo user profile for testing
 */
export const demoUserProfile: UserProfile = {
  uid: 'demo-user-123',
  email: 'diner@demo.com',
  username: 'demo_diner',
  displayName: 'John Doe',
  createdAt: '2024-01-15T10:00:00.000Z',
  role: 'diner',
  photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
  phoneNumber: '+1 (555) 123-4567',
  preferences: {
    cuisine: ['Italian', 'Japanese', 'French'],
    dietaryRestrictions: ['Vegetarian Options Preferred'],
    priceRange: 3,
    favoriteRestaurants: ['rest-1', 'rest-3', 'rest-5']
  },
  stats: {
    totalReservations: 24,
    upcomingReservations: 3,
    cancelledReservations: 2,
    noShowCount: 0
  }
};

/**
 * Demo reservations for testing
 */
export const demoReservations: Reservation[] = [
  {
    id: 'res-1',
    userId: 'demo-user-123',
    restaurantId: 'rest-1',
    restaurantName: 'The Italian Kitchen',
    restaurantImage: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400',
    date: '2024-11-15',
    time: '19:00',
    partySize: 2,
    status: 'confirmed',
    specialRequests: 'Window seat preferred',
    createdAt: '2024-11-08T14:30:00.000Z'
  },
  {
    id: 'res-2',
    userId: 'demo-user-123',
    restaurantId: 'rest-3',
    restaurantName: 'Sakura Sushi Bar',
    restaurantImage: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400',
    date: '2024-11-20',
    time: '20:30',
    partySize: 4,
    status: 'confirmed',
    createdAt: '2024-11-05T09:15:00.000Z'
  },
  {
    id: 'res-3',
    userId: 'demo-user-123',
    restaurantId: 'rest-5',
    restaurantName: 'Le Petit Bistro',
    restaurantImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
    date: '2024-11-25',
    time: '18:30',
    partySize: 2,
    status: 'pending',
    specialRequests: 'Anniversary dinner',
    createdAt: '2024-11-07T16:45:00.000Z'
  },
  {
    id: 'res-4',
    userId: 'demo-user-123',
    restaurantId: 'rest-2',
    restaurantName: 'Steakhouse Prime',
    restaurantImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400',
    date: '2024-10-28',
    time: '19:30',
    partySize: 3,
    status: 'completed',
    createdAt: '2024-10-20T11:20:00.000Z'
  },
  {
    id: 'res-5',
    userId: 'demo-user-123',
    restaurantId: 'rest-4',
    restaurantName: 'Spice Route',
    restaurantImage: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400',
    date: '2024-10-15',
    time: '20:00',
    partySize: 2,
    status: 'completed',
    createdAt: '2024-10-10T13:30:00.000Z'
  }
];

/**
 * Demo restaurants for testing
 */
export const demoRestaurants: Restaurant[] = [
  {
    id: 'rest-1',
    name: 'The Italian Kitchen',
    description: 'Authentic Italian cuisine in an elegant setting. Experience traditional recipes passed down through generations.',
    cuisine: ['Italian', 'Mediterranean'],
    priceRange: 3,
    rating: 4.8,
    reviewCount: 342,
    address: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    phone: '(415) 555-0101',
    email: 'info@italiankitchen.com',
    website: 'https://italiankitchen.com',
    images: [
      'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'
    ],
    hours: {
      monday: { open: '17:00', close: '22:00' },
      tuesday: { open: '17:00', close: '22:00' },
      wednesday: { open: '17:00', close: '22:00' },
      thursday: { open: '17:00', close: '22:00' },
      friday: { open: '17:00', close: '23:00' },
      saturday: { open: '17:00', close: '23:00' },
      sunday: 'closed'
    },
    amenities: ['Outdoor Seating', 'Private Dining', 'Full Bar', 'Valet Parking'],
    dietaryOptions: ['Vegetarian', 'Gluten-Free', 'Vegan Options'],
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'rest-2',
    name: 'Steakhouse Prime',
    description: 'Premium cuts and fine wines in a sophisticated atmosphere. USDA Prime beef aged to perfection.',
    cuisine: ['Steakhouse', 'American'],
    priceRange: 4,
    rating: 4.7,
    reviewCount: 521,
    address: '456 Market Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    phone: '(415) 555-0102',
    email: 'reservations@steakhouseprime.com',
    website: 'https://steakhouseprime.com',
    images: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800'
    ],
    hours: {
      monday: { open: '17:00', close: '22:30' },
      tuesday: { open: '17:00', close: '22:30' },
      wednesday: { open: '17:00', close: '22:30' },
      thursday: { open: '17:00', close: '22:30' },
      friday: { open: '17:00', close: '23:30' },
      saturday: { open: '17:00', close: '23:30' },
      sunday: { open: '17:00', close: '22:00' }
    },
    amenities: ['Private Dining', 'Wine Cellar', 'Full Bar', 'Sommelier'],
    dietaryOptions: ['Gluten-Free Options'],
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'rest-3',
    name: 'Sakura Sushi Bar',
    description: 'Traditional Japanese sushi and sashimi crafted by master chefs. Fresh fish delivered daily.',
    cuisine: ['Japanese', 'Sushi'],
    priceRange: 3,
    rating: 4.9,
    reviewCount: 287,
    address: '789 Geary Boulevard',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94109',
    phone: '(415) 555-0103',
    email: 'info@sakurasushibar.com',
    images: [
      'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
      'https://images.unsplash.com/photo-1583623025817-d180a2221d0a?w=800'
    ],
    hours: {
      monday: 'closed',
      tuesday: { open: '17:30', close: '22:00' },
      wednesday: { open: '17:30', close: '22:00' },
      thursday: { open: '17:30', close: '22:00' },
      friday: { open: '17:30', close: '23:00' },
      saturday: { open: '17:30', close: '23:00' },
      sunday: { open: '17:30', close: '22:00' }
    },
    amenities: ['Sushi Bar Seating', 'Private Rooms', 'Sake Selection'],
    dietaryOptions: ['Vegetarian', 'Gluten-Free'],
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'rest-4',
    name: 'Spice Route',
    description: 'Contemporary Indian cuisine with bold flavors and artistic presentations.',
    cuisine: ['Indian', 'Asian Fusion'],
    priceRange: 2,
    rating: 4.6,
    reviewCount: 198,
    address: '321 Valencia Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94103',
    phone: '(415) 555-0104',
    email: 'hello@spiceroute.com',
    images: [
      'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800',
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800'
    ],
    hours: {
      monday: { open: '11:30', close: '14:30' },
      tuesday: { open: '11:30', close: '14:30' },
      wednesday: { open: '11:30', close: '14:30' },
      thursday: { open: '11:30', close: '14:30' },
      friday: { open: '11:30', close: '22:00' },
      saturday: { open: '11:30', close: '22:00' },
      sunday: { open: '11:30', close: '21:00' }
    },
    amenities: ['Lunch Service', 'Takeout', 'Delivery'],
    dietaryOptions: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal'],
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'rest-5',
    name: 'Le Petit Bistro',
    description: 'Charming French bistro serving classic dishes with a modern twist.',
    cuisine: ['French', 'European'],
    priceRange: 3,
    rating: 4.7,
    reviewCount: 412,
    address: '567 Hayes Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    phone: '(415) 555-0105',
    email: 'contact@lepetitbistro.com',
    website: 'https://lepetitbistro.com',
    images: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
      'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800'
    ],
    hours: {
      monday: 'closed',
      tuesday: { open: '17:00', close: '22:00' },
      wednesday: { open: '17:00', close: '22:00' },
      thursday: { open: '17:00', close: '22:00' },
      friday: { open: '17:00', close: '23:00' },
      saturday: { open: '10:00', close: '23:00' },
      sunday: { open: '10:00', close: '22:00' }
    },
    amenities: ['Brunch', 'Outdoor Seating', 'Wine Bar', 'Happy Hour'],
    dietaryOptions: ['Vegetarian', 'Gluten-Free Options'],
    createdAt: '2024-01-01T00:00:00.000Z'
  }
];

/**
 * Demo experiences for testing
 */
export const demoExperiences: Experience[] = [
  {
    id: 'exp-1',
    restaurantId: 'rest-1',
    restaurantName: 'The Italian Kitchen',
    title: 'Chef\'s Table Experience',
    description: 'An exclusive 7-course tasting menu with wine pairings, served at our chef\'s table with a view into the kitchen.',
    price: 185,
    duration: '3 hours',
    images: [
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
      'https://images.unsplash.com/photo-1515669097368-22e68cb41346?w=800'
    ],
    availableDates: ['2024-11-15', '2024-11-22', '2024-11-29'],
    maxPartySize: 6,
    included: [
      '7-course tasting menu',
      'Wine pairings',
      'Meet the chef',
      'Kitchen tour',
      'Recipe cards'
    ],
    tags: ['Fine Dining', 'Chef\'s Table', 'Wine Pairing'],
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'exp-2',
    restaurantId: 'rest-3',
    restaurantName: 'Sakura Sushi Bar',
    title: 'Omakase Experience',
    description: 'Trust the chef to create a personalized sushi journey with the freshest seasonal ingredients.',
    price: 150,
    duration: '2 hours',
    images: [
      'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
      'https://images.unsplash.com/photo-1563612116625-3012372fccce?w=800'
    ],
    availableDates: ['2024-11-16', '2024-11-23', '2024-11-30'],
    maxPartySize: 8,
    included: [
      '12-15 pieces of sushi',
      'Seasonal sashimi',
      'Miso soup',
      'Japanese tea',
      'Chef interaction'
    ],
    tags: ['Omakase', 'Sushi', 'Japanese'],
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'exp-3',
    restaurantId: 'rest-5',
    restaurantName: 'Le Petit Bistro',
    title: 'French Wine Dinner',
    description: 'A curated evening featuring classic French dishes paired with exceptional wines from Burgundy and Bordeaux.',
    price: 125,
    duration: '2.5 hours',
    images: [
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800',
      'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800'
    ],
    availableDates: ['2024-11-18', '2024-11-25'],
    maxPartySize: 20,
    included: [
      '4-course dinner',
      '5 wine pairings',
      'Sommelier presentation',
      'Wine tasting notes',
      'French cheese selection'
    ],
    tags: ['Wine Dinner', 'French Cuisine', 'Group Event'],
    createdAt: '2024-01-01T00:00:00.000Z'
  }
];

/**
 * Demo waitlist entries for testing
 */
export const demoWaitlistEntries: WaitlistEntry[] = [
  {
    id: 'wait-1',
    userId: 'demo-user-123',
    restaurantId: 'rest-2',
    restaurantName: 'Steakhouse Prime',
    partySize: 2,
    estimatedWaitTime: 25,
    status: 'waiting',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 minutes ago
  }
];

/**
 * Get all demo data for a user
 */
export function getDemoData() {
  return {
    profile: demoUserProfile,
    reservations: demoReservations,
    restaurants: demoRestaurants,
    experiences: demoExperiences,
    waitlist: demoWaitlistEntries
  };
}
