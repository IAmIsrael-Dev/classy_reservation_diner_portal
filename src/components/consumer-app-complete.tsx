import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { toast } from 'sonner';
import { getDemoData, demoUserProfile } from '../lib/demo-data';
import { signOutUser, uploadProfilePicture } from '../lib/firebase-auth';
import { 
  fetchRestaurants, 
  fetchUserReservations, 
  fetchAllExperiences,
  fetchUserWaitlist,
  fetchUserProfile,
  updateUserProfile,
  updateNotificationSettings,
  updateDiningPreferences,
  updatePaymentMethods,
  fetchFavoriteRestaurants,
  addFavoriteRestaurant,
  removeFavoriteRestaurant,
  createReservation,
  updateReservation,
  cancelReservation
} from '../lib/firebase-data';
import { ConversationsList } from './conversations-list';
import { ChatPopup } from './chat-popup';
import { getOrCreateConversation } from '../lib/firebase-conversations';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile, Conversation, Experience } from '../lib/types';
import { getUserRecommendations, type AIRecommendation as FirebaseAIRecommendation } from '../lib/firebase-recommendations';
import {
  Search,
  MapPin,
  Star,
  Clock,
  Users,
  Calendar as CalendarIcon,
  ChevronRight,
  Heart,
  Utensils,
  Wine,
  Award,
  History,
  Settings,
  Check,
  User,
  CreditCard,
  Bell,
  LogOut,
  Edit,
  Sparkles,
  Gift,
  Timer,
  Plus,
  Save,
  X,
  Trash2,
  Lock,
  Mail,
  Smartphone,
  Shield,
  MessageSquare,
} from 'lucide-react';

// ===== TYPES =====
// Local mock restaurant interface for demo UI (different from Firebase Restaurant type)
interface MockRestaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviews: number;
  priceLevel: number;
  distance: string;
  image: string;
  description: string;
  address: string;
  hours: string;
  features: string[];
  availableSlots: string[];
  aiScore?: number;
  aiReason?: string;
  experiences?: MockExperience[];
  ambiance?: {
    noiseLevel: 'Quiet' | 'Moderate' | 'Lively';
    lighting: 'Dim' | 'Ambient' | 'Bright';
    vibe: string[];
  };
  dietary?: string[];
  waitlistAvailable?: boolean;
  currentWaitTime?: number;
}

interface MockExperience {
  id: string;
  name: string;
  description: string;
  price: number;
  capacity: number; // Maximum number of participants
  bookedCount?: number; // Current number of bookings
  icon?: string;
  includes?: string[];
  restaurantId: string;
  restaurantName: string;
  restaurantImage?: string;
  date?: string;
  time?: string;
  duration?: string;
  availableSlots?: string[];
  status?: 'active' | 'inactive' | 'full';
}

interface MockWaitlistEntry {
  id: string;
  restaurantName: string;
  restaurantImage: string;
  position: number;
  totalWaiting: number;
  estimatedWait: number;
  partySize: number;
  notifyReady: boolean;
}

interface MockReservation {
  id: string;
  userId: string;
  restaurantName: string;
  restaurantId: string;
  restaurantImage: string;
  restaurantAddress?: string;
  date: string;
  time: string;
  partySize: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no-show';
  type: 'table' | 'experience'; // Distinguishes table reservations from experience bookings
  experienceId?: string; // Reference to Experience if type is 'experience'
  experienceTitle?: string; // Cached experience title for quick display
  tableId?: string; // Reference to table if type is 'table'
  confirmationCode?: string;
  experience?: string; // Legacy field for backwards compatibility
  pointsEarned?: number;
  specialRequests?: string;
  createdAt?: string;
}

// Type for hours object from Firebase
type HoursObject = {
  [key: string]: { open: string; close: string } | 'closed';
};

// Type for hours - can be string or object
type Hours = string | HoursObject | undefined;

// Type for Consumer App views
export type ConsumerAppView = 'discover' | 'all-restaurants' | 'restaurant-details' | 'experiences' | 'reservations' | 'waitlist' | 'messages' | 'profile';

// Type for Consumer App props
export interface ConsumerAppProps {
  activeView?: ConsumerAppView;
  onViewChange?: (view: ConsumerAppView) => void;
  isDemoMode?: boolean;
  currentUser?: FirebaseUser | null;
  userProfile?: UserProfile | null;
}

// Type for Firebase Restaurant with partial fields
interface FirebaseRestaurantData {
  id: string;
  name: string;
  description?: string;
  cuisine?: string | string[];
  priceRange?: number;
  rating?: number;
  reviewCount?: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  images?: string[];
  imageUrl?: string;
  image?: string;
  hours?: Hours;
  amenities?: string[];
  features?: string[];
  dietaryOptions?: string[];
  dietary?: string[];
  distance?: string;
  availableSlots?: string[];
  ambiance?: {
    noiseLevel?: 'Quiet' | 'Moderate' | 'Lively';
    lighting?: 'Dim' | 'Ambient' | 'Bright';
    vibe?: string[];
  };
  createdAt?: string;
  updatedAt?: string;
}

// ===== UTILITY FUNCTIONS =====
// Helper to convert hours object to string
const formatHoursToString = (hours: Hours): string => {
  // If already a string, return it
  if (typeof hours === 'string') {
    return hours;
  }
  
  // If it's an object, format it
  if (hours && typeof hours === 'object') {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayHours = hours[today];
    
    if (todayHours) {
      if (todayHours === 'closed') {
        return 'Closed today';
      }
      
      if (typeof todayHours === 'object' && todayHours.open && todayHours.close) {
        // Format time from 24h to 12h format
        const formatTime = (time: string) => {
          const [hourStr, minuteStr] = time.split(':');
          const hour = parseInt(hourStr);
          const minute = minuteStr || '00';
          const period = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
          return `${displayHour}:${minute} ${period}`;
        };
        
        return `${formatTime(todayHours.open)} - ${formatTime(todayHours.close)}`;
      }
    }
  }
  
  return 'Hours vary';
};

// Transform Firebase Restaurant to MockRestaurant with display fields
const transformToMockRestaurant = (firebaseRestaurant: FirebaseRestaurantData): MockRestaurant => {
  // Format hours from Firebase format to display string
  const hoursString = formatHoursToString(firebaseRestaurant.hours);

  return {
    id: firebaseRestaurant.id,
    name: firebaseRestaurant.name,
    cuisine: Array.isArray(firebaseRestaurant.cuisine) 
      ? firebaseRestaurant.cuisine.join(', ') 
      : (firebaseRestaurant.cuisine || 'Various'),
    rating: firebaseRestaurant.rating || 4.5,
    reviews: firebaseRestaurant.reviewCount || 0,
    priceLevel: firebaseRestaurant.priceRange || 2,
    distance: '1.2 mi', // Default distance - could be calculated from user location
    image: Array.isArray(firebaseRestaurant.images) && firebaseRestaurant.images.length > 0
      ? firebaseRestaurant.images[0]
      : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    description: firebaseRestaurant.description || '',
    address: firebaseRestaurant.address || '',
    hours: hoursString,
    features: firebaseRestaurant.amenities || [],
    availableSlots: ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'],
    dietary: firebaseRestaurant.dietaryOptions || [],
    ambiance: {
      noiseLevel: 'Moderate' as const,
      lighting: 'Ambient' as const,
      vibe: ['Casual', 'Modern']
    },
    experiences: [],
    waitlistAvailable: false,
    currentWaitTime: 0
  };
};

// Transform Firebase Experience to MockExperience with display fields
const transformToMockExperience = (firebaseExperience: Experience): MockExperience => {
  return {
    id: firebaseExperience.id,
    name: firebaseExperience.title,
    description: firebaseExperience.description,
    price: firebaseExperience.price,
    capacity: firebaseExperience.capacity,
    bookedCount: firebaseExperience.bookedCount || 0,
    duration: firebaseExperience.duration,
    time: firebaseExperience.time,
    status: firebaseExperience.status || 'active',
    includes: firebaseExperience.included,
    restaurantId: firebaseExperience.restaurantId,
    restaurantName: firebaseExperience.restaurantName,
    restaurantImage: Array.isArray(firebaseExperience.images) && firebaseExperience.images.length > 0
      ? firebaseExperience.images[0]
      : undefined,
    date: firebaseExperience.date || (Array.isArray(firebaseExperience.availableDates) && firebaseExperience.availableDates.length > 0
      ? firebaseExperience.availableDates[0]
      : undefined),
    availableSlots: firebaseExperience.availableDates,
  };
};

// ===== MOCK DATA =====
const mockExperiences: MockExperience[] = [
  {
    id: 'exp1',
    name: 'Wine Pairing Experience',
    description: 'Sommelier-curated wine pairing with each course',
    price: 75,
    capacity: 12,
    bookedCount: 8,
    duration: '2.5 hours',
    icon: '🍷',
    includes: ['5 wine selections', 'Sommelier consultation', 'Pairing notes'],
    restaurantId: '1',
    restaurantName: 'Bella Vista',
    restaurantImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    date: 'Saturday, Jan 25, 2026',
    time: '7:00 PM',
    availableSlots: ['6:00 PM', '6:30 PM', '7:00 PM', '8:00 PM'],
    status: 'active',
  },
  {
    id: 'exp2',
    name: "Chef's Table",
    description: 'Exclusive tasting menu prepared tableside by the head chef',
    price: 150,
    capacity: 6,
    bookedCount: 3,
    duration: '3 hours',
    icon: '👨‍🍳',
    includes: ['8-course tasting menu', 'Chef interaction', 'Kitchen tour', 'Recipe card'],
    restaurantId: '2',
    restaurantName: 'Sakura House',
    restaurantImage: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=800&h=600&fit=crop',
    date: 'Friday, Jan 24, 2026',
    time: '6:00 PM',
    availableSlots: ['6:00 PM', '7:00 PM', '8:00 PM'],
    status: 'active',
  },
  {
    id: 'exp3',
    name: 'Celebration Package',
    description: 'Perfect for birthdays and anniversaries',
    price: 50,
    capacity: 20,
    bookedCount: 5,
    duration: '2 hours',
    icon: '🎉',
    includes: ['Champagne toast', 'Dessert upgrade', 'Personalized card', 'Polaroid photo'],
    restaurantId: '1',
    restaurantName: 'Bella Vista',
    restaurantImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    date: 'Sunday, Jan 26, 2026',
    time: '6:00 PM',
    availableSlots: ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'],
    status: 'active',
  },
  {
    id: 'exp4',
    name: 'Cocktail Masterclass',
    description: 'Learn to craft signature cocktails before dinner',
    price: 45,
    capacity: 10,
    bookedCount: 10,
    duration: '1.5 hours',
    icon: '🍸',
    includes: ['3 cocktails', 'Recipe cards', 'Bar tools', 'Appetizer plate'],
    restaurantId: '4',
    restaurantName: 'Fusion Kitchen',
    restaurantImage: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=600&fit=crop',
    date: 'Wednesday, Jan 22, 2026',
    time: '5:30 PM',
    availableSlots: ['5:00 PM', '5:30 PM', '6:00 PM', '7:00 PM'],
    status: 'full',
  },
  {
    id: 'exp5',
    name: 'Truffle Tasting Menu',
    description: 'Five-course menu featuring seasonal truffles',
    price: 120,
    capacity: 16,
    bookedCount: 12,
    duration: '2.5 hours',
    icon: '🍄',
    includes: ['5 courses', 'Truffle shavings', 'Wine pairing', 'Truffle butter to take home'],
    restaurantId: '5',
    restaurantName: 'Le Jardin',
    restaurantImage: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&h=600&fit=crop',
    date: 'Tuesday, Feb 3, 2026',
    time: '6:30 PM',
    availableSlots: ['6:00 PM', '6:30 PM', '8:00 PM'],
    status: 'active',
  },
];

