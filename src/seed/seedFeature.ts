import { db } from "@config/firebase";
import { COLLECTIONS } from "@constant/collection";
import logger from "@utils/logger";

const defaultFeatures = {
  unlimitedMoodCheckins: true,
  unlimitedChatMessages: true,
  publishPostsToCommunity: true,
  fullCommunityAccess: true,
  autoAiRemindersNotifications: true,
  sentimentAwareGuidance: true,
  voiceChatAudioPlayback: true,
  createAndSaveImagesDocuments: true,
  earlyAccessToNewFeatures: false,
  prioritySupport: false,
};

const seedAppFeatures = async () => {
  try {
    logger.info('Seeding default app features...');

    const featuresRef = db.collection(COLLECTIONS.APP_CONFIG).doc('features');

    const doc = await featuresRef.get();
    if (doc.exists) {
      logger.info('Deleting existing app features document...');
      await featuresRef.delete();
      logger.info('Existing document deleted.');
    }

    await featuresRef.set(defaultFeatures);
    logger.info('App features seeded successfully!');

  } catch (error) {
    logger.error('Error seeding app features:', error);
    process.exit(1);
  }
};

seedAppFeatures();