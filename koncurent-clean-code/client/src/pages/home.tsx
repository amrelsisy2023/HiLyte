import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Share, CloudUpload, CreditCard, Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import koncurrentLogo from "@assets/Hubspot Scheduler Logo Image (1)_1751563530272.png";
import ProjectSidebar from "@/components/project-sidebar";
import UploadArea from "@/components/upload-area";
import DrawingCanvas from "@/components/drawing-canvas";
import AnnotationToolbar from "@/components/annotation-toolbar";
import AnnotationModal from "@/components/annotation-modal";
import DataTable from "@/components/data-table";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useCanvas } from "@/hooks/use-canvas";
import type { Drawing, Project, ConstructionDivision } from "@shared/schema";

export default function Home() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'drawings' | 'data'>('drawings');
  const [extractedData, setExtractedData] = useState<Record<number, Array<{
    id: string;
    type: string;
    extractedAt: Date;
    sourceLocation: string;
    items: Array<Record<string, any>>;
  }>>>({});
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { uploadFile, isUploading } = useFileUpload();
  const { 
    canvasRef, 
    tool, 
    setTool, 
    selectedDivision, 
    setSelectedDivision,
    zoom,
    setZoom,
    annotations,
    saveAnnotations,
    undo,
    redo,
    canUndo,
    canRedo
  } = useCanvas();

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: drawings } = useQuery<Drawing[]>({
    queryKey: ['/api/drawings'],
  });

  const { data: divisions } = useQuery<ConstructionDivision[]>({
    queryKey: ['/api/construction-divisions'],
  });

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    try {
      const drawing = await uploadFile(file, currentProject?.id);
      setCurrentDrawing(drawing);
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      
      // Check if this is a trial limit error
      if (error.errorType === 'TRIAL_LIMIT_EXCEEDED') {
        setShowUpgradeModal(true);
      }
    }
  };

  const handleSaveAnnotations = async () => {
    if (!currentDrawing) return;
    
    try {
      await saveAnnotations(currentDrawing.id);
    } catch (error) {
      console.error('Failed to save annotations:', error);
    }
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share functionality not implemented');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img src={koncurrentLogo} alt="Koncurent Logo" className="h-9 w-9" />
                <h1 className="text-xl font-bold text-gray-900">Koncurent Drawings Pro</h1>
              </div>
              <div className="hidden md:flex items-center space-x-1 text-sm text-gray-600">
                <span>{currentProject?.name || 'No Project Selected'}</span>
                {currentDrawing && (
                  <>
                    <span className="text-xs">›</span>
                    <span>{currentDrawing.name}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={handleSaveAnnotations}
                disabled={!currentDrawing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Annotations
              </Button>
              <Button 
                variant="outline"
                onClick={handleShare}
                disabled={!currentDrawing}
              >
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">JD</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <ProjectSidebar
          projects={projects || []}
          drawings={drawings || []}
          currentProject={currentProject}
          currentDrawing={currentDrawing}
          onProjectSelect={setCurrentProject}
          onDrawingSelect={(drawing) => {
            setCurrentDrawing(drawing);
            setCurrentPage(1); // Reset to page 1 when switching drawings
          }}
          onFileUpload={handleFileUpload}
          isUploading={isUploading}
          currentPage={currentPage}
          onPageSelect={setCurrentPage}
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col bg-gray-100">
          {!currentDrawing ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <Card className="max-w-md w-full">
                <CardContent className="p-8">
                  <UploadArea onFileUpload={handleFileUpload} />
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex-1 relative">
              {/* Floating Toolbar */}
              <AnnotationToolbar
                tool={tool}
                onToolChange={setTool}
                selectedDivision={selectedDivision}
                onDivisionChange={setSelectedDivision}
                zoom={zoom}
                onZoomChange={setZoom}
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
              />

              {/* Drawing Canvas */}
              <DrawingCanvas
                ref={canvasRef}
                drawing={currentDrawing}
                tool={tool}
                selectedDivision={selectedDivision}
                zoom={zoom}
                annotations={annotations}
                onAnnotationClick={() => setShowAnnotationModal(true)}
              />

              {/* Drawing Info */}
              <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 toolbar-floating">
                <div className="text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">Scale: 1:100</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600">
                        {currentDrawing.width && currentDrawing.height
                          ? `${currentDrawing.width}x${currentDrawing.height}px`
                          : 'Loading...'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Annotation Modal */}
      <AnnotationModal
        isOpen={showAnnotationModal}
        onClose={() => setShowAnnotationModal(false)}
        onSave={(annotation) => {
          // TODO: Handle annotation save
          console.log('Annotation saved:', annotation);
          setShowAnnotationModal(false);
        }}
      />

      {/* Upgrade Modal for Trial Limits */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              Upgrade to Hi-LYTE Pro
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              You've reached your free trial limit of 1 drawing set. Upgrade to Hi-LYTE Pro for unlimited uploads and advanced features.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              onClick={() => {
                window.location.href = '/ai-credits';
                setShowUpgradeModal(false);
              }}
              className="w-full"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Upgrade to Hi-LYTE Pro
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowUpgradeModal(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
