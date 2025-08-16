import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  FileSearch, 
  BookOpen, 
  CheckCircle, 
  AlertTriangle, 
  Brain, 
  Target,
  Layers,
  Network,
  TrendingUp,
  Lightbulb
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface RequirementStatement {
  id: string;
  type: 'specification' | 'requirement' | 'compliance' | 'standard' | 'procedure' | 'note';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  discipline: string;
  content: string;
  context: string;
  confidence: number;
  metadata: {
    codes?: string[];
    standards?: string[];
    references?: string[];
    dependencies?: string[];
    complianceItems?: string[];
  };
}

interface ComplianceItem {
  id: string;
  code: string;
  description: string;
  category: 'building_code' | 'safety_standard' | 'design_standard' | 'material_standard' | 'procedure';
  complianceLevel: 'mandatory' | 'recommended' | 'optional';
}

interface TextCluster {
  id: string;
  theme: string;
  confidence: number;
  items: string[];
  relationships: string[];
}

interface EnhancedNLPResult {
  documentStructure: {
    sections: Array<{
      title: string;
      type: 'general' | 'technical' | 'specifications' | 'requirements' | 'notes';
      content: string;
      requirementCount: number;
    }>;
    documentType: 'drawing' | 'specification' | 'standard' | 'procedure' | 'mixed';
  };
  requirements: RequirementStatement[];
  complianceItems: ComplianceItem[];
  textClusters: TextCluster[];
  summary: {
    totalRequirements: number;
    criticalRequirements: number;
    complianceItemsIdentified: number;
    documentComplexity: 'low' | 'medium' | 'high';
    recommendedActions: string[];
  };
}

interface EnhancedNLPPanelProps {
  drawingId: number;
  currentPage: number;
  onAnalysisComplete?: (result: any) => void;
}

