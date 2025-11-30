import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { toast } from 'sonner';
import { getDemoData, demoUserProfile } from '../lib/demo-data';
import { signOutUser, uploadProfilePicture } from '../lib/firebase-auth';
import { 
  fetchRestaurants, 
  fetchUserReservations,
  fetchUserProfile,
  updateUserProfile,
  updateNotificationSettings,
  updateDiningPreferences,
  updatePaymentMethods
} from '../lib/firebase-data';
import { getUserRecommendations, type AIRecommendation as FirebaseAIRecommendation } from '../lib/firebase-recommendations';
import { MessagesView } from './messages-view';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserProfile } from '../lib/types';
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
  Filter,
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
  confirmationCode?: string;
  createdAt?: string;
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
  activeTab?: 'home' | 'reservations' | 'saved' | 'profile';
  onTabChange?: (tab: 'home' | 'reservations' | 'saved' | 'profile') => void;
  isDemoMode?: boolean;
  currentUser?: FirebaseUser | null;
  userProfile?: UserProfile | null;
} = {}) {
  const [activeTab, setActiveTab] = useState<'home' | 'reservations' | 'saved' | 'profile'>(externalActiveTab || 'home');
  const [searchQuery, setSearchQuery] = useState('');
  const [committedSearchQuery, setCommittedSearchQuery] = useState(''); // Search query committed by button click
  const [partySize, setPartySize] = useState(2);
  const [selectedRestaurant, setSelectedRestaurant] = useState<MockRestaurant | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [savedRestaurants, setSavedRestaurants] = useState<string[]>([]);
  
  // Data states
  const [restaurants, setRestaurants] = useState<MockRestaurant[]>(mockRestaurants);
  const [reservations, setReservations] = useState<MockReservation[]>([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(false);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<FirebaseAIRecommendation[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  // Profile states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [selectedProfilePicture, setSelectedProfilePicture] = useState<File | null>(null);
  const [photoPreviewURL, setPhotoPreviewURL] = useState<string | null>(null);

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

  // Update activeTab when external prop changes
  useEffect(() => {
    if (externalActiveTab) {
      setActiveTab(externalActiveTab);
    }
  }, [externalActiveTab]);

  // Handle tab change
  const handleTabChange = (tab: 'home' | 'reservations' | 'saved' | 'profile') => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const handleBooking = () => {
    if (!selectedRestaurant || !selectedTime) {
      toast.error('Please select a time');
      return;
    }

    const newReservation: MockReservation = {
      id: `res-${Date.now()}`,
      userId: currentUser?.uid || 'demo-user',
      restaurantId: selectedRestaurant.id,
      restaurantName: selectedRestaurant.name,
      restaurantImage: selectedRestaurant.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
      date: new Date().toISOString().split('T')[0],
      time: selectedTime,
      partySize,
      status: 'confirmed',
      confirmationCode: `${selectedRestaurant.name.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000 + 1000)}`,
    };

    setReservations([newReservation, ...reservations]);
    toast.success(`Reservation confirmed!`);
    setSelectedRestaurant(null);
    setSelectedTime('');
    handleTabChange('reservations');
  };

  const toggleSave = (restaurantId: string) => {
    if (savedRestaurants.includes(restaurantId)) {
      setSavedRestaurants(savedRestaurants.filter(id => id !== restaurantId));
      toast.success('Removed from saved');
    } else {
      setSavedRestaurants([...savedRestaurants, restaurantId]);
      toast.success('Added to saved');
    }
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
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Content */}
      <div className="px-4 py-6">
        {activeTab === 'home' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Search Section */}
            <div>
              <h2 className="text-2xl text-slate-100 mb-4">
                Find Your Next{' '}
                <span className="text-blue-400">Table</span>
              </h2>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    placeholder="Search restaurants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-slate-800 border-slate-700 text-slate-100 h-12"
                  />
                </div>

                <div className="flex gap-3">
                  <select
                    value={partySize}
                    onChange={(e) => setPartySize(Number(e.target.value))}
                    className="flex-1 h-12 px-4 bg-slate-800 border border-slate-700 rounded-md text-slate-100"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((size) => (
                      <option key={size} value={size}>
                        {size} {size === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    className="px-4 bg-slate-800 border-slate-700 text-slate-100"
                  >
                    <Calendar className="w-5 h-5" />
                  </Button>
                </div>

                {/* Search Button */}
                <Button 
                  className="group w-full h-14 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600 text-white shadow-xl hover:shadow-2xl hover:shadow-blue-500/50 rounded-xl transition-all duration-300 active:scale-95 border border-blue-400/20"
                  onClick={() => {
                    // Commit the search query to trigger filtering
                    setCommittedSearchQuery(searchQuery);
                    
                    // Scroll to restaurant listings
                    const restaurantSection = document.querySelector('[data-section="restaurants-mobile"]');
                    if (restaurantSection) {
                      restaurantSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    // Show toast with search criteria
                    const searchSummary = [
                      searchQuery && `"${searchQuery}"`,
                      `${partySize} ${partySize === 1 ? 'guest' : 'guests'}`
                    ].filter(Boolean).join(' • ');
                    
                    toast.success('Searching for tables...', {
                      description: searchSummary || 'Finding nearby restaurants',
                      duration: 2000
                    });
                  }}
                >
                  <Search className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  <span className="tracking-wide">Find Tables</span>
                </Button>
              </div>
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
                <Button variant="ghost" size="sm" className="text-blue-400">
                  <Filter className="w-4 h-4 mr-1" />
                  Filter
                </Button>
              </div>

              {isLoadingRestaurants ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">Loading restaurants...</p>
                </div>
              ) : filteredRestaurants.length === 0 ? (
                <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                  <Utensils className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <h3 className="text-slate-300 mb-2">No Restaurants Available</h3>
                  <p className="text-sm text-slate-500">
                    {committedSearchQuery ? 
                      `No restaurants found matching "${committedSearchQuery}"` : 
                      'No restaurants are available at the moment'}
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredRestaurants.map((restaurant) => (
                    <motion.div
                      key={restaurant.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedRestaurant(restaurant)}
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
                                    savedRestaurants.includes(restaurant.id)
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
            className="space-y-6"
          >
            <h2 className="text-2xl text-slate-100">My Reservations</h2>

            {/* Upcoming */}
            <div>
              <h3 className="text-lg text-slate-100 mb-3">Upcoming</h3>
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
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'saved' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl text-slate-100">Saved</h2>

            <div className="space-y-4">
              {mockRestaurants
                .filter((r) => savedRestaurants.includes(r.id))
                .map((restaurant) => (
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
                          onClick={() => setSelectedRestaurant(restaurant)}
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

              {savedRestaurants.length === 0 && (
                <Card className="p-12 bg-slate-800 border-slate-700 text-center">
                  <Bookmark className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                  <h3 className="text-lg text-slate-400 mb-2">No saved restaurants</h3>
                  <p className="text-sm text-slate-500">
                    Tap the heart icon to save your favorites
                  </p>
                </Card>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-2xl text-slate-100">Profile</h2>

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
              </Card>
            ) : (
              <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                <User className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400">No profile data available</p>
              </Card>
            )}

            {/* Messages Section */}
            <div>
              <h3 className="text-lg text-slate-100 mb-4">Messages</h3>
              <MessagesView 
                userId={currentUser?.uid || 'demo-user'} 
                demoMode={isDemoMode}
              />
            </div>

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

              {/* Dining Preferences */}
              <Card 
                className="p-4 bg-slate-800 border-slate-700"
                onClick={() => setOpenSettingsDialog('dining')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <Utensils className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <div className="text-slate-100">Dining Preferences</div>
                      <div className="text-xs text-slate-500">Cuisine, dietary</div>
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

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 px-2 py-2 z-50">
        <div className="flex items-center justify-around">
          <Button
            variant="ghost"
            className={`flex-col h-14 ${
              activeTab === 'home' ? 'text-blue-400' : 'text-slate-400'
            }`}
            onClick={() => handleTabChange('home')}
          >
            <Home className="w-6 h-6 mb-1" />
            <span className="text-xs">Home</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex-col h-14 ${
              activeTab === 'reservations' ? 'text-blue-400' : 'text-slate-400'
            }`}
            onClick={() => handleTabChange('reservations')}
          >
            <History className="w-6 h-6 mb-1" />
            <span className="text-xs">Reservations</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex-col h-14 ${
              activeTab === 'saved' ? 'text-blue-400' : 'text-slate-400'
            }`}
            onClick={() => handleTabChange('saved')}
          >
            <Bookmark className="w-6 h-6 mb-1" />
            <span className="text-xs">Saved</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex-col h-14 ${
              activeTab === 'profile' ? 'text-blue-400' : 'text-slate-400'
            }`}
            onClick={() => handleTabChange('profile')}
          >
            <User className="w-6 h-6 mb-1" />
            <span className="text-xs">Profile</span>
          </Button>
        </div>
      </div>

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
                onClick={() => setSelectedRestaurant(null)}
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
                    savedRestaurants.includes(selectedRestaurant.id)
                      ? 'fill-red-500 text-red-500'
                      : 'text-slate-300'
                  }`}
                />
              </Button>
            </div>

            <div className="px-4 py-6 pb-24">
              {/* Restaurant Info */}
              <div className="mb-6">
                <h2 className="text-2xl text-slate-100 mb-2">{selectedRestaurant.name}</h2>
                <div className="flex items-center gap-3 mb-3 text-sm text-slate-400">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span>{selectedRestaurant.rating}</span>
                  </div>
                  <span>•</span>
                  <span>{selectedRestaurant.cuisine}</span>
                  <span>•</span>
                  <span>{'$'.repeat(selectedRestaurant.priceLevel)}</span>
                </div>
                <p className="text-slate-300 mb-4">{selectedRestaurant.description}</p>
                
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

              {/* Time Selection */}
              <div className="mb-6">
                <h3 className="text-lg text-slate-100 mb-3">Select Time</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(selectedRestaurant.availableSlots || []).map((slot) => (
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
                onClick={handleBooking}
                disabled={!selectedTime}
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
          <div className="space-y-4 mt-4">
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
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add New Card
            </Button>
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
                {diningPreferences.favoriteCuisines.map((cuisine) => (
                  <Badge key={cuisine} className="bg-blue-500/20 text-blue-400">
                    {cuisine}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Dietary Restrictions</Label>
              <div className="flex flex-wrap gap-2">
                {diningPreferences.dietaryRestrictions.map((restriction) => (
                  <Badge key={restriction} className="bg-amber-500/20 text-amber-400">
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
    </div>
  );
}