const mockRestaurants: MockRestaurant[] = [
  {
    id: '1',
    name: 'Bella Vista',
    cuisine: 'Italian',
    rating: 4.8,
    reviews: 324,
    priceLevel: 3,
    distance: '0.8 mi',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    description: 'Upscale Italian dining with panoramic city views and house-made pasta.',
    address: '123 Main Street, Downtown',
    hours: 'Mon-Sun: 5:00 PM - 11:00 PM',
    features: ['Fine Dining', 'Wine Bar', 'Outdoor Seating', 'Private Events'],
    availableSlots: ['5:00 PM', '5:30 PM', '7:00 PM', '7:30 PM', '9:00 PM'],
    aiScore: 95,
    aiReason: 'Perfect match for romantic Italian dining. You loved their pasta last visit!',
    experiences: mockExperiences.filter(e => e.restaurantId === '1'),
    ambiance: {
      noiseLevel: 'Moderate',
      lighting: 'Dim',
      vibe: ['Romantic', 'Upscale', 'Date Night'],
    },
    dietary: ['Vegetarian Options', 'Gluten-Free Available'],
    waitlistAvailable: true,
    currentWaitTime: 25,
  },
  {
    id: '2',
    name: 'Sakura House',
    cuisine: 'Japanese',
    rating: 4.9,
    reviews: 512,
    priceLevel: 4,
    distance: '1.2 mi',
    image: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=800&h=600&fit=crop',
    description: 'Traditional Japanese cuisine with an omakase experience by master chefs.',
    address: '456 Oak Avenue, Midtown',
    hours: 'Tue-Sat: 6:00 PM - 10:00 PM',
    features: ['Omakase', 'Sushi Bar', 'Sake Selection', "Chef's Table"],
    availableSlots: ['6:00 PM', '6:30 PM', '8:00 PM', '8:30 PM'],
    aiScore: 88,
    aiReason: 'Matches your preference for high-end sushi experiences',
    experiences: mockExperiences.filter(e => e.restaurantId === '2'),
    ambiance: {
      noiseLevel: 'Quiet',
      lighting: 'Ambient',
      vibe: ['Intimate', 'Authentic', 'Chef-Driven'],
    },
    dietary: ['Pescatarian', 'Gluten-Free Available'],
    waitlistAvailable: false,
  },
  {
    id: '3',
    name: 'The Steakhouse',
    cuisine: 'Steakhouse',
    rating: 4.7,
    reviews: 289,
    priceLevel: 4,
    distance: '0.5 mi',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
    description: 'Prime cuts and classic sides in an elegant, timeless setting.',
    address: '789 Elm Street, Financial District',
    hours: 'Mon-Sun: 5:00 PM - 12:00 AM',
    features: ['Premium Cuts', 'Wine Cellar', 'Private Dining', 'Live Music'],
    availableSlots: ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'],
    aiScore: 82,
    aiReason: 'Great for business dinners based on your history',
    experiences: [],
    ambiance: {
      noiseLevel: 'Lively',
      lighting: 'Ambient',
      vibe: ['Classic', 'Business', 'Celebration'],
    },
    dietary: ['Limited Vegetarian'],
    waitlistAvailable: true,
    currentWaitTime: 35,
  },
  {
    id: '4',
    name: 'Fusion Kitchen',
    cuisine: 'Asian Fusion',
    rating: 4.6,
    reviews: 198,
    priceLevel: 2,
    distance: '1.5 mi',
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=600&fit=crop',
    description: 'Modern Asian fusion with creative cocktails and shareable plates.',
    address: '321 Pine Street, Arts District',
    hours: 'Mon-Sun: 11:00 AM - 11:00 PM',
    features: ['Craft Cocktails', 'Happy Hour', 'Rooftop Bar', 'Late Night'],
    availableSlots: ['5:30 PM', '6:00 PM', '7:30 PM', '8:00 PM', '9:30 PM'],
    aiScore: 75,
    aiReason: 'Trendy spot for casual group dining',
    experiences: mockExperiences.filter(e => e.restaurantId === '4'),
    ambiance: {
      noiseLevel: 'Lively',
      lighting: 'Bright',
      vibe: ['Trendy', 'Social', 'Casual'],
    },
    dietary: ['Vegan Options', 'Vegetarian Options'],
    waitlistAvailable: true,
    currentWaitTime: 15,
  },
  {
    id: '5',
    name: 'Le Jardin',
    cuisine: 'French',
    rating: 4.9,
    reviews: 445,
    priceLevel: 4,
    distance: '2.1 mi',
    image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&h=600&fit=crop',
    description: 'Classic French cuisine in a romantic garden setting with seasonal menu.',
    address: '567 Maple Drive, West End',
    hours: 'Wed-Sun: 6:00 PM - 10:00 PM',
    features: ['French Cuisine', 'Wine Pairing', 'Garden Dining', 'Prix Fixe'],
    availableSlots: ['6:00 PM', '6:30 PM', '8:00 PM', '8:30 PM'],
    aiScore: 92,
    aiReason: 'Your anniversary is coming up - perfect romantic spot!',
    experiences: mockExperiences.filter(e => e.restaurantId === '5'),
    ambiance: {
      noiseLevel: 'Quiet',
      lighting: 'Dim',
      vibe: ['Romantic', 'Garden', 'Special Occasion'],
    },
    dietary: ['Vegetarian Options', 'Gluten-Free Available'],
    waitlistAvailable: false,
  },
];

// ===== COMPONENTS =====

// Experience Card (for Experiences tab)
interface ExperienceCardProps {
  experience: MockExperience;
  onBook: () => void;
}

const ExperienceCard = ({ experience, onBook }: ExperienceCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="overflow-hidden bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-all cursor-pointer"
        onClick={onBook}
      >
        <div className="relative h-48">
          <img
            src={experience.restaurantImage || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&h=600&fit=crop'}
            alt={experience.restaurantName}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 right-3">
            <Badge className="bg-purple-500/90 text-white border-0">
              Experience
            </Badge>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            {experience.icon && <div className="text-2xl mb-1">{experience.icon}</div>}
            <div className="text-white text-sm">{experience.restaurantName}</div>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between">
            <h3 className="text-lg text-slate-100">{experience.name}</h3>
            <div className="text-cyan-400">+${experience.price}</div>
          </div>
          
          <p className="text-sm text-slate-400">{experience.description}</p>
          
          <div className="space-y-1">
            {experience.includes?.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-500">
                <Check className="w-3 h-3 text-green-400" />
                {item}
              </div>
            ))}
          </div>

          <div className="pt-2">
            {experience.date && (
              <div className="text-xs text-slate-500 mb-2">Available: {experience.date}</div>
            )}
            <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              Book Experience
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// Waitlist Card
interface WaitlistCardProps {
  entry: MockWaitlistEntry;
  onLeave: () => void;
}

