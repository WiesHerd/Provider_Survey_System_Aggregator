import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface WelcomeBannerProps {
  onDismiss?: () => void;
}

const STORAGE_KEY = 'welcomeBannerDismissed';

/**
 * WelcomeBanner component - Amazon-style minimal, professional banner
 * Guides first-time users to upload their first survey
 */
export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(STORAGE_KEY, 'true');
    onDismiss?.();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-indigo-500 p-5 relative">
            {/* Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 rounded-md transition-colors duration-200"
              aria-label="Dismiss welcome banner"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="flex items-start gap-4 pr-8">
              {/* Icon */}
              <div className="flex-shrink-0">
                <InformationCircleIcon className="h-6 w-6 text-indigo-600" />
              </div>

              {/* Text Content */}
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Welcome to <span className="text-indigo-600">Bench</span><span className="text-purple-600">Point</span>!
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  To get started, upload your first survey by clicking <strong className="text-gray-900">"New Survey"</strong> above.
                  This is the first step in standardizing your compensation data.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Check if welcome banner has been dismissed
 */
export const isWelcomeBannerDismissed = (): boolean => {
  return localStorage.getItem(STORAGE_KEY) === 'true';
};

/**
 * Reset welcome banner dismissal (useful for testing)
 */
export const resetWelcomeBanner = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

