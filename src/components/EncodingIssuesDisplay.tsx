import React from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface EncodingIssuesDisplayProps {
  encodingIssues: {
    hasIssues: boolean;
    issues: string[];
    recommendations: string[];
  } | null;
}

export const EncodingIssuesDisplay: React.FC<EncodingIssuesDisplayProps> = ({ encodingIssues }) => {
  if (!encodingIssues) return null;

  if (!encodingIssues.hasIssues) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
          <h3 className="text-sm font-medium text-green-800">No Encoding Issues Detected</h3>
        </div>
        <p className="text-sm text-green-700 mt-1">
          Your CSV file appears to have proper character encoding.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Character Encoding Issues Detected
          </h3>
          
          {encodingIssues.issues.length > 0 && (
            <div className="mb-3">
              <p className="text-sm text-yellow-700 mb-2">
                The following encoding issues were found in your file:
              </p>
              <ul className="text-sm text-yellow-700 space-y-1">
                {encodingIssues.issues.map((issue, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-yellow-600 mr-2">•</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {encodingIssues.recommendations.length > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-800 mb-2">
                Recommendations:
              </p>
              <ul className="text-sm text-yellow-700 space-y-1">
                {encodingIssues.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-yellow-600 mr-2">•</span>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="mt-3 p-3 bg-yellow-100 rounded-md">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> The app has automatically cleaned these characters for you. 
              Your data should display correctly, but consider fixing the source file for future uploads.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
