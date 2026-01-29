/**
 * Authentication Service
 * 
 * Enterprise-grade authentication service with comprehensive error handling.
 * Wraps Firebase Auth with clean interface for email/password authentication.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  User,
  UserCredential,
  AuthError,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseAvailable } from '../config/firebase';
import { clearStorage } from '../utils/clearStorage';
import { logger } from '../shared/utils/logger';

/**
 * Auth service interface for dependency injection and testing
 */
export interface IAuthService {
  signUp(email: string, password: string): Promise<UserCredential>;
  signIn(email: string, password: string): Promise<UserCredential>;
  signInWithGoogle(): Promise<void>;
  handleRedirectResult(): Promise<UserCredential | null>;
  sendVerificationEmail(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  reloadCurrentUser(): Promise<User | null>;
  signOut(): Promise<void>;
  getCurrentUser(): User | null;
  onAuthStateChanged(callback: (user: User | null) => void): () => void;
  isAvailable(): boolean;
}

/**
 * Firebase Authentication Service
 * 
 * Provides clean abstraction over Firebase Auth with enterprise-grade error handling.
 */
export class AuthService implements IAuthService {
  private static instance: AuthService | null = null;

  private constructor() {
    if (!isFirebaseAvailable()) {
      logger.warn('⚠️ AuthService: Firebase not available. Authentication disabled.');
    }
  }

  /**
   * Get singleton instance of AuthService
   */
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Check if Firebase Auth is available
   */
  public isAvailable(): boolean {
    return isFirebaseAvailable();
  }

  /**
   * Sign up a new user with email and password
   * 
   * @param email User email address
   * @param password User password (min 6 characters required by Firebase)
   * @returns UserCredential with user information
   * @throws Error with user-friendly message
   */
  public async signUp(email: string, password: string): Promise<UserCredential> {
    if (!this.isAvailable()) {
      throw new Error('Authentication service is not available. Check Firebase configuration.');
    }

    try {
      const auth = getFirebaseAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      logger.log('✅ User signed up successfully:', userCredential.user.email);
      return userCredential;
    } catch (error) {
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Sign in existing user with email and password
   * 
   * @param email User email address
   * @param password User password
   * @returns UserCredential with user information
   * @throws Error with user-friendly message
   */
  public async signIn(email: string, password: string): Promise<UserCredential> {
    if (!this.isAvailable()) {
      throw new Error('Authentication service is not available. Check Firebase configuration.');
    }

    try {
      const auth = getFirebaseAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      logger.log('✅ User signed in successfully:', userCredential.user.email);
      return userCredential;
    } catch (error) {
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Sign in with Google
   * 
   * Uses popup by default with a redirect fallback for managed environments.
   * @throws Error with user-friendly message
   */
  public async signInWithGoogle(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Firebase is not configured. Please restart your dev server after setting up .env.local file.');
    }

    try {
      const auth = getFirebaseAuth();
      const provider = this.buildGoogleProvider();
      const userCredential = await signInWithPopup(auth, provider);
      logger.log('✅ User signed in with Google successfully:', userCredential.user.email);
    } catch (error) {
      const authError = error as AuthError;

      if (this.shouldUseRedirectFallback(authError)) {
        const auth = getFirebaseAuth();
        const provider = this.buildGoogleProvider();
        logger.warn('⚠️ Google sign-in popup unavailable. Falling back to redirect.');
        await signInWithRedirect(auth, provider);
        return;
      }
      
      // Handle specific Google sign-in errors first
      if (authError.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign-in was cancelled. Please try again.');
      }
      
      if (authError.code === 'auth/popup-blocked') {
        throw new Error('Popup was blocked by your browser. Please allow popups for this site and try again.');
      }
      
      if (authError.code === 'auth/account-exists-with-different-credential') {
        throw new Error('An account already exists with this email. Please sign in with your email and password.');
      }
      
      if (authError.code === 'auth/operation-not-allowed') {
        throw new Error('Google sign-in is not enabled in Firebase. Please enable it in Firebase Console > Authentication > Sign-in method.');
      }
      
      // Handle API key errors specifically
      if (authError.code === 'auth/api-key-not-valid' || authError.code === 'auth/invalid-api-key') {
        throw new Error('Firebase API key is invalid. Please check your .env.local file and restart the dev server.');
      }
      
      // Use the general error handler for other errors
      throw this.handleAuthError(authError);
    }
  }

  /**
   * Handle redirect sign-in results after returning from Google.
   * 
   * @returns UserCredential or null if no redirect result exists
   */
  public async handleRedirectResult(): Promise<UserCredential | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const auth = getFirebaseAuth();
      const result = await getRedirectResult(auth);
      if (result?.user?.email) {
        logger.log('✅ User signed in with Google (redirect):', result.user.email);
      }
      return result;
    } catch (error) {
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Send verification email to current user
   */
  public async sendVerificationEmail(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Authentication service is not available.');
    }

    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user. Please sign in first.');
    }

    await sendEmailVerification(user);
    logger.log('✅ Verification email sent');
  }

  /**
   * Send password reset email
   */
  public async resetPassword(email: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Authentication service is not available.');
    }

    try {
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email);
      logger.log('✅ Password reset email sent:', email);
    } catch (error) {
      throw this.handleAuthError(error as AuthError);
    }
  }

