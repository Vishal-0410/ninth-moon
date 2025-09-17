import 'dotenv/config';
import logger from "@utils/logger";
import type { ServiceAccount } from "firebase-admin";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { Auth, getAuth } from "firebase-admin/auth";
import { Firestore, getFirestore } from "firebase-admin/firestore";
import { getMessaging, Messaging } from "firebase-admin/messaging";
import { getStorage, Storage } from 'firebase-admin/storage';


const requiredEnvVars = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_CLIENT_EMAIL",
];

const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
}

const serviceAccount: ServiceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID as string,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") as string,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL as string,
};

try {
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,

    });
  }
  logger.info("Firebase Admin SDK initialized successfully");
} catch (error) {
  logger.error("Failed to initialize Firebase Admin SDK:", error);
  throw error;
}

const db:Firestore = getFirestore();
const auth:Auth =getAuth();
const fcm:Messaging  =getMessaging();
const storage:Storage = getStorage();
const bucket = storage.bucket();

export { db, auth, fcm, storage, bucket };

