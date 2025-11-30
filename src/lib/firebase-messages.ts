import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  addDoc,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { type Message } from './types';

/**
 * Create a new message from restaurant to user
 */
export async function createMessage(
  userId: string,
  restaurantId: string,
  restaurantName: string,
  subject: string,
  message: string,
  type: 'confirmation' | 'reminder' | 'update' | 'cancellation' | 'general' | 'special_offer',
  options?: {
    restaurantImage?: string;
    reservationId?: string;
    priority?: 'low' | 'normal' | 'high';
  }
): Promise<Message> {
  try {
    const messagesRef = collection(db, 'messages');
    const newMessage = {
      userId,
      restaurantId,
      restaurantName,
      restaurantImage: options?.restaurantImage || '',
      subject,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      reservationId: options?.reservationId,
      type,
      priority: options?.priority || 'normal'
    };

    const docRef = await addDoc(messagesRef, newMessage);
    
    return {
      id: docRef.id,
      ...newMessage
    };
  } catch (error) {
    console.error('Error creating message:', error);
    throw error;
  }
}

/**
 * Fetch all messages for a user
 */
export async function getUserMessages(userId: string): Promise<Message[]> {
  try {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const messages: Message[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        userId: data.userId,
        restaurantId: data.restaurantId,
        restaurantName: data.restaurantName,
        restaurantImage: data.restaurantImage,
        subject: data.subject,
        message: data.message,
        timestamp: data.timestamp,
        read: data.read || false,
        reservationId: data.reservationId,
        type: data.type || 'general',
        priority: data.priority || 'normal'
      });
    });

    return messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    
    // Check if this is a permission error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('permission-denied') || errorMessage.includes('Missing or insufficient permissions')) {
      console.warn('⚠️ Firebase Firestore permission error when fetching messages');
      console.warn('📋 Messages collection may not have proper read rules configured');
      // Return empty array to allow app to continue
      return [];
    }
    
    throw error;
  }
}

/**
 * Fetch messages for a specific restaurant
 */
export async function getRestaurantMessages(
  userId: string,
  restaurantId: string
): Promise<Message[]> {
  try {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('userId', '==', userId),
      where('restaurantId', '==', restaurantId),
      orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const messages: Message[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        userId: data.userId,
        restaurantId: data.restaurantId,
        restaurantName: data.restaurantName,
        restaurantImage: data.restaurantImage,
        subject: data.subject,
        message: data.message,
        timestamp: data.timestamp,
        read: data.read || false,
        reservationId: data.reservationId,
        type: data.type || 'general',
        priority: data.priority || 'normal'
      });
    });

    return messages;
  } catch (error) {
    console.error('Error fetching restaurant messages:', error);
    
    // Check if this is a permission error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('permission-denied') || errorMessage.includes('Missing or insufficient permissions')) {
      console.warn('⚠️ Firebase Firestore permission error when fetching restaurant messages');
      return [];
    }
    
    throw error;
  }
}

/**
 * Mark a message as read
 */
export async function markMessageAsRead(messageId: string): Promise<void> {
  try {
    const messageRef = doc(db, 'messages', messageId);
    await updateDoc(messageRef, {
      read: true
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    
    // Check if this is a permission error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('permission-denied') || errorMessage.includes('Missing or insufficient permissions')) {
      console.warn('⚠️ Firebase Firestore permission error when updating message');
      console.warn('📋 Messages collection may not have proper write rules configured');
      // Don't throw, allow app to continue
      return;
    }
    
    throw error;
  }
}

/**
 * Mark all messages as read for a user
 */
export async function markAllMessagesAsRead(userId: string): Promise<void> {
  try {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(q);
    const updatePromises: Promise<void>[] = [];

    querySnapshot.forEach((document) => {
      const messageRef = doc(db, 'messages', document.id);
      updatePromises.push(updateDoc(messageRef, { read: true }));
    });

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking all messages as read:', error);
    
    // Check if this is a permission error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('permission-denied') || errorMessage.includes('Missing or insufficient permissions')) {
      console.warn('⚠️ Firebase Firestore permission error when updating messages');
      return;
    }
    
    throw error;
  }
}

/**
 * Get unread message count
 */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting unread message count:', error);
    
    // Check if this is a permission error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('permission-denied') || errorMessage.includes('Missing or insufficient permissions')) {
      console.warn('⚠️ Firebase Firestore permission error when counting messages');
      return 0;
    }
    
    return 0;
  }
}

/**
 * Group messages by restaurant
 */
export function groupMessagesByRestaurant(messages: Message[]): Map<string, Message[]> {
  const grouped = new Map<string, Message[]>();

  messages.forEach(message => {
    const restaurantId = message.restaurantId;
    if (!grouped.has(restaurantId)) {
      grouped.set(restaurantId, []);
    }
    grouped.get(restaurantId)?.push(message);
  });

  return grouped;
}