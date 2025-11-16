import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Calendar } from './ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner';
import { getDemoData, demoUserProfile } from '../lib/demo-data';
import { signOutUser } from '../lib/firebase-auth';
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
  createReservation
} from '../lib/firebase-data';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile } from '../lib/types';
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
  Repeat,
  Save,
  X,
  Trash2,
  Lock,
  Mail,
  Smartphone,
  Shield,
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
  icon?: string;
  includes?: string[];
  restaurantId: string;
  restaurantName: string;
  restaurantImage?: string;
  date?: string;
  availableSlots?: string[];
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
  confirmationCode?: string;
  experience?: string;
  pointsEarned?: number;
  specialRequests?: string;
  createdAt?: string;
}

interface AIRecommendation {
  type: 'restaurant' | 'rebook' | 'experience' | 'time';
  title: string;
  description: string;
  restaurant?: MockRestaurant;
  action: string;
  confidence: number;
}

// Type for hours object from Firebase
type HoursObject = {
  [key: string]: { open: string; close: string } | 'closed';
};

// Type for hours - can be string or object
type Hours = string | HoursObject | undefined;

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
const roundToNearest15 = (date: Date): string => {
  const minutes = date.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  const newDate = new Date(date);
  newDate.setMinutes(roundedMinutes);
  newDate.setSeconds(0);
  
  const hours = newDate.getHours();
  const mins = newDate.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
};

const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 11; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour;
      slots.push(`${displayHour}:${minute.toString().padStart(2, '0')} ${period}`);
    }
  }
  return slots;
};

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

