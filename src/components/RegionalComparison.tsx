import React from 'react';

interface RegionalData {
  region: string;
  tcc_p25: number;
  tcc_p50: number;
  tcc_p75: number;
  tcc_p90: number;
  cf_p25: number;
  cf_p50: number;
  cf_p75: number;
  cf_p90: number;
  wrvus_p25: number;
  wrvus_p50: number;
  wrvus_p75: number;
  wrvus_p90: number;
}

interface RegionalComparisonProps {
  data: RegionalData[];
}

const percentiles = [
  { key: 'p25', label: '25th Percentile' },
  { key: 'p50', label: '50th Percentile' },
  { key: 'p75', label: '75th Percentile' },
  { key: 'p90', label: '90th Percentile' },
];

const metricConfigs = [
  {
    key: 'tcc',
    label: 'Total Cash Compensation (TCC)',
    format: (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v),
  },
  {
    key: 'cf',
    label: 'Conversion Factor (CF)',
    format: (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v),
  },
  {
    key: 'wrvus',
    label: 'Work RVUs (wRVUs)',
    format: (v: number) => new Intl.NumberFormat('en-US').format(v),
  },
];

const getMinMax = (values: number[]) => {
  let min = Math.min(...values);
  let max = Math.max(...values);
  return { min, max };
};

const getRowAverage = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

const getPercentDiff = (value: number, avg: number) => {
  if (avg === 0) return '';
  const diff = ((value - avg) / avg) * 100;
  return (diff > 0 ? '+' : '') + diff.toFixed(1) + '%';
};

const RegionalComparison: React.FC<RegionalComparisonProps> = ({ data }) => {
  const regionNames = data.map(region => region.region);

  return (
    <div className="space-y-10">
      {metricConfigs.map(metric => (
        <div key={metric.key} className="bg-white rounded-lg shadow-lg p-6 overflow-x-auto">
          <h3 className="text-lg font-semibold mb-4">{metric.label}</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 text-left font-semibold text-gray-600 border-b w-48">Percentile</th>
                {regionNames.map(region => (
                  <th key={region} className="p-3 text-right font-semibold text-gray-600 border-b">
                    {region}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {percentiles.map(p => {
                const values = data.map(r => r[`${metric.key}_${p.key}` as keyof RegionalData] as number);
                const { min, max } = getMinMax(values);
                const avg = getRowAverage(values);
                return (
                  <tr key={p.key} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-600 border-b font-medium">{p.label}</td>
                    {data.map(region => {
                      const value = region[`${metric.key}_${p.key}` as keyof RegionalData] as number;
                      let cellClass = '';
                      let tooltip = '';
                      let percentDiff = '';
                      if (value === max) {
                        cellClass = 'bg-green-50 font-bold ';
                        tooltip = 'Highest value';
                        percentDiff = getPercentDiff(value, avg);
                      } else if (value === min) {
                        cellClass = 'bg-red-50 font-bold ';
                        tooltip = 'Lowest value';
                        percentDiff = getPercentDiff(value, avg);
                      }
                      return (
                        <td key={region.region} className={`p-3 text-gray-700 border-b text-right align-middle ${cellClass}`} title={tooltip}>
                          <span>{metric.format(value)}</span>
                          {(value === max || value === min) && (
                            <span className="block text-xs text-gray-500 mt-0.5">{percentDiff}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default RegionalComparison; 