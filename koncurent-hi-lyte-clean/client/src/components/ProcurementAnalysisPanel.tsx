import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Search, 
  Package, 
  Building, 
  Filter, 
  Download, 
  Eye, 
  AlertCircle, 
  CheckCircle, 
  Target,
  MapPin,
  DollarSign,
  Layers,
  BarChart3,
  Zap,
  RefreshCw
} from 'lucide-react';

interface ProcurementItem {
  id: string;
  name: string;
  description: string;
  csiDivision: {
    code: string;
    name: string;
    subdivision?: string;
  };
  location: {
    drawingSheet: string;
    sheetName?: string;
    detailReference?: string;
    gridCoordinates?: string;
    roomLocation?: string;
    coordinates: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  quantity: {
    value: number | string;
    unit?: string;
    notes?: string;
  };
  specifications: {
    modelNumber?: string;
    manufacturer?: string;
    material?: string;
    dimensions?: string;
    performance?: string;
    codes?: string[];
  };
  cost?: {
    estimate?: number;
    currency?: string;
    source?: string;
  };
  priority: 'high' | 'medium' | 'low';
  phase?: string;
  notes?: string;
  confidence: number;
}

interface ProcurementAnalysisResult {
  items: ProcurementItem[];
  summary: {
    totalItems: number;
    divisionBreakdown: Array<{
      division: string;
      count: number;
      color: string;
    }>;
    estimatedValue?: number;
    completeness: number;
  };
  annotations: Array<{
    itemId: string;
    coordinates: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    color: string;
    label: string;
    divisionCode: string;
  }>;
  drawingMetadata: {
    sheetNumber: string;
    sheetName?: string;
    scale?: string;
    discipline?: string;
  };
  confidence: number;
  page?: number;
  drawingId?: number;
}

interface ProcurementAnalysisPanelProps {
  drawingId: number;
  currentPage: number;
  totalPages: number;
  onAnnotationsUpdate?: (annotations: any[]) => void;
  onHighlightItem?: (itemId: string) => void;
}

export function ProcurementAnalysisPanel({ 
  drawingId, 
  currentPage, 
  totalPages,
  onAnnotationsUpdate,
  onHighlightItem 
}: ProcurementAnalysisPanelProps) {
  const [analysisResult, setAnalysisResult] = useState<ProcurementAnalysisResult | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [multiSheetMode, setMultiSheetMode] = useState(false);
  const [selectedPages, setSelectedPages] = useState<number[]>([currentPage]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch CSI divisions
  const { data: divisionsData } = useQuery({
    queryKey: ['/api/ai/procurement-divisions'],
    queryFn: () => apiRequest('/api/ai/procurement-divisions'),
  });

  // Single page analysis mutation - now uses division extraction
  const singlePageAnalysisMutation = useMutation({
    mutationFn: async (data: { page: number; includeCostEstimates?: boolean }): Promise<any> => {
      return await apiRequest(`/api/ai/extract-to-divisions/${drawingId}`, 'POST', data);
    },
    onSuccess: (result: any) => {
      // Transform division extraction result to match procurement analysis format
      const transformedResult: ProcurementAnalysisResult = {
        items: [], // Will be populated from division data
        summary: {
          totalItems: result.summary?.totalItems || 0,
          divisionBreakdown: [],
          completeness: result.summary?.confidence || 0.75
        },
        annotations: [], // Division extraction doesn't have visual annotations yet
        drawingMetadata: result.drawingMetadata || {},
        confidence: result.summary?.confidence || 0.75,
        drawingId
      };
      
      // Convert division extraction data to procurement item format for display
      if (result.extractedData) {
        for (const divisionData of result.extractedData) {
          for (const item of divisionData.items) {
            transformedResult.items.push({
              id: `div_${divisionData.divisionId}_${transformedResult.items.length}`,
              name: item.name,
              description: item.description,
              csiDivision: {
                code: `${divisionData.divisionId}`,
                name: `Division ${divisionData.divisionId}`
              },
              location: {
                drawingSheet: result.drawingMetadata?.sheetNumber || 'Unknown',
                coordinates: item.location?.coordinates || { x: 0, y: 0, width: 50, height: 50 }
              },
              quantity: {
                value: item.quantity || 'TBD'
              },
              specifications: {
                material: item.specifications
              },
              priority: 'medium' as const,
              confidence: item.confidence
            });
          }
        }
      }
      
      setAnalysisResult(transformedResult);
      toast({
        title: "Division Extraction Complete",
        description: `Found ${result.summary?.totalItems || 0} items across ${result.summary?.divisionsFound || 0} divisions`,
      });
      
      // Trigger data refresh for the sidebar
      queryClient.invalidateQueries({ queryKey: ['/api/extracted-data'] });
    },
    onError: (error: any) => {
      console.error('Division extraction failed:', error);
      toast({
        title: "Extraction Failed",
        description: error.message || "Failed to extract data to construction divisions",
        variant: "destructive",
      });
    },
  });

  // Multi-sheet analysis mutation
  const multiSheetAnalysisMutation = useMutation({
    mutationFn: async (data: { pages: number[]; consolidate?: boolean }) => {
      return await apiRequest(`/api/ai/analyze-procurement-multi/${drawingId}`, 'POST', data);
    },
    onSuccess: (result: any) => {
      // Transform multi-sheet result to single result format
      const transformedResult: ProcurementAnalysisResult = {
        items: result.consolidatedItems,
        summary: result.summary,
        annotations: [], // Multi-sheet annotations would need special handling
        drawingMetadata: {
          sheetNumber: `Multi-sheet (${selectedPages.length} sheets)`,
          sheetName: 'Consolidated Analysis'
        },
        confidence: 0.85,
        drawingId
      };
      setAnalysisResult(transformedResult);
      toast({
        title: "Multi-Sheet Analysis Complete",
        description: `Found ${result.consolidatedItems.length} unique items across ${selectedPages.length} sheets`,
      });
    },
    onError: (error: any) => {
      console.error('Multi-sheet analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze multiple sheets",
        variant: "destructive",
      });
    },
  });

  const startAnalysis = () => {
    setIsAnalyzing(true);
    
    if (multiSheetMode && selectedPages.length > 1) {
      multiSheetAnalysisMutation.mutate({
        pages: selectedPages,
        consolidate: true
      });
    } else {
      singlePageAnalysisMutation.mutate({
        page: currentPage,
        includeCostEstimates: true
      });
    }
  };

  useEffect(() => {
    setIsAnalyzing(singlePageAnalysisMutation.isPending || multiSheetAnalysisMutation.isPending);
  }, [singlePageAnalysisMutation.isPending, multiSheetAnalysisMutation.isPending]);

  const filteredItems = analysisResult?.items.filter(item => {
    const matchesDivision = selectedDivision === 'all' || 
      item.csiDivision.code.startsWith(selectedDivision);
    const matchesPriority = selectedPriority === 'all' || 
      item.priority === selectedPriority;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesDivision && matchesPriority && matchesSearch;
  }) || [];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="h-3 w-3" />;
      case 'medium': return <Target className="h-3 w-3" />;
      case 'low': return <CheckCircle className="h-3 w-3" />;
      default: return <Eye className="h-3 w-3" />;
    }
  };

  const exportToCSV = () => {
    if (!analysisResult?.items.length) return;

    const headers = [
      'Item Name',
      'CSI Division',
      'Description',
      'Quantity',
      'Unit',
      'Location',
      'Priority',
      'Manufacturer',
      'Model Number',
      'Material',
      'Confidence'
    ];

    const csvData = analysisResult.items.map(item => [
      item.name,
      `${item.csiDivision.code} - ${item.csiDivision.name}`,
      item.description,
      item.quantity.value,
      item.quantity.unit || '',
      `${item.location.drawingSheet}${item.location.roomLocation ? ` - ${item.location.roomLocation}` : ''}`,
      item.priority,
      item.specifications.manufacturer || '',
      item.specifications.modelNumber || '',
      item.specifications.material || '',
      Math.round(item.confidence * 100) + '%'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procurement-analysis-${drawingId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Division Extraction
            </h3>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={startAnalysis}
              disabled={isAnalyzing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Start Extraction
                </>
              )}
            </Button>
            {analysisResult && (
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </div>

        {/* Analysis Options */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={multiSheetMode}
                onChange={(e) => setMultiSheetMode(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Multi-sheet extraction
              </span>
            </label>
          </div>
          
          {multiSheetMode && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Pages:</span>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <label key={page} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selectedPages.includes(page)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPages([...selectedPages, page]);
                      } else {
                        setSelectedPages(selectedPages.filter(p => p !== page));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-xs">{page}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                AI Division Extraction in Progress
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Extracting data directly into construction divisions...
              </p>
            </div>
          </div>
          <Progress value={65} className="mt-2 h-2" />
        </div>
      )}

      {/* Results */}
      {analysisResult && (
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="items" className="h-full flex flex-col">
            <TabsList className="m-4 mb-0">
              <TabsTrigger value="items">
                Items ({filteredItems.length})
              </TabsTrigger>
              <TabsTrigger value="summary">
                Summary
              </TabsTrigger>
              <TabsTrigger value="divisions">
                Divisions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="flex-1 overflow-hidden m-4 mt-2">
              {/* Filters */}
              <div className="flex gap-2 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-md text-sm"
                    />
                  </div>
                </div>
                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {divisionsData?.divisions?.map((div: any) => (
                      <SelectItem key={div.code} value={div.code}>
                        {div.code} - {div.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Items List */}
              <ScrollArea className="flex-1">
                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <Card 
                      key={item.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onHighlightItem?.(item.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-sm font-medium">
                              {item.name}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {item.description}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary"
                              className={`${getPriorityColor(item.priority)} text-white text-xs`}
                            >
                              {getPriorityIcon(item.priority)}
                              {item.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {Math.round(item.confidence * 100)}%
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="font-medium text-gray-700 dark:text-gray-300">
                              CSI Division
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                              {item.csiDivision.code} - {item.csiDivision.name}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700 dark:text-gray-300">
                              Quantity
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                              {item.quantity.value} {item.quantity.unit}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700 dark:text-gray-300">
                              Location
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                              {item.location.drawingSheet}
                              {item.location.roomLocation && ` - ${item.location.roomLocation}`}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700 dark:text-gray-300">
                              Specifications
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">
                              {item.specifications.manufacturer || 'Not specified'}
                              {item.specifications.modelNumber && ` - ${item.specifications.modelNumber}`}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="summary" className="m-4 mt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Analysis Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Total Items:</span>
                        <span className="font-medium">{analysisResult.summary.totalItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Confidence:</span>
                        <span className="font-medium">{Math.round(analysisResult.confidence * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Completeness:</span>
                        <span className="font-medium">{Math.round(analysisResult.summary.completeness * 100)}%</span>
                      </div>
                      {analysisResult.summary.estimatedValue && (
                        <div className="flex justify-between">
                          <span className="text-sm">Estimated Value:</span>
                          <span className="font-medium">${analysisResult.summary.estimatedValue.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Drawing Context
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Sheet:</span>
                        <span className="font-medium">{analysisResult.drawingMetadata.sheetNumber}</span>
                      </div>
                      {analysisResult.drawingMetadata.sheetName && (
                        <div className="flex justify-between">
                          <span className="text-sm">Title:</span>
                          <span className="font-medium">{analysisResult.drawingMetadata.sheetName}</span>
                        </div>
                      )}
                      {analysisResult.drawingMetadata.discipline && (
                        <div className="flex justify-between">
                          <span className="text-sm">Discipline:</span>
                          <span className="font-medium">{analysisResult.drawingMetadata.discipline}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="divisions" className="m-4 mt-2">
              <div className="space-y-3">
                {analysisResult.summary.divisionBreakdown.map((division) => (
                  <Card key={division.division}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: division.color }}
                          />
                          <span className="font-medium">{division.division}</span>
                        </div>
                        <Badge variant="secondary">
                          {division.count} items
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Empty State */}
      {!analysisResult && !isAnalyzing && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Procurement Analysis
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
              Start AI-powered procurement analysis to identify labeled items, CSI classification, and precise location tracking.
            </p>
            <Button 
              onClick={startAnalysis}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Zap className="h-4 w-4 mr-2" />
              Start Analysis
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}