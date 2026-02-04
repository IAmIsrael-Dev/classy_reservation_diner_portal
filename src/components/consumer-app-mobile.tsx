import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { getDemoData, demoUserProfile } from '../lib/demo-data';
import { signOutUser, uploadProfilePicture } from '../lib/firebase-auth';
import { 
  fetchRestaurants, 
  fetchUserReservations,
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
import { getUserRecommendations, type AIRecommendation as FirebaseAIRecommendation } from '../lib/firebase-recommendations';
import { ConversationsList } from './conversations-list';
import { ConversationChat } from './conversation-chat';
import { getOrCreateConversation } from '../lib/firebase-conversations';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile, Conversation } from '../lib/types';
import {
  Search,
  MapPin,
  Star,
  Calendar,
  Heart,
  Utensils,
  History,
  Bookmark,
  Home,
  User,
  Check,
  X,
  Phone,
  Mail,
  Edit2,
  Save,
  ChevronRight,
  CreditCard,
  Bell,
  Settings,
  Trash2,
  Lock,
  Smartphone,
  Shield,
  LogOut,
  Plus,
  Clock,
  Sparkles,
  MessageSquare,
  Edit,
} from 'lucide-react';

// Local mock restaurant interface for demo UI
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
  ambiance?: {
    noiseLevel: 'Quiet' | 'Moderate' | 'Lively';
    lighting: 'Dim' | 'Ambient' | 'Bright';
    vibe: string[];
  };
  dietary?: string[];
}

interface MockReservation {
  id: string;
  userId: string;
  restaurantName: string;
  restaurantId: string;
  restaurantImage?: string;
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
    address: '123 Downtown Ave',
    hours: 'Mon-Sun 5:00 PM - 11:00 PM',
    features: ['Outdoor Seating', 'Full Bar', 'Private Dining', 'Valet Parking'],
    availableSlots: ['5:00 PM', '5:30 PM', '7:00 PM', '7:30 PM', '9:00 PM'],
    ambiance: {
      noiseLevel: 'Moderate',
      lighting: 'Ambient',
      vibe: ['Romantic', 'Upscale', 'City Views']
    },
    dietary: ['Vegetarian Options', 'Gluten-Free Options']
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
    address: '456 Sakura Lane',
    hours: 'Tue-Sat 6:00 PM - 10:00 PM',
    features: ['Sushi Bar', 'Sake Selection', 'Omakase Experience', 'Private Rooms'],
    availableSlots: ['6:00 PM', '6:30 PM', '8:00 PM', '8:30 PM'],
    ambiance: {
      noiseLevel: 'Quiet',
      lighting: 'Dim',
      vibe: ['Intimate', 'Traditional', 'Authentic']
    },
    dietary: ['Pescatarian', 'Gluten-Free Options']
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
    address: '789 Prime Street',
    hours: 'Mon-Sun 5:00 PM - 10:30 PM',
    features: ['Dry-Aged Steaks', 'Wine Cellar', 'Private Dining', 'Cigar Lounge'],
    availableSlots: ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'],
    ambiance: {
      noiseLevel: 'Moderate',
      lighting: 'Dim',
      vibe: ['Classic', 'Elegant', 'Business']
    },
    dietary: ['Gluten-Free Options']
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
    address: '321 Fusion Blvd',
    hours: 'Mon-Sun 11:30 AM - 11:00 PM',
    features: ['Happy Hour', 'Craft Cocktails', 'Small Plates', 'Patio Seating'],
    availableSlots: ['5:30 PM', '6:00 PM', '7:30 PM', '8:00 PM', '9:30 PM'],
    ambiance: {
      noiseLevel: 'Lively',
      lighting: 'Bright',
      vibe: ['Trendy', 'Casual', 'Social']
    },
    dietary: ['Vegan Options', 'Vegetarian Options', 'Gluten-Free Options']
  },
  {
    id: '5',
    name: 'Taco Haven',
    cuisine: 'Mexican',
    rating: 4.5,
    reviews: 567,
    priceLevel: 1,
    distance: '0.3 mi',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop',
    description: 'Authentic Mexican street food with handmade tortillas and fresh ingredients.',
    address: '654 Taco Street',
    hours: 'Mon-Sun 11:00 AM - 10:00 PM',
    features: ['Outdoor Seating', 'Margaritas', 'Takeout', 'Family Friendly'],
    availableSlots: ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'],
    ambiance: {
      noiseLevel: 'Lively',
      lighting: 'Bright',
      vibe: ['Casual', 'Family Friendly', 'Authentic']
    },
    dietary: ['Vegetarian Options', 'Vegan Options']
  },
];

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
        return `Open today: ${todayHours.open} - ${todayHours.close}`;
      }
    }
    
    // Fallback: show first available day
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of days) {
      const dayHours = hours[day];
      if (dayHours && dayHours !== 'closed' && typeof dayHours === 'object') {
        const dayName = day.charAt(0).toUpperCase() + day.slice(1);
        return `${dayName}: ${dayHours.open} - ${dayHours.close}`;
      }
    }
    
    // If all days are closed or no valid hours
    if (Object.keys(hours).length > 0) {
      return 'Closed today';
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
    distance: firebaseRestaurant.distance || 'N/A',
    image: Array.isArray(firebaseRestaurant.images) && firebaseRestaurant.images.length > 0
      ? firebaseRestaurant.images[0]
      : 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
    description: firebaseRestaurant.description || '',
    address: firebaseRestaurant.address || 'Address not available',
    hours: hoursString,
    features: firebaseRestaurant.features || [],
    availableSlots: firebaseRestaurant.availableSlots || [],
    ambiance: firebaseRestaurant.ambiance ? {
      noiseLevel: firebaseRestaurant.ambiance.noiseLevel || 'Moderate',
      lighting: firebaseRestaurant.ambiance.lighting || 'Ambient',
      vibe: firebaseRestaurant.ambiance.vibe || []
    } : undefined,
    dietary: firebaseRestaurant.dietary || firebaseRestaurant.dietaryOptions || [],
  };
};

