/**
 * User Menu Component
 * 
 * Material Design-compliant user menu dropdown following Google Material Design 3 guidelines.
 * Features:
 * - Material Design avatar with solid color (elevation-based)
 * - Material Design elevation system (4dp for menu)
 * - Smooth Material Design animations
 * - Sign out with confirmation dialog
 * - Professional loading states and transitions
 * - Clean, minimal Material Design spacing and typography
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRightOnRectangleIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmationDialog } from '../shared/components';
import { ButtonSpinner } from '../shared/components';
import { useToast } from '../contexts/ToastContext';

interface UserMenuProps {
  isSidebarOpen: boolean;
}

export const UserMenu: React.FC<UserMenuProps> = ({ isSidebarOpen }) => {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isMenuOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isMenuOpen]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setIsMenuOpen(false);
      setShowSignOutConfirm(false);
      // Navigate to login screen
      navigate('/', { replace: true });
      // Small delay for smooth transition
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (error) {
      console.error('Sign out failed:', error);
      setIsSigningOut(false);
      const message = error instanceof Error ? error.message : 'Please try again.';
      toast.error('Sign out failed', message);
      // Error will be handled by AuthContext
    }
  };

  const userInitials = user?.email
    ? user.email
        .split('@')[0]
        .substring(0, 2)
        .toUpperCase()
    : 'SA';

  // Extract display name from email (before @) or use email
  const userDisplayName = user?.email
    ? user.email.split('@')[0].charAt(0).toUpperCase() + user.email.split('@')[0].slice(1)
    : 'Survey Admin';
  const userDisplayEmail = user?.email || '';
  
  // TODO: Replace with actual user subscription data when available
  // For now, hide plan information until subscription system is implemented
  const userPlan = null; // user?.subscription?.plan || null;

  if (!isSidebarOpen) {
    // Collapsed sidebar - show just avatar button with beautiful gradient
    return (
      <div className="px-3 py-4 border-t border-gray-100">
        <button
          ref={buttonRef}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-gray-50 transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          aria-label="User menu"
          aria-expanded={isMenuOpen}
        >
          <div className="relative">
            {/* Material Design avatar: solid color, elevation-based shadow with border */}
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium shadow-sm group-hover:shadow-md transition-shadow duration-200 border-2 border-white/80 ring-1 ring-gray-200/50">
              {userInitials}
            </div>
          </div>
        </button>

        {/* Beautiful Dropdown menu for collapsed sidebar */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            className="absolute bottom-16 left-16 w-72 bg-white rounded-xl shadow-md border border-gray-200 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
            aria-label="User menu options"
            role="menu"
            style={{
              animation: 'slideUp 0.2s ease-out, fadeIn 0.2s ease-out'
            }}
          >
            {/* User Info Header - Material Design: solid background */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                {/* Material Design avatar: solid primary color with border */}
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium shadow-sm border-2 border-white/80 ring-1 ring-gray-200/50">
                  {userInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p 
                    className="text-sm font-semibold text-gray-900 truncate" 
                    title={userDisplayEmail}
                  >
                    {userDisplayName}
                  </p>
                  <p 
                    className="text-xs text-gray-500 truncate" 
                    title={userDisplayEmail}
                  >
                    {userDisplayEmail}
                  </p>
                  {userPlan && (
                    <p className="text-xs text-gray-400 font-normal mt-0.5">{userPlan}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setShowSignOutConfirm(true);
                }}
                className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-150 group focus:outline-none focus:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                role="menuitem"
                tabIndex={0}
                disabled={isSigningOut}
                aria-disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <>
                    <ButtonSpinner />
                    <span className="ml-3 font-medium">Signing out...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-500 group-hover:text-red-600 mr-3 transition-colors duration-150" />
                    <span className="font-medium">Sign Out</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Expanded sidebar - show full beautiful user menu
  return (
    <div className="px-3 py-4 border-t border-gray-100 relative">
      {/* Beautiful User Profile Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          isMenuOpen 
            ? 'bg-indigo-50 border border-indigo-200' 
            : 'hover:bg-gray-50 border border-transparent'
        }`}
        aria-label="User menu"
        aria-expanded={isMenuOpen}
      >
        <div className="relative flex-shrink-0">
          {/* Material Design avatar: solid primary color, elevation-based with border */}
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium shadow-sm group-hover:shadow-md transition-shadow duration-200 border-2 border-white/80 ring-1 ring-gray-200/50">
            {userInitials}
          </div>
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p 
            className="text-sm font-semibold text-gray-900 truncate"
            title={userDisplayEmail}
          >
            {userDisplayName}
          </p>
          <p 
            className="text-xs text-gray-500 truncate"
            title={userDisplayEmail}
          >
            {userDisplayEmail}
          </p>
          {userPlan && (
            <p className="text-xs text-gray-400 font-normal mt-0.5">{userPlan}</p>
          )}
        </div>
        <div className="flex-shrink-0 transition-transform duration-200">
          {isMenuOpen ? (
            <ChevronUpIcon className="w-5 h-5 text-indigo-600" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
          )}
        </div>
      </button>

      {/* Beautiful Dropdown Menu with smooth animations */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-md border border-gray-200 py-2 z-50 overflow-hidden"
          aria-label="User menu options"
          role="menu"
          style={{
            animation: 'slideUp 0.2s ease-out, fadeIn 0.2s ease-out'
          }}
        >
          {/* Sign Out Option with beautiful styling */}
          <button
            onClick={() => {
              setIsMenuOpen(false);
              setShowSignOutConfirm(true);
            }}
                className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-150 group focus:outline-none focus:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                role="menuitem"
                tabIndex={0}
                disabled={isSigningOut}
                aria-disabled={isSigningOut}
          >
            {isSigningOut ? (
              <>
                <ButtonSpinner />
                <span className="ml-3 font-medium">Signing out...</span>
              </>
            ) : (
              <>
                <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-500 group-hover:text-red-600 mr-3 transition-colors duration-150" />
                <span className="font-medium">Sign Out</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Sign Out Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showSignOutConfirm}
        onClose={() => {
          if (!isSigningOut) {
            setShowSignOutConfirm(false);
          }
        }}
        onConfirm={handleSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out? You'll need to sign in again to access your data."
        confirmText="Sign Out"
        cancelText="Cancel"
        type="danger"
        isLoading={isSigningOut}
      />
    </div>
  );
};

