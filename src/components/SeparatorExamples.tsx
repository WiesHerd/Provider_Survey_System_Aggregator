import React from 'react';
import AgGridWrapper from './AgGridWrapper';

/**
 * Demonstration component showing different column separator styles
 * for AG Grid with Quartz theme
 */
export const SeparatorExamples: React.FC = () => {
  // Sample data for demonstration
  const sampleData = [
    { id: 1, name: 'John Doe', department: 'Engineering', salary: 75000 },
    { id: 2, name: 'Jane Smith', department: 'Marketing', salary: 65000 },
    { id: 3, name: 'Bob Johnson', department: 'Sales', salary: 80000 },
  ];

  const columnDefs = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'name', headerName: 'Name', width: 150 },
    { field: 'department', headerName: 'Department', width: 150 },
    { field: 'salary', headerName: 'Salary', width: 120 },
  ];

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-6">AG Grid Column Separator Examples</h1>
      
      {/* Default separators */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Default Separators</h2>
        <div className="h-64">
          <AgGridWrapper
            rowData={sampleData}
            columnDefs={columnDefs}
            pagination={false}
          />
        </div>
      </div>

      {/* Strong separators */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Strong Separators (2px, darker)</h2>
        <div className="h-64">
          <div className="ag-theme-quartz strong-separators">
            <AgGridWrapper
              rowData={sampleData}
              columnDefs={columnDefs}
              pagination={false}
            />
          </div>
        </div>
      </div>

      {/* Blue separators */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Blue Separators</h2>
        <div className="h-64">
          <div className="ag-theme-quartz blue-separators">
            <AgGridWrapper
              rowData={sampleData}
              columnDefs={columnDefs}
              pagination={false}
            />
          </div>
        </div>
      </div>

      {/* Subtle separators */}
      <div>
        <h2 className="text-lg font-semibold mb-2">Subtle Separators (0.5px, very light)</h2>
        <div className="h-64">
          <div className="ag-theme-quartz subtle-separators">
            <AgGridWrapper
              rowData={sampleData}
              columnDefs={columnDefs}
              pagination={false}
            />
          </div>
        </div>
      </div>

      {/* Usage instructions */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">How to Use Different Separator Styles</h3>
        <div className="space-y-2 text-sm">
          <p><strong>Default:</strong> <code>className="ag-theme-quartz"</code></p>
          <p><strong>Strong:</strong> <code>className="ag-theme-quartz strong-separators"</code></p>
          <p><strong>Blue:</strong> <code>className="ag-theme-quartz blue-separators"</code></p>
          <p><strong>Green:</strong> <code>className="ag-theme-quartz green-separators"</code></p>
          <p><strong>Red:</strong> <code>className="ag-theme-quartz red-separators"</code></p>
          <p><strong>Subtle:</strong> <code>className="ag-theme-quartz subtle-separators"</code></p>
          <p><strong>Very Strong:</strong> <code>className="ag-theme-quartz very-strong-separators"</code></p>
        </div>
      </div>
    </div>
  );
};

export default SeparatorExamples;