export function ConsumerAppMobile({ 
  activeTab: externalActiveTab,
  onTabChange,
  isDemoMode = false,
  currentUser
}: { 
  activeTab?: 'home' | 'reservations' | 'saved' | 'waitlist' | 'messages' | 'profile';
  onTabChange?: (tab: 'home' | 'reservations' | 'saved' | 'waitlist' | 'messages' | 'profile') => void;
  isDemoMode?: boolean;
  currentUser?: FirebaseUser | null;
  userProfile?: UserProfile | null;
} = {}) {
  const [activeTab, setActiveTab] = useState<'home' | 'reservations' | 'saved' | 'waitlist' | 'messages' | 'profile'>(externalActiveTab || 'home');
  const [searchQuery, setSearchQuery] = useState('');
  const [committedSearchQuery, setCommittedSearchQuery] = useState(''); // Search query committed by button click
  const [partySize, setPartySize] = useState(2);
  const [selectedRestaurant, setSelectedRestaurant] = useState<MockRestaurant | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [savedRestaurants, setSavedRestaurants] = useState<string[]>([]);
  const [modifyingReservation, setModifyingReservation] = useState<MockReservation | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_bookingType] = useState<'table' | 'experience'>('table'); // Reserved for future dual booking implementation
  const [showAllRestaurants, setShowAllRestaurants] = useState(false); // For All Restaurants modal
  const [quickReservationDialog, setQuickReservationDialog] = useState(false);
  const [quickReservationRestaurant, setQuickReservationRestaurant] = useState<MockRestaurant | null>(null);
  const [quickReservationDate, setQuickReservationDate] = useState<Date>(new Date());
  const [quickReservationTime, setQuickReservationTime] = useState('');
  const [quickReservationPartySize, setQuickReservationPartySize] = useState(2);
  
  // Data states
  const [restaurants, setRestaurants] = useState<MockRestaurant[]>(mockRestaurants);
  const [reservations, setReservations] = useState<MockReservation[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<FirebaseAIRecommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [waitlistEntries, setWaitlistEntries] = useState<MockWaitlistEntry[]>([]);
  const [isLoadingWaitlist, setIsLoadingWaitlist] = useState(false);
  const [favoriteRestaurants, setFavoriteRestaurants] = useState<MockRestaurant[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);

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
  const [isChatViewOpen, setIsChatViewOpen] = useState(false);
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
      // Use mockRestaurants for now since demo restaurants don't have availableSlots
      setRestaurants(mockRestaurants);
      setReservations(demoData.reservations as unknown as MockReservation[]);
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
      // Transform Firebase restaurant data to match local MockRestaurant interface
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
    } finally {
      setIsLoadingReservations(false);
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

    // Fetch AI recommendations
    setIsLoadingRecommendations(true);
    try {
      const recommendations = await getUserRecommendations(currentUser.uid, 5);
      setAiRecommendations(recommendations);
    } catch (error) {
      console.error('Error loading AI recommendations:', error);
      setAiRecommendations([]); // Set empty array on error
    } finally {
      setIsLoadingRecommendations(false);
    }

    // Fetch waitlist entries
    setIsLoadingWaitlist(true);
    try {
      const waitlistData = await fetchUserWaitlist(currentUser.uid);
      setWaitlistEntries(waitlistData as unknown as MockWaitlistEntry[]);
    } catch (error) {
      console.error('Error loading waitlist:', error);
      setWaitlistEntries([]); // Set empty array on error
    } finally {
      setIsLoadingWaitlist(false);
    }

    // Fetch user's favorite restaurants
    setIsLoadingFavorites(true);
    try {
      const favoritesData = await fetchFavoriteRestaurants(currentUser.uid);
      const transformedFavorites = favoritesData.map(transformToMockRestaurant);
      setFavoriteRestaurants(transformedFavorites);
    } catch (error) {
      console.error('Error loading favorites:', error);
      setFavoriteRestaurants([]); // Set empty array on error
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

  // Update activeTab when external prop changes
  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  // Handle tab change
  const handleTabChange = (tab: 'home' | 'reservations' | 'saved' | 'waitlist' | 'messages' | 'profile') => {
    setActiveTab(tab);
    // Reset chat view when leaving messages tab
    if (tab !== 'messages') {
      setIsChatViewOpen(false);
      setSelectedConversation(null);
    }
    if (onTabChange) {
      onTabChange(tab);
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
        setIsChatViewOpen(true); // Open chat view with the conversation
        setActiveTab('messages'); // Navigate to messages tab
        toast.success('Opening conversation with ' + reservation.restaurantName);
      } else {
        toast.error('Failed to open conversation');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  const handleModifyReservation = (reservation: MockReservation) => {
    const restaurant = restaurants.find(r => r.id === reservation.restaurantId);
    if (restaurant) {
      setModifyingReservation(reservation);
      setSelectedRestaurant(restaurant);
      setSelectedTime(reservation.time);
      setPartySize(reservation.partySize);
      // Parse and set the date from the reservation
      try {
        const reservationDate = new Date(reservation.date);
        setSelectedDate(reservationDate);
      } catch {
        setSelectedDate(new Date()); // Fallback to today if date parsing fails
      }
    }
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

  const handleSaveModification = async () => {
    if (!modifyingReservation) return;

    if (isDemoMode) {
      setReservations(reservations.map(r => 
        r.id === modifyingReservation.id 
          ? { ...r, date: selectedDate.toLocaleDateString(), time: selectedTime, partySize: partySize }
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
          time: selectedTime,
          partySize: partySize
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
    setSelectedTime('');
  };

  const handleBooking = async () => {
    if (!selectedRestaurant || !selectedTime) {
      toast.error('Please select a time');
      return;
    }

    // Create reservation in Firebase
    if (!isDemoMode && currentUser) {
      const reservationData = {
        userId: currentUser.uid,
        restaurantId: selectedRestaurant.id,
        restaurantName: selectedRestaurant.name,
        restaurantImage: selectedRestaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
        date: selectedDate.toISOString(),
        time: selectedTime,
        partySize: partySize,
        status: 'confirmed' as const,
        createdAt: new Date().toISOString(),
        type: 'table' as const,
      };

      const reservationId = await createReservation(reservationData);
      
      if (reservationId) {
        toast.success('Reservation confirmed!');
        
        // Refresh reservations list
        const reservationsData = await fetchUserReservations(currentUser.uid);
        setReservations(reservationsData as unknown as MockReservation[]);
      } else {
        toast.error('Failed to create reservation');
        return;
      }
    } else {
      // Demo mode - create local reservation
      const newReservation: MockReservation = {
        id: `res-${Date.now()}`,
        userId: currentUser?.uid || 'demo-user',
        restaurantId: selectedRestaurant.id,
        restaurantName: selectedRestaurant.name,
        restaurantImage: selectedRestaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
        date: selectedDate.toISOString().split('T')[0],
        time: selectedTime,
        partySize,
        status: 'confirmed',
        confirmationCode: `${selectedRestaurant.name.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000 + 1000)}`,
        type: 'table',
      };

      setReservations([newReservation, ...reservations]);
      toast.success('Reservation confirmed! (Demo Mode)');
    }

    setSelectedRestaurant(null);
    setSelectedTime('');
    handleTabChange('reservations');
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
        partySize: quickReservationPartySize,
        status: 'confirmed' as const,
        type: 'table' as const,
        createdAt: new Date().toISOString(),
      };

      const reservationId = await createReservation(reservationData);
      
      if (reservationId) {
        toast.success('Reservation confirmed!');
        
        // Refresh reservations list
        const reservationsData = await fetchUserReservations(currentUser.uid);
        setReservations(reservationsData as unknown as MockReservation[]);
      } else {
        toast.error('Failed to create reservation');
        return;
      }
    } else {
      // Demo mode - just show success toast
      toast.success('Reservation confirmed! (Demo Mode)');
    }

    // Close dialog and reset
    setQuickReservationDialog(false);
    setQuickReservationRestaurant(null);
    setQuickReservationTime('');
    setQuickReservationDate(new Date());
    setQuickReservationPartySize(2);
    handleTabChange('reservations');
  };

  const toggleSave = async (restaurantId: string) => {
    if (isDemoMode) {
      // Demo mode - use local state
      if (savedRestaurants.includes(restaurantId)) {
        setSavedRestaurants(savedRestaurants.filter(id => id !== restaurantId));
        toast.success('Removed from saved (demo mode)');
      } else {
        setSavedRestaurants([...savedRestaurants, restaurantId]);
        toast.success('Added to saved (demo mode)');
      }
    } else if (currentUser) {
      // Firebase mode - persist to database
      const isFavorited = favoriteRestaurants.some(fav => fav.id === restaurantId);
      
      if (isFavorited) {
        const success = await removeFavoriteRestaurant(currentUser.uid, restaurantId);
        if (success) {
          // Refresh favorites list
          const favoritesData = await fetchFavoriteRestaurants(currentUser.uid);
          const transformedFavorites = favoritesData.map(transformToMockRestaurant);
          setFavoriteRestaurants(transformedFavorites);
          toast.success('Removed from saved');
        } else {
          toast.error('Failed to remove from saved');
        }
      } else {
        const success = await addFavoriteRestaurant(currentUser.uid, restaurantId);
        if (success) {
          // Refresh favorites list
          const favoritesData = await fetchFavoriteRestaurants(currentUser.uid);
          const transformedFavorites = favoritesData.map(transformToMockRestaurant);
          setFavoriteRestaurants(transformedFavorites);
          toast.success('Added to saved');
        } else {
          toast.error('Failed to add to saved');
        }
      }
    }
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
      // On mobile, open full-screen edit profile view
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

  // Filter restaurants based on committed search (only when button is clicked)
  const filteredRestaurants = restaurants.filter(
    (r) =>
      (r?.name?.toLowerCase() || '').includes(committedSearchQuery.toLowerCase()) ||
      (r?.cuisine?.toLowerCase() || '').includes(committedSearchQuery.toLowerCase())
  );

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
    <div className="min-h-screen bg-slate-900 pb-20 sm:pb-24">
      {/* Content */}
      <div className="px-3 sm:px-4 py-4 sm:py-6">
        {activeTab === 'home' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Page Title */}
            <div>
              <h2 className="text-xl sm:text-2xl text-slate-100">
                Discover{' '}
                <span className="text-blue-400">Restaurants</span>
              </h2>
              <p className="text-sm sm:text-base text-slate-400 mt-1">Browse and book tables at the best dining spots</p>
            </div>

            {/* AI Concierge Recommendations */}
            {!isDemoMode && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-lg text-slate-100">AI Concierge</h3>
                </div>

                {isLoadingRecommendations ? (
                  <Card className="p-5 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-cyan-500/30">
                    <p className="text-center text-slate-400">Loading recommendations...</p>
                  </Card>
                ) : aiRecommendations.length === 0 ? (
                  <Card className="p-6 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-cyan-500/30 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-3xl" />
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <h4 className="text-slate-200 mb-2">No Recommendations Yet</h4>
                      <p className="text-sm text-slate-400">
                        Make a few reservations and our AI will start personalizing suggestions for you
                      </p>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {aiRecommendations.map((rec) => (
                      <motion.div
                        key={rec.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card className="p-4 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border-cyan-500/30 active:border-cyan-500/50 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full blur-2xl" />
                          <div className="relative">
                            <div className="flex items-start justify-between mb-2">
                              <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">
                                AI Recommended
                              </Badge>
                              <span className="text-xs text-cyan-400">{rec.confidence}%</span>
                            </div>
                            <h4 className="text-slate-100 mb-1">{rec.title}</h4>
                            <p className="text-sm text-slate-400 mb-3 line-clamp-2">{rec.description}</p>
                            <Button 
                              size="sm" 
                              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                              onClick={() => {
                                // Handle action based on recommendation type
                                if (rec.type === 'restaurant' && rec.restaurantId) {
                                  const restaurant = restaurants.find(r => r.id === rec.restaurantId);
                                  if (restaurant) {
                                    setSelectedRestaurant(restaurant);
                                    setSelectedDate(new Date()); // Reset to today for new bookings
                                  }
                                }
                                toast.success(`Opening ${rec.action}...`);
                              }}
                            >
                              {rec.action}
                              <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Featured Restaurants */}
            <div data-section="restaurants-mobile">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-slate-100">Nearby Restaurants</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-cyan-400 hover:text-cyan-300"
                  onClick={() => setShowAllRestaurants(true)}
                >
                  See All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {isLoadingRestaurants ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">Loading restaurants...</p>
                </div>
              ) : restaurants.length === 0 ? (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <Utensils className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-slate-300 mb-2">No Restaurants Available</h3>
                  <p className="text-sm text-slate-500">
                    No restaurants are available at the moment
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {restaurants.map((restaurant) => (
                    <motion.div
                      key={restaurant.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        // Open quick reservation dialog
                        setQuickReservationRestaurant(restaurant);
                        setQuickReservationDialog(true);
                        setQuickReservationDate(new Date());
                        setQuickReservationTime('');
                        setQuickReservationPartySize(2);
                      }}
                    >
                      <Card className="overflow-hidden bg-slate-800 border-slate-700 active:bg-slate-750">
                        <div className="flex gap-4">
                          <div
                            className="w-24 h-24 bg-cover bg-center flex-shrink-0"
                            style={{ backgroundImage: `url(${restaurant.image})` }}
                          />
                          <div className="flex-1 py-3 pr-3 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-slate-100 truncate pr-2">{restaurant.name}</h4>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="flex-shrink-0 -mt-1 -mr-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSave(restaurant.id);
                                }}
                              >
                                <Heart
                                  className={`w-5 h-5 ${
                                    (isDemoMode 
                                      ? savedRestaurants.includes(restaurant.id)
                                      : favoriteRestaurants.some(fav => fav.id === restaurant.id)
                                    )
                                      ? 'fill-red-500 text-red-500'
                                      : 'text-slate-400'
                                  }`}
                                />
                              </Button>
                            </div>

                            <div className="flex items-center gap-2 mb-2 text-xs text-slate-400">
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                <span>{restaurant.rating}</span>
                              </div>
                              <span>•</span>
                              <span>{restaurant.cuisine}</span>
                              <span>•</span>
                              <span>{'$'.repeat(restaurant.priceLevel)}</span>
                            </div>

                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="w-3 h-3" />
                              <span>{restaurant.distance}</span>
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

        {activeTab === 'reservations' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <h2 className="text-xl sm:text-2xl text-slate-100 mb-4">My Reservations</h2>

            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="bg-slate-800/50 border border-slate-700 p-1 w-full grid grid-cols-2 mb-6">
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

              <TabsContent value="upcoming" className="mt-0">
              <div>
              {isLoadingReservations ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">Loading reservations...</p>
                </div>
              ) : reservations.filter((r) => r.status === 'confirmed' || r.status === 'pending').length === 0 ? (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-slate-400">No upcoming reservations</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {reservations
                    .filter((r) => r.status === 'confirmed' || r.status === 'pending')
                    .map((reservation) => (
                    <Card key={reservation.id} className="p-4 bg-slate-800 border-slate-700">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Utensils className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-slate-100 mb-1">{reservation.restaurantName}</h4>
                          <Badge className="bg-green-500/20 text-green-400 text-xs">
                            Confirmed
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <div className="text-slate-500 mb-1">Date</div>
                          <div className="text-slate-300">
                            {new Date(reservation.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-1">Time</div>
                          <div className="text-slate-300">{reservation.time}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 mb-1">Guests</div>
                          <div className="text-slate-300">{reservation.partySize}</div>
                        </div>
                      </div>

                      {reservation.confirmationCode && (
                        <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
                          Confirmation: #{reservation.confirmationCode}
                        </div>
                      )}

                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-slate-700"
                          onClick={() => handleModifyReservation(reservation)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Modify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-slate-700"
                          onClick={() => handleMessageRestaurant(reservation)}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Message
                        </Button>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => setReservationToCancel(reservation.id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancel Reservation
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
              </div>
              </TabsContent>

              <TabsContent value="past" className="mt-0">
                {isLoadingReservations ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400">Loading past reservations...</p>
                  </div>
                ) : reservations.filter((r) => r.status === 'completed').length === 0 ? (
                  <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                    <p className="text-slate-400">No past reservations</p>
                    <p className="text-slate-500 text-sm mt-2">Your dining history will appear here</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {reservations
                      .filter((r) => r.status === 'completed')
                      .map((reservation) => (
                        <Card key={reservation.id} className="p-4 bg-slate-800/50 border-slate-700">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Utensils className="w-6 h-6 text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-slate-100 mb-1">{reservation.restaurantName}</h4>
                              <Badge className="bg-slate-500/20 text-slate-400 text-xs">
                                Completed
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div>
                              <div className="text-slate-500 mb-1">Date</div>
                              <div className="text-slate-300">
                                {new Date(reservation.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-500 mb-1">Time</div>
                              <div className="text-slate-300">{reservation.time}</div>
                            </div>
                            <div>
                              <div className="text-slate-500 mb-1">Guests</div>
                              <div className="text-slate-300">{reservation.partySize}</div>
                            </div>
                          </div>

                          {reservation.pointsEarned && (
                            <div className="mt-3 pt-3 border-t border-slate-700 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-400">Points Earned</span>
                                <span className="text-cyan-400 font-semibold">+{reservation.pointsEarned}</span>
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        )}

        {activeTab === 'saved' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <h2 className="text-xl sm:text-2xl text-slate-100">Saved</h2>

            {isLoadingFavorites ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Loading saved restaurants...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(isDemoMode 
                  ? mockRestaurants.filter((r) => savedRestaurants.includes(r.id))
                  : favoriteRestaurants
                ).map((restaurant) => (
                  <Card
                    key={restaurant.id}
                    className="overflow-hidden bg-slate-800 border-slate-700"
                  >
                    <div
                      className="h-40 bg-cover bg-center"
                      style={{ backgroundImage: `url(${restaurant.image})` }}
                    />
                    <div className="p-4">
                      <h4 className="text-lg text-slate-100 mb-2">{restaurant.name}</h4>
                      <div className="flex items-center gap-2 mb-3 text-sm text-slate-400">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span>{restaurant.rating}</span>
                        <span>•</span>
                        <span>{restaurant.cuisine}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={() => {
                            setSelectedRestaurant(restaurant);
                            setSelectedDate(new Date()); // Reset to today for new bookings
                          }}
                        >
                          Reserve
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="border-slate-600 text-slate-300"
                          onClick={() => toggleSave(restaurant.id)}
                        >
                          <X className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}

                {(isDemoMode ? savedRestaurants.length === 0 : favoriteRestaurants.length === 0) && (
                  <Card className="p-12 bg-slate-800 border-slate-700 text-center">
                    <Bookmark className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                    <h3 className="text-lg text-slate-400 mb-2">No saved restaurants</h3>
                    <p className="text-sm text-slate-500">
                      Tap the heart icon to save your favorites
                    </p>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'waitlist' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <h2 className="text-xl sm:text-2xl text-slate-100">Waitlist</h2>

            {isLoadingWaitlist ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Loading waitlist...</p>
              </div>
            ) : waitlistEntries.length === 0 ? (
              <Card className="p-12 bg-slate-800 border-slate-700 text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                <h3 className="text-lg text-slate-400 mb-2">No Active Waitlist Entries</h3>
                <p className="text-sm text-slate-500">
                  Join a waitlist to get notified when a table becomes available
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {waitlistEntries.map((entry) => (
                  <Card key={entry.id} className="p-4 bg-slate-800 border-slate-700">
                    <div className="flex gap-4">
                      <div
                        className="w-20 h-20 bg-cover bg-center rounded-lg flex-shrink-0"
                        style={{ backgroundImage: `url(${entry.restaurantImage})` }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-slate-100 mb-2">{entry.restaurantName}</h4>
                        <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                          <div>
                            <div className="text-slate-500 mb-1">Position</div>
                            <div className="text-cyan-400 font-semibold">#{entry.position} of {entry.totalWaiting}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-1">Est. Wait</div>
                            <div className="text-slate-300">{entry.estimatedWait} min</div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-1">Party Size</div>
                            <div className="text-slate-300">{entry.partySize} {entry.partySize === 1 ? 'guest' : 'guests'}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 mb-1">Notify Ready</div>
                            <div className="text-slate-300">
                              {entry.notifyReady ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <X className="w-4 h-4 text-slate-500" />
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                          onClick={() => {
                            toast.info('Removed from waitlist');
                          }}
                        >
                          Leave Waitlist
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'messages' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            {!isChatViewOpen ? (
              <>
                <h2 className="text-xl sm:text-2xl text-slate-100">Messages</h2>
                <ConversationsList
                  userId={currentUser?.uid || 'demo-user'}
                  demoMode={isDemoMode}
                  onSelectConversation={(conversation) => {
                    setSelectedConversation(conversation);
                    setIsChatViewOpen(true);
                  }}
                />
              </>
            ) : selectedConversation ? (
              <div className="fixed inset-0 bg-slate-900 z-[60] flex flex-col">
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-4 border-b border-slate-700 bg-slate-800">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setIsChatViewOpen(false);
                      setSelectedConversation(null);
                    }}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                  {selectedConversation.restaurantImage && (
                    <img
                      src={selectedConversation.restaurantImage}
                      alt={selectedConversation.restaurantName}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-slate-100 truncate">
                      {selectedConversation.restaurantName}
                    </h3>
                    {selectedConversation.reservationDate && selectedConversation.reservationTime && (
                      <p className="text-xs text-slate-400 truncate">
                        {new Date(selectedConversation.reservationDate).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })} at {selectedConversation.reservationTime}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Chat Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 flex flex-col p-4 overflow-hidden">
                    <ConversationChat
                      conversation={selectedConversation}
                      userId={currentUser?.uid || 'demo-user'}
                      onBack={() => setIsChatViewOpen(false)}
                      demoMode={isDemoMode}
                      hideHeader={true}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <h2 className="text-xl sm:text-2xl text-slate-100">Profile</h2>

            {isLoadingProfile ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Loading profile...</p>
              </div>
            ) : profile ? (
              <Card className="p-6 bg-slate-800 border-slate-700">
                <div className="text-center mb-4">
                  <Avatar className="w-20 h-20 mx-auto mb-4">
                    {profile.photoURL && <AvatarImage src={profile.photoURL} />}
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xl">
                      {profile.displayName?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl text-slate-100 mb-1">{profile.displayName}</h3>
                  <p className="text-sm text-slate-400 mb-2">@{profile.username}</p>
                  <p className="text-sm text-slate-500 mb-4">{profile.email}</p>
                  
                  <Button
                    onClick={handleEditProfile}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-slate-700">
                  <div className="text-center">
                    <div className="text-2xl text-slate-100 mb-1">{profile.stats?.totalReservations || reservations.length}</div>
                    <div className="text-xs text-slate-400">Reservations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl text-slate-100 mb-1">{savedRestaurants.length}</div>
                    <div className="text-xs text-slate-400">Saved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl text-slate-100 mb-1">
                      {reservations.filter((r) => r.status === 'completed').length}
                    </div>
                    <div className="text-xs text-slate-400">Visited</div>
                  </div>
                </div>

                {profile.phoneNumber && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="flex items-center text-slate-300">
                      <Phone className="w-4 h-4 mr-3 text-slate-500" />
                      <span className="text-sm">{profile.phoneNumber}</span>
                    </div>
                  </div>
                )}

                {/* Dining Preferences Section */}
                <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Utensils className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm text-slate-100">Dining Preferences</h4>
                  </div>

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

                  <div className="grid grid-cols-2 gap-3">
                    {/* Spice Level */}
                    <div>
                      <Label className="text-xs text-slate-400 mb-1 block">Spice Level</Label>
                      <p className="text-sm text-slate-200">{diningPreferences.spiceLevel}</p>
                    </div>

                    {/* Seating Preference */}
                    <div>
                      <Label className="text-xs text-slate-400 mb-1 block">Seating</Label>
                      <p className="text-sm text-slate-200">{diningPreferences.seatingPreference}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                <User className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400">No profile data available</p>
              </Card>
            )}

            {/* Account Settings */}
            <div className="space-y-3">
              <h3 className="text-lg text-slate-100">Account Settings</h3>
              
              {/* Personal Information */}
              <Card 
                className="p-4 bg-slate-800 border-slate-700"
                onClick={() => setOpenSettingsDialog('personal')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <User className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-slate-100">Personal Information</div>
                      <div className="text-xs text-slate-500">Name, email, phone</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
              </Card>

              {/* Payment Methods */}
              <Card 
                className="p-4 bg-slate-800 border-slate-700"
                onClick={() => setOpenSettingsDialog('payment')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-slate-100">Payment Methods</div>
                      <div className="text-xs text-slate-500">{paymentMethods.length} cards saved</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
              </Card>

              {/* Notifications */}
              <Card 
                className="p-4 bg-slate-800 border-slate-700"
                onClick={() => setOpenSettingsDialog('notifications')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-slate-100">Notifications</div>
                      <div className="text-xs text-slate-500">Email, SMS, push</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
              </Card>

              {/* Privacy & Security */}
              <Card 
                className="p-4 bg-slate-800 border-slate-700"
                onClick={() => setOpenSettingsDialog('privacy')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <Settings className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-slate-100">Privacy & Security</div>
                      <div className="text-xs text-slate-500">Password, data</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </div>
              </Card>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start h-12 bg-slate-800 border-slate-700 text-slate-300"
              >
                <Phone className="w-5 h-5 mr-3" />
                Contact Support
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-12 bg-slate-800 border-slate-700 text-slate-300"
              >
                <Mail className="w-5 h-5 mr-3" />
                Feedback
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-12 border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={handleSignOut}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Sign Out
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* All Restaurants Dialog */}
      <Dialog open={showAllRestaurants} onOpenChange={setShowAllRestaurants}>
        <DialogContent className="bg-slate-900 border-slate-700 max-w-full h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl sm:text-2xl text-slate-100">All Restaurants</DialogTitle>
                <DialogDescription className="text-sm sm:text-base text-slate-400 mt-1">
                  Browse our complete collection
                </DialogDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAllRestaurants(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Search Bar */}
            <div className="sticky top-0 bg-slate-900 pb-4 z-10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  placeholder="Search restaurants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>
              <Button 
                className="w-full mt-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
                onClick={() => {
                  setCommittedSearchQuery(searchQuery);
                  toast.success('Search applied', {
                    description: searchQuery ? `Searching for "${searchQuery}"` : 'Showing all restaurants',
                    duration: 2000
                  });
                }}
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </Button>
            </div>

            {/* Restaurant List */}
            {isLoadingRestaurants ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
                <p className="text-slate-400 mt-4">Loading restaurants...</p>
              </div>
            ) : filteredRestaurants.length === 0 ? (
              <Card className="p-8 bg-slate-800/50 border-slate-700 text-center">
                <Utensils className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-slate-300 mb-2">No Restaurants Found</h3>
                <p className="text-sm text-slate-500 mb-4">
                  {committedSearchQuery ? 
                    `No restaurants found matching "${committedSearchQuery}"` : 
                    'No restaurants are available at the moment'}
                </p>
                {committedSearchQuery && (
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-slate-600"
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
                <div className="flex items-center justify-between text-sm text-slate-400 pb-2">
                  <span>{filteredRestaurants.length} {filteredRestaurants.length === 1 ? 'restaurant' : 'restaurants'} found</span>
                  {committedSearchQuery && (
                    <Button 
                      variant="ghost"
                      size="sm"
                      className="text-cyan-400 h-auto p-0"
                      onClick={() => {
                        setSearchQuery('');
                        setCommittedSearchQuery('');
                      }}
                    >
                      Clear
                      <X className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
                
                <div className="space-y-3">
                  {filteredRestaurants.map((restaurant) => (
                    <motion.div
                      key={restaurant.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedRestaurant(restaurant);
                        setSelectedDate(new Date());
                        setShowAllRestaurants(false);
                      }}
                    >
                      <Card className="overflow-hidden bg-slate-800 border-slate-700 active:bg-slate-750">
                        <div className="flex gap-3">
                          <div
                            className="w-24 h-24 bg-cover bg-center flex-shrink-0"
                            style={{ backgroundImage: `url(${restaurant.image})` }}
                          />
                          <div className="flex-1 py-3 pr-3 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-slate-100 truncate pr-2">{restaurant.name}</h4>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs text-slate-100">{restaurant.rating}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                              <span>{restaurant.cuisine}</span>
                              <span>•</span>
                              <span>{'$'.repeat(restaurant.priceLevel)}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="w-3 h-3" />
                              <span>{restaurant.distance}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      {!isChatViewOpen && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-50 safe-area-bottom">
          <div className="flex items-center justify-around px-0.5 py-1.5 sm:px-2 sm:py-2">
          <Button
            variant="ghost"
            className={`flex-col h-14 sm:h-14 px-0.5 xs:px-1 sm:px-3 min-w-0 flex-1 ${
              activeTab === 'home' ? 'text-blue-400' : 'text-slate-400'
            }`}
            onClick={() => handleTabChange('home')}
          >
            <Home className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 flex-shrink-0" />
            <span className="text-[9px] xs:text-[10px] sm:text-xs leading-none">Home</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex-col h-14 sm:h-14 px-0.5 xs:px-1 sm:px-3 min-w-0 flex-1 ${
              activeTab === 'reservations' ? 'text-blue-400' : 'text-slate-400'
            }`}
            onClick={() => handleTabChange('reservations')}
          >
            <History className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 flex-shrink-0" />
            <span className="text-[9px] xs:text-[10px] sm:text-xs leading-none hidden xs:block">Reservations</span>
            <span className="text-[9px] leading-none xs:hidden">Book</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex-col h-14 sm:h-14 px-0.5 xs:px-1 sm:px-3 min-w-0 flex-1 ${
              activeTab === 'saved' ? 'text-blue-400' : 'text-slate-400'
            }`}
            onClick={() => handleTabChange('saved')}
          >
            <Bookmark className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 flex-shrink-0" />
            <span className="text-[9px] xs:text-[10px] sm:text-xs leading-none">Saved</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex-col h-14 sm:h-14 px-0.5 xs:px-1 sm:px-3 min-w-0 flex-1 ${
              activeTab === 'waitlist' ? 'text-blue-400' : 'text-slate-400'
            }`}
            onClick={() => handleTabChange('waitlist')}
          >
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 flex-shrink-0" />
            <span className="text-[9px] xs:text-[10px] sm:text-xs leading-none">Waitlist</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex-col h-14 sm:h-14 px-0.5 xs:px-1 sm:px-3 min-w-0 flex-1 ${
              activeTab === 'messages' ? 'text-blue-400' : 'text-slate-400'
            }`}
            onClick={() => handleTabChange('messages')}
          >
            <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 flex-shrink-0" />
            <span className="text-[9px] xs:text-[10px] sm:text-xs leading-none hidden xs:block">Messages</span>
            <span className="text-[9px] leading-none xs:hidden">Chat</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex-col h-14 sm:h-14 px-0.5 xs:px-1 sm:px-3 min-w-0 flex-1 ${
              activeTab === 'profile' ? 'text-blue-400' : 'text-slate-400'
            }`}
            onClick={() => handleTabChange('profile')}
          >
            <User className="w-5 h-5 sm:w-6 sm:h-6 mb-0.5 flex-shrink-0" />
            <span className="text-[9px] xs:text-[10px] sm:text-xs leading-none">Profile</span>
          </Button>
        </div>
      </div>
      )}

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedRestaurant && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 bg-slate-900 z-50 overflow-y-auto"
          >
            {/* Header Image */}
            <div
              className="h-48 bg-cover bg-center relative"
              style={{ backgroundImage: `url(${selectedRestaurant.image})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm"
                onClick={() => {
                  setSelectedRestaurant(null);
                  setModifyingReservation(null);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur-sm"
                onClick={() => toggleSave(selectedRestaurant.id)}
              >
                <Heart
                  className={`w-5 h-5 ${
                    (isDemoMode 
                      ? savedRestaurants.includes(selectedRestaurant.id)
                      : favoriteRestaurants.some(fav => fav.id === selectedRestaurant.id)
                    )
                      ? 'fill-red-500 text-red-500'
                      : 'text-slate-300'
                  }`}
                />
              </Button>
            </div>

            <div className="px-3 sm:px-4 py-4 sm:py-6 pb-24">
              {/* Restaurant Info */}
              <div className="mb-6">
                <div className="text-xs sm:text-sm text-blue-400 mb-2">
                  {modifyingReservation ? 'Modify Reservation' : 'Book a Table'}
                </div>
                <h2 className="text-xl sm:text-2xl text-slate-100 mb-2">{selectedRestaurant.name}</h2>
                <div className="flex items-center gap-2 sm:gap-3 mb-3 text-xs sm:text-sm text-slate-400 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span>{selectedRestaurant.rating}</span>
                  </div>
                  <span>•</span>
                  <span>{selectedRestaurant.cuisine}</span>
                  <span>•</span>
                  <span>{'$'.repeat(selectedRestaurant.priceLevel)}</span>
                </div>
                <p className="text-sm sm:text-base text-slate-300 mb-4">{selectedRestaurant.description}</p>
                
                {/* Address and Hours */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-slate-300">{selectedRestaurant.address}</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-slate-300">{formatHoursToString(selectedRestaurant.hours)}</div>
                  </div>
                </div>

                {/* Features */}
                {selectedRestaurant.features && selectedRestaurant.features.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm text-slate-400 mb-2">Features</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedRestaurant.features.map((feature, idx) => (
                        <Badge key={idx} variant="outline" className="bg-slate-800 text-slate-300 border-slate-700">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ambiance */}
                {selectedRestaurant.ambiance && (
                  <div className="mb-4">
                    <div className="text-sm text-slate-400 mb-2">Ambiance</div>
                    <div className="space-y-1 text-sm text-slate-300">
                      <div>Noise Level: {selectedRestaurant.ambiance.noiseLevel}</div>
                      <div>Lighting: {selectedRestaurant.ambiance.lighting}</div>
                      {selectedRestaurant.ambiance.vibe && selectedRestaurant.ambiance.vibe.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedRestaurant.ambiance.vibe.map((v, idx) => (
                            <Badge key={idx} className="bg-purple-500/20 text-purple-400 text-xs">
                              {v}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dietary Options */}
                {selectedRestaurant.dietary && selectedRestaurant.dietary.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm text-slate-400 mb-2">Dietary Options</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedRestaurant.dietary.map((option, idx) => (
                        <Badge key={idx} className="bg-green-500/20 text-green-400">
                          {option}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Party Size */}
              <div className="mb-6">
                <h3 className="text-lg text-slate-100 mb-3">Party Size</h3>
                <select
                  value={partySize}
                  onChange={(e) => setPartySize(Number(e.target.value))}
                  className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-md text-slate-100"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
                    <option key={size} value={size}>
                      {size} {size === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              <div className="mb-6">
                <h3 className="text-lg text-slate-100 mb-3">Select Date</h3>
                
                {/* Selected Date Display */}
                <div className="mb-4 p-4 bg-gradient-to-br from-cyan-600/10 to-blue-600/10 border-2 border-cyan-600/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg">
                      <Calendar className="h-6 w-6 text-white" />
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

              {/* Time Selection */}
              <div className="mb-6">
                <h3 className="text-lg text-slate-100 mb-3">Select Time</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(selectedRestaurant.availableSlots && selectedRestaurant.availableSlots.length > 0 
                    ? selectedRestaurant.availableSlots 
                    : ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM']
                  ).map((slot) => (
                    <Button
                      key={slot}
                      variant={selectedTime === slot ? 'default' : 'outline'}
                      className={`h-12 ${
                        selectedTime === slot
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                      onClick={() => setSelectedTime(slot)}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fixed Bottom Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-700">
              <Button
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg"
                onClick={modifyingReservation ? handleSaveModification : handleBooking}
                disabled={!selectedTime}
              >
                <Check className="w-5 h-5 mr-2" />
                {modifyingReservation ? 'Save Changes' : 'Confirm Reservation'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Reservation Modal */}
      <AnimatePresence>
        {quickReservationDialog && quickReservationRestaurant && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 bg-slate-900 z-50 overflow-y-auto"
          >
            <div className="min-h-screen px-4 py-6 pb-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl text-slate-100">Make a Reservation</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setQuickReservationDialog(false);
                    setQuickReservationRestaurant(null);
                    setQuickReservationTime('');
                  }}
                  className="text-slate-400"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>

              {/* Restaurant Image */}
              <div className="relative h-48 rounded-lg overflow-hidden mb-6">
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
                    className="absolute top-4 right-4 bg-slate-900/50 hover:bg-slate-900/70 backdrop-blur-sm"
                  >
                    <Heart 
                      className={`w-6 h-6 transition-all ${
                        favoriteRestaurants.map(r => r.id).includes(quickReservationRestaurant.id)
                          ? 'fill-red-500 text-red-500' 
                          : 'text-white hover:text-red-500'
                      }`} 
                    />
                  </Button>
                )}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl text-slate-100 mb-2">{quickReservationRestaurant.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-300 mb-2">
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
                    <span className="truncate">{quickReservationRestaurant.address || quickReservationRestaurant.distance}</span>
                  </div>
                </div>
              </div>

              {/* Party Size */}
              <div className="mb-6">
                <h3 className="text-lg text-slate-100 mb-3">Party Size</h3>
                <select
                  value={quickReservationPartySize}
                  onChange={(e) => setQuickReservationPartySize(Number(e.target.value))}
                  className="w-full h-12 px-4 bg-slate-800 border border-slate-700 rounded-md text-slate-100"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
                    <option key={size} value={size}>
                      {size} {size === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              <div className="mb-6">
                <h3 className="text-lg text-slate-100 mb-3">Select Date</h3>
                
                {/* Selected Date Display */}
                <div className="mb-4 p-4 bg-gradient-to-br from-cyan-600/10 to-blue-600/10 border-2 border-cyan-600/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg">
                      <Calendar className="h-6 w-6 text-white" />
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
                {quickReservationDate && (
                  <div className="hidden">{/* Removed duplicate display */}
                    <p className="text-sm text-slate-400 mb-1">Selected Date:</p>
                    <p className="text-base font-semibold text-slate-100">
                      {quickReservationDate.toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                )}
              </div>

              {/* Time Selection */}
              <div className="mb-6">
                <h3 className="text-lg text-slate-100 mb-3">Select Time</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(quickReservationRestaurant.availableSlots && quickReservationRestaurant.availableSlots.length > 0 
                    ? quickReservationRestaurant.availableSlots 
                    : ['5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM']
                  ).map((slot) => (
                    <Button
                      key={slot}
                      variant={quickReservationTime === slot ? 'default' : 'outline'}
                      className={`h-12 ${
                        quickReservationTime === slot
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700'
                          : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                      onClick={() => setQuickReservationTime(slot)}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fixed Bottom Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-700">
              <Button
                className="w-full h-14 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-lg"
                onClick={handleQuickReservationConfirm}
                disabled={!quickReservationTime}
              >
                <Check className="w-5 h-5 mr-2" />
                Confirm Reservation
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && profile && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 bg-slate-900 z-50 overflow-y-auto"
          >
            <div className="min-h-screen px-4 py-6 pb-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl text-slate-100">Edit Profile</h2>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="text-slate-400"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="w-24 h-24">
                    {(photoPreviewURL || editedProfile.photoURL) && <AvatarImage src={photoPreviewURL || editedProfile.photoURL} />}
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-2xl">
                      {profile.displayName?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
                    onClick={() => document.getElementById('photoUploadMobile')?.click()}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Upload Photo
                  </Button>
                  <input
                    id="photoUploadMobile"
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

                {/* Display Name */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Display Name</label>
                  <Input
                    value={editedProfile.displayName || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, displayName: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-slate-100 h-12"
                    placeholder="Enter your name"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Username</label>
                  <Input
                    value={editedProfile.username || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, username: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-slate-100 h-12"
                    placeholder="Enter username"
                  />
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Email</label>
                  <Input
                    value={profile.email}
                    disabled
                    className="bg-slate-800/50 border-slate-700 text-slate-500 h-12 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Phone Number</label>
                  <Input
                    value={editedProfile.phoneNumber || ''}
                    onChange={(e) => setEditedProfile({ ...editedProfile, phoneNumber: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-slate-100 h-12"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                {/* Dining Preferences Section */}
                <div className="pt-4 border-t border-slate-700">
                  <div className="flex items-center gap-2 mb-4">
                    <Utensils className="w-5 h-5 text-cyan-400" />
                    <h3 className="text-lg text-slate-100">Dining Preferences</h3>
                  </div>
                  
                  {/* Favorite Cuisines */}
                  <div className="mb-4">
                    <Label className="text-slate-300 mb-2 block">Favorite Cuisines</Label>
                    <div className="flex flex-wrap gap-2">
                      {['Italian', 'Japanese', 'Mexican', 'Chinese', 'Indian', 'Thai', 'French', 'American'].map(cuisine => (
                        <Badge
                          key={cuisine}
                          className={`cursor-pointer ${
                            diningPreferences.favoriteCuisines.includes(cuisine)
                              ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
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
                  <div className="mb-4">
                    <Label className="text-slate-300 mb-2 block">Dietary Restrictions</Label>
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
                  <div className="mb-4">
                    <Label className="text-slate-300 mb-2 block">Spice Level</Label>
                    <Select
                      value={diningPreferences.spiceLevel}
                      onValueChange={(value) => setDiningPreferences({ ...diningPreferences, spiceLevel: value })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 h-12">
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
                  <div>
                    <Label className="text-slate-300 mb-2 block">Seating Preference</Label>
                    <Select
                      value={diningPreferences.seatingPreference}
                      onValueChange={(value) => setDiningPreferences({ ...diningPreferences, seatingPreference: value })}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 h-12">
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
              </div>
            </div>

            {/* Fixed Bottom Buttons */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-700 space-y-3">
              <Button
                className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg"
                onClick={handleSaveProfile}
              >
                <Save className="w-5 h-5 mr-2" />
                Save Changes
              </Button>
              <Button
                variant="outline"
                className="w-full h-14 border-slate-700 text-slate-300"
                onClick={handleCancelEdit}
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Dialogs */}
      <Dialog open={openSettingsDialog === 'personal'} onOpenChange={(open) => !open && setOpenSettingsDialog(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Personal Information</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update your personal details
            </DialogDescription>
          </DialogHeader>
          {profile && (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Display Name</Label>
                <Input value={profile.displayName} className="bg-slate-700 border-slate-600" disabled />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Email</Label>
                <Input value={profile.email} className="bg-slate-700 border-slate-600" disabled />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Phone</Label>
                <Input value={profile.phoneNumber || 'Not set'} className="bg-slate-700 border-slate-600" disabled />
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setOpenSettingsDialog(null);
                  setIsEditingProfile(true);
                }}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={openSettingsDialog === 'payment'} onOpenChange={(open) => !open && setOpenSettingsDialog(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Payment Methods</DialogTitle>
            <DialogDescription className="text-slate-400">
              Manage your saved payment cards
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
            {!isAddingCard ? (
              <>
                {paymentMethods.map((card) => (
                  <Card key={card.id} className="p-4 bg-slate-700/50 border-slate-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-blue-400" />
                        <div>
                          <div className="text-slate-100">{card.type} •••• {card.last4}</div>
                          <div className="text-sm text-slate-400">Expires {card.expiry}</div>
                          {card.isDefault && (
                            <Badge className="mt-1 bg-blue-500/20 text-blue-400">Default</Badge>
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
                  className="w-full bg-blue-600 hover:bg-blue-700"
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
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100 h-12">
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
                    className="bg-slate-700 border-slate-600 text-slate-100 h-12"
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
                    className="bg-slate-700 border-slate-600 text-slate-100 h-12"
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
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100 h-12">
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
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-slate-100 h-12">
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
                      className="bg-slate-700 border-slate-600 text-slate-100 h-12"
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
                    id="setDefaultMobile"
                    checked={newCard.isDefault}
                    onChange={(e) => setNewCard({ ...newCard, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="setDefaultMobile" className="text-slate-300 cursor-pointer">
                    Set as default payment method
                  </Label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
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

      <Dialog open={openSettingsDialog === 'dining'} onOpenChange={(open) => !open && setOpenSettingsDialog(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Dining Preferences</DialogTitle>
            <DialogDescription className="text-slate-400">
              Set your cuisine and dietary preferences
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Favorite Cuisines</Label>
              <div className="flex flex-wrap gap-2">
                {['Italian', 'Japanese', 'Mexican', 'Chinese', 'Indian', 'Thai', 'French', 'American'].map(cuisine => (
                  <Badge
                    key={cuisine}
                    className={`cursor-pointer ${
                      diningPreferences.favoriteCuisines.includes(cuisine)
                        ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
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
            <div className="space-y-2">
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
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleSaveDiningPreferences}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openSettingsDialog === 'notifications'} onOpenChange={(open) => !open && setOpenSettingsDialog(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Notification Settings</DialogTitle>
            <DialogDescription className="text-slate-400">
              Manage how you receive notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div>
              <h4 className="text-slate-300 mb-3">Channels</h4>
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
                    <span className="text-slate-100">Push</span>
                  </div>
                  <Switch 
                    checked={notificationSettings.push}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, push: checked})}
                  />
                </div>
              </div>
            </div>
            <div>
              <h4 className="text-slate-300 mb-3">Types</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded">
                  <span className="text-slate-100 text-sm">Reservations</span>
                  <Switch 
                    checked={notificationSettings.reservationReminders}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, reservationReminders: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded">
                  <span className="text-slate-100 text-sm">Waitlist</span>
                  <Switch 
                    checked={notificationSettings.waitlistUpdates}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, waitlistUpdates: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded">
                  <span className="text-slate-100 text-sm">Promotions</span>
                  <Switch 
                    checked={notificationSettings.promotions}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, promotions: checked})}
                  />
                </div>
              </div>
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700"
              onClick={handleSaveNotificationSettings}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openSettingsDialog === 'privacy'} onOpenChange={(open) => !open && setOpenSettingsDialog(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Privacy & Security</DialogTitle>
            <DialogDescription className="text-slate-400">
              Manage your account security
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Card className="p-4 bg-slate-700/30 border-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="text-slate-100">Change Password</div>
                    <div className="text-xs text-slate-400">Update password</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>
            </Card>
            <Card className="p-4 bg-slate-700/30 border-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="text-slate-100">Two-Factor Auth</div>
                    <div className="text-xs text-slate-400">Extra security</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>
            </Card>
            <Card className="p-4 bg-slate-700/30 border-slate-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-blue-400" />
                  <div>
                    <div className="text-slate-100">Data & Privacy</div>
                    <div className="text-xs text-slate-400">Control your data</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </div>
            </Card>
            <div className="pt-4 border-t border-slate-700">
              <Button 
                variant="outline" 
                className="w-full border-red-500/30 text-red-400"
                onClick={() => toast.error('This feature is not available')}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
}