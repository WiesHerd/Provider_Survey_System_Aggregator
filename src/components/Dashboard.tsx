import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import {
  ArrowUpTrayIcon,
  TagIcon,
  PresentationChartLineIcon,
  MapIcon,
  ChartBarIcon,
  DocumentChartBarIcon,
  UserIcon,
  CurrencyDollarIcon,
  CircleStackIcon,
  ArrowsPointingOutIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { WelcomeBanner, isWelcomeBannerDismissed } from '../shared/components/WelcomeBanner';
import { useSurveyCount } from '../shared/hooks/useSurveyCount';

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
          color: 'bg-blue-500',
          gradient: 'from-blue-500 to-blue-600',
        },
        {
          title: 'Specialties',
          description: 'Map and standardize specialty names across surveys',
          icon: AcademicCapIcon,
          path: '/specialty-mapping',
          color: 'bg-emerald-500',
          gradient: 'from-emerald-500 to-emerald-600',
        },
        {
          title: 'Provider Types',
          description: 'Map and standardize provider types across surveys',
          icon: UserIcon,
          path: '/provider-type-mapping',
          color: 'bg-purple-500',
          gradient: 'from-purple-500 to-purple-600',
        },
        {
          title: 'Regions',
          description: 'Map and standardize geographic regions across surveys',
          icon: MapIcon,
          path: '/region-mapping',
          color: 'bg-green-500',
          gradient: 'from-green-500 to-green-600',
        },
        {
          title: 'Comp Metrics',
          description: 'Map and standardize compensation variables across surveys',
          icon: CurrencyDollarIcon,
          path: '/variable-mapping',
          color: 'bg-yellow-500',
          gradient: 'from-yellow-500 to-yellow-600',
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
          color: 'bg-amber-500',
          gradient: 'from-amber-500 to-amber-600',
        },
        {
          title: 'Regional Data',
          description: 'Analyze data across multiple regions',
          icon: MapIcon,
          path: '/regional-analytics',
          color: 'bg-red-500',
          gradient: 'from-red-500 to-red-600',
        },
        {
          title: 'Custom Blending',
          description: 'Blend compensation data across specialties for analysis',
          icon: ArrowsPointingOutIcon,
          path: '/specialty-blending',
          color: 'bg-violet-500',
          gradient: 'from-violet-500 to-violet-600',
        },
        {
          title: 'Fair Market Value',
          description: 'Calculate and compare compensation with market data',
          icon: CurrencyDollarIcon,
          path: '/fair-market-value',
          color: 'bg-blue-600',
          gradient: 'from-blue-600 to-blue-700',
        },
        {
          title: 'Report Builder',
          description: 'Create custom reports and visualizations from your survey data',
          icon: DocumentChartBarIcon,
          path: '/custom-reports',
          color: 'bg-teal-500',
          gradient: 'from-teal-500 to-teal-600',
        },
      ]
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                 {/* BenchPoint Branding */}
         {/* Top Navigation with Welcome and Logo */}
         <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6 }}
           className="flex items-center justify-end mb-8"
         >
           {/* Logo and Brand - Right Side */}
           <div className="flex items-center space-x-3">
             <div className="relative">
               <img 
                 src={process.env.PUBLIC_URL + '/benchpoint-icon.svg?v=7'} 
                 alt="BenchPoint Logo" 
                 className="w-12 h-12 object-contain transition-transform duration-300 hover:scale-110 cursor-pointer"
                 onError={(e) => {
                   // Replace with inline SVG fallback
                   const target = e.target as HTMLImageElement;
                   target.style.display = 'none';
                   const parent = target.parentElement;
                   if (parent) {
                     parent.innerHTML = `
                       <svg class="w-12 h-12 transition-transform duration-300 hover:scale-110 cursor-pointer" fill="currentColor" viewBox="0 0 64 64">
                         <defs>
                           <linearGradient id="benchpointGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                             <stop offset="0%" style="stop-color:#4F46E5;stop-opacity:1" />
                             <stop offset="100%" style="stop-color:#7C3AED;stop-opacity:1" />
                           </linearGradient>
                         </defs>
                         <circle cx="32" cy="32" r="28" fill="url(#benchpointGradient)" stroke="#E5E7EB" stroke-width="2"/>
                         <circle cx="20" cy="24" r="3" fill="white" opacity="0.9"/>
                         <circle cx="32" cy="18" r="3" fill="white" opacity="0.9"/>
                         <circle cx="44" cy="24" r="3" fill="white" opacity="0.9"/>
                         <circle cx="20" cy="40" r="3" fill="white" opacity="0.9"/>
                         <circle cx="32" cy="46" r="3" fill="white" opacity="0.9"/>
                         <circle cx="44" cy="40" r="3" fill="white" opacity="0.9"/>
                         <line x1="20" y1="24" x2="32" y2="18" stroke="white" stroke-width="2" opacity="0.7"/>
                         <line x1="32" y1="18" x2="44" y2="24" stroke="white" stroke-width="2" opacity="0.7"/>
                         <line x1="20" y1="40" x2="32" y2="46" stroke="white" stroke-width="2" opacity="0.7"/>
                         <line x1="32" y1="46" x2="44" y2="40" stroke="white" stroke-width="2" opacity="0.7"/>
                         <line x1="20" y1="24" x2="20" y2="40" stroke="white" stroke-width="2" opacity="0.7"/>
                         <line x1="44" y1="24" x2="44" y2="40" stroke="white" stroke-width="2" opacity="0.7"/>
                         <circle cx="32" cy="32" r="4" fill="white"/>
                         <circle cx="32" cy="32" r="2" fill="#4F46E5"/>
                       </svg>
                     `;
                   }
                 }}
               />
             </div>
             <div className="text-2xl font-bold">
               <span className="text-indigo-600">Bench</span>
               <span className="text-purple-600">Point</span>
             </div>
           </div>
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
            <motion.div
              key={section.title}
              variants={cardVariants}
              className="relative"
            >
              {/* Modern Section Header */}
              <div className="flex items-center gap-6 mb-8">
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">
                    {section.title}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {section.description}
                  </p>
                </div>
                <div className="hidden sm:block flex-shrink-0">
                  <div className="w-16 h-px bg-gradient-to-r from-gray-300 to-transparent"></div>
                </div>
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
                  <motion.div
                    key={card.title}
                    variants={cardVariants}
                    animate={shouldHighlight ? {
                      scale: [1, 1.02, 1],
                      transition: {
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }
                    } : {}}
                    whileHover={{ 
                      scale: 1.01,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="group h-full"
                    style={{ 
                      willChange: 'transform',
                      transformOrigin: 'center'
                    }}
                  >
                    <button
                      onClick={() => navigate(card.path)}
                      className="w-full h-full"
                    >
                      <div className={cn(
                        "relative h-full bg-white rounded-xl border p-5 transition-all duration-200 flex flex-col",
                        shouldHighlight 
                          ? "border-indigo-400 shadow-md ring-2 ring-indigo-400/50" 
                          : "border-gray-200 group-hover:shadow-lg group-hover:border-gray-300"
                      )}>
                        {/* Icon */}
                        <div className="mb-4">
                          <div 
                            className={cn(
                              "inline-flex p-2.5 rounded-xl transition-all duration-300 transform",
                              card.color
                            )}
                            style={{
                              transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.15) rotate(8deg)';
                              e.currentTarget.style.boxShadow = '0 10px 25px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                              e.currentTarget.style.boxShadow = '';
                            }}
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

                        {/* Subtle hover indicator */}
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                  );
                })}
              </div>

              {/* Modern Section Divider */}
              {sectionIndex < cardSections.length - 1 && (
                <div className="mt-16 mb-4">
                  <div className="w-full h-px bg-gray-200"></div>
                </div>
              )}
            </motion.div>
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
    </div>
  );
};

export default Dashboard; 