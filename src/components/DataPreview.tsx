import React, { useState, useEffect, useMemo } from 'react';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Box,
  SelectChangeEvent
} from '@mui/material';

interface DataPreviewProps {
  file: {
    id: string;
    fileName: string;
    surveyType: string;
    surveyYear: string;
    uploadDate: Date;
    fileContent?: string;
  };
  onError: (message: string) => void;
  globalFilters: {
    specialty: string;
    providerType: string;
    region: string;
  };
  onFilterChange: (filterName: string, value: string) => void;
}

interface FileStats {
  columnNames: string[];
  totalRows: number;
  uniqueSpecialties: number;
  totalDataPoints: number;
}

const DataPreview: React.FC<DataPreviewProps> = ({ file, onError, globalFilters, onFilterChange }) => {
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const rowsPerPage = 10;

  const uniqueSpecialties = useMemo(() => {
    if (!previewData.length) return [];
    const headers = previewData[0]?.map(h => h?.toLowerCase() || '') || [];
    const specialtyIdx = headers.findIndex(h => h.includes('specialty'));
    return Array.from(new Set(
      previewData.slice(1)
        .map(row => row[specialtyIdx])
        .filter(Boolean)
        .map(String)
    )).sort();
  }, [previewData]);

  const uniqueProviderTypes = useMemo(() => {
    if (!previewData.length) return [];
    const headers = previewData[0]?.map(h => h?.toLowerCase() || '') || [];
    const providerTypeIdx = headers.findIndex(h => h.includes('provider') || h.includes('type'));
    return Array.from(new Set(
      previewData.slice(1)
        .map(row => row[providerTypeIdx])
        .filter(Boolean)
        .map(String)
    )).sort();
  }, [previewData]);

  const uniqueRegions = useMemo(() => {
    if (!previewData.length) return [];
    const headers = previewData[0]?.map(h => h?.toLowerCase() || '') || [];
    const regionIdx = headers.findIndex(h => h.includes('region') || h.includes('geography'));
    return Array.from(new Set(
      previewData.slice(1)
        .map(row => row[regionIdx])
        .filter(Boolean)
        .map(String)
    )).sort();
  }, [previewData]);

  const handleFilterChange = (event: SelectChangeEvent<string>) => {
    onFilterChange(event.target.name, event.target.value);
  };

  useEffect(() => {
    if (file.fileContent) {
      try {
        const lines = file.fileContent.split('\n').map(line => line.split(',').map(cell => cell.trim()));
        const headers = lines[0];
        setStats({
          columnNames: headers,
          totalRows: lines.length - 1,
          uniqueSpecialties: new Set(lines.slice(1).map(row => row[0])).size,
          totalDataPoints: (lines.length - 1) * headers.length
        });
        setPreviewData(lines);
        setIsLoading(false);
      } catch (error) {
        console.error('Error processing file:', error);
        onError('Error processing file data');
        setIsLoading(false);
      }
    }
  }, [file.fileContent, onError]);

  const filteredData = useMemo(() => {
    if (!previewData.length || !stats) return [];

    const headers = previewData[0]?.map(h => h?.toLowerCase() || '') || [];
    const specialtyIdx = headers.findIndex(h => h.includes('specialty'));
    const providerTypeIdx = headers.findIndex(h => h.includes('provider') || h.includes('type'));
    const regionIdx = headers.findIndex(h => h.includes('region') || h.includes('geography'));

    return previewData.slice(1).filter(row => {
      const specialty = row[specialtyIdx]?.toString().toLowerCase() || '';
      const providerType = row[providerTypeIdx]?.toString().toLowerCase() || '';
      const region = row[regionIdx]?.toString().toLowerCase() || '';

      const matchesSpecialty = !globalFilters.specialty || 
        specialty.includes(globalFilters.specialty.toLowerCase());
      const matchesProviderType = !globalFilters.providerType || 
        providerType.includes(globalFilters.providerType.toLowerCase());
      const matchesRegion = !globalFilters.region || 
        region.includes(globalFilters.region.toLowerCase());

      return matchesSpecialty && matchesProviderType && matchesRegion;
    });
  }, [previewData, stats, globalFilters]);

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
      {/* Filter Controls */}
      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: 3,
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider'
      }}>
        <FormControl fullWidth>
          <InputLabel>Specialty</InputLabel>
          <Select
            name="specialty"
            value={globalFilters.specialty}
            onChange={handleFilterChange}
            label="Specialty"
          >
            <MenuItem value="">All</MenuItem>
            {uniqueSpecialties.map(specialty => (
              <MenuItem key={specialty} value={specialty}>{specialty}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Provider Type</InputLabel>
          <Select
            name="providerType"
            value={globalFilters.providerType}
            onChange={handleFilterChange}
            label="Provider Type"
          >
            <MenuItem value="">All</MenuItem>
            {uniqueProviderTypes.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>Geographic Region</InputLabel>
          <Select
            name="region"
            value={globalFilters.region}
            onChange={handleFilterChange}
            label="Geographic Region"
          >
            <MenuItem value="">All</MenuItem>
            {uniqueRegions.map(region => (
              <MenuItem key={region} value={region}>{region}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {previewData[0]?.map((header, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
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
                of <span className="font-medium">{filteredData.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataPreview; 