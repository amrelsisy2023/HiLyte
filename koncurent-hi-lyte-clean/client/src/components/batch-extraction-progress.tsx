import React from 'react';
import { Bot, Zap } from 'lucide-react';

interface BatchExtractionProgressProps {
  isVisible: boolean;
  extractedCount: number;
  totalCount: number;
  currentArea?: string;
}

export default function BatchExtractionProgress({
  isVisible,
  extractedCount,
  totalCount,
  currentArea
}: BatchExtractionProgressProps) {
  if (!isVisible) return null;

  const progress = totalCount > 0 ? (extractedCount / totalCount) * 100 : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80 animate-in slide-in-from-bottom-2">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Zap className="w-4 h-4 text-blue-600" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-gray-900">
              Batch Data Extraction
            </h3>
            <span className="text-xs font-medium text-gray-500">
              {extractedCount}/{totalCount}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            {currentArea ? (
              <>AI is extracting data from selected areas...</>
            ) : (
              <>Processing highlighted areas with AI analysis...</>
            )}
          </p>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {currentArea && (
            <p className="text-xs text-gray-500 truncate">
              Current: {currentArea}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}