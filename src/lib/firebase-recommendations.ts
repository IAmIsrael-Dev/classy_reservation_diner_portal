import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit as firestoreLimit
} from 'firebase/firestore';
import { db } from './firebase';

export interface AIRecommendation {
  id: string;
  userId: string;
  type: 'restaurant' | 'experience' | 'rebook';
  title: string;
  description: string;
  restaurantId?: string;
  restaurantName?: string;
  restaurantImage?: string;
  experienceId?: string;
  experienceName?: string;
  action: string;
  confidence: number;
  createdAt: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fetch AI recommendations for a user
 */
export async function getUserRecommendations(
  userId: string,
  limit: number = 10
): Promise<AIRecommendation[]> {
  try {
    const recommendationsRef = collection(db, 'aiRecommendations');
    const now = new Date().toISOString();
    
    const q = query(
      recommendationsRef,
      where('userId', '==', userId),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'desc'),
      orderBy('confidence', 'desc'),
      firestoreLimit(limit)
    );

    const querySnapshot = await getDocs(q);
    const recommendations: AIRecommendation[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      recommendations.push({
        id: doc.id,
        userId: data.userId,
        type: data.type,
        title: data.title,
        description: data.description,
        restaurantId: data.restaurantId,
        restaurantName: data.restaurantName,
        restaurantImage: data.restaurantImage,
        experienceId: data.experienceId,
        experienceName: data.experienceName,
        action: data.action,
        confidence: data.confidence,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        metadata: data.metadata
      });
    });

    return recommendations;
  } catch (error) {
    console.error('Error fetching AI recommendations:', error);
    
    // Check if this is a permission error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('permission-denied') || errorMessage.includes('Missing or insufficient permissions')) {
      console.warn('⚠️ Firebase Firestore permission error when fetching AI recommendations');
      console.warn('📋 AI recommendations collection may not have proper read rules configured');
      // Return empty array to allow app to continue
      return [];
    }
    
    // Return empty array for other errors too
    return [];
  }
}

/**
 * Fetch recommendations without expiration filter (for demo/testing)
 */
export async function getAllUserRecommendations(
  userId: string,
  limit: number = 10
): Promise<AIRecommendation[]> {
  try {
    const recommendationsRef = collection(db, 'aiRecommendations');
    
    const q = query(
      recommendationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limit)
    );

    const querySnapshot = await getDocs(q);
    const recommendations: AIRecommendation[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      recommendations.push({
        id: doc.id,
        userId: data.userId,
        type: data.type,
        title: data.title,
        description: data.description,
        restaurantId: data.restaurantId,
        restaurantName: data.restaurantName,
        restaurantImage: data.restaurantImage,
        experienceId: data.experienceId,
        experienceName: data.experienceName,
        action: data.action,
        confidence: data.confidence,
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
        metadata: data.metadata
      });
    });

    return recommendations;
  } catch (error) {
    console.error('Error fetching all AI recommendations:', error);
    
    // Check if this is a permission error
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('permission-denied') || errorMessage.includes('Missing or insufficient permissions')) {
      console.warn('⚠️ Firebase Firestore permission error when fetching AI recommendations');
      return [];
    }
    
    return [];
  }
}

