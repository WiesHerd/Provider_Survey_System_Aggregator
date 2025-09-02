import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import {
  ArrowUpTrayIcon,
  LinkIcon,
  TableCellsIcon,
  PresentationChartLineIcon,
  MapIcon,
  CalculatorIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UserIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

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

  const cardSections: CardSection[] = [
    {
      title: 'Data Management',
      description: 'Upload and standardize your survey data for consistency',
      cards: [
        {
          title: 'Upload Data',
          description: 'Upload and validate your survey data files',
          icon: ArrowUpTrayIcon,
          path: '/upload',
          color: 'bg-blue-500',
          gradient: 'from-blue-500 to-blue-600',
        },
        {
          title: 'Specialties',
          description: 'Map and standardize specialty names across surveys',
          icon: LinkIcon,
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
        {
          title: 'Other Column Mappings',
          description: 'Define column mappings and data transformations',
          icon: TableCellsIcon,
          path: '/column-mapping',
          color: 'bg-indigo-500',
          gradient: 'from-indigo-500 to-indigo-600',
        },
      ]
    },
    {
      title: 'Analytics & Reports',
      description: 'Generate insights and reports from your survey data',
      cards: [
        {
          title: 'Survey Analytics',
          description: 'Analyze and compare data across multiple surveys',
          icon: PresentationChartLineIcon,
          path: '/analytics',
          color: 'bg-amber-500',
          gradient: 'from-amber-500 to-amber-600',
        },
        {
          title: 'Regional Analytics',
          description: 'Analyze data across multiple regions',
          icon: ChartBarIcon,
          path: '/regional-analytics',
          color: 'bg-red-500',
          gradient: 'from-red-500 to-red-600',
        },
        {
          title: 'Custom Reports',
          description: 'Create custom reports and visualizations from your survey data',
          icon: DocumentTextIcon,
          path: '/custom-reports',
          color: 'bg-teal-500',
          gradient: 'from-teal-500 to-teal-600',
        },
        {
          title: 'Fair Market Value',
          description: 'Calculate and compare compensation with market data',
          icon: CalculatorIcon,
          path: '/fair-market-value',
          color: 'bg-blue-600',
          gradient: 'from-blue-600 to-blue-700',
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
         <motion.div
           initial={{ opacity: 0, y: -20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6 }}
           className="text-center mb-8"
         >
                     {/* Logo and Brand */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              {/* Logo */}
              <div className="relative">
                <img 
                  src={process.env.PUBLIC_URL + '/favicon-32x32.svg?v=6'} 
                  alt="BenchPoint Logo" 
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    console.log('Dashboard logo failed to load:', (e.target as HTMLImageElement).src);
                    // Replace with inline SVG fallback
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <svg class="w-16 h-16" fill="currentColor" viewBox="0 0 64 64">
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
              {/* Brand Name */}
              <div className="text-3xl font-bold">
                <span className="text-gray-800">Bench</span>
                <span className="text-indigo-600">Point</span>
              </div>
            </div>
          </div>
         </motion.div>

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
              className="space-y-6"
            >
              {/* Section Header */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {section.title}
                </h2>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  {section.description}
                </p>
              </div>

              {/* Section Cards */}
              <div className={cn(
                "grid gap-6 justify-center",
                section.cards.length === 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto" :
                section.cards.length === 6 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto" :
                "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto"
              )}>
                {section.cards.map((card) => (
                  <motion.div
                    key={card.title}
                    variants={cardVariants}
                    whileHover={{ 
                      y: -4,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <button
                      onClick={() => navigate(card.path)}
                      className="w-full h-full group"
                    >
                      <div className="relative h-full bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 overflow-hidden">
                        {/* Gradient Background */}
                        <div className={cn(
                          "absolute inset-0 bg-gradient-to-br opacity-5 group-hover:opacity-10 transition-opacity duration-200",
                          card.gradient
                        )} />
                        
                        {/* Icon */}
                        <div className="relative mb-4">
                          <div className={cn(
                            "inline-flex p-3 rounded-xl shadow-sm",
                            card.color
                          )}>
                            <card.icon className="w-6 h-6 text-white" />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="relative">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors duration-200">
                            {card.title}
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {card.description}
                          </p>
                        </div>

                        {/* Hover Effect */}
                        <div className="absolute inset-0 border-2 border-transparent rounded-xl group-hover:border-indigo-200 transition-colors duration-200 pointer-events-none" />
                      </div>
                    </button>
                  </motion.div>
                ))}
              </div>

              {/* Section Divider */}
              {sectionIndex < cardSections.length - 1 && (
                <div className="flex justify-center pt-8">
                  <div className="w-24 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
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