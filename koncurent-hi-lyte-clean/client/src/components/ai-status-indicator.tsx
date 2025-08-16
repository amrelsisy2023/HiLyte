import { useQuery } from "@tanstack/react-query";
import { Brain, Zap, AlertCircle } from "lucide-react";

interface AIStatus {
  aiEnabled: boolean;
  provider?: string;
  capabilities?: string[];
}

export function AIStatusIndicator() {
  const { data: aiStatus, isLoading } = useQuery<AIStatus>({
    queryKey: ["/api/ai-status"],
    refetchInterval: 10000, // Check every 10 seconds for faster updates
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <div className="w-3 h-3 rounded-full bg-gray-300 animate-pulse" />
        <span>Checking AI...</span>
      </div>
    );
  }

  if (!aiStatus?.aiEnabled) {
    return (
      <div className="flex items-center gap-2 text-orange-600 text-sm" title="AI extraction disabled - using OCR fallback">
        <AlertCircle className="w-3 h-3" />
        <span>OCR Fallback</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-blue-600 text-sm" title={`AI-powered extraction using ${aiStatus.provider}`}>
      <Brain className="w-3 h-3" />
      <span>AI Enhanced</span>
    </div>
  );
}