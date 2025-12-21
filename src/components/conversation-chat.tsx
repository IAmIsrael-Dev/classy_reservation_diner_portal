import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Lock } from 'lucide-react';
import type { Conversation, ConversationMessage } from '../lib/types';
import { subscribeToMessages, sendMessage } from '../lib/firebase-conversations';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';

interface ConversationChatProps {
  conversation: Conversation;
  userId: string;
  onBack: () => void;
  demoMode?: boolean;
  hideHeader?: boolean;
}

export function ConversationChat({ conversation, userId, onBack, demoMode = false, hideHeader = false }: ConversationChatProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to real-time messages
  useEffect(() => {
    if (demoMode) {
      return;
    }

    const unsubscribe = subscribeToMessages(conversation.id, (fetchedMessages) => {
      setMessages(fetchedMessages);
    });

    return () => unsubscribe();
  }, [conversation.id, demoMode]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  }, [messageText]);

  async function handleSendMessage() {
    if (!messageText.trim()) return;
    if (!conversation.isActive) {
      toast.error('This conversation is closed');
      return;
    }

    setSending(true);
    try {
      await sendMessage(conversation.id, userId, 'USER', messageText.trim());
      setMessageText('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  function formatMessageTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  function formatMessageDate(timestamp: string): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  // Group messages by date
  function groupMessagesByDate(messages: ConversationMessage[]): Map<string, ConversationMessage[]> {
    const grouped = new Map<string, ConversationMessage[]>();
    
    messages.forEach(message => {
      const dateKey = formatMessageDate(message.createdAt);
      const existing = grouped.get(dateKey) || [];
      grouped.set(dateKey, [...existing, message]);
    });

    return grouped;
  }

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {!hideHeader && (
        <div className="border-b border-gray-800 pb-4 mb-4">
          <button
            onClick={onBack}
            className="text-blue-400 hover:text-blue-300 text-sm mb-3 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to conversations
          </button>

          <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3 border border-gray-700">
            {conversation.restaurantImage && (
              <img
                src={conversation.restaurantImage}
                alt={conversation.restaurantName}
                className="w-12 h-12 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h3 className="text-white">{conversation.restaurantName}</h3>
              {conversation.reservationDate && conversation.reservationTime && (
                <p className="text-sm text-gray-400">
                  {new Date(conversation.reservationDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })} at {conversation.reservationTime}
                </p>
              )}
            </div>
            {!conversation.isActive && (
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <Lock className="w-4 h-4" />
                <span>Closed</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 px-1 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <p>No messages yet</p>
            <p className="text-sm mt-2">Start the conversation!</p>
          </div>
        ) : (
          Array.from(groupedMessages.entries()).map(([dateLabel, dateMessages]) => (
            <div key={dateLabel}>
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">
                  {dateLabel}
                </div>
              </div>

              {/* Messages for this date */}
              <div className="space-y-3">
                {dateMessages.map((message) => {
                  const isUser = message.senderRole === 'USER';
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-4 py-2 ${
                          isUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-100 border border-gray-700'
                        }`}
                      >
                        {/* Sender role label (only for non-user messages) */}
                        {!isUser && (
                          <p className="text-xs text-gray-400 mb-1">
                            {message.senderRole === 'RESTAURANT' ? 'Restaurant' : 'Admin'}
                          </p>
                        )}
                        
                        {/* Message text */}
                        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                        
                        {/* Timestamp */}
                        <p
                          className={`text-xs mt-1 ${
                            isUser ? 'text-blue-200' : 'text-gray-500'
                          }`}
                        >
                          {formatMessageTime(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0 border-t border-gray-800 pt-4 mt-4">
        {conversation.isActive ? (
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Shift + Enter for new line)"
              disabled={sending}
              className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 resize-none min-h-[40px] max-h-[150px] overflow-y-auto"
              rows={1}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!messageText.trim() || sending}
              className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-400 mb-2">
              <Lock className="w-5 h-5" />
              <span>This conversation is closed</span>
            </div>
            <p className="text-sm text-gray-500">
              This reservation has been completed or cancelled. You can no longer send messages.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}