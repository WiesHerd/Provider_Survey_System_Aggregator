import React, { useState } from 'react';
import { downloadSampleFile, getAvailableSampleFiles } from '../utils/downloadUtils';

export const DownloadTest: React.FC = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string>('');

  const handleDownload = async (filename: string) => {
    setIsDownloading(true);
    setDownloadStatus(`Downloading ${filename}...`);
    
    try {
      await downloadSampleFile(filename);
      setDownloadStatus(`✅ Successfully downloaded ${filename}`);
    } catch (error) {
      setDownloadStatus(`❌ Failed to download ${filename}: ${error}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const sampleFiles = getAvailableSampleFiles();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Download Test</h1>
      
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="font-semibold text-blue-900 mb-2">Available Sample Files</h2>
          <p className="text-blue-700 text-sm">
            Click any file below to test the download functionality.
          </p>
        </div>

        <div className="grid gap-3">
          {sampleFiles.map((file) => (
            <button
              key={file.filename}
              onClick={() => handleDownload(file.filename)}
              disabled={isDownloading}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="text-left">
                <div className="font-medium text-gray-900">{file.displayName}</div>
                <div className="text-sm text-gray-500">{file.filename}</div>
              </div>
              <div className="text-blue-600">
                {isDownloading ? '⏳' : '⬇️'}
              </div>
            </button>
          ))}
        </div>

        {downloadStatus && (
          <div className={`p-4 rounded-lg ${
            downloadStatus.includes('✅') 
              ? 'bg-green-50 text-green-800' 
              : downloadStatus.includes('❌') 
                ? 'bg-red-50 text-red-800'
                : 'bg-blue-50 text-blue-800'
          }`}>
            {downloadStatus}
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Troubleshooting</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• If downloads fail, check the browser console for errors</li>
            <li>• Make sure the files exist in the public directory</li>
            <li>• Verify Vercel routing configuration</li>
            <li>• Check if the deployment includes the sample files</li>
          </ul>
        </div>
      </div>
    </div>
  );
};


