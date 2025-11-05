import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
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
} from 'lucide-react';

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
  availableSlots: string[];
}

interface Reservation {
  id: string;
  restaurantName: string;
  date: string;
  time: string;
  partySize: number;
  status: 'upcoming' | 'completed';
  confirmationCode: string;
}

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
    availableSlots: ['5:00 PM', '5:30 PM', '7:00 PM', '7:30 PM', '9:00 PM'],
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
    availableSlots: ['6:00 PM', '6:30 PM', '8:00 PM', '8:30 PM'],
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
    availableSlots: ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'],
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
    availableSlots: ['5:30 PM', '6:00 PM', '7:30 PM', '8:00 PM', '9:30 PM'],
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
    availableSlots: ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'],
  },
];

const mockReservations: Reservation[] = [
  {
    id: 'res-1',
    restaurantName: 'Bella Vista',
    date: '2025-10-20',
    time: '7:00 PM',
    partySize: 4,
    status: 'upcoming',
    confirmationCode: 'BV7834',
  },
  {
    id: 'res-2',
    restaurantName: 'Sakura House',
    date: '2025-10-25',
    time: '8:00 PM',
    partySize: 2,
    status: 'upcoming',
    confirmationCode: 'SH2941',
  },
];

export function ConsumerAppMobile() {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [reservations, setReservations] = useState<Reservation[]>(mockReservations);
  const [savedRestaurants, setSavedRestaurants] = useState<string[]>([]);

  const handleBooking = () => {
    if (!selectedRestaurant || !selectedTime) {
      toast.error('Please select a time');
      return;
    }

    const newReservation: Reservation = {
      id: `res-${Date.now()}`,
      restaurantName: selectedRestaurant.name,
      date: new Date().toISOString().split('T')[0],
      time: selectedTime,
      partySize,
      status: 'upcoming',
      confirmationCode: `${selectedRestaurant.name.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000 + 1000)}`,
    };

    setReservations([newReservation, ...reservations]);
    toast.success(`Reservation confirmed!`);
    setSelectedRestaurant(null);
    setSelectedTime('');
    setActiveTab('reservations');
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

  const filteredRestaurants = mockRestaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Mobile Header */}
      <div className="sticky top-0 z-40 bg-slate-800/95 backdrop-blur-sm border-b border-slate-700 px-4 py-4">
        <h1 className="text-2xl text-slate-100">
          Reserve<span className="text-blue-400">AI</span>
        </h1>
      </div>

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
              </div>
            </div>

            {/* Featured Restaurants */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-slate-100">Nearby Restaurants</h3>
                <Button variant="ghost" size="sm" className="text-blue-400">
                  <Filter className="w-4 h-4 mr-1" />
                  Filter
                </Button>
              </div>

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
              <div className="space-y-3">
                {reservations
                  .filter((r) => r.status === 'upcoming')
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

                      <div className="mt-3 pt-3 border-t border-slate-700 text-xs text-slate-400">
                        Confirmation: #{reservation.confirmationCode}
                      </div>
                    </Card>
                  ))}

                {reservations.filter((r) => r.status === 'upcoming').length === 0 && (
                  <Card className="p-8 bg-slate-800 border-slate-700 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                    <p className="text-slate-400">No upcoming reservations</p>
                  </Card>
                )}
              </div>
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

            <Card className="p-6 bg-slate-800 border-slate-700 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl text-slate-100 mb-1">John Doe</h3>
              <p className="text-sm text-slate-400 mb-4">john.doe@email.com</p>

              <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-slate-700">
                <div>
                  <div className="text-2xl text-slate-100 mb-1">{reservations.length}</div>
                  <div className="text-xs text-slate-400">Reservations</div>
                </div>
                <div>
                  <div className="text-2xl text-slate-100 mb-1">{savedRestaurants.length}</div>
                  <div className="text-xs text-slate-400">Saved</div>
                </div>
                <div>
                  <div className="text-2xl text-slate-100 mb-1">
                    {reservations.filter((r) => r.status === 'completed').length}
                  </div>
                  <div className="text-xs text-slate-400">Visited</div>
                </div>
              </div>
            </Card>

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
            onClick={() => setActiveTab('home')}
          >
            <Home className="w-6 h-6 mb-1" />
            <span className="text-xs">Home</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex-col h-14 ${
              activeTab === 'reservations' ? 'text-blue-400' : 'text-slate-400'
            }`}
            onClick={() => setActiveTab('reservations')}
          >
            <History className="w-6 h-6 mb-1" />
            <span className="text-xs">Reservations</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex-col h-14 ${
              activeTab === 'saved' ? 'text-blue-400' : 'text-slate-400'
            }`}
            onClick={() => setActiveTab('saved')}
          >
            <Bookmark className="w-6 h-6 mb-1" />
            <span className="text-xs">Saved</span>
          </Button>
          <Button
            variant="ghost"
            className={`flex-col h-14 ${
              activeTab === 'profile' ? 'text-blue-400' : 'text-slate-400'
            }`}
            onClick={() => setActiveTab('profile')}
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
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span>{selectedRestaurant.distance} away</span>
                </div>
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
                  {selectedRestaurant.availableSlots.map((slot) => (
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
    </div>
  );
}
