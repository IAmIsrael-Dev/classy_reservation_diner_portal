import { useState, useEffect } from 'react';
import { type Message } from '../lib/types';
import { 
  getUserMessages, 
  markMessageAsRead, 
  markAllMessagesAsRead,
  groupMessagesByRestaurant 
} from '../lib/firebase-messages';
import { getDemoData } from '../lib/demo-data';
import { Mail, MailOpen, Clock, AlertCircle, CheckCircle, Info, Tag, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface MessagesViewProps {
  userId: string;
  demoMode?: boolean;
}

export function MessagesView({ userId, demoMode = false }: MessagesViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadMessages();
  }, [userId, demoMode]);

  async function loadMessages() {
    setLoading(true);
    try {
      if (demoMode) {
        // Load demo messages from demo-data
        const demoData = getDemoData();
        setMessages(demoData.messages);
      } else {
        const fetchedMessages = await getUserMessages(userId);
        setMessages(fetchedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAsRead(messageId: string) {
    if (demoMode) {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, read: true } : msg
      ));
      return;
    }

    try {
      await markMessageAsRead(messageId);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, read: true } : msg
      ));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  async function handleMarkAllAsRead() {
    if (demoMode) {
      setMessages(prev => prev.map(msg => ({ ...msg, read: true })));
      toast.success('All messages marked as read');
      return;
    }

    try {
      await markAllMessagesAsRead(userId);
      setMessages(prev => prev.map(msg => ({ ...msg, read: true })));
      toast.success('All messages marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  }

  const filteredMessages = filter === 'unread' 
    ? messages.filter(m => !m.read)
    : messages;

  const groupedMessages = groupMessagesByRestaurant(filteredMessages);
  const unreadCount = messages.filter(m => !m.read).length;

  // Get list of restaurants with messages
  const restaurants = Array.from(groupedMessages.entries()).map(([restaurantId, msgs]) => ({
    id: restaurantId,
    name: msgs[0].restaurantName,
    image: msgs[0].restaurantImage,
    messages: msgs,
    unreadCount: msgs.filter(m => !m.read).length
  }));

  const selectedMessages = selectedRestaurantId 
    ? groupedMessages.get(selectedRestaurantId) || []
    : [];

  function getMessageIcon(type: Message['type']) {
    switch (type) {
      case 'confirmation':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'reminder':
        return <Clock className="w-5 h-5 text-blue-400" />;
      case 'update':
        return <Info className="w-5 h-5 text-yellow-400" />;
      case 'cancellation':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'special_offer':
        return <Tag className="w-5 h-5 text-purple-400" />;
      default:
        return <Mail className="w-5 h-5 text-gray-400" />;
    }
  }

  function getTypeLabel(type: Message['type']) {
    switch (type) {
      case 'confirmation':
        return 'Confirmation';
      case 'reminder':
        return 'Reminder';
      case 'update':
        return 'Update';
      case 'cancellation':
        return 'Cancellation';
      case 'special_offer':
        return 'Special Offer';
      default:
        return 'Message';
    }
  }

  function formatTimestamp(timestamp: string) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
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

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <Mail className="w-16 h-16 text-gray-600 mb-4" />
        <h3 className="text-gray-400 mb-2">No Messages</h3>
        <p className="text-gray-500 text-center text-sm">
          You don't have any messages yet. When restaurants send you updates about your reservations, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-800 pb-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white mb-1">Messages</h2>
            <p className="text-sm text-gray-400">
              {unreadCount > 0 ? `${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}` : 'All messages read'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            All ({messages.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              filter === 'unread'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {!selectedRestaurantId ? (
          // Restaurant List View
          <div className="space-y-3">
            {restaurants.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No {filter === 'unread' ? 'unread ' : ''}messages
              </div>
            ) : (
              restaurants.map(restaurant => (
                <button
                  key={restaurant.id}
                  onClick={() => setSelectedRestaurantId(restaurant.id)}
                  className="w-full bg-gray-800 hover:bg-gray-750 rounded-xl p-4 transition-colors text-left border border-gray-700"
                >
                  <div className="flex items-center gap-4">
                    {/* Restaurant Image */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-700">
                      {restaurant.image ? (
                        <img 
                          src={restaurant.image} 
                          alt={restaurant.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Mail className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* Restaurant Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white truncate">{restaurant.name}</h3>
                        {restaurant.unreadCount > 0 && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                            {restaurant.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {restaurant.messages[0].subject}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {restaurant.messages.length} message{restaurant.messages.length !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          // Message Detail View
          <div className="h-full flex flex-col">
            {/* Back Button and Restaurant Header */}
            <div className="mb-4">
              <button
                onClick={() => setSelectedRestaurantId(null)}
                className="text-blue-400 hover:text-blue-300 text-sm mb-3 transition-colors"
              >
                ← Back to all messages
              </button>
              
              {selectedMessages.length > 0 && (
                <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3 border border-gray-700">
                  {selectedMessages[0].restaurantImage && (
                    <img 
                      src={selectedMessages[0].restaurantImage}
                      alt={selectedMessages[0].restaurantName}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <h3 className="text-white">{selectedMessages[0].restaurantName}</h3>
                    <p className="text-sm text-gray-400">
                      {selectedMessages.length} message{selectedMessages.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {selectedMessages.map(message => (
                <div
                  key={message.id}
                  className={`bg-gray-800 rounded-xl p-4 border transition-colors ${
                    message.read 
                      ? 'border-gray-700' 
                      : 'border-blue-600 bg-gray-800/50'
                  }`}
                  onClick={() => !message.read && handleMarkAsRead(message.id)}
                >
                  <div className="flex items-start gap-3 mb-3">
                    {getMessageIcon(message.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-blue-400">
                          {getTypeLabel(message.type)}
                        </span>
                        {!message.read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                        {message.priority === 'high' && (
                          <span className="text-xs text-red-400">High Priority</span>
                        )}
                      </div>
                      <h4 className="text-white mb-1">{message.subject}</h4>
                      <p className="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</p>
                    </div>
                    {!message.read ? (
                      <Mail className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    ) : (
                      <MailOpen className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    )}
                  </div>
                  
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                    {message.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}