import { useState, useEffect } from 'react';
import { MessageSquare, ChevronRight } from 'lucide-react';
import type { Conversation } from '../lib/types';
import { subscribeToUserConversations } from '../lib/firebase-conversations';
import { fetchUserReservations, fetchRestaurants } from '../lib/firebase-data';
import { toast } from 'sonner';

interface ConversationsListProps {
  userId: string;
  onSelectConversation: (conversation: Conversation) => void;
  demoMode?: boolean;
}

export function ConversationsList({ userId, onSelectConversation, demoMode = false }: ConversationsListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (demoMode) {
      // Demo mode - show empty state
      setLoading(false);
      return;
    }

    // Subscribe to real-time conversation updates
    const unsubscribe = subscribeToUserConversations(userId, async (fetchedConversations) => {
      // Enrich conversations with restaurant and reservation details
      const enrichedConversations = await enrichConversations(fetchedConversations, userId);
      setConversations(enrichedConversations);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, demoMode]);

  // Enrich conversations with restaurant name, image, and reservation details
  async function enrichConversations(
    conversations: Conversation[],
    userId: string
  ): Promise<Conversation[]> {
    try {
      // Fetch user reservations and restaurants in parallel
      const [reservations, restaurants] = await Promise.all([
        fetchUserReservations(userId),
        fetchRestaurants(),
      ]);

      // Create lookup maps
      const reservationMap = new Map(reservations.map(r => [r.id, r]));
      const restaurantMap = new Map(restaurants.map(r => [r.id, r]));

      return conversations.map(conversation => {
        const reservation = reservationMap.get(conversation.reservationId);
        const restaurant = restaurantMap.get(conversation.participants.restaurantId);

        return {
          ...conversation,
          restaurantName: restaurant?.name || reservation?.restaurantName || 'Unknown Restaurant',
          restaurantImage: restaurant?.images?.[0] || reservation?.restaurantImage,
          reservationDate: reservation?.date,
          reservationTime: reservation?.time,
        };
      });
    } catch (error) {
      console.error('Error enriching conversations:', error);
      toast.error('Failed to load conversation details');
      return conversations;
    }
  }

  function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <MessageSquare className="w-16 h-16 text-gray-600 mb-4" />
        <h3 className="text-gray-400 mb-2">No Conversations</h3>
        <p className="text-gray-500 text-center text-sm max-w-md">
          Start a conversation with a restaurant by messaging them from your reservation details.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="border-b border-gray-800 pb-4">
        <h2 className="text-white mb-1">Conversations</h2>
        <p className="text-sm text-gray-400">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Conversations List */}
      <div className="space-y-3">
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelectConversation(conversation)}
            className="w-full bg-gray-800 hover:bg-gray-750 rounded-xl p-4 transition-colors text-left border border-gray-700"
          >
            <div className="flex items-center gap-4">
              {/* Restaurant Image */}
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
                {conversation.restaurantImage ? (
                  <img
                    src={conversation.restaurantImage}
                    alt={conversation.restaurantName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-gray-500" />
                  </div>
                )}
              </div>

              {/* Conversation Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white truncate">{conversation.restaurantName}</h3>
                  {!conversation.isActive && (
                    <span className="bg-gray-700 text-gray-400 text-xs px-2 py-0.5 rounded-full">
                      Closed
                    </span>
                  )}
                </div>
                
                {conversation.reservationDate && conversation.reservationTime && (
                  <p className="text-xs text-gray-500 mb-1">
                    Reservation: {new Date(conversation.reservationDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })} at {conversation.reservationTime}
                  </p>
                )}

                <p className="text-sm text-gray-400 truncate">
                  {conversation.lastMessage || 'No messages yet'}
                </p>
                
                <p className="text-xs text-gray-500 mt-1">
                  {formatTimestamp(conversation.lastMessageAt)}
                </p>
              </div>

              <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}