  /**
   * Reload current user to refresh email verification status
   */
  public async reloadCurrentUser(): Promise<User | null> {
    if (!this.isAvailable()) {
      return null;
    }

    const auth = getFirebaseAuth();
    if (!auth.currentUser) {
      return null;
    }

    await auth.currentUser.reload();
    return auth.currentUser;
  }

  /**
   * Sign out current user
   * 
   * @throws Error if sign out fails
   */
  public async signOut(): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Authentication service is not available.');
    }

    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      const signedOut = await this.waitForSignedOut(auth);
      if (!signedOut) {
        logger.warn('⚠️ Sign out did not clear auth state. Running cleanup.');
        await this.forceSignOutCleanup(auth);
      }

      if (auth.currentUser) {
        throw new Error('Sign out did not complete. Please refresh and try again.');
      }

      logger.log('✅ User signed out successfully');
    } catch (error) {
      logger.error('❌ Sign out failed:', error);
      throw new Error('Failed to sign out. Please try again.');
    }
  }

  /**
   * Get currently authenticated user
   * 
   * @returns User object or null if not authenticated
   */
  public getCurrentUser(): User | null {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const auth = getFirebaseAuth();
      return auth.currentUser;
    } catch (error) {
      logger.error('❌ Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Subscribe to authentication state changes
   * 
   * @param callback Function to call when auth state changes
   * @returns Unsubscribe function to stop listening
   */
  public onAuthStateChanged(callback: (user: User | null) => void): () => void {
    if (!this.isAvailable()) {
      // Return no-op unsubscribe function
      return () => {};
    }

    try {
      const auth = getFirebaseAuth();
      return onAuthStateChanged(auth, callback);
    } catch (error) {
      logger.error('❌ Failed to subscribe to auth state changes:', error);
      return () => {};
    }
  }

  private buildGoogleProvider(): GoogleAuthProvider {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    return provider;
  }

  private shouldUseRedirectFallback(authError: AuthError): boolean {
    return [
      'auth/popup-blocked',
      'auth/operation-not-supported-in-this-environment',
      'auth/cancelled-popup-request',
      'auth/popup-closed-by-user',
    ].includes(authError.code);
  }

  private async waitForSignedOut(auth: ReturnType<typeof getFirebaseAuth>): Promise<boolean> {
    const attempts = 5;
    const delayMs = 150;
    for (let i = 0; i < attempts; i += 1) {
      if (!auth.currentUser) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return !auth.currentUser;
  }

  private async forceSignOutCleanup(auth: ReturnType<typeof getFirebaseAuth>): Promise<void> {
    await clearStorage.clearFirebaseAuthStorage();
    try {
      await signOut(auth);
    } catch (cleanupError) {
      logger.warn('⚠️ Cleanup sign-out attempt failed:', cleanupError);
    }
    await this.waitForSignedOut(auth);
  }

  /**
   * Convert Firebase auth errors to user-friendly messages
   * 
   * @param error Firebase AuthError
   * @returns Error with user-friendly message
   */
  private handleAuthError(error: AuthError): Error {
    logger.error('❌ Auth error:', error.code, error.message);

    switch (error.code) {
      case 'auth/email-already-in-use':
        return new Error('This email is already registered. Please sign in instead.');
      
      case 'auth/invalid-email':
        return new Error('Invalid email address. Please check and try again.');
      
      case 'auth/operation-not-allowed':
        return new Error('Authentication method is not enabled. Please contact support.');
      
      case 'auth/weak-password':
        return new Error('Password is too weak. Use at least 6 characters.');
      
      case 'auth/user-disabled':
        return new Error('This account has been disabled. Contact support.');
      
      case 'auth/user-not-found':
        return new Error('No account found with this email. Please sign up first.');
      
      case 'auth/wrong-password':
        return new Error('Incorrect password. Please try again.');
      
      case 'auth/too-many-requests':
        return new Error('Too many failed attempts. Please try again later.');
      
      case 'auth/network-request-failed':
        return new Error('Network error. Check your internet connection.');
      
      case 'auth/api-key-not-valid':
      case 'auth/invalid-api-key':
        return new Error('Firebase API key is invalid. Please check your .env.local file and restart the dev server.');
      
      case 'auth/popup-blocked':
        return new Error('Popup was blocked by your browser. Please allow popups for this site and try again.');
      
      case 'auth/popup-closed-by-user':
        return new Error('Sign-in was cancelled. Please try again.');
      
      case 'auth/account-exists-with-different-credential':
        return new Error('An account already exists with this email. Please sign in with your email and password.');
      
      default:
        // For unknown errors, provide a user-friendly message
        const errorCode = error.code || 'unknown';
        const errorMessage = error.message || 'An unexpected error occurred';
        return new Error(`Authentication failed: ${errorCode.includes('api-key') ? 'Please check your Firebase configuration and restart the dev server.' : errorMessage}`);
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