// ===== MOCK DATA =====
const mockExperiences: MockExperience[] = [
  {
    id: 'exp1',
    name: 'Wine Pairing Experience',
    description: 'Sommelier-curated wine pairing with each course',
    price: 75,
    icon: '🍷',
    includes: ['5 wine selections', 'Sommelier consultation', 'Pairing notes'],
    restaurantId: '1',
    restaurantName: 'Bella Vista',
    restaurantImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    date: '2025-10-30',
    availableSlots: ['6:00 PM', '6:30 PM', '7:00 PM', '8:00 PM'],
  },
  {
    id: 'exp2',
    name: "Chef's Table",
    description: 'Exclusive tasting menu prepared tableside by the head chef',
    price: 150,
    icon: '👨‍🍳',
    includes: ['8-course tasting menu', 'Chef interaction', 'Kitchen tour', 'Recipe card'],
    restaurantId: '2',
    restaurantName: 'Sakura House',
    restaurantImage: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=800&h=600&fit=crop',
    date: '2025-10-28',
    availableSlots: ['6:00 PM', '7:00 PM', '8:00 PM'],
  },
  {
    id: 'exp3',
    name: 'Celebration Package',
    description: 'Perfect for birthdays and anniversaries',
    price: 50,
    icon: '🎉',
    includes: ['Champagne toast', 'Dessert upgrade', 'Personalized card', 'Polaroid photo'],
    restaurantId: '1',
    restaurantName: 'Bella Vista',
    restaurantImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    date: '2025-11-01',
    availableSlots: ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'],
  },
  {
    id: 'exp4',
    name: 'Cocktail Masterclass',
    description: 'Learn to craft signature cocktails before dinner',
    price: 45,
    icon: '🍸',
    includes: ['3 cocktails', 'Recipe cards', 'Bar tools', 'Appetizer plate'],
    restaurantId: '4',
    restaurantName: 'Fusion Kitchen',
    restaurantImage: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=600&fit=crop',
    date: '2025-10-26',
    availableSlots: ['5:00 PM', '5:30 PM', '6:00 PM', '7:00 PM'],
  },
  {
    id: 'exp5',
    name: 'Truffle Tasting Menu',
    description: 'Five-course menu featuring seasonal truffles',
    price: 120,
    icon: '🍄',
    includes: ['5 courses', 'Truffle shavings', 'Wine pairing', 'Truffle butter to take home'],
    restaurantId: '5',
    restaurantName: 'Le Jardin',
    restaurantImage: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&h=600&fit=crop',
    date: '2025-11-05',
    availableSlots: ['6:00 PM', '6:30 PM', '8:00 PM'],
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

const mockAIRecommendations: AIRecommendation[] = [
  {
    type: 'rebook',
    title: '🎂 Anniversary Coming Up!',
    description: 'Your anniversary is in 2 weeks. We recommend Le Jardin - you had an amazing experience there last year!',
    restaurant: mockRestaurants[4],
    action: 'Book Le Jardin',
    confidence: 95,
  },
  {
    type: 'restaurant',
    title: '✨ Perfect for Tonight',
    description: 'Based on your love for Italian and the romantic ambiance, Bella Vista is ideal for your evening plans.',
    restaurant: mockRestaurants[0],
    action: 'View Bella Vista',
    confidence: 92,
  },
  {
    type: 'experience',
    title: '🍷 Try Wine Pairing',
    description: "You've never tried the wine pairing experience. Based on your preferences, you'll love it at Le Jardin.",
    restaurant: mockRestaurants[4],
    action: 'Explore Experiences',
    confidence: 88,
  },
  {
    type: 'time',
    title: '⏰ Better Availability',
    description: 'Booking at 6:30 PM instead of 7:00 PM gives you more table choices and shorter wait times.',
    action: 'See Recommendations',
    confidence: 85,
  },
];

// ===== COMPONENTS =====

// AI Concierge Card
interface AIConciergeCardProps {
  recommendation: AIRecommendation;
  onAction: () => void;
}

const AIConciergeCard = ({ recommendation, onAction }: AIConciergeCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className="p-5 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-cyan-500/30 hover:border-cyan-500/50 transition-all cursor-pointer relative overflow-hidden"
        onClick={onAction}
      >
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
              <div className="text-sm text-cyan-400">{recommendation.confidence}%</div>
            </div>
          </div>
          <h3 className="text-lg text-slate-100 mb-2">{recommendation.title}</h3>
          <p className="text-sm text-slate-400 mb-4">{recommendation.description}</p>
          <Button className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700">
            {recommendation.action}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

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
}: { 
  activeView?: 'discover' | 'experiences' | 'reservations' | 'waitlist' | 'profile';
  onViewChange?: (view: 'discover' | 'experiences' | 'reservations' | 'waitlist' | 'profile') => void;
  isDemoMode?: boolean;
  currentUser?: FirebaseUser | null;
  userProfile?: UserProfile | null;
} = {}) {
  const [activeView, setActiveView] = useState<'discover' | 'experiences' | 'reservations' | 'waitlist' | 'profile'>(externalActiveView || 'discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [committedSearchQuery, setCommittedSearchQuery] = useState(''); // Search query committed by button click
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>(roundToNearest15(new Date()));
  const [partySize, setPartySize] = useState('2');
  const [selectedRestaurant, setSelectedRestaurant] = useState<MockRestaurant | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_selectedExperience, setSelectedExperience] = useState<MockExperience | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_bookingStep, setBookingStep] = useState<'time' | 'experience' | 'confirm'>('time');
  const [reservationTime, setReservationTime] = useState('');
  const [reservationExperience, setReservationExperience] = useState<string | null>(null);
  const [modifyingReservation, setModifyingReservation] = useState<MockReservation | null>(null);
  
  // Data loading states
  const [restaurants, setRestaurants] = useState<MockRestaurant[]>([]);
  const [reservations, setReservations] = useState<MockReservation[]>([]);
  const [experiences, setExperiences] = useState<MockExperience[]>([]);
  const [waitlist, setWaitlist] = useState<MockWaitlistEntry[]>([]);
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<MockRestaurant[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [isLoadingExperiences, setIsLoadingExperiences] = useState(false);
  const [isLoadingWaitlist, setIsLoadingWaitlist] = useState(false);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  
  // Restaurant details dialog state
  const [viewingRestaurantDetails, setViewingRestaurantDetails] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  // Profile states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});

  // Settings dialog states
  const [openSettingsDialog, setOpenSettingsDialog] = useState<'personal' | 'payment' | 'dining' | 'notifications' | 'privacy' | null>(null);
  
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
      setRestaurants(transformedDemoRestaurants);
      setReservations(demoData.reservations as unknown as MockReservation[]);
      setExperiences(demoData.experiences as unknown as MockExperience[]);
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
      setExperiences(experiencesData as unknown as MockExperience[]);
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

  // Update activeView when external prop changes
  useEffect(() => {
    if (externalActiveView) {
      setActiveView(externalActiveView);
    }
  }, [externalActiveView]);

  // Handle view change
  const handleViewChange = (view: 'discover' | 'experiences' | 'reservations' | 'waitlist' | 'profile') => {
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
    setSelectedRestaurant(restaurant);
    setViewingRestaurantDetails(true);
    setBookingStep('time');
    setReservationTime('');
    setReservationExperience(null);
    
    // Check if restaurant is in favorites
    if (!isDemoMode && currentUser) {
      const favs = await fetchFavoriteRestaurants(currentUser.uid);
      setIsFavorite(favs.some(fav => fav.id === restaurant.id));
    }
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
    const restaurant = mockRestaurants.find(r => r.id === experience.restaurantId);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      setSelectedExperience(experience);
      setReservationExperience(experience.name);
      setBookingStep('time');
    }
  };

  const handleCompleteBooking = async () => {
    if (!selectedRestaurant || !reservationTime) return;

    // Create reservation in Firebase
    if (!isDemoMode && currentUser) {
      const reservationData = {
        userId: currentUser.uid,
        restaurantId: selectedRestaurant.id,
        restaurantName: selectedRestaurant.name,
        restaurantImage: selectedRestaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
        date: selectedDate.toISOString(),
        time: reservationTime,
        partySize: parseInt(partySize),
        status: 'confirmed' as const,
        specialRequests: reservationExperience || undefined,
        createdAt: new Date().toISOString(),
      };

      const reservationId = await createReservation(reservationData);
      
      if (reservationId) {
        toast.success(
          <div>
            <div className="font-bold">Reservation Confirmed!</div>
            <div className="text-sm">
              {selectedRestaurant.name} - {reservationTime}
              {reservationExperience && ` with ${reservationExperience}`}
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
            {selectedRestaurant.name} - {reservationTime}
            {reservationExperience && ` with ${reservationExperience}`}
          </div>
        </div>
      );
    }

    setSelectedRestaurant(null);
    setSelectedExperience(null);
    setReservationTime('');
    setReservationExperience(null);
    setViewingRestaurantDetails(false);
  };

  const handleModifyReservation = (reservation: MockReservation) => {
    const restaurant = mockRestaurants.find(r => r.id === reservation.restaurantId);
    if (restaurant) {
      setModifyingReservation(reservation);
      setSelectedRestaurant(restaurant);
      setReservationTime(reservation.time);
      setPartySize(reservation.partySize.toString());
      setBookingStep('time');
    }
  };

  const handleSaveModification = () => {
    toast.success('Reservation updated successfully!');
    setModifyingReservation(null);
    setSelectedRestaurant(null);
    setReservationTime('');
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
      });
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
    } else if (currentUser) {
      // Real mode: update Firebase
      const success = await updateUserProfile(currentUser.uid, editedProfile);
      if (success) {
        // Reload profile data
        const updated = await fetchUserProfile(currentUser.uid);
        setProfile(updated);
        toast.success('Profile updated successfully!');
        setIsEditingProfile(false);
      } else {
        toast.error('Failed to update profile');
      }
    }
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setEditedProfile({});
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
        {/* DISCOVER VIEW */}
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
                Find Your Perfect Dining Experience
              </h1>
              <p className="text-lg text-slate-400">
                AI-powered recommendations tailored to your taste
              </p>
            </div>

            {/* AI Recommendations - MOVED TO TOP */}
            <div>
              <h2 className="text-2xl text-slate-100 mb-4">AI Concierge Recommendations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockAIRecommendations.map((rec, idx) => (
                  <AIConciergeCard
                    key={idx}
                    recommendation={rec}
                    onAction={() => {
                      if (rec.type === 'experience') {
                        setActiveView('experiences');
                      } else if (rec.restaurant) {
                        handleBookRestaurant(rec.restaurant);
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Search Bar with Date, Time, and Party Size - NOW BELOW AI RECOMMENDATIONS */}
            <Card className="p-6 bg-slate-800/50 border-slate-700">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Search */}
                  <div className="md:col-span-1">
                    <Label className="text-slate-300 mb-2 block">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                      <Input
                        placeholder="Restaurant or cuisine"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-slate-700 border-slate-600 text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Date */}
                  <div>
                    <Label className="text-slate-300 mb-2 block">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start bg-slate-700 border-slate-600 text-slate-100"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => date && setSelectedDate(date)}
                          className="rounded-md"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Time */}
                  <div>
                    <Label className="text-slate-300 mb-2 block">Time</Label>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                        <Clock className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {generateTimeSlots().map(slot => (
                          <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Party Size */}
                  <div>
                    <Label className="text-slate-300 mb-2 block">Guests</Label>
                    <Select value={partySize} onValueChange={setPartySize}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100">
                        <Users className="mr-2 h-4 w-4" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
                          <SelectItem key={num} value={num.toString()}>
                            {num} {num === 1 ? 'Guest' : 'Guests'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search/Filter Button */}
                <div className="flex justify-center pt-4">
                  <Button 
                    size="lg"
                    className="group relative bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600 text-white shadow-xl hover:shadow-2xl hover:shadow-blue-500/50 px-16 py-6 rounded-xl transition-all duration-300 hover:scale-105 border border-blue-400/20"
                    onClick={() => {
                      // Commit the search query to trigger filtering
                      setCommittedSearchQuery(searchQuery);
                      
                      // Scroll to restaurant listings
                      const restaurantSection = document.querySelector('[data-section="restaurants"]');
                      if (restaurantSection) {
                        restaurantSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                      // Show toast with search criteria
                      const searchSummary = [
                        searchQuery && `"${searchQuery}"`,
                        selectedDate && selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        selectedTime,
                        `${partySize} ${partySize === '1' ? 'guest' : 'guests'}`
                      ].filter(Boolean).join(' • ');
                      
                      toast.success('Searching for tables...', {
                        description: searchSummary,
                        duration: 2000
                      });
                    }}
                  >
                    <Search className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                    <span className="tracking-wide">Find Tables</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Restaurant Listings */}
            <div data-section="restaurants">
              <h2 className="text-2xl text-slate-100 mb-4">Available Restaurants</h2>
              {isLoadingRestaurants ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">Loading restaurants...</p>
                </div>
              ) : filteredRestaurants.length === 0 ? (
                <Card className="p-12 bg-slate-800/50 border-slate-700 text-center">
                  <Utensils className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl text-slate-300 mb-2">No Restaurants Available</h3>
                  <p className="text-slate-500">
                    {committedSearchQuery ? 
                      `No restaurants found matching "${committedSearchQuery}". Try a different search.` : 
                      'No restaurants are available at the moment. Please check back later.'}
                  </p>
                  {committedSearchQuery && (
                    <Button 
                      className="mt-6 bg-blue-600 hover:bg-blue-700"
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRestaurants.map(restaurant => (
                  <motion.div
                    key={restaurant.id}
                    whileHover={{ scale: 1.02 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="overflow-hidden bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-all cursor-pointer"
                      onClick={() => handleBookRestaurant(restaurant)}
                    >
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

                        <div className="flex items-center gap-2">
                          <Button className="flex-1 bg-cyan-600 hover:bg-cyan-700">
                            View Details
                          </Button>
                          {restaurant.waitlistAvailable && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="border-slate-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJoinWaitlist(restaurant);
                              }}
                            >
                              <Timer className="w-4 h-4" />
                            </Button>
                          )}
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
              <TabsList className="bg-slate-800">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
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
                            onClick={() => {
                              const restaurant = mockRestaurants.find(r => r.id === res.restaurantId);
                              if (restaurant) {
                                handleBookRestaurant(restaurant);
                              }
                            }}
                          >
                            <Repeat className="w-4 h-4 mr-2" />
                            Rebook
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

                          <Button
                            className="bg-cyan-600 hover:bg-cyan-700"
                            onClick={() => {
                              const restaurant = mockRestaurants.find(r => r.id === res.restaurantId);
                              if (restaurant) {
                                handleBookRestaurant(restaurant);
                              }
                            }}
                          >
                            <Repeat className="w-4 h-4 mr-2" />
                            Rebook
                          </Button>
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
                  <div className="flex items-center gap-4">
                    <Avatar className="w-20 h-20">
                      {profile.photoURL && <AvatarImage src={profile.photoURL} />}
                      <AvatarFallback className="bg-cyan-600 text-white text-xl">
                        {profile.displayName?.substring(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-xl text-slate-100 mb-1">{profile.displayName}</h3>
                      <p className="text-sm text-slate-400 mb-2">@{profile.username}</p>
                      <p className="text-xs text-slate-500 mb-2">{profile.email}</p>
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

              {/* Dining Preferences */}
              <Card 
                className="p-5 bg-slate-800/50 border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-all"
                onClick={() => setOpenSettingsDialog('dining')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <Utensils className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-slate-100">Dining Preferences</div>
                      <div className="text-sm text-slate-500">Cuisine, dietary restrictions</div>
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
        setViewingRestaurantDetails(false);
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRestaurant && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl text-slate-100">
                      {modifyingReservation ? 'Modify Reservation' : 'Book a Table'}
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

              <div className="space-y-6 mt-4">
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
                  <h4 className="text-lg text-slate-100 mb-4">Make a Reservation</h4>
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

                {/* Add Experience (optional) */}
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
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                    onClick={modifyingReservation ? handleSaveModification : handleCompleteBooking}
                    disabled={!reservationTime}
                  >
                    {modifyingReservation ? 'Save Changes' : 'Confirm Booking'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md">
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
                  {editedProfile.photoURL && <AvatarImage src={editedProfile.photoURL} />}
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
                        // Convert to data URL for preview
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditedProfile({ ...editedProfile, photoURL: reader.result as string });
                        };
                        reader.readAsDataURL(file);
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
            <Button className="w-full bg-cyan-600 hover:bg-cyan-700">
              <Plus className="w-4 h-4 mr-2" />
              Add New Card
            </Button>
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
    </div>
  );
};
