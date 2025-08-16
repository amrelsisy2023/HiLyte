import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Folder, FolderPlus, GitCompare, Upload, Clock, CheckCircle, AlertTriangle, Eye, Trash2, RefreshCw, FileImage } from "lucide-react";

interface DrawingFolder {
  id: number;
  name: string;
  description?: string;
  projectId?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface RevisionSet {
  id: number;
  name: string;
  description?: string;
  revisionDate: string;
  folderId?: number;
  projectId?: number;
  createdBy: number;
  createdAt: string;
}

interface RevisionChange {
  id: number;
  revisionSetId: number;
  drawingId: number;
  changeType: 'modified' | 'new' | 'removed';
  location: any;
  description: string;
  severity: 'low' | 'medium' | 'high';
  reviewed: boolean;
  reviewedBy?: number;
  reviewedAt?: string;
  createdAt: string;
}

interface DrawingComparison {
  changedPages: Array<{
    pageNumber: number;
    changeType: 'modified' | 'new' | 'removed';
    changeDescription: string;
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    affectedRegions: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
      description: string;
    }>;
  }>;
  preservedExtractions: Array<{
    extractionId: number;
    confidence: number;
    newCoordinates?: { x: number; y: number; width: number; height: number };
  }>;
  summary: {
    totalChanges: number;
    majorChanges: number;
    minorChanges: number;
    recommendedAction: string;
  };
}