const WaitlistCard = ({ entry, onLeave }: WaitlistCardProps) => {
  const progress = ((entry.totalWaiting - entry.position + 1) / entry.totalWaiting) * 100;

  return (
    <Card className="p-5 bg-slate-800/50 border-slate-700">
      <div className="flex gap-4">
        <div className="relative w-24 h-24 flex-shrink-0">
          <img
            src={entry.restaurantImage}
            alt={entry.restaurantName}
            className="w-full h-full object-cover rounded-lg"
          />
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="text-lg text-slate-100 mb-1">{entry.restaurantName}</h4>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Users className="w-4 h-4" />
                Party of {entry.partySize}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onLeave} className="border-slate-600">
              Leave
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-slate-400">Position in queue</span>
                <span className="text-cyan-400 font-mono">#{entry.position} of {entry.totalWaiting}</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-900/50 rounded">
                <div className="text-xs text-slate-400 mb-1">Estimated Wait</div>
                <div className="text-xl text-slate-100 flex items-center gap-1">
                  <Timer className="w-5 h-5 text-cyan-400" />
                  {entry.estimatedWait} min
                </div>
              </div>
              <div className="p-3 bg-slate-900/50 rounded">
                <div className="text-xs text-slate-400 mb-1">Notifications</div>
                <div className="text-sm text-slate-100 flex items-center gap-2 mt-1">
                  <Switch checked={entry.notifyReady} />
                  <span className="text-xs">{entry.notifyReady ? 'ON' : 'OFF'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

// Main Component
export function ConsumerApp({ 
  activeView: externalActiveView,
  onViewChange,
  isDemoMode = false,
  currentUser
}: ConsumerAppProps = {}) {
  const [activeView, setActiveView] = useState<ConsumerAppView>(externalActiveView || 'discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [committedSearchQuery, setCommittedSearchQuery] = useState(''); // Search query committed by button click
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [partySize, setPartySize] = useState('2');
  const [selectedRestaurant, setSelectedRestaurant] = useState<MockRestaurant | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedExperience, setSelectedExperience] = useState<MockExperience | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_bookingStep, setBookingStep] = useState<'time' | 'experience' | 'confirm'>('time');
  const [reservationTime, setReservationTime] = useState('');
  const [reservationExperience, setReservationExperience] = useState<string | null>(null);
  const [modifyingReservation, setModifyingReservation] = useState<MockReservation | null>(null);
  const [bookingType, setBookingType] = useState<'table' | 'experience'>('table'); // Type of booking
  const [selectedExperienceForBooking, setSelectedExperienceForBooking] = useState<MockExperience | null>(null);
  
  // Data loading states
  const [restaurants, setRestaurants] = useState<MockRestaurant[]>([]);
  const [reservations, setReservations] = useState<MockReservation[]>([]);
  const [experiences, setExperiences] = useState<MockExperience[]>([]);
  const [waitlist, setWaitlist] = useState<MockWaitlistEntry[]>([]);
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<MockRestaurant[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<FirebaseAIRecommendation[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [isLoadingExperiences, setIsLoadingExperiences] = useState(false);
  const [isLoadingWaitlist, setIsLoadingWaitlist] = useState(false);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  
  // Restaurant details dialog state
  const [viewingRestaurantDetails, setViewingRestaurantDetails] = useState(false);
  const [restaurantDetailsView, setRestaurantDetailsView] = useState<MockRestaurant | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [quickReservationDialog, setQuickReservationDialog] = useState(false);
  const [quickReservationRestaurant, setQuickReservationRestaurant] = useState<MockRestaurant | null>(null);
  const [quickReservationDate, setQuickReservationDate] = useState<Date>(new Date());
  const [quickReservationTime, setQuickReservationTime] = useState('');
  const [quickReservationPartySize, setQuickReservationPartySize] = useState('2');

  // Profile states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [selectedProfilePicture, setSelectedProfilePicture] = useState<File | null>(null);
  const [photoPreviewURL, setPhotoPreviewURL] = useState<string | null>(null);

  // Settings dialog states
  const [openSettingsDialog, setOpenSettingsDialog] = useState<'personal' | 'payment' | 'dining' | 'notifications' | 'privacy' | null>(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCard, setNewCard] = useState({
    cardNumber: '',
    cardName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    type: 'Visa' as 'Visa' | 'Mastercard' | 'Amex' | 'Discover',
    isDefault: false
  });

  // Conversation states
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isChatPopupOpen, setIsChatPopupOpen] = useState(false);
  const [reservationToCancel, setReservationToCancel] = useState<string | null>(null);
  
  // Settings data states
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    sms: true,
    push: true,
    reservationReminders: true,
    waitlistUpdates: true,
    promotions: false,
  });
  
  const [diningPreferences, setDiningPreferences] = useState({
    favoriteCuisines: ['Italian', 'Japanese'],
    dietaryRestrictions: ['Vegetarian'],
    spiceLevel: 'Medium',
    seatingPreference: 'Window',
  });
  
  const [paymentMethods, setPaymentMethods] = useState([
    { id: '1', type: 'Visa', last4: '4242', expiry: '12/25', isDefault: true },
    { id: '2', type: 'Mastercard', last4: '8888', expiry: '08/26', isDefault: false },
  ]);

  // Load data on mount - either from demo or Firebase
  useEffect(() => {
    if (isDemoMode) {
      // Load demo data
      const demoData = getDemoData();
      // Transform demo restaurants to ensure hours are strings
      const transformedDemoRestaurants = demoData.restaurants.map(transformToMockRestaurant);
      const transformedDemoExperiences = demoData.experiences.map(transformToMockExperience);
      setRestaurants(transformedDemoRestaurants);
      setReservations(demoData.reservations as unknown as MockReservation[]);
      setExperiences(transformedDemoExperiences);
      setWaitlist(demoData.waitlist as unknown as MockWaitlistEntry[]);
      setProfile(demoUserProfile);
    } else {
      // Load real data from Firebase
      loadFirebaseData();
    }
  }, [isDemoMode, currentUser]);

  // Load Firebase data
  const loadFirebaseData = async () => {
    if (!currentUser) return;

    // Fetch restaurants
    setIsLoadingRestaurants(true);
    try {
      const restaurantsData = await fetchRestaurants();
      // Transform Firebase restaurants to MockRestaurant format with all display fields
      const transformedRestaurants = restaurantsData.map(transformToMockRestaurant);
      setRestaurants(transformedRestaurants);
    } catch (error) {
      console.error('Error loading restaurants:', error);
      setRestaurants([]); // Set empty array on error
      toast.error('Failed to load restaurants');
    } finally {
      setIsLoadingRestaurants(false);
    }

    // Fetch user's reservations
    setIsLoadingReservations(true);
    try {
      const reservationsData = await fetchUserReservations(currentUser.uid);
      setReservations(reservationsData as unknown as MockReservation[]);
    } catch (error) {
      console.error('Error loading reservations:', error);
      toast.error('Failed to load reservations');
    } finally {
      setIsLoadingReservations(false);
    }

    // Fetch all experiences (public)
    setIsLoadingExperiences(true);
    try {
      const experiencesData = await fetchAllExperiences();
      const transformedExperiences = experiencesData.map(transformToMockExperience);
      setExperiences(transformedExperiences);
    } catch (error) {
      console.error('Error loading experiences:', error);
      toast.error('Failed to load experiences');
    } finally {
      setIsLoadingExperiences(false);
    }

    // Fetch user's waitlist
    setIsLoadingWaitlist(true);
    try {
      const waitlistData = await fetchUserWaitlist(currentUser.uid);
      setWaitlist(waitlistData as unknown as MockWaitlistEntry[]);
    } catch (error) {
      console.error('Error loading waitlist:', error);
      toast.error('Failed to load waitlist');
    } finally {
      setIsLoadingWaitlist(false);
    }

    // Fetch user profile
    setIsLoadingProfile(true);
    try {
      const profileData = await fetchUserProfile(currentUser.uid);
      setProfile(profileData);
      
      // Load settings from profile if they exist
      if (profileData) {
        if (profileData.notificationSettings) {
          setNotificationSettings(profileData.notificationSettings);
        }
        if (profileData.diningPreferences) {
          setDiningPreferences(profileData.diningPreferences);
        }
        if (profileData.paymentMethods) {
          setPaymentMethods(profileData.paymentMethods);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }

    // Fetch user's favorite restaurants
    setIsLoadingFavorites(true);
    try {
      const favoritesData = await fetchFavoriteRestaurants(currentUser.uid);
      const transformedFavorites = favoritesData.map(transformToMockRestaurant);
      setFavoriteRestaurants(transformedFavorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoadingFavorites(false);
    }

    // Fetch AI recommendations
    setIsLoadingRecommendations(true);
    try {
      const recommendationsData = await getUserRecommendations(currentUser.uid);
      setAiRecommendations(recommendationsData);
    } catch (error) {
      console.error('Error loading AI recommendations:', error);
      setAiRecommendations([]); // Set empty array on error
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Settings save handlers
  const handleSaveNotificationSettings = async () => {
    if (!isDemoMode && currentUser) {
      const success = await updateNotificationSettings(currentUser.uid, notificationSettings);
      if (success) {
        toast.success('Notification settings saved');
      } else {
        toast.error('Failed to save notification settings');
        return;
      }
    } else {
      toast.success('Notification settings saved (demo mode)');
    }
    setOpenSettingsDialog(null);
  };

  const handleSaveDiningPreferences = async () => {
    if (!isDemoMode && currentUser) {
      const success = await updateDiningPreferences(currentUser.uid, diningPreferences);
      if (success) {
        toast.success('Dining preferences updated');
      } else {
        toast.error('Failed to update dining preferences');
        return;
      }
    } else {
      toast.success('Dining preferences updated (demo mode)');
    }
    setOpenSettingsDialog(null);
  };

  const handleRemovePaymentMethod = async (cardId: string) => {
    const updatedMethods = paymentMethods.filter(c => c.id !== cardId);
    setPaymentMethods(updatedMethods);
    
    if (!isDemoMode && currentUser) {
      const success = await updatePaymentMethods(currentUser.uid, updatedMethods);
      if (success) {
        toast.success('Card removed');
      } else {
        toast.error('Failed to remove card');
        // Revert on failure
        setPaymentMethods(paymentMethods);
      }
    } else {
      toast.success('Card removed (demo mode)');
    }
  };

  const handleAddPaymentMethod = async () => {
    // Validate inputs
    if (!newCard.cardNumber || !newCard.cardName || !newCard.expiryMonth || !newCard.expiryYear || !newCard.cvv) {
      toast.error('Please fill in all card details');
      return;
    }

    // Validate card number (basic check - should be 13-19 digits)
    const cardNumberClean = newCard.cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(cardNumberClean)) {
      toast.error('Invalid card number');
      return;
    }

    // Validate CVV (3 or 4 digits)
    if (!/^\d{3,4}$/.test(newCard.cvv)) {
      toast.error('Invalid CVV');
      return;
    }

    // Validate expiry
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const expYear = parseInt(newCard.expiryYear);
    const expMonth = parseInt(newCard.expiryMonth);
    
    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      toast.error('Card has expired');
      return;
    }

    // Create new payment method
    const newPaymentMethod = {
      id: Date.now().toString(),
      type: newCard.type,
      last4: cardNumberClean.slice(-4),
      expiry: `${newCard.expiryMonth}/${newCard.expiryYear.slice(-2)}`,
      isDefault: newCard.isDefault || paymentMethods.length === 0
    };

    const updatedMethods = [...paymentMethods, newPaymentMethod];
    
    // If this card is set as default, unset other defaults
    if (newPaymentMethod.isDefault) {
      updatedMethods.forEach(method => {
        if (method.id !== newPaymentMethod.id) {
          method.isDefault = false;
        }
      });
    }

    setPaymentMethods(updatedMethods);
    
    if (!isDemoMode && currentUser) {
      const success = await updatePaymentMethods(currentUser.uid, updatedMethods);
      if (success) {
        toast.success('Card added successfully');
        setIsAddingCard(false);
        setNewCard({
          cardNumber: '',
          cardName: '',
          expiryMonth: '',
          expiryYear: '',
          cvv: '',
          type: 'Visa',
          isDefault: false
        });
      } else {
        toast.error('Failed to add card');
        // Revert on failure
        setPaymentMethods(paymentMethods);
      }
    } else {
      toast.success('Card added (demo mode)');
      setIsAddingCard(false);
      setNewCard({
        cardNumber: '',
        cardName: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        type: 'Visa',
        isDefault: false
      });
    }
  };

  // Update activeView when external prop changes
  useEffect(() => {
    if (externalActiveView) {
      setActiveView(externalActiveView);
    }
  }, [externalActiveView]);

  // Handle view change
  const handleViewChange = (view: ConsumerAppView) => {
    setActiveView(view);
    if (onViewChange) {
      onViewChange(view);
    }
  };

  // Filter restaurants based on committed search (only when button is clicked)
  const filteredRestaurants = restaurants.filter(restaurant =>
    (restaurant?.name?.toLowerCase() || '').includes(committedSearchQuery.toLowerCase()) ||
    (restaurant?.cuisine?.toLowerCase() || '').includes(committedSearchQuery.toLowerCase()) ||
    (restaurant?.description?.toLowerCase() || '').includes(committedSearchQuery.toLowerCase())
  );

  // Filter experiences based on committed search (only when button is clicked)
  const filteredExperiences = experiences.filter(exp =>
    (exp?.name?.toLowerCase() || '').includes(committedSearchQuery.toLowerCase()) ||
    (exp?.description?.toLowerCase() || '').includes(committedSearchQuery.toLowerCase()) ||
    (exp?.restaurantName?.toLowerCase() || '').includes(committedSearchQuery.toLowerCase())
  );

  const handleBookRestaurant = async (restaurant: MockRestaurant) => {
    // Open quick reservation dialog
    setQuickReservationRestaurant(restaurant);
    setQuickReservationDialog(true);
    setQuickReservationDate(new Date());
    setQuickReservationTime('');
    setQuickReservationPartySize('2');
  };

  const handleToggleFavorite = async () => {
    if (!currentUser || !selectedRestaurant) return;
    
    if (isFavorite) {
      const success = await removeFavoriteRestaurant(currentUser.uid, selectedRestaurant.id);
      if (success) {
        setIsFavorite(false);
        toast.success('Removed from favorites');
        // Refresh favorites list
        const favoritesData = await fetchFavoriteRestaurants(currentUser.uid);
        const transformedFavorites = favoritesData.map(transformToMockRestaurant);
        setFavoriteRestaurants(transformedFavorites);
      } else {
        toast.error('Failed to remove from favorites');
      }
    } else {
      const success = await addFavoriteRestaurant(currentUser.uid, selectedRestaurant.id);
      if (success) {
        setIsFavorite(true);
        toast.success('Added to favorites');
        // Refresh favorites list
        const favoritesData = await fetchFavoriteRestaurants(currentUser.uid);
        const transformedFavorites = favoritesData.map(transformToMockRestaurant);
        setFavoriteRestaurants(transformedFavorites);
      } else {
        toast.error('Failed to add to favorites');
      }
    }
  };

  const handleBookExperience = (experience: MockExperience) => {
    const restaurant = (restaurants.length > 0 ? restaurants : mockRestaurants).find(r => r.id === experience.restaurantId);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      setSelectedExperience(experience);
      setSelectedExperienceForBooking(experience); // Set the selected experience for booking
      setReservationExperience(experience.name);
      setViewingRestaurantDetails(true);
      setSelectedDate(new Date()); // Reset to today for new bookings
      setBookingStep('time');
      setBookingType('experience'); // Set booking type to experience
      setReservationTime(''); // Clear table reservation time
    }
  };

  const handleCompleteBooking = async () => {
    // Validation based on booking type
    if (bookingType === 'table' && (!selectedRestaurant || !reservationTime)) return;
    if (bookingType === 'experience' && (!selectedRestaurant || !selectedExperienceForBooking)) return;

    // Create reservation in Firebase
    if (!isDemoMode && currentUser) {
      const reservationData = bookingType === 'experience' && selectedExperienceForBooking
        ? {
            // Experience booking
            userId: currentUser.uid,
            restaurantId: selectedRestaurant!.id,
            restaurantName: selectedRestaurant!.name,
            restaurantImage: selectedRestaurant!.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
            date: selectedExperienceForBooking.date || new Date().toISOString(),
            time: selectedExperienceForBooking.time || '6:00 PM',
            partySize: 1, // Experience bookings are typically per person
            status: 'confirmed' as const,
            type: 'experience' as const,
            experienceId: selectedExperienceForBooking.id,
            experienceTitle: selectedExperienceForBooking.name,
            specialRequests: `Experience: ${selectedExperienceForBooking.name}`,
            createdAt: new Date().toISOString(),
          }
        : {
            // Table reservation
            userId: currentUser.uid,
            restaurantId: selectedRestaurant!.id,
            restaurantName: selectedRestaurant!.name,
            restaurantImage: selectedRestaurant!.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
            date: selectedDate.toISOString(),
            time: reservationTime,
            partySize: parseInt(partySize),
            status: 'confirmed' as const,
            type: 'table' as const,
            ...(reservationExperience && { specialRequests: reservationExperience }),
            createdAt: new Date().toISOString(),
          };

      const reservationId = await createReservation(reservationData);
      
      if (reservationId) {
        if (bookingType === 'experience' && selectedExperienceForBooking) {
          toast.success(
            <div>
              <div className="font-bold">Experience Booked!</div>
              <div className="text-sm">
                {selectedExperienceForBooking.name} at {selectedRestaurant!.name}
              </div>
            </div>
          );
        } else {
          toast.success(
            <div>
              <div className="font-bold">Reservation Confirmed!</div>
              <div className="text-sm">
                {selectedRestaurant!.name} - {reservationTime}
                {reservationExperience && ` with ${reservationExperience}`}
              </div>
            </div>
          );
        }
        
        // Refresh reservations list
        const reservationsData = await fetchUserReservations(currentUser.uid);
        setReservations(reservationsData as unknown as MockReservation[]);
      } else {
        toast.error('Failed to create reservation');
        return;
      }
    } else {
      // Demo mode - just show success toast
      if (bookingType === 'experience' && selectedExperienceForBooking) {
        toast.success(
          <div>
            <div className="font-bold">Experience Booked! (Demo Mode)</div>
            <div className="text-sm">
              {selectedExperienceForBooking.name} at {selectedRestaurant!.name}
            </div>
          </div>
        );
      } else {
        toast.success(
          <div>
            <div className="font-bold">Reservation Confirmed! (Demo Mode)</div>
            <div className="text-sm">
              {selectedRestaurant!.name} - {reservationTime}
              {reservationExperience && ` with ${reservationExperience}`}
            </div>
          </div>
        );
      }
    }

    setSelectedRestaurant(null);
    setSelectedExperience(null);
    setReservationTime('');
    setReservationExperience(null);
    setBookingType('table');
    setSelectedExperienceForBooking(null);
    setViewingRestaurantDetails(false);
  };

  const handleQuickReservationConfirm = async () => {
    if (!quickReservationRestaurant || !quickReservationTime) return;

    // Create reservation in Firebase
    if (!isDemoMode && currentUser) {
      const reservationData = {
        userId: currentUser.uid,
        restaurantId: quickReservationRestaurant.id,
        restaurantName: quickReservationRestaurant.name,
        restaurantImage: quickReservationRestaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
        date: quickReservationDate.toISOString(),
        time: quickReservationTime,
        partySize: parseInt(quickReservationPartySize),
        status: 'confirmed' as const,
        type: 'table' as const,
        createdAt: new Date().toISOString(),
      };

      const reservationId = await createReservation(reservationData);
      
      if (reservationId) {
        toast.success(
          <div>
            <div className="font-bold">Reservation Confirmed!</div>
            <div className="text-sm">
              {quickReservationRestaurant.name} - {quickReservationTime}
            </div>
          </div>
        );
        
        // Refresh reservations list
        const reservationsData = await fetchUserReservations(currentUser.uid);
        setReservations(reservationsData as unknown as MockReservation[]);
      } else {
        toast.error('Failed to create reservation');
        return;
      }
    } else {
      // Demo mode - just show success toast
      toast.success(
        <div>
          <div className="font-bold">Reservation Confirmed! (Demo Mode)</div>
          <div className="text-sm">
            {quickReservationRestaurant.name} - {quickReservationTime}
          </div>
        </div>
      );
    }

    // Close dialog and reset
    setQuickReservationDialog(false);
    setQuickReservationRestaurant(null);
    setQuickReservationTime('');
    setQuickReservationDate(new Date());
    setQuickReservationPartySize('2');
  };

  const handleModifyReservation = (reservation: MockReservation) => {
    const restaurant = (restaurants.length > 0 ? restaurants : mockRestaurants).find(r => r.id === reservation.restaurantId);
    if (restaurant) {
      setModifyingReservation(reservation);
      setSelectedRestaurant(restaurant);
      setReservationTime(reservation.time);
      setPartySize(reservation.partySize.toString());
      // Parse and set the date from the reservation
      try {
        const reservationDate = new Date(reservation.date);
        setSelectedDate(reservationDate);
      } catch {
        setSelectedDate(new Date()); // Fallback to today if date parsing fails
      }
      setBookingStep('time');
    }
  };

  const handleMessageRestaurant = async (reservation: MockReservation) => {
    if (isDemoMode) {
      toast.error('Messaging is not available in demo mode. Please sign in to message restaurants.');
      return;
    }

    if (!currentUser) {
      toast.error('Please sign in to message restaurants');
      return;
    }

    try {
      // Get or create conversation for this reservation
      const conversationId = await getOrCreateConversation(
        currentUser.uid,
        reservation.restaurantId,
        reservation.id
      );

      // Fetch the conversation details
      const conversations = await import('../lib/firebase-conversations').then(m => m.getUserConversations(currentUser.uid));
      const conversation = conversations.find(c => c.id === conversationId);

      if (conversation) {
        // Enrich conversation with restaurant details from the reservation
        const enrichedConversation = {
          ...conversation,
          restaurantName: reservation.restaurantName,
          restaurantImage: reservation.restaurantImage,
          reservationDate: reservation.date,
          reservationTime: reservation.time
        };
        
        setSelectedConversation(enrichedConversation);
        setIsChatPopupOpen(true); // Open chat popup with the conversation
        toast.success('Opening conversation with ' + reservation.restaurantName);
      } else {
        toast.error('Failed to open conversation');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    }
  };



  const handleSaveModification = async () => {
    if (!modifyingReservation) return;

    if (isDemoMode) {
      // Demo mode - update local state
      setReservations(reservations.map(r => 
        r.id === modifyingReservation.id 
          ? { ...r, date: selectedDate.toLocaleDateString(), time: reservationTime, partySize: Number(partySize) }
          : r
      ));
      toast.success('Reservation updated successfully!');
    } else if (currentUser) {
      // Firebase mode - update reservation in Firebase
      const formattedDate = selectedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const success = await updateReservation(
        modifyingReservation.id, 
        {
          date: formattedDate,
          time: reservationTime,
          partySize: Number(partySize)
        },
        currentUser.uid // Pass userId to ensure cache is cleared
      );

      if (success) {
        toast.success('Reservation updated successfully!');
        // Refresh reservations list
        const updatedReservations = await fetchUserReservations(currentUser.uid);
        setReservations(updatedReservations as unknown as MockReservation[]);
      } else {
        toast.error('Failed to update reservation');
      }
    }

    setModifyingReservation(null);
    setSelectedRestaurant(null);
    setReservationTime('');
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (isDemoMode) {
      setReservations(reservations.filter(r => r.id !== reservationId));
      toast.success('Reservation cancelled');
      setReservationToCancel(null);
    } else if (currentUser) {
      // Firebase mode - cancel reservation
      const success = await cancelReservation(reservationId, currentUser.uid);
      
      if (success) {
        toast.success('Reservation cancelled');
        // Refresh reservations list
        const updatedReservations = await fetchUserReservations(currentUser.uid);
        setReservations(updatedReservations as unknown as MockReservation[]);
      } else {
        toast.error('Failed to cancel reservation');
      }
      setReservationToCancel(null);
    }
  };

  const handleJoinWaitlist = (restaurant: MockRestaurant) => {
    toast.success(`Added to waitlist at ${restaurant.name}`);
  };

  const handleLeaveWaitlist = (entryId: string) => {
    // TODO: Implement Firebase waitlist removal with entryId
    void entryId; // Currently unused but will be used for Firebase integration
    toast.info('Removed from waitlist');
  };

  // Profile editing handlers
  const handleEditProfile = () => {
    if (profile) {
      setEditedProfile({
        displayName: profile.displayName,
        username: profile.username,
        phoneNumber: profile.phoneNumber,
        diningPreferences: profile.diningPreferences,
        notificationSettings: profile.notificationSettings,
      });
      // Also update local dining preferences state
      if (profile.diningPreferences) {
        setDiningPreferences(profile.diningPreferences);
      }
      if (profile.notificationSettings) {
        setNotificationSettings(profile.notificationSettings);
      }
      setIsEditingProfile(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    if (isDemoMode) {
      // Demo mode: just update local state
      setProfile({ ...profile, ...editedProfile });
      toast.success('Profile updated successfully!');
      setIsEditingProfile(false);
      setSelectedProfilePicture(null);
      setPhotoPreviewURL(null);
    } else if (currentUser) {
      try {
        const profileUpdates = { ...editedProfile };

        // Remove photoURL from editedProfile if it's a base64 string (shouldn't happen now, but safety check)
        if (profileUpdates.photoURL && profileUpdates.photoURL.startsWith('data:')) {
          delete profileUpdates.photoURL;
        }

        // If there's a new profile picture, upload it first
        let photoUploadFailed = false;
        if (selectedProfilePicture) {
          try {
            toast.info('Uploading profile picture...');
            const photoURL = await uploadProfilePicture(currentUser.uid, selectedProfilePicture);
            profileUpdates.photoURL = photoURL;
          } catch (uploadError) {
            photoUploadFailed = true;
            console.error('Photo upload failed, continuing with profile update:', uploadError);
            
            // Check if it's a storage permission error
            if (uploadError instanceof Error && uploadError.message === 'STORAGE_PERMISSION_DENIED') {
              toast.error('Photo upload failed: Firebase Storage permissions not configured. Profile will be saved without photo.', {
                duration: 6000
              });
              console.warn('💡 TIP: Configure Firebase Storage rules to enable photo uploads.');
              console.warn('📄 See FIREBASE_STORAGE_RULES.md for instructions.');
            } else {
              toast.error('Photo upload failed. Profile will be saved without photo.');
            }
          }
        }

        // Add dining preferences and notification settings to profile updates
        profileUpdates.diningPreferences = diningPreferences;
        profileUpdates.notificationSettings = notificationSettings;

        // Update profile in Firebase (even if photo upload failed)
        const success = await updateUserProfile(currentUser.uid, profileUpdates);
        if (success) {
          // Reload profile data
          const updated = await fetchUserProfile(currentUser.uid);
          setProfile(updated);
          
          if (photoUploadFailed) {
            toast.success('Profile updated (without photo)');
          } else {
            toast.success('Profile updated successfully!');
          }
          
          setIsEditingProfile(false);
          setSelectedProfilePicture(null);
          setPhotoPreviewURL(null);
        } else {
          toast.error('Failed to update profile');
        }
      } catch (error) {
        console.error('Error saving profile:', error);
        
        // Show specific error message
        const errorMessage = error instanceof Error ? error.message : 'Failed to save profile';
        toast.error(errorMessage);
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditedProfile({});
    setSelectedProfilePicture(null);
    setPhotoPreviewURL(null);
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await signOutUser();
      toast.success('Signed out successfully');
      // The auth state listener will handle the UI update
    } catch (error) {
      toast.error('Failed to sign out');
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-6 py-6 max-w-7xl">
        {/* RESTAURANTS VIEW */}
        {activeView === 'discover' && (
          <motion.div
            key="discover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Hero Search Section */}
            <div className="text-center space-y-4 py-8">
              <h1 className="text-4xl text-slate-100">
                Reserve a Table at Top Restaurants
              </h1>
              <p className="text-lg text-slate-400">
                Browse and book tables at the best dining spots
              </p>
            </div>

            {/* AI Recommendations - MOVED TO TOP */}
            <div>
              <h2 className="text-2xl text-slate-100 mb-4">AI Concierge Recommendations</h2>
              {isLoadingRecommendations ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                </div>
              ) : aiRecommendations.length === 0 ? (
                <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h3 className="text-slate-200 mb-2">No Recommendations Yet</h3>
                  <p className="text-slate-400 text-sm">
                    Make your first reservation to start receiving personalized AI recommendations based on your dining preferences and history.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiRecommendations.map((rec) => (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Card className="p-5 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-cyan-500/30 hover:border-cyan-500/50 transition-all cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl" />
                        <div className="relative">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 mb-1">
                                  AI Recommended
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-slate-400">Confidence</div>
                              <div className="text-sm text-cyan-400">{rec.confidence}%</div>
                            </div>
                          </div>
                          <h3 className="text-lg text-slate-100 mb-2">{rec.title}</h3>
                          <p className="text-sm text-slate-400 mb-4">{rec.description}</p>
                          <Button 
                            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                            onClick={() => {
                              if (rec.type === 'experience') {
                                setActiveView('experiences');
                              } else if (rec.restaurantId) {
                                // Find restaurant by ID and open booking
                                const restaurant = restaurants.find(r => r.id === rec.restaurantId);
                                if (restaurant) {
                                  handleBookRestaurant(restaurant);
                                }
                              }
                            }}
                          >
                            {rec.action}
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Restaurant Listings */}
            <div data-section="restaurants">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl text-slate-100">Available Restaurants</h2>
                <Button
                  variant="ghost"
                  className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                  onClick={() => setActiveView('all-restaurants')}
                >
                  See All Restaurants
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              {isLoadingRestaurants ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">Loading restaurants...</p>
                </div>
              ) : restaurants.length === 0 ? (
                <Card className="p-12 bg-slate-800/50 border-slate-700 text-center">
                  <Utensils className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl text-slate-300 mb-2">No Restaurants Available</h3>
                  <p className="text-slate-500">
                    No restaurants are available at the moment. Please check back later.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {restaurants.map(restaurant => (
                  <motion.div
                    key={restaurant.id}
                    whileHover={{ scale: 1.02 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="overflow-hidden bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-all">
                      <div className="relative h-48">
                        <img
                          src={restaurant.image}
                          alt={restaurant.name}
                          className="w-full h-full object-cover"
                        />
                        {restaurant.aiScore && restaurant.aiScore > 85 && (
                          <div className="absolute top-3 right-3">
                            <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI Match {restaurant.aiScore}%
                            </Badge>
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <Badge variant="secondary" className="bg-slate-900/80 backdrop-blur-sm">
                            {restaurant.distance}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-5 space-y-3">
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg text-slate-100">{restaurant.name}</h3>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm text-slate-100">{restaurant.rating}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <span>{restaurant.cuisine}</span>
                            <span>•</span>
                            <span>{'$'.repeat(restaurant.priceLevel)}</span>
                            <span>•</span>
                            <span>{restaurant.reviews} reviews</span>
                          </div>
                        </div>

                        {restaurant.aiReason && (
                          <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded text-xs text-cyan-300">
                            ✨ {restaurant.aiReason}
                          </div>
                        )}

                        {restaurant.ambiance && restaurant.ambiance.vibe && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {restaurant.ambiance.vibe.slice(0, 3).map((v, i) => (
                              <Badge key={i} variant="outline" className="text-xs border-slate-700">
                                {v}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          <Button 
                            className="w-full bg-cyan-600 hover:bg-cyan-700"
                            onClick={() => {
                              setRestaurantDetailsView(restaurant);
                              setActiveView('restaurant-details');
                            }}
                          >
                            View Details
                          </Button>
                          <div className="flex items-center gap-2">
                            <Button 
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                              onClick={() => {
                                setQuickReservationRestaurant(restaurant);
                                setQuickReservationDialog(true);
                                setQuickReservationDate(new Date());
                                setQuickReservationTime('');
                                setQuickReservationPartySize('2');
                              }}
                            >
                              <CalendarIcon className="w-4 h-4 mr-1" />
                              Make Reservation
                            </Button>
                            {restaurant.waitlistAvailable && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="border-slate-700"
                                onClick={() => handleJoinWaitlist(restaurant)}
                              >
                                <Timer className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* EXPERIENCES VIEW */}
        {activeView === 'experiences' && (
          <motion.div
            key="experiences"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="text-center space-y-4 py-8">
              <h1 className="text-4xl text-slate-100">
                Exclusive Dining Experiences
              </h1>
              <p className="text-lg text-slate-400">
                Curated special events and unique culinary adventures
              </p>
            </div>

            {/* Search */}
            <Card className="p-6 bg-slate-800/50 border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  placeholder="Search experiences..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-slate-100"
                />
              </div>
            </Card>

            {/* Experience Grid */}
            {isLoadingExperiences ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Loading experiences...</p>
              </div>
            ) : filteredExperiences.length === 0 ? (
              <Card className="p-12 bg-slate-800/50 border-slate-700 text-center">
                <Sparkles className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl text-slate-300 mb-2">No Experiences Available</h3>
                <p className="text-slate-500 mb-6">
                  {committedSearchQuery ? 
                    `No experiences found matching "${committedSearchQuery}". Try a different search.` : 
                    'No dining experiences are available at the moment. Explore restaurants to discover unique dining opportunities.'}
                </p>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleViewChange('discover')}
                >
                  Discover Restaurants
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredExperiences.map(experience => (
                  <ExperienceCard
                    key={experience.id}
                    experience={experience}
                    onBook={() => handleBookExperience(experience)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ALL RESTAURANTS VIEW */}
        {activeView === 'all-restaurants' && (
          <motion.div
            key="all-restaurants"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl text-slate-100 mb-2">
                  All Restaurants
                </h1>
                <p className="text-lg text-slate-400">
                  Browse our complete collection of dining spots
                </p>
              </div>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => setActiveView('discover')}
              >
                <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                Back to Discover
              </Button>
            </div>

            {/* Enhanced Search Bar */}
            <Card className="p-6 bg-slate-800/50 border-slate-700">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Search */}
                  <div className="md:col-span-2">
                    <Label className="text-slate-300 mb-2 block">Search Restaurants</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <Input
                        placeholder="Search by name, cuisine, or location..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-700 border-slate-600 text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Sort By */}
                  <div>
                    <Label className="text-slate-300 mb-2 block">Sort By</Label>
                    <Select defaultValue="rating">
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="rating">Highest Rated</SelectItem>
                        <SelectItem value="reviews">Most Reviews</SelectItem>
                        <SelectItem value="distance">Nearest</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 group"
                  onClick={() => {
                    setCommittedSearchQuery(searchQuery);
                    toast.success('Search applied', {
                      description: searchQuery ? `Searching for "${searchQuery}"` : 'Showing all restaurants',
                      duration: 2000
                    });
                  }}
                >
                  <Search className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="tracking-wide">Search Restaurants</span>
                </Button>
              </div>
            </Card>

            {/* Restaurant Grid */}
            {isLoadingRestaurants ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              </div>
            ) : filteredRestaurants.length === 0 ? (
              <Card className="p-12 bg-slate-800/50 border-slate-700 text-center">
                <Utensils className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl text-slate-300 mb-2">No Restaurants Found</h3>
                <p className="text-slate-500 mb-6">
                  {committedSearchQuery ? 
                    `No restaurants found matching "${committedSearchQuery}". Try a different search.` : 
                    'No restaurants are available at the moment. Please check back later.'}
                </p>
                {committedSearchQuery && (
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setSearchQuery('');
                      setCommittedSearchQuery('');
                    }}
                  >
                    Clear Search
                  </Button>
                )}
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm text-slate-400 pb-2 border-b border-slate-700">
                  <span>{filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'restaurant' : 'restaurants'} found</span>
                  {committedSearchQuery && (
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="text-cyan-400 hover:text-cyan-300"
                      onClick={() => {
                        setSearchQuery('');
                        setCommittedSearchQuery('');
                      }}
                    >
                      Clear Search
                      <X className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRestaurants.map(restaurant => (
                    <motion.div
                      key={restaurant.id}
                      whileHover={{ scale: 1.02 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="overflow-hidden bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-all">
                        <div className="relative h-48">
                          <img
                            src={restaurant.image}
                            alt={restaurant.name}
                            className="w-full h-full object-cover"
                          />
                          {restaurant.aiScore && restaurant.aiScore > 85 && (
                            <div className="absolute top-3 right-3">
                              <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0">
                                <Sparkles className="w-3 h-3 mr-1" />
                                AI Match {restaurant.aiScore}%
                              </Badge>
                            </div>
                          )}
                          <div className="absolute top-3 left-3">
                            <Badge variant="secondary" className="bg-slate-900/80 backdrop-blur-sm">
                              {restaurant.distance}
                            </Badge>
                          </div>
                        </div>

                        <div className="p-5 space-y-3">
                          <div>
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-lg text-slate-100">{restaurant.name}</h3>
                              <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="text-sm text-slate-100">{restaurant.rating}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                              <span>{restaurant.cuisine}</span>
                              <span>•</span>
                              <span>{'$'.repeat(restaurant.priceLevel)}</span>
                              <span>•</span>
                              <span>{restaurant.reviews} reviews</span>
                            </div>
                          </div>

                          {restaurant.aiReason && (
                            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded text-xs text-cyan-300">
                              ✨ {restaurant.aiReason}
                            </div>
                          )}

                          {restaurant.ambiance && restaurant.ambiance.vibe && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {restaurant.ambiance.vibe.slice(0, 3).map((v, i) => (
                                <Badge key={i} variant="outline" className="text-xs border-slate-700">
                                  {v}
                                </Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-col gap-2">
                            <Button 
                              className="w-full bg-cyan-600 hover:bg-cyan-700"
                              onClick={() => {
                                setRestaurantDetailsView(restaurant);
                                setActiveView('restaurant-details');
                              }}
                            >
                              View Details
                            </Button>
                            <div className="flex items-center gap-2">
                              <Button 
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                onClick={() => {
                                  setQuickReservationRestaurant(restaurant);
                                  setQuickReservationDialog(true);
                                  setQuickReservationDate(new Date());
                                  setQuickReservationTime('');
                                  setQuickReservationPartySize('2');
                                }}
                              >
                                <CalendarIcon className="w-4 h-4 mr-1" />
                                Make Reservation
                              </Button>
                              {restaurant.waitlistAvailable && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="border-slate-700"
                                  onClick={() => handleJoinWaitlist(restaurant)}
                                >
                                  <Timer className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* RESTAURANT DETAILS VIEW */}
        {activeView === 'restaurant-details' && restaurantDetailsView && (
          <motion.div
            key="restaurant-details"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => setActiveView('discover')}
              >
                <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                Back to Discover
              </Button>
              {!isDemoMode && currentUser && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    const favoriteIds = favoriteRestaurants.map(r => r.id);
                    const isCurrentlyFavorite = favoriteIds.includes(restaurantDetailsView.id);
                    
                    if (isCurrentlyFavorite) {
                      const success = await removeFavoriteRestaurant(currentUser.uid, restaurantDetailsView.id);
                      if (success) {
                        toast.success('Removed from favorites');
                        const favoritesData = await fetchFavoriteRestaurants(currentUser.uid);
                        const transformedFavorites = favoritesData.map(transformToMockRestaurant);
                        setFavoriteRestaurants(transformedFavorites);
                      }
                    } else {
                      const success = await addFavoriteRestaurant(currentUser.uid, restaurantDetailsView.id);
                      if (success) {
                        toast.success('Added to favorites');
                        const favoritesData = await fetchFavoriteRestaurants(currentUser.uid);
                        const transformedFavorites = favoritesData.map(transformToMockRestaurant);
                        setFavoriteRestaurants(transformedFavorites);
                      }
                    }
                  }}
                >
                  <Heart 
                    className={`w-6 h-6 transition-all ${
                      favoriteRestaurants.map(r => r.id).includes(restaurantDetailsView.id)
                        ? 'fill-red-500 text-red-500' 
                        : 'text-slate-400 hover:text-red-500'
                    }`} 
                  />
                </Button>
              )}
            </div>

            {/* Restaurant Hero Image */}
            <div className="relative h-96 rounded-xl overflow-hidden">
              <img
                src={restaurantDetailsView.image}
                alt={restaurantDetailsView.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-4xl text-white mb-2">{restaurantDetailsView.name}</h1>
                    <div className="flex items-center gap-3 text-white/90">
                      <span>{restaurantDetailsView.cuisine}</span>
                      <span>•</span>
                      <span>{'$'.repeat(restaurantDetailsView.priceLevel)}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span>{restaurantDetailsView.rating}</span>
                        <span className="text-white/70">({restaurantDetailsView.reviews} reviews)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <Button 
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 h-14 text-lg"
                onClick={() => {
                  setQuickReservationRestaurant(restaurantDetailsView);
                  setQuickReservationDialog(true);
                  setQuickReservationDate(new Date());
                  setQuickReservationTime('');
                  setQuickReservationPartySize('2');
                }}
              >
                <CalendarIcon className="w-5 h-5 mr-2" />
                Make Reservation
              </Button>
              {restaurantDetailsView.waitlistAvailable && (
                <Button
                  variant="outline"
                  className="border-slate-600 h-14"
                  onClick={() => handleJoinWaitlist(restaurantDetailsView)}
                >
                  <Timer className="w-5 h-5 mr-2" />
                  Join Waitlist
                </Button>
              )}
            </div>

            {/* Restaurant Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <Card className="p-6 bg-slate-800/50 border-slate-700">
                  <h2 className="text-xl text-slate-100 mb-3">About</h2>
                  <p className="text-slate-300 leading-relaxed">{restaurantDetailsView.description}</p>
                </Card>

                {/* Features */}
                {restaurantDetailsView.features && restaurantDetailsView.features.length > 0 && (
                  <Card className="p-6 bg-slate-800/50 border-slate-700">
                    <h2 className="text-xl text-slate-100 mb-3">Features</h2>
                    <div className="flex flex-wrap gap-2">
                      {restaurantDetailsView.features.map((feature) => (
                        <Badge key={feature} className="bg-slate-700/50 text-slate-300 border-slate-600">
                          <Check className="w-3 h-3 mr-1" />
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Ambiance */}
                {restaurantDetailsView.ambiance && (
                  <Card className="p-6 bg-slate-800/50 border-slate-700">
                    <h2 className="text-xl text-slate-100 mb-4">Ambiance</h2>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-700/30 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">Noise Level</div>
                        <div className="text-sm text-slate-200">{restaurantDetailsView.ambiance.noiseLevel}</div>
                      </div>
                      <div className="p-4 bg-slate-700/30 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">Lighting</div>
                        <div className="text-sm text-slate-200">{restaurantDetailsView.ambiance.lighting}</div>
                      </div>
                      <div className="p-4 bg-slate-700/30 rounded-lg">
                        <div className="text-xs text-slate-500 mb-1">Vibe</div>
                        <div className="text-sm text-slate-200">{restaurantDetailsView.ambiance.vibe.join(', ')}</div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Dietary Options */}
                {restaurantDetailsView.dietary && restaurantDetailsView.dietary.length > 0 && (
                  <Card className="p-6 bg-slate-800/50 border-slate-700">
                    <h2 className="text-xl text-slate-100 mb-3">Dietary Options</h2>
                    <div className="flex flex-wrap gap-2">
                      {restaurantDetailsView.dietary.map((option) => (
                        <Badge key={option} className="bg-green-500/20 text-green-400 border-green-500/30">
                          <Check className="w-3 h-3 mr-1" />
                          {option}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}
              </div>

              {/* Right Column - Contact Info */}
              <div className="space-y-6">
                {/* Location & Hours */}
                <Card className="p-6 bg-slate-800/50 border-slate-700">
                  <h2 className="text-xl text-slate-100 mb-4">Information</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Address</div>
                        <div className="text-sm text-slate-300">{restaurantDetailsView.address}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Hours</div>
                        <div className="text-sm text-slate-300">
                          {(() => {
                            const hours = restaurantDetailsView.hours;
                            if (!hours) return 'Hours not available';
                            if (typeof hours === 'string') return hours;
                            if (typeof hours === 'object' && 'open' in hours && 'close' in hours) {
                              const hoursObj = hours as { open: string; close: string };
                              return `${hoursObj.open} - ${hoursObj.close}`;
                            }
                            return 'Hours vary';
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Price Range */}
                <Card className="p-6 bg-slate-800/50 border-slate-700">
                  <h2 className="text-xl text-slate-100 mb-3">Price Range</h2>
                  <div className="text-2xl text-cyan-400">
                    {'$'.repeat(restaurantDetailsView.priceLevel)}
                    <span className="text-slate-600">{'$'.repeat(4 - restaurantDetailsView.priceLevel)}</span>
                  </div>
                </Card>
              </div>
            </div>
          </motion.div>
        )}

        {/* RESERVATIONS VIEW */}
        {activeView === 'reservations' && (
          <motion.div
            key="reservations"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl text-slate-100">My Reservations</h2>
              <Button 
                className="bg-cyan-600 hover:bg-cyan-700"
                onClick={() => setActiveView('discover')}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Reservation
              </Button>
            </div>

            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="bg-slate-800/50 border border-slate-700 p-1 w-full grid grid-cols-2">
                <TabsTrigger 
                  value="upcoming"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-slate-200 transition-all duration-200"
                >
                  Upcoming
                </TabsTrigger>
                <TabsTrigger 
                  value="past"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-slate-200 transition-all duration-200"
                >
                  Past
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4 mt-6">
                {isLoadingReservations ? (
                  <div className="text-center py-12">
                    <p className="text-slate-400">Loading reservations...</p>
                  </div>
                ) : reservations.filter(r => r.status === 'confirmed' || r.status === 'pending').length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg text-slate-300 mb-2">No Upcoming Reservations</h3>
                    <p className="text-slate-500 mb-6">You don't have any upcoming reservations at the moment.</p>
                    <Button 
                      onClick={() => handleViewChange('discover')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Discover Restaurants
                    </Button>
                  </div>
                ) : reservations.filter(r => r.status === 'confirmed' || r.status === 'pending').map(res => (
                  <Card key={res.id} className="p-5 bg-slate-800/50 border-slate-700">
                    <div className="flex gap-4">
                      {/* Restaurant Image */}
                      <div className="relative w-32 h-32 flex-shrink-0">
                        <img
                          src={res.restaurantImage}
                          alt={res.restaurantName}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>

                      {/* Reservation Details */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg text-slate-100">{res.restaurantName}</h3>
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              Confirmed
                            </Badge>
                            {res.type === 'experience' && (
                              <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                <Sparkles className="w-3 h-3 mr-1" />
                                Experience
                              </Badge>
                            )}
                          </div>
                          {res.restaurantAddress && (
                            <div className="text-sm text-slate-400 mb-1">
                              <MapPin className="w-3 h-3 inline mr-1" />
                              {res.restaurantAddress}
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-sm text-slate-400">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="w-4 h-4" />
                              {new Date(res.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {res.time}
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {res.partySize} guests
                            </div>
                          </div>
                        </div>

                        {res.experience && (
                          <Badge variant="outline" className="border-purple-500/30 text-purple-400">
                            <Wine className="w-3 h-3 mr-1" />
                            {res.experience}
                          </Badge>
                        )}

                        {res.confirmationCode && (
                          <div className="text-xs text-slate-500">
                            Confirmation: {res.confirmationCode}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-slate-700"
                            onClick={() => handleMessageRestaurant(res)}
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Message
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-slate-700"
                            onClick={() => handleModifyReservation(res)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Modify
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={() => setReservationToCancel(res.id)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="past" className="space-y-4 mt-6">
                {isLoadingReservations ? (
                  <div className="text-center py-12">
                    <p className="text-slate-400">Loading past reservations...</p>
                  </div>
                ) : reservations.filter(r => r.status === 'completed').length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg text-slate-300 mb-2">No Past Reservations</h3>
                    <p className="text-slate-500">Your dining history will appear here.</p>
                  </div>
                ) : reservations.filter(r => r.status === 'completed').map(res => (
                  <Card key={res.id} className="p-5 bg-slate-800/50 border-slate-700">
                    <div className="flex gap-4">
                      {/* Restaurant Image */}
                      <div className="relative w-32 h-32 flex-shrink-0 opacity-75">
                        <img
                          src={res.restaurantImage}
                          alt={res.restaurantName}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>

                      {/* Reservation Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div>
                              <h3 className="text-lg text-slate-100">{res.restaurantName}</h3>
                              <div className="text-sm text-slate-400 mb-1">
                                <MapPin className="w-3 h-3 inline mr-1" />
                                {res.restaurantAddress}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                                <span>{new Date(res.date).toLocaleDateString()}</span>
                                <span>{res.time}</span>
                                <span>{res.partySize} guests</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Award className="w-4 h-4 text-amber-400" />
                              <span className="text-sm text-slate-400">
                                +{res.pointsEarned} points earned
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        {/* WAITLIST VIEW */}
        {activeView === 'waitlist' && (
          <motion.div
            key="waitlist"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl text-slate-100">My Waitlists</h2>
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                {waitlist.length} Active
              </Badge>
            </div>

            {isLoadingWaitlist ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Loading waitlist...</p>
              </div>
            ) : waitlist.length === 0 ? (
              <Card className="p-12 bg-slate-800/50 border-slate-700 text-center">
                <Timer className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl text-slate-300 mb-2">No Active Waitlists</h3>
                <p className="text-slate-500 mb-6">
                  Join a waitlist to get notified when a table becomes available
                </p>
                <Button 
                  className="bg-cyan-600 hover:bg-cyan-700"
                  onClick={() => setActiveView('discover')}
                >
                  Browse Restaurants
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {waitlist.map(entry => (
                  <WaitlistCard
                    key={entry.id}
                    entry={entry}
                    onLeave={() => handleLeaveWaitlist(entry.id)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* MESSAGES VIEW */}
        {activeView === 'messages' && (
          <motion.div
            key="messages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h2 className="text-2xl text-slate-100">Messages</h2>
            
            <ConversationsList 
              userId={currentUser?.uid || 'demo-user'} 
              onSelectConversation={(conversation) => {
                setSelectedConversation(conversation);
                setIsChatPopupOpen(true);
              }}
              demoMode={isDemoMode}
            />
          </motion.div>
        )}

        {/* PROFILE VIEW */}
        {activeView === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h2 className="text-2xl text-slate-100">Profile & Settings</h2>

            {isLoadingProfile ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Loading profile...</p>
              </div>
            ) : profile ? (
              <>
                {/* Profile Header */}
                <Card className="p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700">
                  <div className="flex items-start gap-4 mb-6">
                    <Avatar className="w-20 h-20">
                      {profile.photoURL && <AvatarImage src={profile.photoURL} />}
                      <AvatarFallback className="bg-cyan-600 text-white text-xl">
                        {profile.displayName?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-xl text-slate-100 mb-1">{profile.displayName}</h3>
                      <p className="text-sm text-slate-400 mb-2">@{profile.username}</p>
                      <p className="text-xs text-slate-500 mb-1">{profile.email}</p>
                      {profile.phoneNumber && (
                        <p className="text-xs text-slate-500 mb-2">{profile.phoneNumber}</p>
                      )}
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                        <Award className="w-3 h-3 mr-1" />
                        Gold Member
                      </Badge>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="border-slate-600"
                      onClick={handleEditProfile}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </div>

                  {/* Dining Preferences Section */}
                  <div className="pt-4 border-t border-slate-700 space-y-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Utensils className="w-5 h-5 text-cyan-400" />
                      <h4 className="text-base text-slate-100">Dining Preferences</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Favorite Cuisines */}
                      <div>
                        <Label className="text-xs text-slate-400 mb-2 block">Favorite Cuisines</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {diningPreferences.favoriteCuisines.length > 0 ? (
                            diningPreferences.favoriteCuisines.map(cuisine => (
                              <Badge key={cuisine} className="bg-cyan-600/20 text-cyan-300 border-cyan-500/30 text-xs">
                                {cuisine}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">Not set</span>
                          )}
                        </div>
                      </div>

                      {/* Dietary Restrictions */}
                      <div>
                        <Label className="text-xs text-slate-400 mb-2 block">Dietary Restrictions</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {diningPreferences.dietaryRestrictions.length > 0 ? (
                            diningPreferences.dietaryRestrictions.map(restriction => (
                              <Badge key={restriction} className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                                {restriction}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500">None</span>
                          )}
                        </div>
                      </div>

                      {/* Spice Level */}
                      <div>
                        <Label className="text-xs text-slate-400 mb-2 block">Spice Level</Label>
                        <p className="text-sm text-slate-200">{diningPreferences.spiceLevel}</p>
                      </div>

                      {/* Seating Preference */}
                      <div>
                        <Label className="text-xs text-slate-400 mb-2 block">Seating Preference</Label>
                        <p className="text-sm text-slate-200">{diningPreferences.seatingPreference}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
                <User className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400">No profile data available</p>
              </Card>
            )}

            {/* Rewards & Points */}
            <Card className="p-6 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-cyan-500/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-cyan-400" />
                  <h3 className="text-lg text-slate-100">Rewards Program</h3>
                </div>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                  4,850 Points
                </Badge>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-400">Progress to Platinum</span>
                    <span className="text-cyan-400">850 / 5000 points</span>
                  </div>
                  <Progress value={(4850 / 10000) * 100} className="h-2" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-800/50 rounded text-center">
                    <div className="text-2xl text-cyan-400 mb-1">28</div>
                    <div className="text-xs text-slate-400">Reservations</div>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded text-center">
                    <div className="text-2xl text-cyan-400 mb-1">$2,450</div>
                    <div className="text-xs text-slate-400">Total Spent</div>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded text-center">
                    <div className="text-2xl text-cyan-400 mb-1">12</div>
                    <div className="text-xs text-slate-400">Reviews</div>
                  </div>
                </div>

                <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700">
                  <Gift className="w-4 h-4 mr-2" />
                  Redeem Rewards
                </Button>
              </div>
            </Card>

            {/* Account Settings */}
            <div className="space-y-3">
              <h3 className="text-lg text-slate-100">Account Settings</h3>
              
              {/* Personal Information */}
              <Card 
                className="p-5 bg-slate-800/50 border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-all"
                onClick={() => setOpenSettingsDialog('personal')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-slate-100">Personal Information</div>
                      <div className="text-sm text-slate-500">Name, email, phone number</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
              </Card>

              {/* Payment Methods */}
              <Card 
                className="p-5 bg-slate-800/50 border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-all"
                onClick={() => setOpenSettingsDialog('payment')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-slate-100">Payment Methods</div>
                      <div className="text-sm text-slate-500">{paymentMethods.length} cards saved</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
              </Card>

              {/* Notifications */}
              <Card 
                className="p-5 bg-slate-800/50 border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-all"
                onClick={() => setOpenSettingsDialog('notifications')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-slate-100">Notifications</div>
                      <div className="text-sm text-slate-500">Email, SMS, push notifications</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
              </Card>

              {/* Privacy & Security */}
              <Card 
                className="p-5 bg-slate-800/50 border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-all"
                onClick={() => setOpenSettingsDialog('privacy')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <Settings className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-slate-100">Privacy & Security</div>
                      <div className="text-sm text-slate-500">Password, data settings</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
              </Card>
            </div>

            {/* Favorites */}
            <div className="space-y-3">
              <h3 className="text-lg text-slate-100">Favorite Restaurants</h3>
              {isLoadingFavorites ? (
                <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
                  <p className="text-slate-400">Loading favorites...</p>
                </Card>
              ) : favoriteRestaurants.length === 0 ? (
                <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
                  <Heart className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <h4 className="text-lg text-slate-300 mb-2">No Favorite Restaurants</h4>
                  <p className="text-slate-500 mb-4">
                    Mark restaurants as favorites to see them here
                  </p>
                  <Button 
                    className="bg-cyan-600 hover:bg-cyan-700"
                    onClick={() => setActiveView('discover')}
                  >
                    Discover Restaurants
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {favoriteRestaurants.map(restaurant => (
                    <Card 
                      key={restaurant.id} 
                      className="p-4 bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-all cursor-pointer"
                      onClick={() => handleBookRestaurant(restaurant)}
                    >
                      <div className="flex gap-3">
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <img
                            src={restaurant.image}
                            alt={restaurant.name}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="text-slate-100 truncate">{restaurant.name}</h4>
                            <Heart className="w-4 h-4 fill-red-500 text-red-500 flex-shrink-0 ml-2" />
                          </div>
                          <div className="text-sm text-slate-400">{restaurant.cuisine}</div>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-slate-400">{restaurant.rating}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Saved Payment Methods Preview */}
            <div className="space-y-3">
              <h3 className="text-lg text-slate-100">Saved Payment Methods</h3>
              <Card className="p-5 bg-gradient-to-r from-slate-800/50 to-slate-900/50 border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-slate-100">•••• •••• •••• 4242</div>
                    <div className="text-sm text-slate-400">Expires 12/25</div>
                  </div>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    Default
                  </Badge>
                </div>
              </Card>
              <Card className="p-5 bg-slate-800/50 border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-gradient-to-r from-amber-600 to-amber-400 rounded flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="text-slate-100">•••• •••• •••• 8888</div>
                    <div className="text-sm text-slate-400">Expires 08/26</div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Sign Out */}
            <Button 
              variant="outline" 
              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </motion.div>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog open={selectedRestaurant !== null || viewingRestaurantDetails} onOpenChange={() => {
        setSelectedRestaurant(null);
        setSelectedExperience(null);
        setModifyingReservation(null);
        setReservationTime('');
        setReservationExperience(null);
        setBookingType('table');
        setSelectedExperienceForBooking(null);
        setViewingRestaurantDetails(false);
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {selectedRestaurant && (
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl text-slate-100">
                      {modifyingReservation 
                        ? 'Modify Reservation' 
                        : bookingType === 'experience'
                        ? 'Book an Experience'
                        : 'Reserve a Table'
                      }
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                      {selectedRestaurant.name}
                    </DialogDescription>
                  </div>
                  {/* Favorite Button */}
                  {!isDemoMode && currentUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleToggleFavorite}
                      className="flex-shrink-0 ml-2"
                    >
                      <Heart 
                        className={`w-6 h-6 transition-all ${
                          isFavorite 
                            ? 'fill-red-500 text-red-500' 
                            : 'text-slate-400 hover:text-red-500'
                        }`} 
                      />
                    </Button>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4 overflow-y-auto pr-2 flex-1">
                {/* Restaurant Image */}
                <div className="relative h-64 rounded-lg overflow-hidden">
                  <img
                    src={selectedRestaurant.image}
                    alt={selectedRestaurant.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="text-lg text-white">{selectedRestaurant.rating}</span>
                      </div>
                      <span className="text-slate-300">({selectedRestaurant.reviews} reviews)</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                      <span>{Array(selectedRestaurant.priceLevel).fill('$').join('')}</span>
                      <span>•</span>
                      <span>{selectedRestaurant.cuisine}</span>
                      {selectedRestaurant.distance && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {selectedRestaurant.distance}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Restaurant Info */}
                <div className="space-y-4">
                  {/* Description */}
                  <div>
                    <p className="text-slate-300">{selectedRestaurant.description}</p>
                  </div>

                  {/* Address & Hours */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Address</div>
                          <div className="text-sm text-slate-300">{selectedRestaurant.address}</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Hours</div>
                          <div className="text-sm text-slate-300">{formatHoursToString(selectedRestaurant.hours)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  {selectedRestaurant.features && selectedRestaurant.features.length > 0 && (
                    <div>
                      <div className="text-sm text-slate-500 mb-2">Features</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedRestaurant.features.map((feature) => (
                          <Badge key={feature} className="bg-slate-700/50 text-slate-300 border-slate-600">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ambiance */}
                  {selectedRestaurant.ambiance && (
                    <div>
                      <div className="text-sm text-slate-500 mb-2">Ambiance</div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 bg-slate-700/30 rounded">
                          <div className="text-xs text-slate-500">Noise Level</div>
                          <div className="text-sm text-slate-200">{selectedRestaurant.ambiance.noiseLevel}</div>
                        </div>
                        <div className="p-3 bg-slate-700/30 rounded">
                          <div className="text-xs text-slate-500">Lighting</div>
                          <div className="text-sm text-slate-200">{selectedRestaurant.ambiance.lighting}</div>
                        </div>
                        <div className="p-3 bg-slate-700/30 rounded">
                          <div className="text-xs text-slate-500">Vibe</div>
                          <div className="text-sm text-slate-200">{selectedRestaurant.ambiance.vibe.join(', ')}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dietary Options */}
                  {selectedRestaurant.dietary && selectedRestaurant.dietary.length > 0 && (
                    <div>
                      <div className="text-sm text-slate-500 mb-2">Dietary Options</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedRestaurant.dietary.map((option) => (
                          <Badge key={option} className="bg-green-500/20 text-green-400 border-green-500/30">
                            <Check className="w-3 h-3 mr-1" />
                            {option}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-slate-700 pt-6">
                  <h4 className="text-lg text-slate-100 mb-4">
                    {modifyingReservation ? 'Modify Reservation' : 'Make a Reservation'}
                  </h4>
                </div>

                {/* Table Booking Flow */}
                {bookingType === 'table' && (
                  <>
                    {/* Select Date */}
                    <div>
                      <Label className="text-slate-300 mb-2 block">Select Date</Label>
                      
                      {/* Selected Date Display */}
                      <div className="mb-4 p-4 bg-gradient-to-br from-cyan-600/10 to-blue-600/10 border-2 border-cyan-600/30 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg">
                            <CalendarIcon className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <div className="text-xs text-slate-400">Selected Date</div>
                            <div className="text-lg font-semibold text-white">
                              {selectedDate?.toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'long', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Date Dropdowns */}
                      <div className="grid grid-cols-3 gap-3">
                        {/* Month Dropdown */}
                        <div>
                          <Label className="text-slate-400 text-xs mb-1.5 block">Month</Label>
                          <Select
                            value={(selectedDate?.getMonth() || new Date().getMonth()).toString()}
                            onValueChange={(value) => {
                              const newDate = new Date(selectedDate || new Date());
                              newDate.setMonth(parseInt(value));
                              setSelectedDate(newDate);
                            }}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                                <SelectItem key={idx} value={idx.toString()}>
                                  {month}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Day Dropdown */}
                        <div>
                          <Label className="text-slate-400 text-xs mb-1.5 block">Day</Label>
                          <Select
                            value={(selectedDate?.getDate() || new Date().getDate()).toString()}
                            onValueChange={(value) => {
                              const newDate = new Date(selectedDate || new Date());
                              newDate.setDate(parseInt(value));
                              setSelectedDate(newDate);
                            }}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                <SelectItem key={day} value={day.toString()}>
                                  {day}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Year Dropdown */}
                        <div>
                          <Label className="text-slate-400 text-xs mb-1.5 block">Year</Label>
                          <Select
                            value={(selectedDate?.getFullYear() || new Date().getFullYear()).toString()}
                            onValueChange={(value) => {
                              const newDate = new Date(selectedDate || new Date());
                              newDate.setFullYear(parseInt(value));
                              setSelectedDate(newDate);
                            }}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700">
                              {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                  {year}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                {/* Select Time */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Select Time</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(selectedRestaurant.availableSlots || ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM']).map(slot => (
                      <Button
                        key={slot}
                        variant={reservationTime === slot ? 'default' : 'outline'}
                        className={reservationTime === slot ? 'bg-cyan-600' : 'border-slate-600'}
                        onClick={() => setReservationTime(slot)}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Party Size (for modify only) */}
                {modifyingReservation && (
                  <div>
                    <Label className="text-slate-300 mb-2 block">Party Size</Label>
                    <Select value={partySize} onValueChange={setPartySize}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                        <Users className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? 'Guest' : 'Guests'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                    {/* Add Experience (optional) for table reservations */}
                    {!modifyingReservation && selectedRestaurant.experiences && selectedRestaurant.experiences.length > 0 && (
                      <div>
                        <Label className="text-slate-300 mb-2 block">Add an Experience (Optional)</Label>
                        <div className="space-y-2">
                          {(selectedRestaurant.experiences || []).map(exp => (
                            <Card
                              key={exp.id}
                              className={`p-4 cursor-pointer transition-all ${
                                reservationExperience === exp.name
                                  ? 'bg-purple-500/20 border-purple-500'
                                  : 'bg-slate-900/50 border-slate-700 hover:border-purple-500/50'
                              }`}
                              onClick={() => setReservationExperience(
                                reservationExperience === exp.name ? null : exp.name
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className="text-2xl">{exp.icon}</div>
                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <h4 className="text-slate-100">{exp.name}</h4>
                                    <div className="text-purple-400">+${exp.price}</div>
                                  </div>
                                  <p className="text-sm text-slate-400 mt-1">{exp.description}</p>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Experience Booking Flow */}
                {bookingType === 'experience' && !modifyingReservation && (
                  <div>
                    <Label className="text-slate-300 mb-3 block">Select an Experience</Label>
                    {selectedRestaurant.experiences && selectedRestaurant.experiences.length > 0 ? (
                      <div className="space-y-3">
                        {selectedRestaurant.experiences.map(exp => {
                          const remainingCapacity = exp.capacity - (exp.bookedCount || 0);
                          const isFull = remainingCapacity <= 0;
                          
                          return (
                            <Card
                              key={exp.id}
                              className={`p-5 cursor-pointer transition-all border-2 ${
                                selectedExperienceForBooking?.id === exp.id
                                  ? 'bg-purple-500/20 border-purple-500'
                                  : isFull
                                  ? 'bg-slate-900/30 border-slate-700 opacity-50 cursor-not-allowed'
                                  : 'bg-slate-900/50 border-slate-700 hover:border-purple-500/50'
                              }`}
                              onClick={() => !isFull && setSelectedExperienceForBooking(
                                selectedExperienceForBooking?.id === exp.id ? null : exp
                              )}
                            >
                              <div className="flex items-start gap-4">
                                <div className="text-3xl">{exp.icon || '🎭'}</div>
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <h4 className="text-lg font-semibold text-slate-100 mb-1">{exp.name}</h4>
                                      <p className="text-sm text-slate-400">{exp.description}</p>
                                    </div>
                                    <div className="text-right ml-4">
                                      <div className="text-xl font-bold text-purple-400">${exp.price}</div>
                                      {exp.duration && (
                                        <div className="text-xs text-slate-500">{exp.duration}</div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Date & Time */}
                                  {exp.date && exp.time && (
                                    <div className="flex items-center gap-4 text-sm text-slate-300 mb-2">
                                      <div className="flex items-center gap-1">
                                        <CalendarIcon className="w-4 h-4 text-cyan-400" />
                                        <span>{exp.date}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4 text-cyan-400" />
                                        <span>{exp.time}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* Capacity */}
                                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4 text-slate-400" />
                                      <span className="text-sm text-slate-400">
                                        {isFull ? (
                                          <span className="text-red-400 font-semibold">Fully Booked</span>
                                        ) : (
                                          <>
                                            <span className="text-cyan-400 font-semibold">{remainingCapacity}</span>
                                            <span> / {exp.capacity} spots available</span>
                                          </>
                                        )}
                                      </span>
                                    </div>
                                    {!isFull && selectedExperienceForBooking?.id === exp.id && (
                                      <Badge className="bg-purple-500 text-white">Selected</Badge>
                                    )}
                                  </div>

                                  {/* What's Included */}
                                  {exp.includes && exp.includes.length > 0 && (
                                    <div className="mt-3">
                                      <div className="text-xs text-slate-500 mb-1">What's Included:</div>
                                      <div className="flex flex-wrap gap-1">
                                        {exp.includes.map((item, idx) => (
                                          <Badge key={idx} className="bg-slate-700/50 text-slate-300 text-xs border-slate-600">
                                            <Check className="w-3 h-3 mr-1" />
                                            {item}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 px-4 bg-slate-900/30 rounded-lg border border-slate-700">
                        <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400">No experiences available at this time</p>
                        <p className="text-sm text-slate-500 mt-1">Try booking a table instead</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-600"
                    onClick={() => {
                      setSelectedRestaurant(null);
                      setModifyingReservation(null);
                      setReservationTime('');
                      setReservationExperience(null);
                      setBookingType('table');
                      setSelectedExperienceForBooking(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className={`flex-1 ${
                      bookingType === 'experience'
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700'
                    }`}
                    onClick={modifyingReservation ? handleSaveModification : handleCompleteBooking}
                    disabled={
                      bookingType === 'table' ? !reservationTime : !selectedExperienceForBooking
                    }
                  >
                    {modifyingReservation 
                      ? 'Save Changes' 
                      : bookingType === 'experience'
                      ? 'Book Experience'
                      : 'Confirm Reservation'
                    }
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Reservation Dialog */}
      <Dialog open={quickReservationDialog} onOpenChange={setQuickReservationDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-2xl text-slate-100">Make a Reservation</DialogTitle>
            <DialogDescription className="text-slate-400">
              {quickReservationRestaurant?.name}
            </DialogDescription>
          </DialogHeader>

          {quickReservationRestaurant && (
            <div className="space-y-6 overflow-y-auto pr-2 flex-1">
              {/* Restaurant Image */}
              <div className="relative h-40 rounded-lg overflow-hidden">
                <img
                  src={quickReservationRestaurant.image}
                  alt={quickReservationRestaurant.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 to-transparent" />
                {/* Favorite Button */}
                {!isDemoMode && currentUser && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      const favoriteIds = favoriteRestaurants.map(r => r.id);
                      const isCurrentlyFavorite = favoriteIds.includes(quickReservationRestaurant.id);
                      
                      if (isCurrentlyFavorite) {
                        const success = await removeFavoriteRestaurant(currentUser.uid, quickReservationRestaurant.id);
                        if (success) {
                          toast.success('Removed from favorites');
                          const favoritesData = await fetchFavoriteRestaurants(currentUser.uid);
                          const transformedFavorites = favoritesData.map(transformToMockRestaurant);
                          setFavoriteRestaurants(transformedFavorites);
                        } else {
                          toast.error('Failed to remove from favorites');
                        }
                      } else {
                        const success = await addFavoriteRestaurant(currentUser.uid, quickReservationRestaurant.id);
                        if (success) {
                          toast.success('Added to favorites');
                          const favoritesData = await fetchFavoriteRestaurants(currentUser.uid);
                          const transformedFavorites = favoritesData.map(transformToMockRestaurant);
                          setFavoriteRestaurants(transformedFavorites);
                        } else {
                          toast.error('Failed to add to favorites');
                        }
                      }
                    }}
                    className="absolute top-3 right-3 bg-slate-900/50 hover:bg-slate-900/70 backdrop-blur-sm"
                  >
                    <Heart 
                      className={`w-5 h-5 transition-all ${
                        favoriteRestaurants.map(r => r.id).includes(quickReservationRestaurant.id)
                          ? 'fill-red-500 text-red-500' 
                          : 'text-white hover:text-red-500'
                      }`} 
                    />
                  </Button>
                )}
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-lg font-semibold text-slate-100 mb-2">{quickReservationRestaurant.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-300 mb-1">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span>{quickReservationRestaurant.rating}</span>
                    </div>
                    <span>•</span>
                    <span>{quickReservationRestaurant.cuisine}</span>
                    <span>•</span>
                    <span>{'$'.repeat(quickReservationRestaurant.priceLevel)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <MapPin className="w-3 h-3" />
                    <span>{quickReservationRestaurant.address || quickReservationRestaurant.distance}</span>
                  </div>
                </div>
              </div>

              {/* Party Size */}
              <div>
                <Label className="text-slate-300 mb-2 block">Party Size</Label>
                <Select value={quickReservationPartySize} onValueChange={setQuickReservationPartySize}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                    <Users className="mr-2 h-4 w-4" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? 'Guest' : 'Guests'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Select Date */}
              <div>
                <Label className="text-slate-300 mb-2 block">Select Date</Label>
                
                {/* Selected Date Display */}
                <div className="mb-4 p-4 bg-gradient-to-br from-cyan-600/10 to-blue-600/10 border-2 border-cyan-600/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg">
                      <CalendarIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Selected Date</div>
                      <div className="text-lg font-semibold text-white">
                        {quickReservationDate?.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date Dropdowns */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Month Dropdown */}
                  <div>
                    <Label className="text-slate-400 text-xs mb-1.5 block">Month</Label>
                    <Select
                      value={(quickReservationDate?.getMonth() || new Date().getMonth()).toString()}
                      onValueChange={(value) => {
                        const newDate = new Date(quickReservationDate || new Date());
                        newDate.setMonth(parseInt(value));
                        setQuickReservationDate(newDate);
                      }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                          <SelectItem key={idx} value={idx.toString()}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Day Dropdown */}
                  <div>
                    <Label className="text-slate-400 text-xs mb-1.5 block">Day</Label>
                    <Select
                      value={(quickReservationDate?.getDate() || new Date().getDate()).toString()}
                      onValueChange={(value) => {
                        const newDate = new Date(quickReservationDate || new Date());
                        newDate.setDate(parseInt(value));
                        setQuickReservationDate(newDate);
                      }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Year Dropdown */}
                  <div>
                    <Label className="text-slate-400 text-xs mb-1.5 block">Year</Label>
                    <Select
                      value={(quickReservationDate?.getFullYear() || new Date().getFullYear()).toString()}
                      onValueChange={(value) => {
                        const newDate = new Date(quickReservationDate || new Date());
                        newDate.setFullYear(parseInt(value));
                        setQuickReservationDate(newDate);
                      }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {Array.from({ length: 3 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Select Time */}
              <div>
                <Label className="text-slate-300 mb-2 block">Select Time</Label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {(quickReservationRestaurant.availableSlots || ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM']).map(slot => (
                    <Button
                      key={slot}
                      variant={quickReservationTime === slot ? 'default' : 'outline'}
                      className={quickReservationTime === slot ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700' : 'border-slate-600 hover:bg-slate-700'}
                      onClick={() => setQuickReservationTime(slot)}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-600"
                  onClick={() => {
                    setQuickReservationDialog(false);
                    setQuickReservationRestaurant(null);
                    setQuickReservationTime('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                  onClick={handleQuickReservationConfirm}
                  disabled={!quickReservationTime}
                >
                  Confirm Reservation
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-100">Edit Profile</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update your personal information
            </DialogDescription>
          </DialogHeader>

          {profile && (
            <div className="space-y-6 mt-4">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <Avatar className="w-24 h-24">
                  {(photoPreviewURL || editedProfile.photoURL) && <AvatarImage src={photoPreviewURL || editedProfile.photoURL} />}
                  <AvatarFallback className="bg-cyan-600 text-white text-2xl">
                    {profile.displayName?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                    onClick={() => document.getElementById('photoUpload')?.click()}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                  <input
                    id="photoUpload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Store the file for later upload
                        setSelectedProfilePicture(file);
                        // Create preview URL (doesn't bloat editedProfile)
                        const previewURL = URL.createObjectURL(file);
                        setPhotoPreviewURL(previewURL);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-slate-300">Display Name</Label>
                <Input
                  id="displayName"
                  value={editedProfile.displayName || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, displayName: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-slate-100"
                  placeholder="Enter your name"
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300">Username</Label>
                <Input
                  id="username"
                  value={editedProfile.username || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, username: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-slate-100"
                  placeholder="Enter username"
                />
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-slate-700/50 border-slate-600 text-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500">Email cannot be changed</p>
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-300">Phone Number</Label>
                <Input
                  id="phone"
                  value={editedProfile.phoneNumber || ''}
                  onChange={(e) => setEditedProfile({ ...editedProfile, phoneNumber: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-slate-100"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              {/* Dining Preferences Section */}
              <div className="pt-4 border-t border-slate-700">
                <h3 className="text-lg text-slate-100 mb-4">Dining Preferences</h3>
                
                {/* Favorite Cuisines */}
                <div className="space-y-2 mb-4">
                  <Label className="text-slate-300">Favorite Cuisines</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Italian', 'Japanese', 'Mexican', 'Chinese', 'Indian', 'Thai', 'French', 'American'].map(cuisine => (
                      <Badge
                        key={cuisine}
                        className={`cursor-pointer ${
                          diningPreferences.favoriteCuisines.includes(cuisine)
                            ? 'bg-cyan-600 hover:bg-cyan-700'
                            : 'bg-slate-700 hover:bg-slate-600'
                        }`}
                        onClick={() => {
                          const updated = diningPreferences.favoriteCuisines.includes(cuisine)
                            ? diningPreferences.favoriteCuisines.filter(c => c !== cuisine)
                            : [...diningPreferences.favoriteCuisines, cuisine];
                          setDiningPreferences({ ...diningPreferences, favoriteCuisines: updated });
                        }}
                      >
                        {cuisine}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Dietary Restrictions */}
                <div className="space-y-2 mb-4">
                  <Label className="text-slate-300">Dietary Restrictions</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal', 'Kosher'].map(restriction => (
                      <Badge
                        key={restriction}
                        className={`cursor-pointer ${
                          diningPreferences.dietaryRestrictions.includes(restriction)
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                        onClick={() => {
                          const updated = diningPreferences.dietaryRestrictions.includes(restriction)
                            ? diningPreferences.dietaryRestrictions.filter(r => r !== restriction)
                            : [...diningPreferences.dietaryRestrictions, restriction];
                          setDiningPreferences({ ...diningPreferences, dietaryRestrictions: updated });
                        }}
                      >
                        {restriction}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Spice Level */}
                <div className="space-y-2 mb-4">
                  <Label className="text-slate-300">Spice Level</Label>
                  <Select
                    value={diningPreferences.spiceLevel}
                    onValueChange={(value) => setDiningPreferences({ ...diningPreferences, spiceLevel: value })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                      <SelectValue placeholder="Select spice level" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {['Mild', 'Medium', 'Hot', 'Extra Hot'].map(level => (
                        <SelectItem key={level} value={level} className="text-slate-100 focus:bg-slate-700 focus:text-slate-100">
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Seating Preference */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Seating Preference</Label>
                  <Select
                    value={diningPreferences.seatingPreference}
                    onValueChange={(value) => setDiningPreferences({ ...diningPreferences, seatingPreference: value })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                      <SelectValue placeholder="Select seating preference" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {['Window', 'Booth', 'Bar', 'Outdoor', 'No Preference'].map(seating => (
                        <SelectItem key={seating} value={seating} className="text-slate-100 focus:bg-slate-700 focus:text-slate-100">
                          {seating}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isDemoMode && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm text-blue-400">
                    <strong>Demo Mode:</strong> Changes will be saved locally only.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                  onClick={handleSaveProfile}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300"
                  onClick={handleCancelEdit}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Personal Information Dialog */}
      <Dialog open={openSettingsDialog === 'personal'} onOpenChange={(open) => !open && setOpenSettingsDialog(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-100">Personal Information</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update your personal details
            </DialogDescription>
          </DialogHeader>
          {profile && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Display Name</Label>
                <Input
                  value={profile.displayName}
                  className="bg-slate-700 border-slate-600 text-slate-100"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <Input
                  value={profile.email}
                  className="bg-slate-700 border-slate-600 text-slate-100"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Phone</Label>
                <Input
                  value={profile.phoneNumber || 'Not set'}
                  className="bg-slate-700 border-slate-600 text-slate-100"
                  disabled
                />
              </div>
              <Button 
                className="w-full bg-cyan-600 hover:bg-cyan-700"
                onClick={() => {
                  setOpenSettingsDialog(null);
                  handleEditProfile();
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Methods Dialog */}
      <Dialog open={openSettingsDialog === 'payment'} onOpenChange={(open) => !open && setOpenSettingsDialog(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-100">Payment Methods</DialogTitle>
            <DialogDescription className="text-slate-400">
              Manage your saved payment cards
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {!isAddingCard ? (
              <>
                {paymentMethods.map((card) => (
                  <Card key={card.id} className="p-4 bg-slate-700/50 border-slate-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-cyan-400" />
                        <div>
                          <div className="text-slate-100">{card.type} •••• {card.last4}</div>
                          <div className="text-sm text-slate-400">Expires {card.expiry}</div>
                          {card.isDefault && (
                            <Badge className="mt-1 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Default</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePaymentMethod(card.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </div>
                  </Card>
                ))}
                <Button 
                  className="w-full bg-cyan-600 hover:bg-cyan-700"
                  onClick={() => setIsAddingCard(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Card
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                {/* Card Type */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Card Type</Label>
                  <Select
                    value={newCard.type}
                    onValueChange={(value) => setNewCard({ ...newCard, type: value as 'Visa' | 'Mastercard' | 'Amex' | 'Discover' })}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="Visa" className="text-slate-100 focus:bg-slate-700">Visa</SelectItem>
                      <SelectItem value="Mastercard" className="text-slate-100 focus:bg-slate-700">Mastercard</SelectItem>
                      <SelectItem value="Amex" className="text-slate-100 focus:bg-slate-700">American Express</SelectItem>
                      <SelectItem value="Discover" className="text-slate-100 focus:bg-slate-700">Discover</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Card Number */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Card Number</Label>
                  <Input
                    value={newCard.cardNumber}
                    onChange={(e) => {
                      // Format card number with spaces every 4 digits
                      const value = e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                      setNewCard({ ...newCard, cardNumber: value });
                    }}
                    className="bg-slate-700 border-slate-600 text-slate-100"
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                  />
                </div>

                {/* Cardholder Name */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Cardholder Name</Label>
                  <Input
                    value={newCard.cardName}
                    onChange={(e) => setNewCard({ ...newCard, cardName: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-slate-100"
                    placeholder="John Doe"
                  />
                </div>

                {/* Expiry and CVV */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Month</Label>
                    <Select
                      value={newCard.expiryMonth}
                      onValueChange={(value) => setNewCard({ ...newCard, expiryMonth: value })}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                        <SelectValue placeholder="MM" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = (i + 1).toString().padStart(2, '0');
                          return (
                            <SelectItem key={month} value={month} className="text-slate-100 focus:bg-slate-700">
                              {month}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Year</Label>
                    <Select
                      value={newCard.expiryYear}
                      onValueChange={(value) => setNewCard({ ...newCard, expiryYear: value })}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                        <SelectValue placeholder="YYYY" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = (new Date().getFullYear() + i).toString();
                          return (
                            <SelectItem key={year} value={year} className="text-slate-100 focus:bg-slate-700">
                              {year}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">CVV</Label>
                    <Input
                      value={newCard.cvv}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setNewCard({ ...newCard, cvv: value });
                      }}
                      className="bg-slate-700 border-slate-600 text-slate-100"
                      placeholder="123"
                      maxLength={4}
                      type="password"
                    />
                  </div>
                </div>

                {/* Set as Default */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="setDefault"
                    checked={newCard.isDefault}
                    onChange={(e) => setNewCard({ ...newCard, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-600 focus:ring-cyan-500"
                  />
                  <Label htmlFor="setDefault" className="text-slate-300 cursor-pointer">
                    Set as default payment method
                  </Label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                    onClick={handleAddPaymentMethod}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Card
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300"
                    onClick={() => {
                      setIsAddingCard(false);
                      setNewCard({
                        cardNumber: '',
                        cardName: '',
                        expiryMonth: '',
                        expiryYear: '',
                        cvv: '',
                        type: 'Visa',
                        isDefault: false
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dining Preferences Dialog */}
      <Dialog open={openSettingsDialog === 'dining'} onOpenChange={(open) => !open && setOpenSettingsDialog(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-100">Dining Preferences</DialogTitle>
            <DialogDescription className="text-slate-400">
              Set your cuisine and dietary preferences
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Favorite Cuisines</Label>
              <div className="flex flex-wrap gap-2">
                {diningPreferences.favoriteCuisines.map((cuisine) => (
                  <Badge key={cuisine} className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                    {cuisine}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Dietary Restrictions</Label>
              <div className="flex flex-wrap gap-2">
                {diningPreferences.dietaryRestrictions.map((restriction) => (
                  <Badge key={restriction} className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    {restriction}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Spice Level</Label>
              <Select value={diningPreferences.spiceLevel} onValueChange={(value) => setDiningPreferences({...diningPreferences, spiceLevel: value})}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="Mild">Mild</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hot">Hot</SelectItem>
                  <SelectItem value="Extra Hot">Extra Hot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Seating Preference</Label>
              <Select value={diningPreferences.seatingPreference} onValueChange={(value) => setDiningPreferences({...diningPreferences, seatingPreference: value})}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="Window">Window</SelectItem>
                  <SelectItem value="Booth">Booth</SelectItem>
                  <SelectItem value="Bar">Bar</SelectItem>
                  <SelectItem value="Patio">Patio</SelectItem>
                  <SelectItem value="No Preference">No Preference</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              className="w-full bg-cyan-600 hover:bg-cyan-700"
              onClick={handleSaveDiningPreferences}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={openSettingsDialog === 'notifications'} onOpenChange={(open) => !open && setOpenSettingsDialog(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-100">Notification Settings</DialogTitle>
            <DialogDescription className="text-slate-400">
              Manage how you receive notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <h4 className="text-slate-300 mb-3">Notification Channels</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-100">Email</span>
                  </div>
                  <Switch 
                    checked={notificationSettings.email}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, email: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-100">SMS</span>
                  </div>
                  <Switch 
                    checked={notificationSettings.sms}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, sms: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-slate-400" />
                    <span className="text-slate-100">Push Notifications</span>
                  </div>
                  <Switch 
                    checked={notificationSettings.push}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, push: checked})}
                  />
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-slate-300 mb-3">Notification Types</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded">
                  <span className="text-slate-100">Reservation Reminders</span>
                  <Switch 
                    checked={notificationSettings.reservationReminders}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, reservationReminders: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded">
                  <span className="text-slate-100">Waitlist Updates</span>
                  <Switch 
                    checked={notificationSettings.waitlistUpdates}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, waitlistUpdates: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded">
                  <span className="text-slate-100">Promotions & Offers</span>
                  <Switch 
                    checked={notificationSettings.promotions}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, promotions: checked})}
                  />
                </div>
              </div>
            </div>
            <Button 
              className="w-full bg-cyan-600 hover:bg-cyan-700"
              onClick={handleSaveNotificationSettings}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy & Security Dialog */}
      <Dialog open={openSettingsDialog === 'privacy'} onOpenChange={(open) => !open && setOpenSettingsDialog(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-100">Privacy & Security</DialogTitle>
            <DialogDescription className="text-slate-400">
              Manage your account security settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Card className="p-4 bg-slate-700/30 border-slate-600 cursor-pointer hover:border-cyan-500/50 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="text-slate-100">Change Password</div>
                    <div className="text-sm text-slate-400">Update your password</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>
            </Card>
            <Card className="p-4 bg-slate-700/30 border-slate-600 cursor-pointer hover:border-cyan-500/50 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="text-slate-100">Two-Factor Authentication</div>
                    <div className="text-sm text-slate-400">Add an extra layer of security</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>
            </Card>
            <Card className="p-4 bg-slate-700/30 border-slate-600 cursor-pointer hover:border-cyan-500/50 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-cyan-400" />
                  <div>
                    <div className="text-slate-100">Data & Privacy</div>
                    <div className="text-sm text-slate-400">Control your data</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>
            </Card>
            <div className="pt-4 border-t border-slate-700">
              <Button 
                variant="outline" 
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  toast.error('This feature is not available in demo mode');
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Popup */}
      {selectedConversation && (
        <ChatPopup
          isOpen={isChatPopupOpen}
          onClose={() => {
            setIsChatPopupOpen(false);
            setSelectedConversation(null);
          }}
          conversation={selectedConversation}
          userId={currentUser?.uid || 'demo-user'}
          demoMode={isDemoMode}
        />
      )}

      {/* Cancel Reservation Confirmation Dialog */}
      <AlertDialog open={reservationToCancel !== null} onOpenChange={(open) => !open && setReservationToCancel(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Cancel Reservation?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to cancel this reservation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600">
              Keep Reservation
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => reservationToCancel && handleCancelReservation(reservationToCancel)}
            >
              Cancel Reservation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
