import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink as firebaseSignInWithEmailLink, signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword, ActionCodeSettings } from "firebase/auth";

// Validate required environment variables
const getFirebaseConfig = () => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!apiKey || !authDomain || !projectId) {
    throw new Error(
      "Missing required Firebase environment variables. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are set in your .env file."
    );
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export const initializeFirebase = (): { app: FirebaseApp; auth: Auth } => {
  if (app && auth) {
    return { app, auth };
  }

  // Check if already initialized
  const existingApp = getApps()[0];
  if (existingApp) {
    app = existingApp;
    auth = getAuth(existingApp);
    return { app, auth };
  }

  // Get and validate config
  const firebaseConfig = getFirebaseConfig();

  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);

  return { app, auth };
};

export const getAuthInstance = (): Auth => {
  const { auth } = initializeFirebase();
  return auth;
};

/**
 * Get action code settings for email link authentication
 */
export const getActionCodeSettings = (): ActionCodeSettings => {
  // Use window.location for protocol detection (client-side only)
  // Fallback to environment variable or default
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "localhost";
  
  // Determine protocol from current window location if available (client-side)
  // Otherwise use environment variable or default to https for production
  let protocol = "https";
  let port = "";
  
  if (typeof window !== "undefined") {
    // Client-side: use current window protocol
    protocol = window.location.protocol.slice(0, -1); // Remove trailing ':'
    port = window.location.port ? `:${window.location.port}` : "";
  } else {
    // Server-side: use environment variable or default
    protocol = process.env.NEXT_PUBLIC_PROTOCOL || "https";
    port = process.env.NEXT_PUBLIC_PORT ? `:${process.env.NEXT_PUBLIC_PORT}` : "";
  }
  
  const url = `${protocol}://${appDomain}${port}/auth/callback`;

  return {
    url,
    handleCodeInApp: true,
  };
};

/**
 * Send passwordless sign-in link to email
 */
export const sendPasswordlessLink = async (email: string): Promise<void> => {
  const auth = getAuthInstance();
  const actionCodeSettings = getActionCodeSettings();
  
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
};

/**
 * Check if the current URL is a sign-in email link
 */
export const checkIsEmailLink = (): boolean => {
  if (typeof window === "undefined") return false;
  
  const auth = getAuthInstance();
  return isSignInWithEmailLink(auth, window.location.href);
};

/**
 * Sign in with email link
 */
export const signInWithEmailLinkAuth = async (
  email: string,
  emailLink: string
): Promise<{ user: { uid: string; email: string | null }; idToken: string }> => {
  const auth = getAuthInstance();
  const userCredential = await firebaseSignInWithEmailLink(auth, email, emailLink);
  const idToken = await userCredential.user.getIdToken();
  
  return {
    user: userCredential.user,
    idToken,
  };
};

/**
 * Sign in with email and password
 */
export const signInWithEmailAndPassword = async (
  email: string,
  password: string
): Promise<{ user: { uid: string; email: string | null }; idToken: string }> => {
  const auth = getAuthInstance();
  const userCredential = await firebaseSignInWithEmailAndPassword(auth, email, password);
  const idToken = await userCredential.user.getIdToken();
  
  return {
    user: userCredential.user,
    idToken,
  };
};
