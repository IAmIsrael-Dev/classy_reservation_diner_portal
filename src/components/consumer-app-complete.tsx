import { useState } from 'react';
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
  Repeat,
  Plus,
  Home,
  ListChecks,
  CircleUser,
} from 'lucide-react';

// ===== TYPES =====
interface Restaurant {
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
  experiences?: Experience[];
  ambiance?: {
    noiseLevel: 'Quiet' | 'Moderate' | 'Lively';
    lighting: 'Dim' | 'Ambient' | 'Bright';
    vibe: string[];
  };
  dietary?: string[];
  waitlistAvailable?: boolean;
  currentWaitTime?: number;
}

interface Experience {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  includes: string[];
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  date: string;
  availableSlots: string[];
}

interface Reservation {
  id: string;
  restaurantName: string;
  restaurantId: string;
  restaurantImage: string;
  restaurantAddress: string;
  date: string;
  time: string;
  partySize: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  confirmationCode: string;
  experience?: string;
  pointsEarned?: number;
}

interface WaitlistEntry {
  id: string;
  restaurantName: string;
  restaurantImage: string;
  position: number;
  totalWaiting: number;
  estimatedWait: number;
  partySize: number;
  notifyReady: boolean;
}

interface AIRecommendation {
  type: 'restaurant' | 'rebook' | 'experience' | 'time';
  title: string;
  description: string;
  restaurant?: Restaurant;
  action: string;
  confidence: number;
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

// ===== MOCK DATA =====
const mockExperiences: Experience[] = [
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

const mockRestaurants: Restaurant[] = [
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

const mockReservations: Reservation[] = [
  {
    id: 'res-1',
    restaurantName: 'Bella Vista',
    restaurantId: '1',
    restaurantImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    restaurantAddress: '123 Main Street, Downtown',
    date: '2025-10-28',
    time: '7:00 PM',
    partySize: 2,
    status: 'upcoming',
    confirmationCode: 'BV2341',
    experience: 'Wine Pairing Experience',
  },
  {
    id: 'res-2',
    restaurantName: 'Sakura House',
    restaurantId: '2',
    restaurantImage: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=800&h=600&fit=crop',
    restaurantAddress: '456 Oak Avenue, Midtown',
    date: '2025-10-30',
    time: '8:00 PM',
    partySize: 4,
    status: 'upcoming',
    confirmationCode: 'SH7892',
  },
  {
    id: 'res-3',
    restaurantName: 'The Steakhouse',
    restaurantId: '3',
    restaurantImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
    restaurantAddress: '789 Elm Street, Financial District',
    date: '2025-10-10',
    time: '7:30 PM',
    partySize: 6,
    status: 'completed',
    confirmationCode: 'TS5612',
    pointsEarned: 720,
  },
  {
    id: 'res-4',
    restaurantName: 'Le Jardin',
    restaurantId: '5',
    restaurantImage: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800&h=600&fit=crop',
    restaurantAddress: '567 Maple Drive, West End',
    date: '2024-10-15',
    time: '8:00 PM',
    partySize: 2,
    status: 'completed',
    confirmationCode: 'LJ3421',
    experience: 'Wine Pairing Experience',
    pointsEarned: 890,
  },
];

const mockWaitlist: WaitlistEntry[] = [
  {
    id: 'wait-1',
    restaurantName: 'Bella Vista',
    restaurantImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    position: 3,
    totalWaiting: 12,
    estimatedWait: 25,
    partySize: 2,
    notifyReady: true,
  },
  {
    id: 'wait-2',
    restaurantName: 'The Steakhouse',
    restaurantImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop',
    position: 1,
    totalWaiting: 8,
    estimatedWait: 10,
    partySize: 4,
    notifyReady: true,
  },
  {
    id: 'wait-3',
    restaurantName: 'Fusion Kitchen',
    restaurantImage: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&h=600&fit=crop',
    position: 5,
    totalWaiting: 15,
    estimatedWait: 35,
    partySize: 6,
    notifyReady: false,
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
  experience: Experience;
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
            src={experience.restaurantImage}
            alt={experience.restaurantName}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 right-3">
            <Badge className="bg-purple-500/90 text-white border-0">
              Experience
            </Badge>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="text-2xl mb-1">{experience.icon}</div>
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
            {experience.includes.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-slate-500">
                <Check className="w-3 h-3 text-green-400" />
                {item}
              </div>
            ))}
          </div>

          <div className="pt-2">
            <div className="text-xs text-slate-500 mb-2">Available: {experience.date}</div>
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
  entry: WaitlistEntry;
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
export function ConsumerApp() {
  const [activeView, setActiveView] = useState<'discover' | 'experiences' | 'reservations' | 'waitlist' | 'profile'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>(roundToNearest15(new Date()));
  const [partySize, setPartySize] = useState('2');
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [, setSelectedExperience] = useState<Experience | null>(null);
  const [, setBookingStep] = useState<'time' | 'experience' | 'confirm'>('time');
  const [reservationTime, setReservationTime] = useState('');
  const [reservationExperience, setReservationExperience] = useState<string | null>(null);
  const [modifyingReservation, setModifyingReservation] = useState<Reservation | null>(null);

  // Filter restaurants based on search
  const filteredRestaurants = mockRestaurants.filter(restaurant =>
    restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    restaurant.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
    restaurant.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter experiences based on search
  const filteredExperiences = mockExperiences.filter(exp =>
    exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exp.restaurantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleBookRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setBookingStep('time');
    setReservationTime('');
    setReservationExperience(null);
  };

  const handleBookExperience = (experience: Experience) => {
    const restaurant = mockRestaurants.find(r => r.id === experience.restaurantId);
    if (restaurant) {
      setSelectedRestaurant(restaurant);
      setSelectedExperience(experience);
      setReservationExperience(experience.name);
      setBookingStep('time');
    }
  };

  const handleCompleteBooking = () => {
    toast.success(
      <div>
        <div className="font-bold">Reservation Confirmed!</div>
        <div className="text-sm">
          {selectedRestaurant?.name} - {reservationTime}
          {reservationExperience && ` with ${reservationExperience}`}
        </div>
      </div>
    );
    setSelectedRestaurant(null);
    setSelectedExperience(null);
    setReservationTime('');
    setReservationExperience(null);
  };

  const handleModifyReservation = (reservation: Reservation) => {
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

  const handleJoinWaitlist = (restaurant: Restaurant) => {
    toast.success(`Added to waitlist at ${restaurant.name}`);
  };

  const handleLeaveWaitlist = () => {
    toast.info('Removed from waitlist');
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Navigation */}
      <div className="bg-slate-950 sticky top-0 z-50 border-b border-slate-800/50">
        <div className="container mx-auto px-6 py-3 max-w-7xl">
          {/* Pill Navigation */}
          <div className="flex items-center gap-4">
            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeView === 'discover'
                  ? 'bg-slate-800/80 text-white shadow-inner'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveView('discover')}
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Dashboard</span>
            </button>

            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeView === 'experiences'
                  ? 'bg-slate-800/80 text-white shadow-inner'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveView('experiences')}
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm">Experiences</span>
            </button>

            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeView === 'reservations'
                  ? 'bg-slate-800/80 text-white shadow-inner'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveView('reservations')}
            >
              <ListChecks className="w-4 h-4" />
              <span className="text-sm">Reservations</span>
            </button>

            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeView === 'waitlist'
                  ? 'bg-slate-800/80 text-white shadow-inner'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveView('waitlist')}
            >
              <Timer className="w-4 h-4" />
              <span className="text-sm">Waitlist</span>
            </button>

            <button
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeView === 'profile'
                  ? 'bg-slate-800/80 text-white shadow-inner'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActiveView('profile')}
            >
              <CircleUser className="w-4 h-4" />
              <span className="text-sm">Profile</span>
            </button>
          </div>
        </div>
      </div>

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
            </Card>

