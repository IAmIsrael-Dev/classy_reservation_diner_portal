import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  doc,
  orderBy,
  onSnapshot,
  serverTimestamp,
  QueryDocumentSnapshot,
  type DocumentData
} from 'firebase/firestore';
import { db } from './firebase';
import type { Conversation, ConversationMessage, ParticipantRole } from './types';

/**
 * Fetch all conversations for a given user
 * Query: conversations where participants.userId == userId
 */
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  try {
    const conversationsRef = collection(db, 'conversations');
    // Remove orderBy to avoid composite index requirement
    // Will sort in JavaScript instead
    const q = query(
      conversationsRef,
      where('participants.userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const conversations: Conversation[] = [];

    snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      conversations.push({
        id: doc.id,
        type: data.type,
        reservationId: data.reservationId,
        participants: data.participants,
        participantRoles: data.participantRoles,
        lastMessage: data.lastMessage || '',
        lastMessageAt: data.lastMessageAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        isActive: data.isActive ?? true,
      });
    });

    // Sort by lastMessageAt in JavaScript (descending - newest first)
    conversations.sort((a, b) => {
      const dateA = new Date(a.lastMessageAt).getTime();
      const dateB = new Date(b.lastMessageAt).getTime();
      return dateB - dateA;
    });

    return conversations;
  } catch (error) {
    console.error('Error fetching user conversations:', error);
    // Return empty array instead of throwing to allow app to continue
    return [];
  }
}

/**
 * Fetch messages for a specific conversation
 * Query: conversations/{conversationId}/messages ordered by createdAt ascending
 */
export async function getConversationMessages(conversationId: string): Promise<ConversationMessage[]> {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const snapshot = await getDocs(q);
    const messages: ConversationMessage[] = [];

    snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        senderId: data.senderId,
        senderRole: data.senderRole,
        text: data.text,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        isRead: data.isRead ?? false,
      });
    });

    return messages;
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    throw error;
  }
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  senderRole: ParticipantRole,
  text: string
): Promise<void> {
  try {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    
    // Add the message
    await addDoc(messagesRef, {
      senderId,
      senderRole,
      text,
      createdAt: serverTimestamp(),
      isRead: false,
    });

    // Update conversation's lastMessage and lastMessageAt
    const conversationRef = doc(db, 'conversations', conversationId);
    await updateDoc(conversationRef, {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Subscribe to real-time messages for a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  onUpdate: (messages: ConversationMessage[]) => void
): () => void {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const messages: ConversationMessage[] = [];
    snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        senderId: data.senderId,
        senderRole: data.senderRole,
        text: data.text,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        isRead: data.isRead ?? false,
      });
    });
    onUpdate(messages);
  });

  return unsubscribe;
}

/**
 * Subscribe to real-time conversations for a user
 */
export function subscribeToUserConversations(
  userId: string,
  onUpdate: (conversations: Conversation[]) => void
): () => void {
  const conversationsRef = collection(db, 'conversations');
  // Remove orderBy to avoid composite index requirement
  // Will sort in the snapshot callback instead
  const q = query(
    conversationsRef,
    where('participants.userId', '==', userId)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const conversations: Conversation[] = [];
    snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
      const data = doc.data();
      conversations.push({
        id: doc.id,
        type: data.type,
        reservationId: data.reservationId,
        participants: data.participants,
        participantRoles: data.participantRoles,
        lastMessage: data.lastMessage || '',
        lastMessageAt: data.lastMessageAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        isActive: data.isActive ?? true,
      });
    });
    
    // Sort by lastMessageAt in JavaScript (descending - newest first)
    conversations.sort((a, b) => {
      const dateA = new Date(a.lastMessageAt).getTime();
      const dateB = new Date(b.lastMessageAt).getTime();
      return dateB - dateA;
    });
    
    onUpdate(conversations);
  });

  return unsubscribe;
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(conversationId: string, messageIds: string[]): Promise<void> {
  try {
    const updatePromises = messageIds.map(messageId => {
      const messageRef = doc(db, 'conversations', conversationId, 'messages', messageId);
      return updateDoc(messageRef, { isRead: true });
    });

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}

/**
 * Get or create a conversation for a reservation
 * If a conversation already exists for the reservation, return it
 * Otherwise, create a new conversation
 */
export async function getOrCreateConversation(
  userId: string,
  restaurantId: string,
  reservationId: string
): Promise<string> {
  try {
    // First, check if a conversation already exists for this reservation
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('reservationId', '==', reservationId)
    );

    const snapshot = await getDocs(q);

    // If conversation exists, return its ID
    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }

    // Create a new conversation
    const newConversation = {
      type: 'reservation',
      reservationId,
      participants: {
        userId,
        restaurantId,
      },
      participantRoles: {
        [userId]: 'user',
        [restaurantId]: 'restaurant',
      },
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      isActive: true,
    };

    const docRef = await addDoc(conversationsRef, newConversation);
    return docRef.id;
  } catch (error) {
    console.error('Error getting or creating conversation:', error);
    throw error;
  }
}