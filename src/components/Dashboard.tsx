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
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

interface WelcomeCard {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  path: string;
  color: string;
  gradient: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const welcomeCards: WelcomeCard[] = [
    {
      title: 'Upload Survey Data',
      description: 'Upload and validate your survey data files',
      icon: ArrowUpTrayIcon,
      path: '/upload',
      color: 'bg-blue-500',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Specialty Mapping',
      description: 'Map and standardize specialty names across surveys',
      icon: LinkIcon,
      path: '/specialty-mapping',
      color: 'bg-emerald-500',
      gradient: 'from-emerald-500 to-emerald-600',
    },
    {
      title: 'Column Mapping',
      description: 'Define column mappings and data transformations',
      icon: TableCellsIcon,
      path: '/column-mapping',
      color: 'bg-purple-500',
      gradient: 'from-purple-500 to-purple-600',
    },
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
      icon: MapIcon,
      path: '/regional-analytics',
      color: 'bg-red-500',
      gradient: 'from-red-500 to-red-600',
    },
    {
      title: 'Fair Market Value',
      description: 'Calculate and compare compensation with market data',
      icon: CalculatorIcon,
      path: '/fair-market-value',
      color: 'bg-indigo-500',
      gradient: 'from-indigo-500 to-indigo-600',
    },
    {
      title: 'Custom Reports',
      description: 'Create custom reports and visualizations from your survey data',
      icon: ChartBarIcon,
      path: '/custom-reports',
      color: 'bg-teal-500',
      gradient: 'from-teal-500 to-teal-600',
    },
    {
      title: 'System Settings',
      description: 'Manage data storage, export settings, and system preferences',
      icon: Cog6ToothIcon,
      path: '/system-settings',
      color: 'bg-slate-500',
      gradient: 'from-slate-500 to-slate-600',
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
           {/* Welcome Message */}
           <h2 className="text-xl font-semibold text-gray-900 mb-4">
             Welcome to
           </h2>
           
           {/* Logo and Brand */}
           <div className="flex items-center justify-center mb-6">
             <div className="flex items-center space-x-4">
               {/* Logo */}
               <div className="relative">
                 <img 
                                       src={process.env.PUBLIC_URL + '/benchpoint-icon.svg?v=4'} 
                   alt="BenchPoint Logo" 
                   className="w-16 h-16 object-contain"
                   onError={(e) => {
                     console.log('Dashboard logo failed to load:', (e.target as HTMLImageElement).src);
                     (e.target as HTMLImageElement).style.display = 'none';
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
           <p className="text-sm text-gray-600">
             Get started by selecting an option below.
           </p>
         </motion.div>

        {/* Feature Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto"
        >
          {welcomeCards.map((card) => (
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