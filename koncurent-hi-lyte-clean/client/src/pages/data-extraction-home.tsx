import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CloudUpload, Loader2, FileImage, X, LogOut, User, Settings, ChevronDown, DollarSign, Bot, Zap, CreditCard, FileText, Cog, MessageCircle, Folder, FolderPlus, Trash2, Package, Building } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Project, Drawing, ConstructionDivision, ExtractedData } from "@shared/schema";
import DataExtractionSidebar from "@/components/data-extraction-sidebar-v2";
import DataExtractionCanvas from "@/components/data-extraction-canvas";
import PDFViewer from "@/components/pdf-viewer";
import TemplateDataTable from "@/components/template-data-table";
import CleanDataTable from "@/components/clean-data-table";
import ConstructionDivisionManager from "@/components/ConstructionDivisionManager";
import PaidFeaturesManager from "@/components/PaidFeaturesManager";
import DrawingProfileModal from "@/components/DrawingProfileModal";
import DrawingProfileViewer from "@/components/DrawingProfileViewer";
import ExtractionCostEstimator from "@/components/ExtractionCostEstimator";
import { AIDashboard } from "@/components/AIDashboard";
import { TrainingNotification } from "@/components/TrainingNotification";
import { WelcomeBonusModal } from "@/components/WelcomeBonusModal";
import { BetaFeedbackModal } from "@/components/BetaFeedbackModal";
import FolderSelectionModal from "@/components/FolderSelectionModal";
import HelpTooltip from "@/components/HelpTooltip";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useToast } from "@/hooks/use-toast";
import UploadProgress from "@/components/upload-progress";
import { canAccessAIDashboard } from "@/utils/accessControl";
import BackgroundAiStatus from "@/components/background-ai-status";
import BatchExtractionProgress from "@/components/batch-extraction-progress";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { UpgradeButton, FloatingUpgradeButton, InlineUpgradePrompt } from "@/components/upgrade-button";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { getDisplayName } from "@/lib/utils";
import ProcurementResultsTable from "@/components/ProcurementResultsTable";
import { EnhancedNLPPanel } from "@/components/enhanced-nlp-panel";


