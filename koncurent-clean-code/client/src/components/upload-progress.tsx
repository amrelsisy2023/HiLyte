import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, FileImage, CheckCircle2, X } from "lucide-react";

interface UploadProgressProps {
  fileName: string;
  totalPages?: number;
  isVisible: boolean;
  onCancel?: (userInitiated?: boolean) => void;
}

interface UploadStatus {
  phase: 'pdf_processing' | 'ai_extraction' | 'complete';
  pagesProcessed: number;
  totalPages: number;
  timeRemaining?: number;
  currentTask: string;
}

export default function UploadProgress({ fileName, totalPages = 0, isVisible, onCancel }: UploadProgressProps) {
  const [status, setStatus] = useState<UploadStatus>({
    phase: 'pdf_processing',
    pagesProcessed: 0,
    totalPages: totalPages,
    currentTask: 'Starting PDF processing...'
  });
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!isVisible) return;

    // Poll for upload status and background AI status
    const pollStatus = async () => {
      try {
        // Check upload status first
        const uploadResponse = await fetch('/api/upload/status');
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          
          // If upload is complete, check background AI status
          if (uploadData.phase === 'complete' || uploadData.phase === 'idle') {
            const aiResponse = await fetch('/api/background-ai/status');
            if (aiResponse.ok) {
              const aiData = await aiResponse.json();
              if (aiData.isProcessing) {
                // Background AI is running - stay visible and show AI progress
                setStatus({
                  phase: 'ai_extraction',
                  pagesProcessed: aiData.currentPage || 0,
                  totalPages: aiData.totalPages || uploadData.totalPages || 0,
                  currentTask: `Analyzing sheet ${aiData.currentPage || 0} of ${aiData.totalPages || uploadData.totalPages || 0}...`,
                  timeRemaining: 0
                });
                return;
              } else {
                // Check if AI processing just finished - only auto-hide if AI was actually done
                if (aiData.drawingId && !aiData.isProcessing) {
                  // Everything is complete - show completion status
                  setStatus({
                    phase: 'complete',
                    pagesProcessed: uploadData.totalPages || 0,
                    totalPages: uploadData.totalPages || 0,
                    currentTask: 'Upload and analysis complete',
                    timeRemaining: 0
                  });
                  
                  // Auto-hide after 5 seconds when everything is truly complete
                  setTimeout(() => {
                    if (onCancel) {
                      onCancel(false); // Pass false to indicate this is cleanup, not user-initiated
                    }
                  }, 5000);
                  return;
                } else {
                  // Upload complete but no AI processing detected yet - stay in processing mode
                  setStatus({
                    phase: 'pdf_processing',
                    pagesProcessed: uploadData.pagesProcessed || uploadData.totalPages || 0,
                    totalPages: uploadData.totalPages || 0,
                    currentTask: 'Preparing for AI analysis...',
                    timeRemaining: 0
                  });
                  return;
                }
              }
            }
          }
          
          // Still in upload phase, calculate time remaining
          const now = Date.now();
          const elapsed = (now - startTime) / 1000; // seconds
          let timeRemaining = 0;
          
          if (uploadData.pagesProcessed > 0) {
            const timePerPage = elapsed / uploadData.pagesProcessed;
            const remainingPages = uploadData.totalPages - uploadData.pagesProcessed;
            timeRemaining = Math.ceil(remainingPages * timePerPage);
          }

          // Format the current task to show "Processing page X of Y" format
          let currentTask = uploadData.currentTask;
          if (uploadData.phase === 'pdf_processing' && uploadData.pagesProcessed && uploadData.totalPages) {
            currentTask = `Processing page ${uploadData.pagesProcessed} of ${uploadData.totalPages}...`;
          }

          setStatus({
            ...uploadData,
            currentTask,
            timeRemaining
          });
        }
      } catch (error) {
        console.error('Failed to fetch upload status:', error);
      }
    };

    const interval = setInterval(pollStatus, 1000);
    return () => clearInterval(interval);
  }, [isVisible, startTime]);

  if (!isVisible || !fileName) return null;

  const getProgress = () => {
    if (status.phase === 'complete') return 100;
    if (status.totalPages === 0) return 10; // Show some progress even when starting
    
    if (status.phase === 'pdf_processing') {
      // Calculate progress based on pages processed, but cap it at 90% until complete
      // to avoid showing 100% while still processing
      const rawProgress = (status.pagesProcessed / Math.max(status.totalPages, status.pagesProcessed + 1)) * 100;
      return Math.min(90, Math.max(10, rawProgress));
    } else if (status.phase === 'ai_extraction') {
      // AI extraction runs in background after upload completes
      return 100;
    }
    
    return 10;
  };

  const getIcon = () => {
    switch (status.phase) {
      case 'pdf_processing':
        return <FileImage className="h-5 w-5 text-blue-600" />;
      case 'ai_extraction':
        return <Brain className="h-5 w-5 text-purple-600" />;
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      default:
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
    }
  };

  const getPhaseText = () => {
    switch (status.phase) {
      case 'pdf_processing':
        return 'Processing PDF pages';
      case 'ai_extraction':
        return 'AI analyzing sheet titles';
      case 'complete':
        return 'Upload complete';
      default:
        return 'Processing';
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return `${seconds}s remaining`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s remaining`;
  };

  return (
    <div className="w-full">
      <div className="flex items-center space-x-3 mb-4">
        {getIcon()}
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{fileName}</h4>
          <p className="text-sm text-gray-600">{getPhaseText()}</p>
        </div>
        {onCancel && status.phase !== 'complete' && (
          <Button
            onClick={() => onCancel(true)} // Explicitly pass true for user-initiated cancel
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Progress value={getProgress()} className="mb-4 h-3" />





      {status.phase === 'ai_extraction' && (
        <div className="mt-3 p-2 bg-purple-50 rounded text-xs text-purple-700">
          AI is analyzing title blocks to extract sheet numbers and titles...
        </div>
      )}
    </div>
  );
}