import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import {
  ArrowUpTrayIcon,
  PresentationChartLineIcon,
  MapIcon,
  DocumentChartBarIcon,
  DocumentTextIcon,
  UserIcon,
  CurrencyDollarIcon,
  ArrowsPointingOutIcon,
  AcademicCapIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { WelcomeBanner, isWelcomeBannerDismissed } from '../shared/components/WelcomeBanner';
import { useSurveyCount } from '../shared/hooks/useSurveyCount';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmationDialog, ButtonSpinner } from '../shared/components';
import { useToast } from '../contexts/ToastContext';

interface WelcomeCard {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  path: string;
  color: string;
  gradient: string;
}

interface CardSection {
  title: string;
  description: string;
  cards: WelcomeCard[];
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { hasSurveys, loading: surveysLoading } = useSurveyCount();
  const [showBanner, setShowBanner] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { signOut } = useAuth();
  const toast = useToast();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Check if banner should be shown
  useEffect(() => {
    if (!surveysLoading) {
      const dismissed = isWelcomeBannerDismissed();
      setShowBanner(!hasSurveys && !dismissed);
    }
  }, [hasSurveys, surveysLoading]);

  const handleBannerDismiss = () => {
    setShowBanner(false);
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
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

  const cardSections: CardSection[] = [
    {
      title: 'Data Upload & Mappings',
      description: 'Upload surveys and standardize your data for analysis',
      cards: [
        {
          title: 'New Survey',
          description: 'Upload and validate your survey data files',
          icon: ArrowUpTrayIcon,
          path: '/upload',
          color: 'bg-indigo-600',
          gradient: 'from-indigo-600 to-indigo-700',
        },
        {
          title: 'Specialties',
          description: 'Map and standardize specialty names across surveys',
          icon: AcademicCapIcon,
          path: '/specialty-mapping',
          color: 'bg-indigo-600',
          gradient: 'from-indigo-600 to-indigo-700',
        },
        {
          title: 'Provider Types',
          description: 'Map and standardize provider types across surveys',
          icon: UserIcon,
          path: '/provider-type-mapping',
          color: 'bg-indigo-600',
          gradient: 'from-indigo-600 to-indigo-700',
        },
        {
          title: 'Regions',
          description: 'Map and standardize geographic regions across surveys',
          icon: MapIcon,
          path: '/region-mapping',
          color: 'bg-indigo-600',
          gradient: 'from-indigo-600 to-indigo-700',
        },
        {
          title: 'Comp Metrics',
          description: 'Map and standardize compensation variables across surveys',
          icon: CurrencyDollarIcon,
          path: '/variable-mapping',
          color: 'bg-indigo-600',
          gradient: 'from-indigo-600 to-indigo-700',
        },
      ]
    },
    {
      title: 'Benchmarking & Analytics',
      description: 'Analyze and compare compensation data across surveys',
      cards: [
        {
          title: 'Benchmarking',
          description: 'Analyze and compare data across multiple surveys',
          icon: PresentationChartLineIcon,
          path: '/benchmarking',
          color: 'bg-purple-600',
          gradient: 'from-purple-600 to-purple-700',
        },
        {
          title: 'Regional Data',
          description: 'Analyze data across multiple regions',
          icon: MapIcon,
          path: '/regional-analytics',
          color: 'bg-purple-600',
          gradient: 'from-purple-600 to-purple-700',
        },
        {
          title: 'Custom Blending',
          description: 'Blend compensation data across specialties for analysis',
          icon: ArrowsPointingOutIcon,
          path: '/specialty-blending',
          color: 'bg-purple-600',
          gradient: 'from-purple-600 to-purple-700',
        },
        {
          title: 'Fair Market Value',
          description: 'Calculate and compare compensation with market data',
          icon: CurrencyDollarIcon,
          path: '/fair-market-value',
          color: 'bg-purple-600',
          gradient: 'from-purple-600 to-purple-700',
        },
        {
          title: 'Chart & Report Builder',
          description: 'Create custom reports and visualizations from your survey data',
          icon: DocumentChartBarIcon,
          path: '/custom-reports',
          color: 'bg-purple-600',
          gradient: 'from-purple-600 to-purple-700',
        },
        {
          title: 'Report Library',
          description: 'Select a pre-formatted report template and generate professional reports',
          icon: DocumentTextIcon,
          path: '/canned-reports',
          color: 'bg-purple-600',
          gradient: 'from-purple-600 to-purple-700',
        },
      ]
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.2
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                 {/* BenchPoint Branding */}
         {/* Top Navigation with Welcome and Logo */}
         <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6 }}
           className="flex items-center justify-between mb-8"
         >
           {/* Logo and Brand - Left Side */}
           <div className="flex items-center space-x-3">
             <div className="relative">
               {!logoError ? (
                 <img 
                   src={process.env.PUBLIC_URL + '/benchpoint-icon.svg?v=7'} 
                   alt="BenchPoint Logo" 
                   className="w-12 h-12 object-contain transition-transform duration-300 hover:scale-110 cursor-pointer"
                   onError={() => setLogoError(true)}
                 />
               ) : (
                 <svg className="w-12 h-12 transition-transform duration-300 hover:scale-110 cursor-pointer" fill="currentColor" viewBox="0 0 64 64">
                   <defs>
                     <linearGradient id="benchpointGradientDashboard" x1="0%" y1="0%" x2="100%" y2="100%">
                       <stop offset="0%" style={{ stopColor: '#4F46E5', stopOpacity: 1 }} />
                       <stop offset="100%" style={{ stopColor: '#7C3AED', stopOpacity: 1 }} />
                     </linearGradient>
                   </defs>
                   <circle cx="32" cy="32" r="28" fill="url(#benchpointGradientDashboard)" stroke="#E5E7EB" strokeWidth="2"/>
                   <circle cx="20" cy="24" r="3" fill="white" opacity="0.9"/>
                   <circle cx="32" cy="18" r="3" fill="white" opacity="0.9"/>
                   <circle cx="44" cy="24" r="3" fill="white" opacity="0.9"/>
                   <circle cx="20" cy="40" r="3" fill="white" opacity="0.9"/>
                   <circle cx="32" cy="46" r="3" fill="white" opacity="0.9"/>
                   <circle cx="44" cy="40" r="3" fill="white" opacity="0.9"/>
                   <line x1="20" y1="24" x2="32" y2="18" stroke="white" strokeWidth="2" opacity="0.7"/>
                   <line x1="32" y1="18" x2="44" y2="24" stroke="white" strokeWidth="2" opacity="0.7"/>
                   <line x1="20" y1="40" x2="32" y2="46" stroke="white" strokeWidth="2" opacity="0.7"/>
                   <line x1="32" y1="46" x2="44" y2="40" stroke="white" strokeWidth="2" opacity="0.7"/>
                   <line x1="20" y1="24" x2="20" y2="40" stroke="white" strokeWidth="2" opacity="0.7"/>
                   <line x1="44" y1="24" x2="44" y2="40" stroke="white" strokeWidth="2" opacity="0.7"/>
                   <circle cx="32" cy="32" r="4" fill="white"/>
                   <circle cx="32" cy="32" r="2" fill="#4F46E5"/>
                 </svg>
               )}
             </div>
             <div className="text-2xl font-bold">
               <span className="text-indigo-600">Bench</span>
               <span className="text-purple-600">Point</span>
             </div>
           </div>

           {/* Sign Out Button - Right Side - Google/Apple Style */}
           <button
             onClick={() => setShowSignOutConfirm(true)}
             className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg focus:outline-none focus:bg-red-50 transition-all duration-150 group disabled:opacity-50 disabled:cursor-not-allowed"
             aria-label="Sign out"
             disabled={isSigningOut}
           >
             {isSigningOut ? (
               <>
                 <ButtonSpinner />
                 <span className="ml-2">Signing out...</span>
               </>
             ) : (
               <>
                 <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-500 group-hover:text-red-600 mr-2 transition-colors duration-150" />
                 <span>Sign Out</span>
               </>
             )}
           </button>
         </motion.div>

        {/* Welcome Banner - Show only for first-time users */}
        {showBanner && (
          <WelcomeBanner onDismiss={handleBannerDismiss} />
        )}

        {/* Sections */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto space-y-12"
        >
          {cardSections.map((section, sectionIndex) => (
            <div
              key={section.title}
              className="relative"
            >
              {/* Section Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-1.5">
                  {section.title}
                </h2>
                <p className="text-sm text-gray-600">
                  {section.description}
                </p>
              </div>

              {/* Modern Card Grid */}
              <div className={cn(
                "grid gap-4 items-stretch overflow-visible",
                section.cards.length === 4 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" :
                section.cards.length === 6 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" :
                section.cards.length === 5 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" :
                "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              )}>
                {section.cards.map((card) => {
                  // Skip placeholder cards
                  if (!card.title) {
                    return <div key="placeholder" className="hidden" />;
                  }
                  
                  // Check if this is the "New Survey" card and banner is visible
                  const isNewSurveyCard = card.title === 'New Survey';
                  const shouldHighlight = isNewSurveyCard && showBanner;
                  
                  return (
                  <div
                    key={card.title}
                    className="group h-full"
                  >
                    <button
                      onClick={() => navigate(card.path)}
                      className="w-full h-full text-left"
                    >
                      <div className={cn(
                        "relative h-full bg-white rounded-xl border p-5 transition-all duration-200 flex flex-col",
                        shouldHighlight 
                          ? "border-indigo-400 shadow-md ring-2 ring-indigo-400/50" 
                          : "border-gray-200 group-hover:shadow-md group-hover:border-gray-300"
                      )}>
                        {/* Icon */}
                        <div className="mb-4">
                          <div 
                            className={cn(
                              "inline-flex p-2.5 rounded-xl",
                              card.color
                            )}
                          >
                            <card.icon className="w-5 h-5 text-white" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col min-h-0">
                          <h3 className="text-base font-medium text-gray-900 mb-2 flex-shrink-0">
                            {card.title}
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 flex-1 overflow-hidden">
                            {card.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                  );
                })}
              </div>

              {/* Section Divider */}
              {sectionIndex < cardSections.length - 1 && (
                <div className="mt-12 mb-8">
                  <div className="w-full h-px bg-gray-200"></div>
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-sm text-gray-500">
            © 2024 BenchPoint. All rights reserved.
          </p>
        </motion.div>
      </div>

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

export default Dashboard; 