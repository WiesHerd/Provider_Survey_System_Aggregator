import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon } from '@heroicons/react/24/solid';

interface FileWithPreview extends File {
  preview?: string;
  id?: string;
  surveyType?: string;
  surveyYear?: string;
  uploadDate?: Date;
}

interface UploadedSurvey {
  id: string;
  fileName: string;
  surveyType: string;
  surveyYear: string;
  uploadDate: Date;
  preview?: string;
  fileContent?: string;  // Added to store the file content
}

interface DataPreviewProps {
  file: FileWithPreview | UploadedSurvey;
  onError: (error: string) => void;
}

interface FileStats {
  totalRows: number;
  totalColumns: number;
  columnNames: string[];
}

const formatValue = (value: string, columnName: string): string => {
  // Remove any existing commas and dollar signs for parsing
  const cleanValue = value.replace(/[$,]/g, '');
  
  // Check if it's a number
  const num = Number(cleanValue);
  if (isNaN(num)) return value;

  // Format based on column name patterns
  const isCurrency = /COST|PRICE|SALARY|COMPENSATION|BONUS|PAY|REVENUE|AMOUNT|TCC|CF/i.test(columnName);
  const isPercentage = /%|PERCENT|RATE/i.test(columnName);
  const isCount = /COUNT|NUMBER|QTY|QUANTITY|TOTAL/i.test(columnName);

  if (isCurrency) {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  }
  
  if (isPercentage) {
    return new Intl.NumberFormat('en-US', { 
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(num / 100);
  }
  
  if (isCount || /^\d+$/.test(cleanValue)) {
    return new Intl.NumberFormat('en-US').format(num);
  }

  return value;
};

const DataPreview: React.FC<DataPreviewProps> = ({ file, onError }) => {
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerms, setSearchTerms] = useState({
    specialty: '',
    providerType: '',
    geographicRegion: ''
  });
  const rowsPerPage = 10;

  // Get unique specialties from the data
  const uniqueSpecialties = useMemo(() => {
    if (!stats?.columnNames || !previewData.length) return [];
    const specialtyIndex = stats.columnNames.findIndex(col => col.toLowerCase() === 'specialty');
    if (specialtyIndex === -1) return [];
    
    const specialties = new Set(
      previewData.map(row => row[specialtyIndex])
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
    );
    return ['', ...Array.from(specialties)];
  }, [previewData, stats?.columnNames]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const parseCSV = async () => {
      try {
        if ('fileContent' in file) {
          // Handle UploadedSurvey type
          const lines = file.fileContent?.split('\n') || [];
          const headers = lines[0]?.split(',').map(header => header.trim()) || [];
          
          // Remove the 100 row limit
          const data = lines.slice(1).map(line => 
            line.split(',').map(cell => cell.trim())
          ).filter(row => row.some(cell => cell.trim())); // Filter out empty rows

          if (isMounted) {
            setPreviewData(data);
            setStats({
              totalRows: data.length,
              totalColumns: headers.length,
              columnNames: headers
            });
            setIsLoading(false);
          }
        } else {
          // Handle FileWithPreview type
          const reader = new FileReader();
          
          reader.onload = async (e) => {
            if (!e.target?.result || !isMounted) return;
            
            const text = e.target.result as string;
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(header => header.trim());
            
            // Remove the 100 row limit
            const data = lines.slice(1).map(line => 
              line.split(',').map(cell => cell.trim())
            ).filter(row => row.some(cell => cell.trim())); // Filter out empty rows

            if (isMounted) {
              setPreviewData(data);
              setStats({
                totalRows: data.length,
                totalColumns: headers.length,
                columnNames: headers
              });
              setIsLoading(false);
            }
          };

          reader.onerror = () => {
            if (isMounted) {
              onError('Error reading file');
              setIsLoading(false);
            }
          };

          if ('slice' in file) {
            reader.readAsText(file as File);
          } else {
            onError('Invalid file format');
            setIsLoading(false);
          }
        }
      } catch (error) {
        if (isMounted) {
          onError('Error parsing CSV file');
          setIsLoading(false);
        }
      }
    };

    parseCSV();
    return () => { isMounted = false; };
  }, [file, onError]);

  const filteredData = useMemo(() => {
    return previewData.filter(row => {
      const specialtyIndex = stats?.columnNames.findIndex(col => col.toLowerCase() === 'specialty') ?? -1;
      const providerTypeIndex = stats?.columnNames.findIndex(col => col.toLowerCase() === 'provider_type') ?? -1;
      const regionIndex = stats?.columnNames.findIndex(col => col.toLowerCase() === 'geographic_region') ?? -1;

      const matchesSpecialty = !searchTerms.specialty || 
        (specialtyIndex >= 0 && row[specialtyIndex].toLowerCase().includes(searchTerms.specialty.toLowerCase()));
      const matchesProviderType = !searchTerms.providerType || 
        (providerTypeIndex >= 0 && row[providerTypeIndex].toLowerCase().includes(searchTerms.providerType.toLowerCase()));
      const matchesRegion = !searchTerms.geographicRegion || 
        (regionIndex >= 0 && row[regionIndex].toLowerCase().includes(searchTerms.geographicRegion.toLowerCase()));

      return matchesSpecialty && matchesProviderType && matchesRegion;
    });
  }, [previewData, stats?.columnNames, searchTerms]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + rowsPerPage);

  if (isLoading) {
    return (
      <div className="w-full bg-white shadow-sm">
        <div className="animate-pulse">
          <div className="h-[400px] bg-gray-50">
            <div className="h-10 bg-gray-200 mb-4" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-100 mb-2" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white shadow-sm">
      {/* Search Filters */}
      <div className="p-4 border border-gray-200 rounded-lg mb-4 bg-white">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Data</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative rounded-md shadow-sm">
            <select
              id="specialty-select"
              className="block w-full rounded-md border border-gray-300 pl-3 pr-10 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white appearance-none"
              value={searchTerms.specialty}
              onChange={(e) => setSearchTerms(prev => ({ ...prev, specialty: e.target.value }))}
            >
              <option value="">All Specialties</option>
              {uniqueSpecialties.filter(Boolean).map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              id="provider-search"
              className="block w-full rounded-md border border-gray-300 pl-10 pr-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Filter by Provider Type..."
              value={searchTerms.providerType}
              onChange={(e) => setSearchTerms(prev => ({ ...prev, providerType: e.target.value }))}
            />
            {searchTerms.providerType && (
              <button
                onClick={() => setSearchTerms(prev => ({ ...prev, providerType: '' }))}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <span className="sr-only">Clear provider type search</span>
                <svg className="h-4 w-4 text-gray-400 hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
            <input
              type="text"
              id="region-search"
              className="block w-full rounded-md border border-gray-300 pl-10 pr-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Filter by Region..."
              value={searchTerms.geographicRegion}
              onChange={(e) => setSearchTerms(prev => ({ ...prev, geographicRegion: e.target.value }))}
            />
            {searchTerms.geographicRegion && (
              <button
                onClick={() => setSearchTerms(prev => ({ ...prev, geographicRegion: '' }))}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <span className="sr-only">Clear region search</span>
                <svg className="h-4 w-4 text-gray-400 hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Data Preview Table Container */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead>
              <tr>
                {stats?.columnNames.map((header, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="bg-gray-50 px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap sticky top-0 border-b border-gray-200"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {currentData.map((row, rowIndex) => (
                <tr 
                  key={rowIndex} 
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap border-r last:border-r-0 border-gray-100"
                      title={cell}
                    >
                      {formatValue(cell, stats?.columnNames[cellIndex] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {currentData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">No data available</p>
          </div>
        )}

        {/* Pagination */}
        <div className="bg-white px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(startIndex + rowsPerPage, filteredData.length)}
                </span>{' '}
                of <span className="font-medium">{filteredData.length}</span> rows
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataPreview; 