export default function RevisionManagement() {
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDescription, setNewFolderDescription] = useState("");
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<DrawingFolder | null>(null);
  const [comparisonResult, setComparisonResult] = useState<DrawingComparison | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch folders
  const { data: folders = [], isLoading: foldersLoading } = useQuery<DrawingFolder[]>({
    queryKey: ['/api/folders'],
    retry: false,
  });

  // Fetch revision sets
  const { data: revisionSets = [], isLoading: revisionsLoading } = useQuery<RevisionSet[]>({
    queryKey: ['/api/revision-sets'],
    retry: false,
  });

  // Fetch drawings for comparison selection
  const { data: drawings = [] } = useQuery<any[]>({
    queryKey: ['/api/drawings'],
    retry: false,
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderData: { name: string; description?: string; sortOrder: number }) => {
      return await apiRequest('/api/folders', 'POST', folderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      setNewFolderName("");
      setNewFolderDescription("");
      setShowCreateFolder(false);
      toast({
        title: "Folder Created",
        description: "Drawing folder created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create folder: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Compare drawings mutation
  const compareDrawingsMutation = useMutation({
    mutationFn: async ({ originalDrawingId, newDrawingId }: { originalDrawingId: number; newDrawingId: number }) => {
      return await apiRequest('/api/drawings/compare', 'POST', { originalDrawingId, newDrawingId });
    },
    onSuccess: (result: any) => {
      setComparisonResult(result.comparison);
      toast({
        title: "Comparison Complete",
        description: result.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Comparison Failed",
        description: `Failed to compare drawings: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Folder name is required",
        variant: "destructive",
      });
      return;
    }

    createFolderMutation.mutate({
      name: newFolderName.trim(),
      description: newFolderDescription.trim() || undefined,
      sortOrder: folders.length + 1,
    });
  };

  const handleCompareDrawings = (originalId: number, newId: number) => {
    setIsComparing(true);
    compareDrawingsMutation.mutate({ originalDrawingId: originalId, newDrawingId: newId });
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getChangeTypeIcon = (changeType: 'modified' | 'new' | 'removed') => {
    switch (changeType) {
      case 'modified': return <RefreshCw className="h-4 w-4" />;
      case 'new': return <Upload className="h-4 w-4" />;
      case 'removed': return <Trash2 className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Intelligent Revision Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Organize drawings into folders and track revisions with AI-powered change detection
          </p>
        </div>
        
        <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
          <DialogTrigger asChild>
            <Button>
              <FolderPlus className="h-4 w-4 mr-2" />
              Create Folder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Drawing Folder</DialogTitle>
              <DialogDescription>
                Organize your drawings by creating folders for different projects or phases.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="folderName">Folder Name</Label>
                <Input
                  id="folderName"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g., Phase 1 - Foundation Plans"
                />
              </div>
              <div>
                <Label htmlFor="folderDescription">Description (Optional)</Label>
                <Input
                  id="folderDescription"
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  placeholder="Brief description of this folder's contents"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateFolder(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateFolder}
                  disabled={createFolderMutation.isPending}
                >
                  {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="folders" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="folders">Drawing Folders</TabsTrigger>
          <TabsTrigger value="revisions">Revision Sets</TabsTrigger>
          <TabsTrigger value="compare">AI Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="folders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Folder className="h-5 w-5" />
                <span>Drawing Folders</span>
              </CardTitle>
              <CardDescription>
                Organize your drawings into folders for better project management
              </CardDescription>
            </CardHeader>
            <CardContent>
              {foldersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : folders.length === 0 ? (
                <div className="text-center py-8">
                  <Folder className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    No folders created yet. Create your first folder to organize drawings.
                  </p>
                  <Button onClick={() => setShowCreateFolder(true)}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    Create First Folder
                  </Button>
                </div>
              ) : selectedFolder ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFolder(null)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ← Back to Folders
                      </Button>
                      <div className="text-sm text-gray-500">
                        / {selectedFolder.name}
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <Folder className="h-6 w-6 text-blue-500" />
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {selectedFolder.name}
                          </h3>
                          {selectedFolder.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {selectedFolder.description}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-center py-8">
                        <FileImage className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          This folder is empty. Upload drawings to get started.
                        </p>
                        <Button>
                          Upload Drawings to Folder
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {folders.map((folder: DrawingFolder) => (
                      <Card 
                        key={folder.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedFolder(folder)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            <Folder className="h-8 w-8 text-blue-500 mt-1" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                {folder.name}
                              </h3>
                              {folder.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {folder.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-2">
                                Created {new Date(folder.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Revision Sets</span>
              </CardTitle>
              <CardDescription>
                Track drawing revisions and changes over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {revisionsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : revisionSets.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No revision sets found. Upload revised drawings to track changes.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {revisionSets.map((revision: RevisionSet) => (
                    <Card key={revision.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {revision.name}
                            </h3>
                            {revision.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {revision.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">
                              Revision Date: {new Date(revision.revisionDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {new Date(revision.createdAt).toLocaleDateString()}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <GitCompare className="h-5 w-5" />
                <span>AI-Powered Drawing Comparison</span>
              </CardTitle>
              <CardDescription>
                Compare drawing sets to automatically detect changes and preserve unchanged data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {drawings.length >= 2 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Original Drawing Set</Label>
                      <select className="w-full mt-1 p-2 border rounded-md bg-white dark:bg-gray-800">
                        <option value="">Select original drawing...</option>
                        {drawings.map((drawing: any) => (
                          <option key={drawing.id} value={drawing.id}>
                            {drawing.filename} ({drawing.totalPages} pages)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>New Drawing Set</Label>
                      <select className="w-full mt-1 p-2 border rounded-md bg-white dark:bg-gray-800">
                        <option value="">Select new drawing...</option>
                        {drawings.map((drawing: any) => (
                          <option key={drawing.id} value={drawing.id}>
                            {drawing.filename} ({drawing.totalPages} pages)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <GitCompare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      You need at least 2 drawing sets to perform comparison.
                    </p>
                    <p className="text-sm text-gray-400">
                      Upload more drawings to enable intelligent revision tracking.
                    </p>
                  </div>
                )}

                {drawings.length >= 2 && (
                  <div className="flex justify-center">
                    <Button
                      onClick={() => {
                        // This would be connected to actual drawing selection
                        if (drawings.length >= 2) {
                          handleCompareDrawings(drawings[0].id, drawings[1].id);
                        }
                      }}
                      disabled={compareDrawingsMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <GitCompare className="h-4 w-4 mr-2" />
                      {compareDrawingsMutation.isPending ? "Analyzing Changes..." : "Start AI Comparison"}
                    </Button>
                  </div>
                )}

                {comparisonResult && (
                  <div className="mt-8">
                    <Separator className="mb-6" />
                    <h3 className="text-lg font-semibold mb-4">Comparison Results</h3>
                    
                    <div className="grid gap-4 md:grid-cols-3 mb-6">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {comparisonResult.summary.totalChanges}
                          </div>
                          <div className="text-sm text-gray-500">Total Changes</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {comparisonResult.summary.majorChanges}
                          </div>
                          <div className="text-sm text-gray-500">Major Changes</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {comparisonResult.preservedExtractions.length}
                          </div>
                          <div className="text-sm text-gray-500">Preserved Data</div>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="mb-4">
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">Recommended Action</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {comparisonResult.summary.recommendedAction}
                        </p>
                      </CardContent>
                    </Card>

                    {comparisonResult.changedPages.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Detected Changes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {comparisonResult.changedPages.map((change, index) => (
                              <div key={index} className="flex items-start space-x-3 p-3 border rounded-lg">
                                <div className="mt-1">
                                  {getChangeTypeIcon(change.changeType)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium">Page {change.pageNumber}</span>
                                    <Badge className={getSeverityColor(change.severity)}>
                                      {change.severity}
                                    </Badge>
                                    <Badge variant="outline">
                                      {Math.round(change.confidence * 100)}% confidence
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-300">
                                    {change.changeDescription}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}