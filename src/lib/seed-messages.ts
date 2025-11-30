import { createMessage } from './firebase-messages';
import { demoMessages, demoRestaurants } from './demo-data';

/**
 * Seed demo messages into Firebase for testing
 * This function can be called manually to populate messages for a user
 */
export async function seedMessagesForUser(userId: string): Promise<void> {
  console.log('Starting to seed messages for user:', userId);
  
  try {
    // Create messages based on demo data
    const messagePromises = demoMessages.map(async (demoMsg, index) => {
      try {
        // Find the restaurant for the image
        const restaurant = demoRestaurants.find(r => r.id === demoMsg.restaurantId);
        
        const message = await createMessage(
          userId, // Use the actual user ID
          demoMsg.restaurantId,
          demoMsg.restaurantName,
          demoMsg.subject,
          demoMsg.message,
          demoMsg.type,
          {
            restaurantImage: restaurant?.images?.[0] || demoMsg.restaurantImage,
            reservationId: demoMsg.reservationId,
            priority: demoMsg.priority
          }
        );
        
        console.log(`✅ Created message ${index + 1}/${demoMessages.length}:`, message.subject);
        return message;
      } catch (error) {
        console.error(`❌ Failed to create message ${index + 1}:`, error);
        throw error;
      }
    });

    await Promise.all(messagePromises);
    console.log('✅ Successfully seeded all messages!');
  } catch (error) {
    console.error('❌ Error seeding messages:', error);
    throw error;
  }
}

/**
 * Create a sample confirmation message for a reservation
 */
export async function createConfirmationMessage(
  userId: string,
  reservationId: string,
  restaurantId: string,
  restaurantName: string,
  restaurantImage: string,
  date: string,
  time: string,
  partySize: number
): Promise<void> {
  try {
    await createMessage(
      userId,
      restaurantId,
      restaurantName,
      'Reservation Confirmed',
      `Your reservation for ${partySize} guest${partySize !== 1 ? 's' : ''} on ${date} at ${time} has been confirmed. We look forward to serving you!`,
      'confirmation',
      {
        restaurantImage,
        reservationId,
        priority: 'normal'
      }
    );
    console.log('✅ Confirmation message created');
  } catch (error) {
    console.error('❌ Error creating confirmation message:', error);
    throw error;
  }
}

/**
 * Create a reminder message for an upcoming reservation
 */
export async function createReminderMessage(
  userId: string,
  reservationId: string,
  restaurantId: string,
  restaurantName: string,
  restaurantImage: string,
  date: string,
  time: string,
  partySize: number
): Promise<void> {
  try {
    await createMessage(
      userId,
      restaurantId,
      restaurantName,
      'Reservation Reminder',
      `This is a friendly reminder about your reservation for ${partySize} guest${partySize !== 1 ? 's' : ''} on ${date} at ${time}. We can't wait to see you!`,
      'reminder',
      {
        restaurantImage,
        reservationId,
        priority: 'normal'
      }
    );
    console.log('✅ Reminder message created');
  } catch (error) {
    console.error('❌ Error creating reminder message:', error);
    throw error;
  }
}

/**
 * Create a special offer message
 */
export async function createSpecialOfferMessage(
  userId: string,
  restaurantId: string,
  restaurantName: string,
  restaurantImage: string,
  subject: string,
  offerDetails: string
): Promise<void> {
  try {
    await createMessage(
      userId,
      restaurantId,
      restaurantName,
      subject,
      offerDetails,
      'special_offer',
      {
        restaurantImage,
        priority: 'low'
      }
    );
    console.log('✅ Special offer message created');
  } catch (error) {
    console.error('❌ Error creating special offer message:', error);
    throw error;
  }
}

/**
 * Create an update message for a reservation
 */
export async function createUpdateMessage(
  userId: string,
  reservationId: string,
  restaurantId: string,
  restaurantName: string,
  restaurantImage: string,
  subject: string,
  updateDetails: string,
  priority: 'low' | 'normal' | 'high' = 'normal'
): Promise<void> {
  try {
    await createMessage(
      userId,
      restaurantId,
      restaurantName,
      subject,
      updateDetails,
      'update',
      {
        restaurantImage,
        reservationId,
        priority
      }
    );
    console.log('✅ Update message created');
  } catch (error) {
    console.error('❌ Error creating update message:', error);
    throw error;
  }
}
