import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";

let adminApp: App | undefined;
let adminAuth: Auth | undefined;

const initializeFirebaseAdmin = (): { app: App; auth: Auth } => {
  if (adminApp && adminAuth) {
    return { app: adminApp, auth: adminAuth };
  }

  // Check if already initialized
  const existingApp = getApps()[0];
  if (existingApp) {
    adminApp = existingApp;
    adminAuth = getAuth(existingApp);
    return { app: adminApp, auth: adminAuth };
  }

  try {
    // Initialize with service account
    const privateKey = process.env.NEXT_PRIVATE_FIREBASE_PRIVATE_KEY?.replace(
      /\\n/g,
      "\n"
    );

    if (!privateKey) {
      throw new Error("NEXT_PRIVATE_FIREBASE_PRIVATE_KEY is not set");
    }

    if (!process.env.NEXT_PRIVATE_FIREBASE_PROJECT_ID_SA) {
      throw new Error("NEXT_PRIVATE_FIREBASE_PROJECT_ID_SA is not set");
    }

    if (!process.env.NEXT_PRIVATE_FIREBASE_CLIENT_EMAIL) {
      throw new Error("NEXT_PRIVATE_FIREBASE_CLIENT_EMAIL is not set");
    }

    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PRIVATE_FIREBASE_PROJECT_ID_SA,
        clientEmail: process.env.NEXT_PRIVATE_FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.NEXT_PRIVATE_FIREBASE_PROJECT_ID_SA,
    });

    adminAuth = getAuth(adminApp);

    return { app: adminApp, auth: adminAuth };
  } catch (error) {
    throw new Error(
      `Failed to initialize Firebase Admin: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
};

export const getAdminAuth = (): Auth => {
  const { auth } = initializeFirebaseAdmin();
  return auth;
};

export const getAdminApp = (): App => {
  const { app } = initializeFirebaseAdmin();
  return app;
};
