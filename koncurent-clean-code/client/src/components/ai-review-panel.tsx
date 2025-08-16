import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Eye, Brain, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AiReviewPanelProps {
  isVisible: boolean;
  onClose: () => void;
  pendingAreas: Array<{
    id: string;
    area: {
      x: number;
      y: number;
      width: number;
      height: number;
      type: 'data' | 'header' | 'critical';
      description: string;
    };
    suggestedDivision?: {
      id: number;
      name: string;
      code: string;
      color: string;
      confidence: number;
    };
    scaledCoords: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  onApproveArea: (areaId: string) => void;
  onRejectArea: (areaId: string) => void;
  onApproveAll: () => void;
  onRejectAll: () => void;
}

export function AiReviewPanel({
  isVisible,
  onClose,
  pendingAreas,
  onApproveArea,
  onRejectArea,
  onApproveAll,
  onRejectAll
}: AiReviewPanelProps) {
  const { toast } = useToast();
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

  if (!isVisible || pendingAreas.length === 0) {
    return null;
  }

  const handleApproveArea = (areaId: string) => {
    onApproveArea(areaId);
    toast({
      title: "Area Approved",
      description: "AI-suggested area approved for extraction.",
    });
  };

  const handleRejectArea = (areaId: string) => {
    onRejectArea(areaId);
    toast({
      title: "Area Rejected",
      description: "AI-suggested area rejected.",
    });
  };

  const handleApproveAll = () => {
    onApproveAll();
    toast({
      title: "All Areas Approved",
      description: `${pendingAreas.length} AI-suggested areas approved for extraction.`,
    });
  };

  const handleRejectAll = () => {
    onRejectAll();
    toast({
      title: "All Areas Rejected",
      description: "All AI-suggested areas rejected.",
    });
  };

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI Review Panel
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <AlertCircle className="h-4 w-4" />
          <span>{pendingAreas.length} areas identified for review</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Bulk Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleApproveAll}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="h-4 w-4 mr-1" />
            Approve All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRejectAll}
            className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
          >
            <X className="h-4 w-4 mr-1" />
            Reject All
          </Button>
        </div>

        {/* Individual Areas */}
        <ScrollArea className="h-48">
          <div className="space-y-2">
            {pendingAreas.map((area, index) => (
              <div
                key={area.id}
                className={`p-3 border rounded-lg transition-all duration-200 ${
                  hoveredArea === area.id 
                    ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
                onMouseEnter={() => setHoveredArea(area.id)}
                onMouseLeave={() => setHoveredArea(null)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: area.suggestedDivision?.color + '20',
                          color: area.suggestedDivision?.color 
                        }}
                      >
                        {area.suggestedDivision?.code || 'Unknown'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {area.area.type}
                      </Badge>
                    </div>
                    
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                      {area.suggestedDivision?.name || 'Unknown Division'}
                    </p>
                    
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      {area.area.description}
                    </p>
                    
                    {area.suggestedDivision?.confidence && (
                      <div className="text-xs text-gray-500">
                        Confidence: {Math.round(area.suggestedDivision.confidence * 100)}%
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleApproveArea(area.id)}
                      className="h-8 w-8 p-0 text-green-600 hover:bg-green-100"
                      title="Approve this area"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRejectArea(area.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
                      title="Reject this area"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}