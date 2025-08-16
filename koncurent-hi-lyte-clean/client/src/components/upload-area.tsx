import { useCallback, useState } from "react";
import { CloudUpload, FileImage, Loader2, CreditCard, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import UploadProgress from "./upload-progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UploadAreaProps {
  onFileUpload: (files: File[]) => void;
  isUploading?: boolean;
  uploadingFileName?: string;
  showProgress?: boolean;
}

export default function UploadArea({ 
  onFileUpload, 
  isUploading = false, 
  uploadingFileName = '',
  showProgress = false 
}: UploadAreaProps) {
  const [dragOver, setDragOver] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    validateAndUpload(files);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    validateAndUpload(files);
  }, []);

  const validateAndUpload = (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    const maxSize = 50 * 1024 * 1024; // 50MB

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, PNG, or JPG file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 50MB.",
        variant: "destructive",
      });
      return;
    }

    onFileUpload([file]);
  };

  const loadSampleDrawing = () => {
    // TODO: Load a sample architectural drawing
    toast({
      title: "Sample drawing",
      description: "Sample drawing feature coming soon.",
    });
  };

  // If we're showing progress, replace the entire upload area with the progress component
  if (showProgress && uploadingFileName) {
    return (
      <div className="text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CloudUpload className="text-blue-600 h-8 w-8" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Upload Architectural Drawing
        </h3>
        
        <UploadProgress 
          fileName={uploadingFileName}
          isVisible={true}
        />
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <CloudUpload className="text-blue-600 h-8 w-8" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Upload Architectural Drawing
      </h3>
      
      <p className="text-gray-600 mb-6">
        Drag and drop your PDF, PNG, or JPG files here, or click to browse
      </p>
      
      <div
        className={`border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer ${
          dragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input
          id="fileInput"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFileInput}
          disabled={isUploading}
        />
        
        <div className="text-center">
          {isUploading ? (
            <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-2" />
          ) : (
            <FileImage className="h-12 w-12 text-gray-400 mx-auto mb-2" />
          )}
          
          <p className="text-gray-600">
            {isUploading ? 'Uploading...' : 'Choose files or drag and drop'}
          </p>
          
          <p className="text-sm text-gray-500 mt-1">
            PDF, PNG, JPG up to 50MB
          </p>
        </div>
      </div>
      
      <div className="mt-6 flex justify-center space-x-4">
        <Button
          disabled={isUploading}
          onClick={() => document.getElementById('fileInput')?.click()}
        >
          Browse Files
        </Button>
        
        <Button
          variant="outline"
          onClick={loadSampleDrawing}
          disabled={isUploading}
        >
          Load Sample
        </Button>
      </div>

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