export function EnhancedNLPPanel({ drawingId, currentPage, onAnalysisComplete }: EnhancedNLPPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState('');
  const [result, setResult] = useState<EnhancedNLPResult | null>(null);
  const { toast } = useToast();

  const performEnhancedNLP = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentStage('Initializing Enhanced NLP Analysis...');
    
    try {
      // Simulate progress updates
      const progressStages = [
        { progress: 20, stage: 'Stage 1: Analyzing document structure...' },
        { progress: 40, stage: 'Stage 2: Detecting requirements and specifications...' },
        { progress: 60, stage: 'Stage 3: Analyzing compliance items...' },
        { progress: 80, stage: 'Stage 4: Clustering related content...' },
        { progress: 100, stage: 'Analysis complete!' }
      ];

      // Start progress simulation
      const progressInterval = setInterval(() => {
        const nextStage = progressStages.find(stage => stage.progress > analysisProgress);
        if (nextStage) {
          setAnalysisProgress(nextStage.progress);
          setCurrentStage(nextStage.stage);
        }
      }, 1500);

      const response = await apiRequest(`/api/ai/enhanced-nlp/${drawingId}`, {
        method: 'POST',
        body: JSON.stringify({ page: currentPage }),
        headers: { 'Content-Type': 'application/json' }
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);
      setCurrentStage('Analysis complete!');

      if (response.success) {
        setResult(response.result.data);
        onAnalysisComplete?.(response.result);
        toast({
          title: "Enhanced NLP Analysis Complete",
          description: `Found ${response.result.data.summary.totalRequirements} requirements and ${response.result.data.summary.complianceItemsIdentified} compliance items.`,
        });
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Enhanced NLP analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Enhanced NLP analysis failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const performCombinedAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setCurrentStage('Initializing Combined Analysis...');
    
    try {
      const progressStages = [
        { progress: 15, stage: 'Running Smart Extraction...' },
        { progress: 30, stage: 'Running Enhanced NLP Analysis...' },
        { progress: 50, stage: 'Analyzing document structure...' },
        { progress: 70, stage: 'Detecting requirements and compliance...' },
        { progress: 85, stage: 'Generating combined insights...' },
        { progress: 100, stage: 'Combined analysis complete!' }
      ];

      const progressInterval = setInterval(() => {
        const nextStage = progressStages.find(stage => stage.progress > analysisProgress);
        if (nextStage) {
          setAnalysisProgress(nextStage.progress);
          setCurrentStage(nextStage.stage);
        }
      }, 2000);

      const response = await apiRequest(`/api/ai/combined-analysis/${drawingId}`, {
        method: 'POST',
        body: JSON.stringify({ page: currentPage }),
        headers: { 'Content-Type': 'application/json' }
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);
      setCurrentStage('Combined analysis complete!');

      if (response.success) {
        setResult(response.result.enhancedNLP.data);
        onAnalysisComplete?.(response.result);
        toast({
          title: "Combined Analysis Complete",
          description: `Extracted ${response.result.savedItemsCount} items and found ${response.result.enhancedNLP.data?.summary?.totalRequirements || 0} requirements.`,
        });
      } else {
        throw new Error(response.error || 'Combined analysis failed');
      }
    } catch (error) {
      console.error('Combined analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Combined analysis failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getComplianceLevelColor = (level: string) => {
    switch (level) {
      case 'mandatory': return 'destructive';
      case 'recommended': return 'default';
      case 'optional': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Analysis Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Enhanced NLP Document Analysis
          </CardTitle>
          <CardDescription>
            Multi-stage AI analysis for requirement detection, compliance checking, and document understanding
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAnalyzing ? (
            <div className="space-y-3">
              <Progress value={analysisProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">{currentStage}</p>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button 
                onClick={performEnhancedNLP}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={isAnalyzing}
              >
                <FileSearch className="h-4 w-4 mr-2" />
                Enhanced NLP Only
              </Button>
              <Button 
                onClick={performCombinedAnalysis}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                disabled={isAnalyzing}
              >
                <Target className="h-4 w-4 mr-2" />
                Combined Analysis
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.summary.totalRequirements}</div>
                  <div className="text-sm text-muted-foreground">Total Requirements</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{result.summary.criticalRequirements}</div>
                  <div className="text-sm text-muted-foreground">Critical/High Priority</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{result.summary.complianceItemsIdentified}</div>
                  <div className="text-sm text-muted-foreground">Compliance Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{result.textClusters.length}</div>
                  <div className="text-sm text-muted-foreground">Content Clusters</div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Document Complexity:</span>
                  <Badge variant={result.summary.documentComplexity === 'high' ? 'destructive' : 
                                result.summary.documentComplexity === 'medium' ? 'default' : 'secondary'}>
                    {result.summary.documentComplexity.toUpperCase()}
                  </Badge>
                </div>
                
                {result.summary.recommendedActions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-600" />
                      Recommended Actions:
                    </p>
                    <ul className="space-y-1">
                      {result.summary.recommendedActions.map((action, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-yellow-600 mt-1">•</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-600" />
                Document Structure
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Document Type:</span>
                  <Badge variant="outline">{result.documentStructure.documentType.toUpperCase()}</Badge>
                </div>
                
                <Separator />
                
                <div>
                  <p className="text-sm font-medium mb-2">Sections Identified:</p>
                  <div className="space-y-2">
                    {result.documentStructure.sections.map((section, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium">{section.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{section.type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {section.requirementCount} requirements
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{section.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requirements Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-600" />
                Requirements Analysis ({result.requirements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {result.requirements.map((req, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={getPriorityColor(req.priority) as any}>
                            {req.priority.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">{req.type}</Badge>
                          <Badge variant="secondary">{req.discipline}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(req.confidence * 100)}% confidence
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium">{req.content}</p>
                      <p className="text-xs text-muted-foreground">{req.context}</p>
                      
                      {(req.metadata.codes?.length || req.metadata.standards?.length) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {req.metadata.codes?.map((code, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {code}
                            </Badge>
                          ))}
                          {req.metadata.standards?.map((standard, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {standard}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Compliance Items */}
          {result.complianceItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-orange-600" />
                  Compliance Analysis ({result.complianceItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {result.complianceItems.map((item, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={getComplianceLevelColor(item.complianceLevel) as any}>
                              {item.complianceLevel.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">{item.category.replace('_', ' ')}</Badge>
                          </div>
                          <span className="text-sm font-mono">{item.code}</span>
                        </div>
                        <p className="text-sm">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Text Clusters */}
          {result.textClusters.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5 text-purple-600" />
                  Content Clusters ({result.textClusters.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {result.textClusters.map((cluster, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{cluster.theme}</h4>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(cluster.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {cluster.items.length} related items
                      </p>
                      {cluster.relationships.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Relationships: {cluster.relationships.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}