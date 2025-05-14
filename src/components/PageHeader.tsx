import React from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description }) => {
  return (
    <header className="h-16 border-b border-gray-100 bg-white flex items-center px-8 mb-6">
      <div>
        <h1 className="text-2xl font-semibold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
          {title}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{description}</p>
      </div>
    </header>
  );
};

export default PageHeader; 