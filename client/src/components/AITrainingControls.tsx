import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, Zap, Eye, Target, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface AITrainingControlsProps {
  currentDrawing: any;
  onHighlightAreas?: (areas: HighlightedArea[]) => void;
  onManualCorrection?: (correction: ManualCorrection) => void;
}

interface HighlightedArea {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'data' | 'header' | 'critical';
  description: string;
}

interface ManualCorrection {
  originalText: string;
  correctedText: string;
  region: { x: number; y: number; width: number; height: number };
  context: string;
  divisionId: number;
}

export default function AITrainingControls({ 
  currentDrawing, 
  onHighlightAreas,
  onManualCorrection 
}: AITrainingControlsProps) {
  const { toast } = useToast();
  const [trainingMode, setTrainingMode] = useState<'auto' | 'manual' | null>(null);
  const [highlightedAreas, setHighlightedAreas] = useState<HighlightedArea[]>([]);
  const [learningData, setLearningData] = useState<any[]>([]);

  // Check AI status
  const { data: aiStatus } = useQuery({
    queryKey: ['/api/ai-status'],
    refetchInterval: 10000,
  });

  // Auto-extraction mutation
  const autoExtractMutation = useMutation({
    mutationFn: async (drawingId: number) => {
      const response = await fetch(`/api/ai/auto-extract/${drawingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to auto-extract');
      return response.json();
    },
    onSuccess: (data) => {
      setHighlightedAreas(data.highlightedAreas || []);
      if (onHighlightAreas) {
        onHighlightAreas(data.highlightedAreas || []);
      }
      toast({
        title: 'AI Auto-Extraction Complete',
        description: data.suggestions || 'AI has identified data areas for your review.',
      });
      setTrainingMode('auto');
    },
    onError: (error) => {
      toast({
        title: 'Auto-Extraction Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Manual correction learning mutation
  const learnCorrectionMutation = useMutation({
    mutationFn: async (correction: ManualCorrection & { drawingId: number }) => {
      const response = await fetch('/api/ai/learn-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correction),
      });
      if (!response.ok) throw new Error('Failed to process learning');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'AI Learning Complete',
        description: data.message || 'AI has learned from your correction.',
      });
      setLearningData(prev => [...prev, data]);
    },
    onError: (error) => {
      toast({
        title: 'Learning Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAutoExtraction = () => {
    if (!currentDrawing) {
      toast({
        title: 'No Drawing Selected',
        description: 'Please select a drawing first.',
        variant: 'destructive',
      });
      return;
    }

    autoExtractMutation.mutate(currentDrawing.id);
  };

  const handleManualTraining = () => {
    setTrainingMode('manual');
    toast({
      title: 'Manual Training Mode Active',
      description: 'Start extracting data regions. AI will learn from your selections and corrections.',
    });
  };

  const handleManualCorrection = (correction: ManualCorrection) => {
    if (!currentDrawing) return;

    learnCorrectionMutation.mutate({
      ...correction,
      drawingId: currentDrawing.id,
    });

    if (onManualCorrection) {
      onManualCorrection(correction);
    }
  };

  const resetTrainingMode = () => {
    setTrainingMode(null);
    setHighlightedAreas([]);
    setLearningData([]);
    toast({
      title: 'Training Mode Reset',
      description: 'You can now choose a new training approach.',
    });
  };

  if (!aiStatus?.aiEnabled) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
            <AlertCircle className="h-5 w-5" />
            <div>
              <h3 className="font-semibold">AI Training Unavailable</h3>
              <p className="text-sm">AI features require an Anthropic API key to be configured.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI Status */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
        <Bot className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <div className="flex justify-between items-center">
            <div>
              <span className="font-semibold">AI Training Ready</span>
              <p className="text-sm">{aiStatus.provider} • {aiStatus.model}</p>
            </div>
            <Badge variant="default" className="bg-blue-600">Active</Badge>
          </div>
        </AlertDescription>
      </Alert>

      {/* Training Mode Selection */}
      {!trainingMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5 text-blue-600" />
              <span>Choose AI Training Mode</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Auto-Extraction Mode */}
              <Card className="border-2 border-dashed border-blue-200 hover:border-blue-400 transition-colors cursor-pointer"
                    onClick={handleAutoExtraction}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Zap className="h-6 w-6 text-blue-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Auto-Extract with Highlighting
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        AI automatically scans the entire drawing and highlights areas containing extractable data for your verification.
                      </p>
                      <div className="space-y-1 text-xs text-gray-500">
                        <div>✓ Identifies tables, schedules, and specifications</div>
                        <div>✓ Provides confidence scores and suggestions</div>
                        <div>✓ Highlights areas for your review</div>
                      </div>
                      <Button 
                        className="w-full mt-3" 
                        disabled={autoExtractMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAutoExtraction();
                        }}
                      >
                        {autoExtractMutation.isPending ? 'Analyzing...' : 'Start Auto-Extraction'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Manual Training Mode */}
              <Card className="border-2 border-dashed border-green-200 hover:border-green-400 transition-colors cursor-pointer"
                    onClick={handleManualTraining}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <BookOpen className="h-6 w-6 text-green-600 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Manual Training Mode
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        Manually select data regions and correct AI extractions. AI learns from your actions to improve future performance.
                      </p>
                      <div className="space-y-1 text-xs text-gray-500">
                        <div>✓ Learn from your selection patterns</div>
                        <div>✓ Store correction examples</div>
                        <div>✓ Improve accuracy over time</div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-full mt-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleManualTraining();
                        }}
                      >
                        Start Manual Training
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Training Status */}
      {trainingMode === 'auto' && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200">
                    Auto-Extraction Active
                  </h3>
                  <p className="text-sm text-blue-600 dark:text-blue-300">
                    {highlightedAreas.length} areas identified. Click highlighted regions to extract data.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={resetTrainingMode}>
                Reset Mode
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {trainingMode === 'manual' && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-200">
                    Manual Training Active
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    Select regions and correct extractions. AI learns from each interaction.
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={resetTrainingMode}>
                Reset Mode
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Progress */}
      {learningData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Learning Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              AI has learned from {learningData.length} correction{learningData.length !== 1 ? 's' : ''} in this session.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}