            {/* Restaurant Listings */}
            <div>
              <h2 className="text-2xl text-slate-100 mb-4">Available Restaurants</h2>
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

                        {restaurant.ambiance && (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExperiences.map(experience => (
                <ExperienceCard
                  key={experience.id}
                  experience={experience}
                  onBook={() => handleBookExperience(experience)}
                />
              ))}
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
              <TabsList className="bg-slate-800">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4 mt-6">
                {mockReservations.filter(r => r.status === 'upcoming').map(res => (
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
                          <div className="text-sm text-slate-400 mb-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {res.restaurantAddress}
                          </div>
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

                        <div className="text-xs text-slate-500">
                          Confirmation: {res.confirmationCode}
                        </div>

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
                {mockReservations.filter(r => r.status === 'completed').map(res => (
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
                {mockWaitlist.length} Active
              </Badge>
            </div>

            <div className="space-y-4">
              {mockWaitlist.map(entry => (
                <WaitlistCard
                  key={entry.id}
                  entry={entry}
                  onLeave={() => handleLeaveWaitlist()}
                />
              ))}
            </div>

            {mockWaitlist.length === 0 && (
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

            {/* Profile Header */}
            <Card className="p-6 bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop" />
                  <AvatarFallback className="bg-cyan-600 text-white text-xl">JD</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl text-slate-100 mb-1">John Doe</h3>
                  <p className="text-sm text-slate-400 mb-2">john.doe@example.com</p>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    <Award className="w-3 h-3 mr-1" />
                    Gold Member
                  </Badge>
                </div>
                <Button variant="outline" size="sm" className="border-slate-600">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </Card>

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
              <Card className="p-5 bg-slate-800/50 border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-all">
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
              <Card className="p-5 bg-slate-800/50 border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-slate-100">Payment Methods</div>
                      <div className="text-sm text-slate-500">2 cards saved</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
              </Card>

              {/* Dining Preferences */}
              <Card className="p-5 bg-slate-800/50 border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-all">
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
              <Card className="p-5 bg-slate-800/50 border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-all">
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
              <Card className="p-5 bg-slate-800/50 border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-all">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockRestaurants.slice(0, 4).map(restaurant => (
                  <Card key={restaurant.id} className="p-4 bg-slate-800/50 border-slate-700 hover:border-cyan-500/50 transition-all cursor-pointer">
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
              onClick={() => toast.info('Sign out functionality')}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </motion.div>
        )}
      </div>

      {/* Booking Dialog */}
      <Dialog open={selectedRestaurant !== null} onOpenChange={() => {
        setSelectedRestaurant(null);
        setSelectedExperience(null);
        setModifyingReservation(null);
        setReservationTime('');
        setReservationExperience(null);
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedRestaurant && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl text-slate-100">
                  {modifyingReservation ? 'Modify Reservation' : 'Book a Table'}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  {selectedRestaurant.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Restaurant Image */}
                <div className="relative h-48 rounded-lg overflow-hidden">
                  <img
                    src={selectedRestaurant.image}
                    alt={selectedRestaurant.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Select Time */}
                <div>
                  <Label className="text-slate-300 mb-2 block">Select Time</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedRestaurant.availableSlots.map(slot => (
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
                      {selectedRestaurant.experiences.map(exp => (
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
    </div>
  );
};
