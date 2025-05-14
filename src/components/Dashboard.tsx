import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpTrayIcon,
  LinkIcon,
  TableCellsIcon,
  PresentationChartLineIcon,
  MapIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';

interface DashboardCard {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  path: string;
  color: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const dashboardCards: DashboardCard[] = [
    {
      title: 'Upload Survey Data',
      description: 'Upload and validate your survey data files',
      icon: ArrowUpTrayIcon,
      path: '/upload',
      color: 'bg-blue-500',
    },
    {
      title: 'Specialty Mapping',
      description: 'Map and standardize specialty names across surveys',
      icon: LinkIcon,
      path: '/specialty-mapping',
      color: 'bg-green-500',
    },
    {
      title: 'Column Mapping',
      description: 'Define column mappings and data transformations',
      icon: TableCellsIcon,
      path: '/column-mapping',
      color: 'bg-purple-500',
    },
    {
      title: 'Survey Analytics',
      description: 'Analyze and compare data across multiple surveys',
      icon: PresentationChartLineIcon,
      path: '/analytics',
      color: 'bg-yellow-500',
    },
    {
      title: 'Regional Analytics',
      description: 'Analyze data across multiple regions',
      icon: MapIcon,
      path: '/regional-analytics',
      color: 'bg-red-500',
    },
    {
      title: 'Fair Market Value',
      description: 'Calculate and compare compensation with market data',
      icon: CalculatorIcon,
      path: '/fair-market-value',
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="py-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map((card) => (
          <button
            key={card.title}
            onClick={() => navigate(card.path)}
            className="flex flex-col items-start p-6 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 text-left"
          >
            <div className={`p-3 rounded-lg ${card.color} mb-4`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
            <p className="text-sm text-gray-600">{card.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard; 