export default function DataExtractionHome() {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<ConstructionDivision | null>(null);
  const [showDivisionManager, setShowDivisionManager] = useState(false);
  const [showPaidFeaturesManager, setShowPaidFeaturesManager] = useState(false);
  const [showDrawingProfile, setShowDrawingProfile] = useState(false);
  const [showDrawingProfileViewer, setShowDrawingProfileViewer] = useState(false);
  const [pendingDrawing, setPendingDrawing] = useState<Drawing | null>(null);
  // Cost estimator removed - no longer needed

  const [showDataTable, setShowDataTable] = useState(false);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [triggerDeleteAll, setTriggerDeleteAll] = useState<number>(0);
  const [triggerClearMarquees, setTriggerClearMarquees] = useState<number>(0);
  const [showTrainingDashboard, setShowTrainingDashboard] = useState(false);
  const [showEnhancedNLP, setShowEnhancedNLP] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(0);
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  
  // Batch extraction state
  const [batchExtractionFn, setBatchExtractionFn] = useState<(() => Promise<void>) | null>(null);
  const [pendingHighlightCount, setPendingHighlightCount] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  

  const [showWelcomeBonus, setShowWelcomeBonus] = useState(false);
  const [showBetaFeedback, setShowBetaFeedback] = useState(false);
  const [isBatchExtracting, setIsBatchExtracting] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ extracted: 0, total: 0, currentArea: '' });
  const [showFolderSelection, setShowFolderSelection] = useState(false);
  const [pendingDrawingForFolder, setPendingDrawingForFolder] = useState<Drawing | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);


  
  // Division visibility state with localStorage persistence
  const [visibleDivisions, setVisibleDivisions] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('hiddenDivisions');
      const hiddenIds = saved ? JSON.parse(saved) : [];
      // Return a set that excludes hidden divisions (we'll populate with all visible ones later)
      return new Set();
    } catch {
      return new Set();
    }
  });

  // Fixed table height - no more dragging
  const tableHeight = 450;

  // PDF navigation state
  const [navigateToPage, setNavigateToPage] = useState<number | undefined>(undefined);

  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();



  // Check if user was just invited
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('invited') === 'true') {
      toast({
        title: "Welcome to the team!",
        description: "You've successfully joined as a collaborator. You can now access and collaborate on shared drawings.",
        duration: 5000,
      });
      // Clean up the URL
      window.history.replaceState({}, '', '/');
    }
  }, [toast]);

  // Check if user should see welcome bonus - automatically show for new users
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('welcome_bonus') === 'true') {
      setShowWelcomeBonus(true);
      // Clean up the URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const { uploadFile, isUploading: hookIsUploading } = useFileUpload();
  const [manualIsUploading, setManualIsUploading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const isUploading = hookIsUploading || manualIsUploading;

  // Monitor upload and AI processing status and keep progress bar visible during both
  useEffect(() => {
    if (!manualIsUploading) return;
    
    const checkProcessingStatus = async () => {
      try {
        // Check upload status first (PDF conversion)
        const uploadResponse = await fetch('/api/upload/status');
        let uploadStillProcessing = false;
        let hasFileName = false;
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          uploadStillProcessing = uploadData.phase === 'pdf_processing' || uploadData.phase === 'converting';
          hasFileName = !!uploadData.fileName;
          
          // Update total pages from upload status
          if (uploadData.totalPages > 0 && uploadData.totalPages !== totalPages) {
            setTotalPages(uploadData.totalPages);
          }
          
          console.log('Upload status:', uploadData);
        }
        
        // Check AI processing status
        const aiResponse = await fetch('/api/background-ai/status');
        let aiStillProcessing = false;
        
        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          aiStillProcessing = aiData.isProcessing;
          setAiProcessing(aiStillProcessing);
        }
        
        // Only hide progress bar when BOTH conditions are met:
        // 1. No upload processing AND no AI processing
        // 2. AND we've actually seen some processing happen (indicated by fileName being set)
        const shouldHideProgress = !uploadStillProcessing && !aiStillProcessing && hasFileName;
        
        if (shouldHideProgress) {
          console.log('All processing complete - hiding progress bar');
          setManualIsUploading(false);
          setAiProcessing(false);
          setUploadingFileName('');
        } else {
          console.log('Processing still active:', { 
            uploadStillProcessing, 
            aiStillProcessing, 
            hasFileName,
            shouldHideProgress
          });
        }
      } catch (error) {
        console.error('Error checking processing status:', error);
      }
    };

    // Start monitoring after a short delay to allow upload to initialize
    const delayedStart = setTimeout(() => {
      checkProcessingStatus(); // Check immediately
      const interval = setInterval(checkProcessingStatus, 1000);
      
      // Store interval for cleanup
      (window as any).progressMonitoringInterval = interval;
    }, 500);

    return () => {
      clearTimeout(delayedStart);
      if ((window as any).progressMonitoringInterval) {
        clearInterval((window as any).progressMonitoringInterval);
        (window as any).progressMonitoringInterval = null;
      }
    };
  }, [manualIsUploading, totalPages]);










  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      if (!response.ok) throw new Error("Failed to fetch projects");
      return response.json();
    },
  });

  const { data: drawings = [] } = useQuery({
    queryKey: ["/api/drawings"],
    queryFn: async () => {
      const response = await fetch("/api/drawings");
      if (!response.ok) throw new Error("Failed to fetch drawings");
      return response.json();
    },
  });

  // Preserve currentDrawing selection after drawings query refresh
  useEffect(() => {
    if (currentDrawing && drawings.length > 0) {
      // Find the updated drawing object with the same ID
      const updatedDrawing = drawings.find((d: Drawing) => d.id === currentDrawing.id);
      if (updatedDrawing && updatedDrawing !== currentDrawing) {
        // Update the currentDrawing with the refreshed data
        setCurrentDrawing(updatedDrawing);
      } else if (!updatedDrawing) {
        // Drawing was deleted, clear the selection
        setCurrentDrawing(null);
      }
    }
  }, [drawings]);

  const { data: constructionDivisions = [] } = useQuery({
    queryKey: ["/api/construction-divisions"],
    queryFn: async () => {
      const response = await fetch("/api/construction-divisions");
      if (!response.ok) throw new Error("Failed to fetch construction divisions");
      return response.json();
    },
  });

  // Initialize visible divisions when construction divisions are loaded, excluding hidden ones
  useEffect(() => {
    if (constructionDivisions.length > 0 && visibleDivisions.size === 0) {
      try {
        const saved = localStorage.getItem('hiddenDivisions');
        const hiddenIds = saved ? JSON.parse(saved) : [];
        const hiddenSet = new Set(hiddenIds);
        
        // Create visible set by excluding hidden divisions
        const allDivisionIds = constructionDivisions.map((d: any) => d.id);
        const visibleIds = allDivisionIds.filter(id => !hiddenSet.has(id));
        
        console.log('Initializing visibility:', { allDivisionIds, hiddenIds, visibleIds });
        setVisibleDivisions(new Set(visibleIds));
      } catch {
        // Fallback: show all divisions if localStorage parsing fails
        setVisibleDivisions(new Set(constructionDivisions.map((d: any) => d.id)));
      }
    } else if (constructionDivisions.length > 0 && visibleDivisions.size > 0) {
      // When divisions list changes but we already have visibility state, 
      // ensure any new divisions not in localStorage are made visible
      try {
        const saved = localStorage.getItem('hiddenDivisions');
        const hiddenIds = saved ? JSON.parse(saved) : [];
        const hiddenSet = new Set(hiddenIds);
        
        const allDivisionIds = constructionDivisions.map((d: any) => d.id);
        const newVisibleIds = allDivisionIds.filter(id => !hiddenSet.has(id));
        
        // Only update if there are new divisions that should be visible
        const currentVisible = Array.from(visibleDivisions);
        const hasNewVisibleDivisions = newVisibleIds.some(id => !visibleDivisions.has(id));
        
        if (hasNewVisibleDivisions) {
          console.log('Adding new visible divisions:', { newVisibleIds, currentVisible });
          setVisibleDivisions(new Set(newVisibleIds));
        }
      } catch (error) {
        console.error('Error updating visibility for new divisions:', error);
      }
    }
  }, [constructionDivisions]);

  // Set consistent browser tab title
  useEffect(() => {
    document.title = 'Koncurent Hi-LYTE';
  }, []);

  const { data: extractedData = [] } = useQuery({
    queryKey: ["/api/extracted-data", currentDrawing?.id],
    queryFn: async () => {
      const response = await fetch(`/api/extracted-data?drawingId=${currentDrawing?.id}`);
      if (!response.ok) throw new Error("Failed to fetch extracted data");
      return response.json();
    },
    enabled: !!currentDrawing,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Fetch AI credits balance
  const { data: aiCreditsBalance } = useQuery({
    queryKey: ["/api/ai-credits/balance"],
    queryFn: async () => {
      const response = await fetch("/api/ai-credits/balance");
      if (!response.ok) throw new Error("Failed to fetch AI credits balance");
      return response.json();
    },
  });

  // Fetch subscription status for project limits
  const { data: subscriptionStatus } = useQuery({
    queryKey: ["/api/subscription/status"],
    queryFn: async () => {
      const response = await fetch("/api/subscription/status");
      if (!response.ok) throw new Error("Failed to fetch subscription status");
      return response.json();
    },
  });

  // Automatically show welcome bonus for new users who haven't received it yet
  useEffect(() => {
    const checkWelcomeBonus = async () => {
      // Only check if user is authenticated
      if (user) {
        try {
          // Check if user has any credit transactions (indicating they've been welcomed)
          const response = await fetch('/api/ai-credits/transactions');
          if (response.ok) {
            const transactions = await response.json();
            console.log('Checking welcome bonus status:', { transactions, user });
            const hasWelcomeBonus = transactions.some((tx: any) => tx.type === 'signup_bonus');
            
            // If no welcome bonus transaction exists, show the modal
            if (!hasWelcomeBonus) {
              console.log('No welcome bonus found, showing modal');
              setShowWelcomeBonus(true);
            } else {
              console.log('Welcome bonus already received');
            }
          }
        } catch (error) {
          console.log('Error checking welcome bonus status:', error);
        }
      }
    };

    checkWelcomeBonus();
  }, [user]);

  const deleteDrawingMutation = useMutation({
    mutationFn: async (drawingId: number) => {
      const response = await fetch(`/api/drawings/${drawingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete drawing');
      }
      
      return response.ok ? {} : response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drawings"] });
      toast({
        title: "Drawing deleted",
        description: "The drawing has been successfully removed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting drawing",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createExtractedDataMutation = useMutation({
    mutationFn: async (data: {
      drawingId: number;
      divisionId: number;
      type: string;
      sourceLocation: string;
      data: string;
    }) => {
      console.log('=== MUTATION FUNCTION CALLED ===');
      console.log('Mutation data:', data);
      console.log('About to call apiRequest...');
      
      try {
        const response = await fetch("/api/extracted-data", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('apiRequest successful:', result);
        return result;
      } catch (error) {
        console.error('apiRequest failed:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      console.log('=== MUTATION SUCCESS ===');
      console.log('Extracted data created successfully:', result);
      queryClient.invalidateQueries({ queryKey: ["/api/extracted-data", currentDrawing?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/extracted-data"] });
      // Individual success toasts removed - only batch completion toast will show
    },
    onError: (error: any) => {
      console.error('=== MUTATION ERROR ===');
      console.error('Failed to create extracted data:', error);
      
      // Check for specific error types
      if (error.message && error.message.includes('Insufficient AI credits')) {
        toast({
          title: "Insufficient AI Credits",
          description: "You need more AI credits to continue. Click here to purchase credits.",
          variant: "destructive",
          action: (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/ai-credits'}
            >
              Buy Credits
            </Button>
          ),
        });
      } else if (error.message && error.message.includes('Extraction limit reached')) {
        toast({
          title: "Extraction Limit Reached",
          description: "Please upgrade to Koncurent Pro for unlimited extractions",
          variant: "destructive",
        });
        // Redirect to subscription page after a delay
        setTimeout(() => {
          window.location.href = '/subscription';
        }, 2000);
      } else {
        toast({
          title: "Extraction Failed",
          description: `Failed to extract data: ${error.message}`,
          variant: "destructive",
        });
      }
    },
  });



  // State for smart extraction (replaces procurement extraction)
  const [isSmartExtracting, setIsSmartExtracting] = useState(false);
  const [smartExtractionProgress, setSmartExtractionProgress] = useState('');
  const [bulkExtractionProgressPercent, setBulkExtractionProgressPercent] = useState(0);
  const [smartExtractionResults, setSmartExtractionResults] = useState<any>(null);

  // Smart extraction handler - Enhanced unified analysis combining procurement and division features
  const handleSmartExtraction = async (page: number = 1) => {
    if (!currentDrawing) return;

    setIsSmartExtracting(true);
    setBulkExtractionProgressPercent(0); // Reset progress on start
    
    // Handle bulk extraction (all pages)
    if (page === -1) {
      setSmartExtractionProgress(`Starting bulk extraction for all ${currentDrawing.totalPages} pages...`);
      
      try {
        const response = await fetch(`/api/ai/bulk-extract/${currentDrawing.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Bulk extraction started:', result);
          
          toast({
            title: "Bulk Extraction Started",
            description: `Processing all ${currentDrawing.totalPages} pages in parallel. This may take a few minutes.`
          });
          
          // Start polling for status
          startBulkExtractionPolling();
          
        } else {
          const error = await response.json();
          if (response.status === 402) {
            throw new Error('Insufficient AI credits. Please add credits to your account to continue with bulk extraction.');
          }
          throw new Error(error.error || 'Failed to start bulk extraction');
        }
      } catch (error: any) {
        console.error('Bulk extraction error:', error);
        toast({
          title: "Bulk Extraction Failed",
          description: error.message || 'Failed to start bulk extraction.',
          variant: "destructive"
        });
        setIsSmartExtracting(false);
        setSmartExtractionProgress('');
      }
      return;
    }
    
    // Handle single page extraction
    setSmartExtractionProgress('Initializing smart extraction...');
    
    try {
      const response = await fetch(`/api/ai/smart-extract/${currentDrawing.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Smart extraction result:', result);
        
        // Store results for display
        setSmartExtractionResults(result);
        
        // Invalidate queries to refresh data
        await queryClient.invalidateQueries({ queryKey: ["/api/extracted-data", currentDrawing.id] });
        await queryClient.invalidateQueries({ queryKey: ["/api/ai-credits/balance"] });

        toast({
          title: "Smart Extraction Complete",
          description: `Successfully analyzed and extracted ${result.summary?.totalItems || 0} construction items across ${result.summary?.divisionsFound || 0} CSI divisions with intelligent categorization.`
        });
        
        // Auto-open data table to show results
        setShowDataTable(true);
        
        // Auto-select first division with extracted data
        if (result.extractedItems?.length > 0) {
          const firstDivisionWithData = constructionDivisions?.find(
            div => result.extractedItems.some((item: any) => item.csiDivision?.id === div.id)
          );
          if (firstDivisionWithData) {
            setSelectedDivision(firstDivisionWithData);
          }
        }
      } else {
        const error = await response.json();
        if (response.status === 402) {
          throw new Error('Insufficient AI credits. Please add credits to your account to continue with smart extraction.');
        }
        throw new Error(error.message || error.error || 'Smart extraction failed');
      }
    } catch (error: any) {
      console.error('Smart extraction error:', error);
      toast({
        title: "Smart Extraction Failed",
        description: error.message || 'An error occurred during smart extraction.',
        variant: "destructive"
      });
    } finally {
      setIsSmartExtracting(false);
      setSmartExtractionProgress('');
    }
  };

  // Bulk extraction status polling
  const startBulkExtractionPolling = () => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/bulk-extraction/status');
        if (response.ok) {
          const status = await response.json();
          
          if (status.isProcessing) {
            const progress = status.totalPages > 0 
              ? `Processing page ${status.currentPage} of ${status.totalPages} (${status.extractedItems} items found)`
              : 'Processing...';
            setSmartExtractionProgress(progress);
            
            // Calculate progress percentage (0% to 95% based on currentPage/totalPages, leave 5% for completion)
            const progressPercent = status.totalPages > 0 
              ? Math.min(95, Math.round((status.currentPage / status.totalPages) * 95))
              : 5;
            setBulkExtractionProgressPercent(progressPercent);
          } else {
            // Extraction complete
            clearInterval(pollInterval);
            setIsSmartExtracting(false);
            setSmartExtractionProgress('');
            setBulkExtractionProgressPercent(100);
            
            // Reset progress after a short delay
            setTimeout(() => setBulkExtractionProgressPercent(0), 2000);
            
            if (status.phase === 'complete') {
              // Refresh data and show results
              await queryClient.invalidateQueries({ queryKey: ["/api/extracted-data", currentDrawing?.id] });
              await queryClient.invalidateQueries({ queryKey: ["/api/ai-credits/balance"] });
              
              toast({
                title: "Bulk Extraction Complete",
                description: `Successfully processed all ${status.totalPages} pages and extracted ${status.extractedItems} construction items.`
              });
              
              // Auto-open data table to show results
              setShowDataTable(true);
            } else if (status.phase === 'error') {
              toast({
                title: "Bulk Extraction Failed",
                description: "An error occurred during bulk extraction. Please try again.",
                variant: "destructive"
              });
            }
          }
        }
      } catch (error) {
        console.error('Error polling bulk extraction status:', error);
        clearInterval(pollInterval);
        setIsSmartExtracting(false);
        setSmartExtractionProgress('');
      }
    }, 2000); // Poll every 2 seconds
    
    // Clean up after 10 minutes max
    setTimeout(() => {
      clearInterval(pollInterval);
      if (isSmartExtracting) {
        setIsSmartExtracting(false);
        setSmartExtractionProgress('');
        toast({
          title: "Extraction Timeout",
          description: "Bulk extraction is taking longer than expected. Please check results manually.",
          variant: "destructive"
        });
      }
    }, 600000); // 10 minutes
  };

  // Handler for when drawing profile is completed/skipped
  const handleDrawingProfileComplete = (drawing: Drawing) => {
    // After drawing profile is completed, show folder selection modal
    setPendingDrawingForFolder(drawing);
    setShowFolderSelection(true);
  };

  // Handler for folder selection - awaits background upload and assigns folder
  const handleFolderSelection = async (folderId: string | null, uploadedDrawing?: Drawing, isRevision: boolean = false) => {
    if (!pendingDrawingForFolder && !uploadedDrawing) return;

    const selectedFolderId = folderId === "uncategorized" ? null : folderId;
    setShowFolderSelection(false);

    try {
      let drawing: Drawing;
      
      // If drawing is already provided (direct folder upload), use it
      if (uploadedDrawing) {
        drawing = uploadedDrawing;
      } else {
        // Wait for the background upload to complete (regular upload flow)
        const uploadPromise = (window as any).pendingUploadPromise;
        if (!uploadPromise) {
          toast({
            title: "Error",
            description: "Upload process not found. Please try again.",
            variant: "destructive",
          });
          return;
        }
        drawing = await uploadPromise;
      }
      
      // Assign drawing to folder immediately after upload completes
      if (selectedFolderId) {
        console.log('Assigning drawing to folder:', { drawingId: drawing.id, folderId: selectedFolderId });
        await apiRequest(`/api/drawings/${drawing.id}/folder`, "PUT", {
          folderId: selectedFolderId
        });
        console.log('Drawing successfully assigned to folder');
        
        // Expand the selected folder in the sidebar to show the new drawing
        setExpandedFolderId(selectedFolderId);
      }

      // For revisions (second+ drawing in folder), skip project information modal
      if (isRevision) {
        console.log('Revision upload - skipping project information modal');
        setCurrentDrawing(drawing);
        
        toast({
          title: "Revision uploaded",
          description: `${drawing.name} has been uploaded as a revision successfully.`,
        });
      } else {
        // Show drawing profile modal for new drawings
        setPendingDrawing(drawing);
        setShowDrawingProfile(true);
        
        toast({
          title: "Upload successful",
          description: `${drawing.name} has been uploaded and organized successfully.`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/drawings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });

    } catch (error: any) {
      console.error('Failed to upload file:', error);
      console.log('Error details:', { errorType: error.errorType, message: error.message });
      
      // Check if this is a trial limit error
      if (error.errorType === 'TRIAL_LIMIT_EXCEEDED') {
        console.log('Trial limit exceeded - showing upgrade modal');
        setShowUpgradeModal(true);
        setUploadingFileName(''); // Reset upload state
        return; // Don't show regular error toast
      }
      
      toast({
        title: "Upload failed",
        description: `Failed to upload ${uploadingFileName}.`,
        variant: "destructive",
      });
    } finally {
      // Reset state but keep progress bar visible if AI is still processing
      setPendingDrawingForFolder(null);
      setPendingFile(null);
      
      // Don't reset upload state here - let the main useEffect handle it
      // The progress monitoring useEffect will handle cleanup when processing is actually complete
      console.log('Folder selection complete - upload state will be managed by progress monitoring');
      
      (window as any).pendingUploadPromise = null;
      (window as any).preSelectedFolderId = null;
      (window as any).isRevisionUpload = null;
    }
  };

  const handleFileUpload = async (files: File[], folderId?: string, isRevision?: boolean) => {
    // Process the first file (for multiple files, we'll handle them one by one)
    const file = files[0];
    if (!file) return;
    
    // Start upload immediately and show progress
    setUploadingFileName(file.name);
    setManualIsUploading(true);
    setTotalPages(0); // Will be updated by progress polling
    
    try {
      // Start the upload process in the background
      const uploadPromise = uploadFile(file, currentProject?.id);
      
      // If folder is pre-selected (direct folder upload), skip folder selection modal
      if (folderId) {
        console.log('Direct folder upload to folder:', folderId, 'isRevision:', isRevision);
        
        // For non-revisions, show project information modal immediately while upload is processing
        if (!isRevision) {
          setPendingDrawing({ name: file.name, id: 0 } as Drawing);
          setShowDrawingProfile(true);
        }
        
        // Store the upload promise and directly assign to folder
        (window as any).pendingUploadPromise = uploadPromise;
        (window as any).preSelectedFolderId = folderId;
        (window as any).isRevisionUpload = isRevision;
        
        // Wait for upload to complete and assign to folder automatically
        uploadPromise.then((result) => {
          if (result && result.id) {
            handleFolderSelection(folderId, result, isRevision || false);
            // Note: Upload state will be reset by handleFolderSelection after checking AI status
          }
        }).catch((error) => {
          console.error('Direct folder upload failed:', error);
          setUploadingFileName('');
          setManualIsUploading(false);
        });
        
        return;
      }
      
      // Regular upload flow - show folder selection modal
      setPendingFile(file);
      setPendingDrawingForFolder({ name: file.name } as Drawing);
      setShowFolderSelection(true);
      
      // Store the upload promise so we can await it after folder selection
      (window as any).pendingUploadPromise = uploadPromise;
      
    } catch (error: any) {
      console.error('Failed to start upload:', error);
      if (error.errorType === 'TRIAL_LIMIT_EXCEEDED') {
        setShowUpgradeModal(true);
        setUploadingFileName('');
        return;
      }
      
      toast({
        title: "Upload failed",
        description: `Failed to upload ${file.name}.`,
        variant: "destructive",
      });
      setUploadingFileName('');
      setManualIsUploading(false);
    }
  };

  const handleCancelUpload = async (userInitiated: boolean = true) => {
    if (!userInitiated) {
      // If this wasn't user-initiated (e.g., component cleanup), just silently reset state
      // but DON'T reset manualIsUploading - let the component handle its own visibility
      console.log('Upload cleanup triggered - resetting state silently');
      setUploadingFileName('');
      setTotalPages(0);
      return;
    }

    try {
      console.log('User attempting to cancel upload...');
      
      // First try to cancel upload processing
      const uploadResponse = await fetch('/api/upload/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      // Also try to cancel background AI processing (but don't let it fail the entire operation)
      await fetch('/api/background-ai/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      }).catch(() => {
        // Ignore AI cancellation errors - upload cancellation is the priority
        console.log('AI cancellation failed but continuing with upload cancellation');
      });
      
      // Use upload response as primary
      const response = uploadResponse;
      
      console.log('Cancel response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Cancel request failed: ${errorData.message}`);
      }
      
      const result = await response.json();
      console.log('Cancel response:', result);
      
      // Reset upload state immediately
      setUploadingFileName('');
      setTotalPages(0);
      
      // Refresh the drawings list in case anything was partially uploaded
      queryClient.invalidateQueries({ queryKey: ["/api/drawings"] });
      
      toast({
        title: "Upload cancelled",
        description: "PDF processing has been cancelled.",
      });
    } catch (error) {
      console.error('Failed to cancel upload:', error);
      // Only show error toast for user-initiated cancellations
      toast({
        title: "Cancel failed",
        description: `Failed to cancel the upload process. ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleDrawingProfileSave = async (profile: any) => {
    if (!pendingDrawing) return;
    
    try {
      // Save the drawing profile
      const response = await fetch('/api/drawing-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          drawingId: pendingDrawing.id,
          ...profile,
          // Keep dates as they are - the database will handle conversion
          projectStartDate: profile.projectStartDate,
          projectEndDate: profile.projectEndDate,
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save drawing profile');
      }
      
      // Close the drawing profile modal
      setShowDrawingProfile(false);
      const currentPendingDrawing = pendingDrawing;
      setPendingDrawing(null);
      
      // Set as current drawing (no need for second folder selection since we already handled it during upload)
      setCurrentDrawing(currentPendingDrawing);
      queryClient.invalidateQueries({ queryKey: ["/api/drawings"] });
      
      toast({
        title: "Profile saved",
        description: "Drawing profile has been saved successfully. Your drawing is ready for data extraction.",
      });
    } catch (error) {
      toast({
        title: "Profile save failed",
        description: "Failed to save drawing profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDataExtracted = async (extractedDataItem: {
    type: string;
    sourceLocation: string;
    data: string;
    confidence?: number;
    divisionId?: number;
  }) => {
    console.log('=== handleDataExtracted CALLED ===');
    console.log('extractedDataItem:', extractedDataItem);
    console.log('currentDrawing:', currentDrawing);
    
    if (!currentDrawing) {
      console.log('Missing currentDrawing, returning early');
      toast({
        title: "Error",
        description: "Please select a drawing first.",
        variant: "destructive",
      });
      return;
    }

    // Use division ID from extracted data if available, otherwise fall back to selected division
    let divisionId = extractedDataItem.divisionId || selectedDivision?.id;
    
    if (!divisionId) {
      toast({
        title: "Error",
        description: "No construction division information available.",
        variant: "destructive",
      });
      return;
    }

    const mutationData = {
      drawingId: currentDrawing.id,
      divisionId: divisionId,
      ...extractedDataItem,
    };

    console.log('About to trigger mutation with:', mutationData);
    console.log('Mutation state - isPending:', createExtractedDataMutation.isPending);
    console.log('Mutation state - isError:', createExtractedDataMutation.isError);
    console.log('Mutation state - error:', createExtractedDataMutation.error);
    
    try {
      console.log('Calling createExtractedDataMutation.mutate...');
      createExtractedDataMutation.mutate(mutationData);
      console.log('createExtractedDataMutation.mutate called successfully');
    } catch (error) {
      console.error('Error calling mutation:', error);
      toast({
        title: "Error",
        description: "Failed to trigger data extraction mutation.",
        variant: "destructive",
      });
    }
  };

  const handleMarqueeDeleted = (marqueeId: string) => {
    // Find and delete corresponding extracted data
    const extractedDataItems = extractedData || [];
    console.log('Looking for marquee ID:', marqueeId);
    console.log('Available extracted data:', extractedDataItems.map(item => ({ id: item.id, sourceLocation: item.sourceLocation })));
    
    const correspondingData = extractedDataItems.find((item: any) => 
      item.sourceLocation === marqueeId
    );
    
    console.log('Found corresponding data:', correspondingData);
    
    if (correspondingData) {
      // Delete the extracted data from the backend
      fetch(`/api/extracted-data/${correspondingData.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(response => {
          if (response.ok) {
            queryClient.invalidateQueries({ queryKey: ["/api/extracted-data", currentDrawing?.id] });
            toast({
              title: "Data Deleted",
              description: "Marquee and corresponding extracted data have been removed.",
            });
          } else {
            throw new Error('Failed to delete');
          }
        })
        .catch((error) => {
          console.error('Deletion error:', error);
          toast({
            title: "Deletion Failed",
            description: "Failed to delete extracted data. Please try again.",
            variant: "destructive",
          });
        });
    } else {
      toast({
        title: "No Data Found",
        description: "No corresponding extracted data found for this marquee.",
        variant: "destructive",
      });
    }
  };

  // Handle batch extraction communication from PDF viewer
  const handleBatchExtractionReady = (extractFn: () => Promise<void>, highlightCount: number, isExtracting: boolean) => {
    setBatchExtractionFn(() => extractFn);
    setPendingHighlightCount(highlightCount);
    setIsBatchExtracting(isExtracting);
  };

  // Execute batch extraction
  const executeBatchExtraction = async () => {
    if (batchExtractionFn) {
      await batchExtractionFn();
    }
  };

  const handleDrawingDelete = (drawingId: number) => {
    // Clear current drawing if it's being deleted
    if (currentDrawing?.id === drawingId) {
      setCurrentDrawing(null);
    }
    deleteDrawingMutation.mutate(drawingId);
  };

  // Group extracted data by construction division
  const dataByDivision = extractedData.reduce((acc: any, item: any) => {
    const divisionId = item.divisionId;
    if (!acc[divisionId]) {
      acc[divisionId] = [];
    }
    // Clean the data by removing embedded marquee metadata
    const cleanData = item.data ? item.data.split('||MARQUEE_DATA:')[0] : item.data;
    
    acc[divisionId].push({
      id: item.id.toString(),
      type: item.type,
      extractedAt: item.extractedAt || new Date(),
      sourceLocation: item.sourceLocation,
      data: cleanData || '', // Keep the raw string data for proper table detection
    });
    return acc;
  }, {} as Record<number, Array<{
    id: string;
    type: string;
    extractedAt: Date;
    sourceLocation: string;
    data: string;
  }>>);

  return (
    <div className="bg-gray-100 pt-4 px-4 pb-8">
      {/* Header with user info and upgrade button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {/* Left side is now empty, removed Koncurent Hi-LYTE */}
        </div>
        <div className="flex items-center gap-3">

          
          {/* Only show upgrade button if user doesn't have active subscription */}
          {subscriptionStatus?.subscriptionStatus !== 'active' && (
            <UpgradeButton variant="prominent" size="sm" />
          )}
          
          {/* Account Status Card - moved here between upgrade button and user dropdown */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2">
            <div className="flex items-center gap-2">
              {subscriptionStatus?.subscriptionStatus === 'active' ? (
                <>
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Hi-LYTE Pro</span>
                </>
              ) : (
                <>
                  <div className={`w-2 h-2 rounded-full ${
                    subscriptionStatus?.limits?.drawingCount > 0 ? 'bg-orange-500' : 'bg-green-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    {subscriptionStatus?.limits?.drawingCount > 0 
                      ? 'Free Project Used' 
                      : '1 Free Project'}
                  </span>
                </>
              )}
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-3 h-3 text-blue-600" />
              <span className="text-sm text-gray-600">
                {aiCreditsBalance ? `$${aiCreditsBalance.balance?.toFixed(2) || '0.00'}` : '$0.00'} AI Credits
              </span>
            </div>
          </div>


          
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Welcome, {getDisplayName(user)}!</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/profile")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/templates")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Manage Templates
                </DropdownMenuItem>


                <DropdownMenuItem onClick={() => setLocation("/pricing")}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Pricing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/ai-credits")}>
                  <Zap className="h-4 w-4 mr-2" />
                  AI Credits
                </DropdownMenuItem>
                {canAccessAIDashboard(user) && (
                  <DropdownMenuItem onClick={() => setLocation("/ai-training")}>
                    <Bot className="h-4 w-4 mr-2" />
                    AI Dashboard
                  </DropdownMenuItem>
                )}
                {user?.email?.endsWith('@koncurent.com') && (
                  <DropdownMenuItem onClick={() => setShowPaidFeaturesManager(true)}>
                    <Cog className="h-4 w-4 mr-2" />
                    Feature Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowBetaFeedback(true)}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Beta Feedback
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      
      <div className="flex flex-col gap-4">
        {/* Top row with panels */}
        <div className="flex gap-4 h-[800px]">
          {/* Drawings Panel */}
          <div className="w-96 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col" data-tour="folders">
            <DataExtractionSidebar
              projects={projects}
              drawings={drawings}
              currentProject={currentProject}
              currentDrawing={currentDrawing}
              onProjectSelect={setCurrentProject}
              onDrawingSelect={setCurrentDrawing}
              onDrawingDelete={handleDrawingDelete}
              onFileUpload={handleFileUpload}
              isUploading={isUploading}
              uploadingFileName={uploadingFileName}
              constructionDivisions={constructionDivisions}
              selectedDivision={selectedDivision}
              onDivisionSelect={(division) => {
                setSelectedDivision(division);
              }}
              extractedData={dataByDivision}
              showDataTable={showDataTable}
              setShowDataTable={setShowDataTable}
              showTrainingDashboard={showTrainingDashboard}
              setShowTrainingDashboard={setShowTrainingDashboard}
              onManageDivisions={() => setShowDivisionManager(true)}
              onManageFeatures={() => setShowPaidFeaturesManager(true)}
              onViewProfile={async (drawingId) => {
                const drawing = drawings?.find(d => d.id === drawingId);
                if (drawing) {
                  setCurrentDrawing(drawing);
                  
                  // Check if drawing profile exists
                  try {
                    const response = await fetch(`/api/drawing-profiles/${drawingId}`);
                    if (response.ok) {
                      // Profile exists, show viewer
                      setShowDrawingProfileViewer(true);
                    } else {
                      // No profile exists, show modal to collect information
                      setPendingDrawing(drawing);
                      setShowDrawingProfile(true);
                    }
                  } catch (error) {
                    // If error checking profile, default to showing modal to collect information
                    console.log('Error checking profile, opening modal to collect information');
                    setPendingDrawing(drawing);
                    setShowDrawingProfile(true);
                  }
                }
              }}
              pendingHighlightCount={pendingHighlightCount}
              isBatchExtracting={isBatchExtracting}
              onBatchExtract={executeBatchExtraction}
              visibleDivisions={visibleDivisions}
              onDivisionVisibilityChange={(newVisibleDivisions) => {
                // Update state
                setVisibleDivisions(newVisibleDivisions);
                
                // Persist hidden divisions to localStorage
                try {
                  const allDivisionIds = constructionDivisions.map((d: any) => d.id);
                  const hiddenIds = allDivisionIds.filter(id => !newVisibleDivisions.has(id));
                  localStorage.setItem('hiddenDivisions', JSON.stringify(hiddenIds));
                  console.log('Persisted hidden divisions:', hiddenIds);
                } catch (error) {
                  console.error('Failed to persist division visibility:', error);
                }
              }}
              expandedFolderId={expandedFolderId}
              onFolderExpansionChange={setExpandedFolderId}
              // Smart extraction props
              isSmartExtracting={isSmartExtracting}
              smartExtractionProgress={smartExtractionProgress}
              bulkExtractionProgressPercent={bulkExtractionProgressPercent}
              onSmartExtraction={handleSmartExtraction}
              smartExtractionResults={smartExtractionResults}
              showEnhancedNLP={showEnhancedNLP}
              setShowEnhancedNLP={setShowEnhancedNLP}
            />
          </div>
          
          {/* Drawing Viewer Panel */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col pb-4" data-tour="drawing-canvas">
            {currentDrawing ? (
              <div className="h-full relative flex flex-col">
                {currentDrawing.fileType === 'application/pdf' ? (
                  <PDFViewer
                    drawing={currentDrawing}
                    selectedDivision={selectedDivision}
                    onDataExtracted={handleDataExtracted}
                    onMarqueeDeleted={handleMarqueeDeleted}
                    onBatchExtractionReady={handleBatchExtractionReady}
                    onBatchProgress={(extracted, total, currentArea) => {
                      setBatchProgress({ extracted, total, currentArea });
                    }}
                    navigateToPage={navigateToPage}
                    triggerClearMarquees={triggerClearMarquees}
                  />
                ) : (
                  <DataExtractionCanvas
                    drawing={currentDrawing}
                    selectedDivision={selectedDivision}
                    onDataExtracted={handleDataExtracted}
                    triggerClearMarquees={triggerClearMarquees}
                  />
                )}
              </div>
            ) : (
              <div className="h-full bg-gray-50 pt-12 px-8 pb-20 rounded-2xl overflow-y-auto">
                <div className="text-center max-w-2xl mx-auto">
                  <h2 className="text-2xl font-semibold text-gray-700 mb-4">
                    Welcome, Let's Get Started
                  </h2>
                  <p className="text-gray-500 mb-6">
                    Follow these steps to extract data from your drawings:
                  </p>
                  <ol className="text-left text-gray-600 space-y-2 mb-8">
                    <li>1. Upload your PDF drawing sets</li>
                    <li>2. Select a drawing set and navigate between pages</li>
                    <li>3. Choose a construction division from the left sidebar</li>
                    <li>4. Use marquee selection to highlight data areas</li>
                    <li>5. View extracted data in organized tables</li>
                    <li>6. Export .csv for Koncurent upload</li>
                  </ol>
                  
                  {/* Drag and drop area - only show when not uploading */}
                  {!isUploading && (
                    <HelpTooltip content="Drop PDF files here or click to browse. Organize your drawings by creating folders and selecting construction divisions for targeted AI extraction.">
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-2xl p-8 bg-white hover:border-gray-400 transition-colors"
                      onDrop={(e) => {
                        console.log('Drop event triggered');
                        e.preventDefault();
                        const files = Array.from(e.dataTransfer.files);
                        console.log('Files dropped:', files.length, files.map(f => f.name));
                        if (files.length > 0) {
                          setUploadingFileName(files[0].name);
                          console.log('About to call handleFileUpload with dropped files:', files.map(f => f.name));
                          handleFileUpload(files);
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <div className="text-center">
                        <CloudUpload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Drag & Drop Your PDF Drawings Here
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Or click to browse and select files
                        </p>
                        <Button
                          data-tour="extract-button"
                          onClick={() => {
                            console.log('Select PDF Files button clicked');
                            // Trigger file input
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.pdf';
                            input.multiple = true;
                            input.onchange = (e) => {
                              const files = Array.from((e.target as HTMLInputElement).files || []);
                              console.log('Files selected from file picker:', files.length);
                              if (files.length > 0) {
                                setUploadingFileName(files[0].name);
                                console.log('About to call handleFileUpload with selected files:', files.map(f => f.name));
                                handleFileUpload(files);
                              } else {
                                console.log('No files selected from file picker');
                              }
                            };
                            input.click();
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <FileImage className="mr-2 h-4 w-4" />
                          Select PDF Files
                        </Button>
                      </div>
                    </div>
                    </HelpTooltip>
                  )}
                  
                  {/* Upload Progress - Replace the upload area when uploading */}
                  {manualIsUploading && uploadingFileName && (
                    <div className="border-2 border-dashed border-blue-300 rounded-2xl p-8 bg-blue-50/30">
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileImage className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          Processing Your PDF
                        </h3>
                        <p className="text-sm text-gray-600">
                          Converting pages to high-quality images for analysis
                        </p>
                      </div>
                      <UploadProgress 
                        fileName={uploadingFileName}
                        totalPages={totalPages}
                        isVisible={manualIsUploading}
                        onCancel={handleCancelUpload}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>


        </div>

        {/* Bottom panel for template/data table - full width */}
        {selectedDivision && showDataTable && (
          <div 
            className="mt-4 mb-4 bg-white shadow-sm flex flex-col"
            style={{ 
              height: '450px',
              minHeight: '450px',
              maxHeight: '450px',
              width: '100%',
              overflow: 'hidden'
            }}
          >
            <HelpTooltip content="View and edit extracted data in organized tables. Use the marquee tool on drawings to select areas for AI-powered data extraction.">
              <div className="h-full flex flex-col" style={{ width: '100%' }}>
                {/* Panel Header */}
                <div className="flex items-center justify-between bg-gray-50 px-4 py-3 flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: selectedDivision.color }}
                    />
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-gray-700">
                        {selectedDivision.name} - {dataByDivision[selectedDivision.id]?.length > 0 
                          ? `Extracted Data (${dataByDivision[selectedDivision.id]?.length} extractions)` 
                          : 'Template View (0 extractions)'}
                      </h3>
                      
                      {/* Action icons: gear, trash, X */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Set a state variable that the CleanDataTable can watch
                            setShowColumnManager(true);
                          }}
                          className="h-5 w-5 p-0 text-gray-500 hover:text-gray-700"
                          title="Manage columns"
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Set a trigger for delete all and clear marquees
                            setTriggerDeleteAll(Date.now());
                            setTriggerClearMarquees(Date.now());
                          }}
                          className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                          title="Delete all data"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        
                        {!showColumnManager && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                              setTimeout(() => setShowDataTable(false), 400);
                            }}
                            className="h-5 w-5 p-0 text-gray-500 hover:text-gray-700"
                            title="Close table"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* X button back in top-right corner */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Scroll to top first, then close the container for smoother animation
                      window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                      });
                      // Close the data table after scroll animation starts
                      setTimeout(() => {
                        setShowDataTable(false);
                      }, 400);
                    }}
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                    title="Close data table"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Panel Content - full width */}
                <div className="flex-1 overflow-hidden min-h-0" style={{ width: '100%', margin: '0', padding: '0' }}>
                  <CleanDataTable
                    selectedDivision={selectedDivision}
                    extractedData={dataByDivision[selectedDivision.id] || []}
                    drawingId={currentDrawing?.id}
                    showColumnManager={showColumnManager}
                    onShowColumnManagerChange={setShowColumnManager}
                    triggerDeleteAll={triggerDeleteAll}
                    onClose={() => {
                      // Scroll to top first, then close the container for smoother animation
                      window.scrollTo({
                        top: 0,
                        behavior: 'smooth'
                      });
                      // Close the data table after scroll animation starts
                      setTimeout(() => {
                        setShowDataTable(false);
                      }, 400);
                    }}
                  />
                </div>
              </div>
            </HelpTooltip>
          </div>
        )}

        {/* Smart Extraction Results Table */}
        {smartExtractionResults && smartExtractionResults.extractedItems && smartExtractionResults.extractedItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <ProcurementResultsTable
              results={smartExtractionResults}
              onItemSelect={(item) => {
                // You could implement navigation to the item location on drawing here
                console.log('Selected smart extraction item:', item);
              }}
              onExport={() => {
                // Custom export functionality could be added here
                console.log('Exporting smart extraction results');
              }}
            />
          </div>
        )}

        {/* AI Dashboard */}
        {showTrainingDashboard && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-80 flex flex-col flex-shrink-0 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-gray-700">
                  AI Dashboard
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTrainingDashboard(false)}
                className="h-6 w-6 p-0 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <AIDashboard />
            </div>
          </div>
        )}

        {/* Enhanced NLP Panel */}
        {showEnhancedNLP && currentDrawing && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col flex-shrink-0 overflow-hidden max-h-[600px]">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-2xl">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-semibold text-gray-700">
                  Enhanced NLP Analysis
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEnhancedNLP(false)}
                className="h-6 w-6 p-0 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              <EnhancedNLPPanel 
                drawingId={currentDrawing.id}
                currentPage={currentDrawing.currentPage || 1}
                onAnalysisComplete={(result) => {
                  console.log('Enhanced NLP analysis completed:', result);
                  toast({
                    title: "Analysis Complete",
                    description: "Enhanced NLP analysis has been completed successfully.",
                  });
                }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Training notification */}
      <TrainingNotification />
      
      {/* Upgrade components - only show for non-Pro users */}
      {subscriptionStatus?.subscriptionStatus !== 'active' && (
        <FloatingUpgradeButton />
      )}
      
      {/* Background AI status indicator */}
      <BackgroundAiStatus />
      
      {/* Batch extraction progress modal */}
      <BatchExtractionProgress
        isVisible={isBatchExtracting}
        extractedCount={batchProgress.extracted}
        totalCount={batchProgress.total}
        currentArea={batchProgress.currentArea}
      />
      
      {/* Construction Division Manager Modal */}
      <ConstructionDivisionManager 
        isOpen={showDivisionManager}
        onClose={() => setShowDivisionManager(false)}
        visibleDivisions={visibleDivisions}
        onDivisionVisibilityChange={(newVisibleDivisions) => {
          // Update state
          setVisibleDivisions(newVisibleDivisions);
          
          // Persist hidden divisions to localStorage
          try {
            const allDivisionIds = constructionDivisions.map((d: any) => d.id);
            const hiddenIds = allDivisionIds.filter(id => !newVisibleDivisions.has(id));
            localStorage.setItem('hiddenDivisions', JSON.stringify(hiddenIds));
            console.log('Persisted hidden divisions from modal:', hiddenIds);
          } catch (error) {
            console.error('Failed to persist division visibility from modal:', error);
          }
        }}
        extractedData={dataByDivision}
      />
      
      {/* Paid Features Manager Modal */}
      <PaidFeaturesManager
        isOpen={showPaidFeaturesManager}
        onClose={() => setShowPaidFeaturesManager(false)}
      />
      
      {/* Drawing Profile Modal */}
      {pendingDrawing && (
        <DrawingProfileModal
          isOpen={showDrawingProfile}
          onClose={() => {
            setShowDrawingProfile(false);
            const currentPendingDrawing = pendingDrawing;
            setPendingDrawing(null);
            // Set as current drawing (no need for second folder selection since we already handled it during upload)
            setCurrentDrawing(currentPendingDrawing);
            queryClient.invalidateQueries({ queryKey: ["/api/drawings"] });
            
            toast({
              title: "Profile skipped",
              description: "Your drawing is ready for data extraction.",
            });
          }}
          onSave={handleDrawingProfileSave}
          drawingName={pendingDrawing.name}
        />
      )}
      
      {/* Drawing Profile Viewer Modal */}
      {currentDrawing && (
        <DrawingProfileViewer
          isOpen={showDrawingProfileViewer}
          onClose={() => setShowDrawingProfileViewer(false)}
          drawingId={currentDrawing.id}
          drawingName={currentDrawing.name}
        />
      )}

      {/* Cost Estimator Modal removed - no longer needed */}

      {/* Welcome Bonus Modal */}
      <WelcomeBonusModal
        isOpen={showWelcomeBonus}
        onClose={() => setShowWelcomeBonus(false)}
      />

      {/* Beta Feedback Modal */}
      <BetaFeedbackModal
        isOpen={showBetaFeedback}
        onClose={() => setShowBetaFeedback(false)}
      />



      {/* Folder Selection Modal */}
      {pendingDrawingForFolder && (
        <FolderSelectionModal
          isOpen={showFolderSelection}
          onClose={async () => {
            setShowFolderSelection(false);
            setPendingDrawingForFolder(null);
            setPendingFile(null);
            
            // Don't reset upload state here - let the comprehensive progress monitoring handle it
            // The progress monitoring useEffect will detect when all processing is complete and handle cleanup
            console.log('Folder selection modal closed - upload state will be managed by progress monitoring');
          }}
          onFolderSelected={handleFolderSelection}
          drawingName={pendingDrawingForFolder.name}
        />
      )}

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