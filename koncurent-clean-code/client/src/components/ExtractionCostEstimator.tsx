import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, FileText, Bot, Zap, Calculator, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Drawing } from "@shared/schema";

interface ExtractionCostEstimatorProps {
  drawings: Drawing[];
  selectedDrawings?: Drawing[];
  onProceed?: () => void;
  onCancel?: () => void;
  extractionType: 'ai' | 'ocr' | 'both';
  estimatedPages?: number;
}

interface PaidFeature {
  id: string;
  name: string;
  costPerUnit: number;
  unit: string;
  enabled: boolean;
}

export default function ExtractionCostEstimator({
  drawings,
  selectedDrawings,
  onProceed,
  onCancel,
  extractionType,
  estimatedPages
}: ExtractionCostEstimatorProps) {
  const [totalCost, setTotalCost] = useState(0);
  const [breakdown, setBreakdown] = useState<Array<{name: string, pages: number, cost: number, unit: string}>>([]);

  // Fetch paid features pricing
  const { data: paidFeatures = [] } = useQuery<PaidFeature[]>({
    queryKey: ['/api/paid-features'],
  });

  useEffect(() => {
    calculateCost();
  }, [drawings, selectedDrawings, extractionType, paidFeatures, estimatedPages]);

  const calculateCost = () => {
    if (!paidFeatures.length) return;

    const targetDrawings = selectedDrawings || drawings;
    const totalPages = estimatedPages || targetDrawings.reduce((total, drawing) => {
      // Estimate pages based on file size (rough approximation: 100KB per page for PDFs)
      const estimatedPageCount = Math.max(1, Math.ceil(drawing.fileSize / 102400));
      return total + estimatedPageCount;
    }, 0);

    const costBreakdown: Array<{name: string, pages: number, cost: number, unit: string}> = [];
    let total = 0;

    // AI extraction cost
    if ((extractionType === 'ai' || extractionType === 'both')) {
      const aiFeature = paidFeatures.find(f => f.id === 'ai-extraction');
      if (aiFeature && aiFeature.enabled) {
        const aiCost = totalPages * aiFeature.costPerUnit;
        costBreakdown.push({
          name: 'AI-Enhanced Extraction',
          pages: totalPages,
          cost: aiCost,
          unit: aiFeature.unit
        });
        total += aiCost;
      }
    }

    // OCR processing cost
    if ((extractionType === 'ocr' || extractionType === 'both')) {
      const ocrFeature = paidFeatures.find(f => f.id === 'advanced-ocr');
      if (ocrFeature && ocrFeature.enabled) {
        const ocrCost = totalPages * ocrFeature.costPerUnit;
        costBreakdown.push({
          name: 'Advanced OCR Processing',
          pages: totalPages,
          cost: ocrCost,
          unit: ocrFeature.unit
        });
        total += ocrCost;
      }
    }

    // Premium PDF processing
    const pdfFeature = paidFeatures.find(f => f.id === 'premium-pdf-processing');
    if (pdfFeature && pdfFeature.enabled) {
      const pdfCost = totalPages * pdfFeature.costPerUnit;
      costBreakdown.push({
        name: 'Premium PDF Processing',
        pages: totalPages,
        cost: pdfCost,
        unit: pdfFeature.unit
      });
      total += pdfCost;
    }

    setBreakdown(costBreakdown);
    setTotalCost(total);
  };

  const formatCost = (cost: number) => {
    return cost < 0.01 ? '<$0.01' : `$${cost.toFixed(3)}`;
  };

  const targetDrawings = selectedDrawings || drawings;
  const totalPages = estimatedPages || targetDrawings.reduce((total, drawing) => {
    const estimatedPageCount = Math.max(1, Math.ceil(drawing.fileSize / 102400));
    return total + estimatedPageCount;
  }, 0);

  if (!targetDrawings.length || totalCost === 0) {
    return null;
  }

  return (
    <Card className="w-full max-w-md mx-auto border-blue-200 bg-blue-50 dark:bg-blue-900/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          <Calculator className="h-5 w-5 text-blue-600" />
          <span>Extraction Cost Estimate</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <Alert className="border-blue-300 bg-blue-100 dark:bg-blue-800/30">
          <DollarSign className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Total Documents:</span>
                <p>{targetDrawings.length}</p>
              </div>
              <div>
                <span className="font-medium">Estimated Pages:</span>
                <p>{totalPages}</p>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Cost Breakdown */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Cost Breakdown:</h4>
          {breakdown.map((item, index) => (
            <div key={index} className="flex justify-between items-center py-2 px-3 bg-white dark:bg-gray-800 rounded-lg border">
              <div className="flex items-center space-x-2">
                {item.name.includes('AI') && <Bot className="h-4 w-4 text-blue-500" />}
                {item.name.includes('OCR') && <Zap className="h-4 w-4 text-green-500" />}
                {item.name.includes('PDF') && <FileText className="h-4 w-4 text-purple-500" />}
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.pages} {item.unit}</p>
                </div>
              </div>
              <Badge variant="outline">{formatCost(item.cost)}</Badge>
            </div>
          ))}
        </div>

        {/* Total Cost */}
        <div className="flex justify-between items-center pt-3 border-t border-blue-200">
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Total Cost:</span>
          <Badge className="bg-blue-600 text-white text-lg px-3 py-1">
            {formatCost(totalCost)}
          </Badge>
        </div>

        {/* Action Buttons */}
        {onProceed && onCancel && (
          <div className="flex space-x-2 pt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={onProceed}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Proceed ({formatCost(totalCost)})
            </Button>
          </div>
        )}

        {/* Pricing Information */}
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
            <strong>AI Credit System:</strong> These costs reflect actual AI processing charges. Koncurent uses a centralized Anthropic API and charges per-token usage to your AI credit balance.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}