import { useEffect, useState } from "react";
import { Brain, CheckCircle2, Loader2 } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

interface BackgroundAiStatus {
  isProcessing: boolean;
  drawingId: number | null;
  currentPage: number;
  totalPages: number;
  fileName: string;
}

export default function BackgroundAiStatus() {
  const [status, setStatus] = useState<BackgroundAiStatus>({
    isProcessing: false,
    drawingId: null,
    currentPage: 0,
    totalPages: 0,
    fileName: ''
  });

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch('/api/background-ai/status');
        if (response.ok) {
          const data = await response.json();
          const wasProcessing = status.isProcessing;
          setStatus(data);
          
          // If AI processing just completed, invalidate caches to refresh thumbnails and drawing data
          if (wasProcessing && !data.isProcessing && data.drawingId) {
            queryClient.invalidateQueries({
              queryKey: ['drawings', data.drawingId, 'metadata']
            });
            // Also invalidate the main drawings query to refresh the drawing list with updated metadata
            queryClient.invalidateQueries({
              queryKey: ['/api/drawings']
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch background AI status:', error);
      }
    };

    // Poll every 1 second when processing for more responsive updates
    const interval = setInterval(pollStatus, 1000);
    pollStatus(); // Initial call

    return () => clearInterval(interval);
  }, []);

  if (!status.isProcessing) {
    return null;
  }

  const progress = status.totalPages > 0 ? Math.min(95, (status.currentPage / status.totalPages) * 100) : 0;

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-80 z-50">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {status.isProcessing ? (
            <Brain className="h-5 w-5 text-purple-600 animate-pulse" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          )}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-gray-900">
              AI Enhanced Sheet Labels
            </h4>
            <span className="text-xs text-gray-500">
              {status.currentPage}/{status.totalPages}
            </span>
          </div>
          
          <p className="text-xs text-gray-600 mb-2">
            Analyzing "{status.fileName}" in background
          </p>
          
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <p className="text-xs text-purple-600 mt-1">
            AI is extracting sheet numbers and titles...
          </p>
        </div>
      </div>
    </div>
  );
}