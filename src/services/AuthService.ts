/**
 * Authentication Service
 * 
 * Enterprise-grade authentication service with comprehensive error handling.
 * Wraps Firebase Auth with clean interface for email/password authentication.
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential,
  AuthError,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseAvailable } from '../config/firebase';

/**
 * Auth service interface for dependency injection and testing
 */
export interface IAuthService {
  signUp(email: string, password: string): Promise<UserCredential>;
  signIn(email: string, password: string): Promise<UserCredential>;
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
      console.warn('⚠️ AuthService: Firebase not available. Authentication disabled.');
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
      console.log('✅ User signed up successfully:', userCredential.user.email);
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
      console.log('✅ User signed in successfully:', userCredential.user.email);
      return userCredential;
    } catch (error) {
      throw this.handleAuthError(error as AuthError);
    }
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
      console.log('✅ User signed out successfully');
    } catch (error) {
      console.error('❌ Sign out failed:', error);
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
      console.error('❌ Failed to get current user:', error);
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
      console.error('❌ Failed to subscribe to auth state changes:', error);
      return () => {};
    }
  }

  /**
   * Convert Firebase auth errors to user-friendly messages
   * 
   * @param error Firebase AuthError
   * @returns Error with user-friendly message
   */
  private handleAuthError(error: AuthError): Error {
    console.error('❌ Auth error:', error.code, error.message);

    switch (error.code) {
      case 'auth/email-already-in-use':
        return new Error('This email is already registered. Please sign in instead.');
      
      case 'auth/invalid-email':
        return new Error('Invalid email address. Please check and try again.');
      
      case 'auth/operation-not-allowed':
        return new Error('Email/password authentication is not enabled. Contact support.');
      
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
      
      default:
        return new Error(`Authentication failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

