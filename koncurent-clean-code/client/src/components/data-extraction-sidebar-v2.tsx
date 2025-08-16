import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

import { Upload, FileImage, Calendar, ChevronDown, ChevronRight, Trash2, Check, Download, Plus, DollarSign, FileText, Bot, Zap, X, Settings, Minus, Folder, FolderPlus, FolderOpen, Edit3, ArrowDown, AlertTriangle, Cog, Eye, EyeOff, Package, RefreshCw } from "lucide-react";
import HelpTooltip from "./HelpTooltip";
import { Project, Drawing, ConstructionDivision, DrawingFolder } from "@shared/schema";
import CreateFolderModal from "./CreateFolderModal";
import { formatFileSize } from "@/lib/file-utils";
import kLogo from "@assets/Hubspot Scheduler Logo Image (1)_1751563530272.png";
import { AIStatusIndicator } from "./ai-status-indicator";
import PaidFeaturesManager from "./PaidFeaturesManager";


interface DataExtractionSidebarProps {
  projects: Project[];
  drawings: Drawing[];
  currentProject: Project | null;
  currentDrawing: Drawing | null;
  onProjectSelect: (project: Project) => void;
  onDrawingSelect: (drawing: Drawing) => void;
  onDrawingDelete?: (drawingId: number) => void;
  onFileUpload: (files: File[], folderId?: string, isRevision?: boolean) => void;
  isUploading: boolean;
  constructionDivisions: ConstructionDivision[];
  selectedDivision: ConstructionDivision | null;
  onDivisionSelect: (division: ConstructionDivision) => void;
  extractedData: Record<number, Array<{
    id: string;
    type: string;
    extractedAt: Date;
    sourceLocation: string;
    data: string;
  }>>;
  showDataTable?: boolean;
  setShowDataTable: (show: boolean) => void;
  showTrainingDashboard?: boolean;
  setShowTrainingDashboard?: (show: boolean) => void;
  onManageDivisions?: () => void;
  onManageFeatures?: () => void;
  onViewProfile?: (drawingId: number) => Promise<void> | void;
  // Batch extraction props
  pendingHighlightCount?: number;
  isBatchExtracting?: boolean;
  onBatchExtract?: () => Promise<void>;
  // Division visibility props
  visibleDivisions?: Set<number>;
  onDivisionVisibilityChange?: (visibleDivisions: Set<number>) => void;
  // Folder expansion props
  expandedFolderId?: string | null;
  onFolderExpansionChange?: (folderId: string | null) => void;
  // Smart extraction props (replaces procurement extraction)
  isSmartExtracting?: boolean;
  smartExtractionProgress?: string;
  bulkExtractionProgressPercent?: number;
  onSmartExtraction?: (page?: number) => Promise<void>;
  smartExtractionResults?: any;
  // Enhanced NLP props
  showEnhancedNLP?: boolean;
  setShowEnhancedNLP?: (show: boolean) => void;
}

export default function DataExtractionSidebar({
  drawings,
  currentDrawing,
  onDrawingSelect,
  onDrawingDelete,
  onFileUpload,
  isUploading,
  constructionDivisions,
  selectedDivision,
  onDivisionSelect,
  extractedData,
  showDataTable,
  setShowDataTable,
  showTrainingDashboard,
  setShowTrainingDashboard,
  onManageDivisions,
  onManageFeatures,
  onViewProfile,
  pendingHighlightCount = 0,
  isBatchExtracting = false,
  onBatchExtract,
  visibleDivisions = new Set(constructionDivisions.map(d => d.id)),
  onDivisionVisibilityChange,
  expandedFolderId,
  onFolderExpansionChange,
  isSmartExtracting = false,
  smartExtractionProgress = "",
  bulkExtractionProgressPercent = 0,
  onSmartExtraction,
  smartExtractionResults,
  showEnhancedNLP = false,
  setShowEnhancedNLP,
}: DataExtractionSidebarProps & { currentDrawing?: Drawing }) {
  const [drawingsCollapsed, setDrawingsCollapsed] = useState(false);
  const [drawingsSectionCollapsed, setDrawingsSectionCollapsed] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateDivision, setShowCreateDivision] = useState(false);
  const [newDivisionName, setNewDivisionName] = useState("");
  const [newDivisionColor, setNewDivisionColor] = useState("#3B82F6");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<{ id: number; name: string } | null>(null);
  const [showFolderActions, setShowFolderActions] = useState(false);
  const [newFolderActionTimer, setNewFolderActionTimer] = useState<NodeJS.Timeout | null>(null);
  const [showDivisionActions, setShowDivisionActions] = useState(false);
  const [newDivisionActionTimer, setNewDivisionActionTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [divisionToDelete, setDivisionToDelete] = useState<any>(null);
  const [drawingDeleteDialogOpen, setDrawingDeleteDialogOpen] = useState(false);
  const [drawingToDelete, setDrawingToDelete] = useState<Drawing | null>(null);
  const [newlyCreatedDivisionId, setNewlyCreatedDivisionId] = useState<number | null>(null);
  const [editingDivisionId, setEditingDivisionId] = useState<number | null>(null);
  const [editingDivisionName, setEditingDivisionName] = useState("");
  const [editingDivisionColor, setEditingDivisionColor] = useState("");
  
  // Auto-hide timers for inactivity (2 minutes)
  const [folderAutoHideTimer, setFolderAutoHideTimer] = useState<NodeJS.Timeout | null>(null);
  const [divisionAutoHideTimer, setDivisionAutoHideTimer] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Sync expandedFolderId prop with local state
  useEffect(() => {
    if (expandedFolderId && !expandedFolders.has(expandedFolderId)) {
      setExpandedFolders(prev => new Set([...prev, expandedFolderId]));
    }
  }, [expandedFolderId, expandedFolders]);

  // Helper functions for auto-hide timers
  const startFolderAutoHideTimer = () => {
    // Clear existing auto-hide timer
    if (folderAutoHideTimer) {
      clearTimeout(folderAutoHideTimer);
    }
    
    // Set new 2-minute auto-hide timer
    const timer = setTimeout(() => {
      setShowFolderActions(false);
      setFolderAutoHideTimer(null);
    }, 2 * 60 * 1000); // 2 minutes
    
    setFolderAutoHideTimer(timer);
  };

  const startDivisionAutoHideTimer = () => {
    // Clear existing auto-hide timer
    if (divisionAutoHideTimer) {
      clearTimeout(divisionAutoHideTimer);
    }
    
    // Set new 2-minute auto-hide timer
    const timer = setTimeout(() => {
      setShowDivisionActions(false);
      setDivisionAutoHideTimer(null);
    }, 2 * 60 * 1000); // 2 minutes
    
    setDivisionAutoHideTimer(timer);
  };

  const resetFolderAutoHideTimer = () => {
    if (showFolderActions) {
      startFolderAutoHideTimer();
    }
  };

  const resetDivisionAutoHideTimer = () => {
    if (showDivisionActions) {
      startDivisionAutoHideTimer();
    }
  };

  // Cleanup timers on component unmount
  useEffect(() => {
    return () => {
      if (newFolderActionTimer) {
        clearTimeout(newFolderActionTimer);
      }
      if (newDivisionActionTimer) {
        clearTimeout(newDivisionActionTimer);
      }
      if (folderAutoHideTimer) {
        clearTimeout(folderAutoHideTimer);
      }
      if (divisionAutoHideTimer) {
        clearTimeout(divisionAutoHideTimer);
      }
    };
  }, [newFolderActionTimer, newDivisionActionTimer, folderAutoHideTimer, divisionAutoHideTimer]);

  // Handle clicking outside color picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker]);

  // Fetch folders
  const { data: folders = [] } = useQuery<DrawingFolder[]>({
    queryKey: ['/api/folders'],
  });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      return await apiRequest("/api/folders", "POST", {
        name: folderName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      toast({
        title: "Folder created",
        description: "New folder has been created successfully.",
      });
      
      // Show folder actions for 30 seconds after creating a new folder
      setShowFolderActions(true);
      
      // Clear any existing timer
      if (newFolderActionTimer) {
        clearTimeout(newFolderActionTimer);
      }
      
      // Set new timer to hide actions after 30 seconds
      const timer = setTimeout(() => {
        setShowFolderActions(false);
        setNewFolderActionTimer(null);
      }, 30000);
      
      setNewFolderActionTimer(timer);
      
      // Also start the 2-minute auto-hide timer
      startFolderAutoHideTimer();
    },
    onError: (error) => {
      toast({
        title: "Error creating folder",
        description: "Failed to create folder. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Rename folder mutation
  const renameFolderMutation = useMutation({
    mutationFn: async ({ folderId, newName }: { folderId: string; newName: string }) => {
      return await apiRequest(`/api/folders/${folderId}`, "PUT", {
        name: newName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      setEditingFolderId(null);
      setEditingFolderName("");
      toast({
        title: "Folder renamed",
        description: "Folder has been renamed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error renaming folder",
        description: "Failed to rename folder. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete folder mutation
  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: number) => {
      return await apiRequest(`/api/folders/${folderId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drawings"] });
      toast({
        title: "Folder deleted",
        description: "Folder has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting folder",
        description: "Failed to delete folder. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Create division mutation
  const createDivisionMutation = useMutation({
    mutationFn: async (divisionData: { name: string; color: string }) => {
      // Generate a code from the name (first 3 characters uppercase + random number)
      const code = (divisionData.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 900 + 100));
      return await apiRequest("/api/construction-divisions", "POST", {
        ...divisionData,
        code
      });
    },
    onSuccess: (newDivision: ConstructionDivision) => {
      // Set newly created division ID and show actions for 30 seconds FIRST
      setNewlyCreatedDivisionId(newDivision.id);
      setShowDivisionActions(true);
      
      // Make the new division visible by default BEFORE invalidating queries
      if (onDivisionVisibilityChange && visibleDivisions) {
        const updatedVisible = new Set(visibleDivisions);
        updatedVisible.add(newDivision.id);
        onDivisionVisibilityChange(updatedVisible);
      }
      
      // Invalidate queries AFTER visibility is updated with a small delay to ensure state is set
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/construction-divisions"] });
      }, 100);
      
      // Clear any existing timer
      if (newDivisionActionTimer) {
        clearTimeout(newDivisionActionTimer);
      }
      
      // Set new timer to hide actions after 30 seconds
      const timer = setTimeout(() => {
        setShowDivisionActions(false);
        setNewlyCreatedDivisionId(null);
        setNewDivisionActionTimer(null);
      }, 30000);
      
      setNewDivisionActionTimer(timer);
      
      // Start auto-hide timer for inactivity
      startDivisionAutoHideTimer();
      
      toast({
        title: "Division created",
        description: "New construction division has been created successfully.",
      });
      setShowCreateDivision(false);
      setNewDivisionName("");
      setNewDivisionColor("#3B82F6");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create division. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update division mutation
  const updateDivisionMutation = useMutation({
    mutationFn: async (divisionData: { id: number; name: string; color: string }) => {
      return await apiRequest(`/api/construction-divisions/${divisionData.id}`, "PATCH", {
        name: divisionData.name,
        color: divisionData.color
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/construction-divisions"] });
      setEditingDivisionId(null);
      setEditingDivisionName("");
      setEditingDivisionColor("");
      toast({
        title: "Division updated",
        description: "Construction division has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update division. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete division mutation
  const deleteDivisionMutation = useMutation({
    mutationFn: async (divisionId: number) => {
      return await apiRequest(`/api/construction-divisions/${divisionId}`, "DELETE");
    },
    onSuccess: (_, divisionId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/construction-divisions"] });
      
      // Remove from visible divisions if it was visible
      if (onDivisionVisibilityChange && visibleDivisions && visibleDivisions.has(divisionId)) {
        const updatedVisible = new Set(visibleDivisions);
        updatedVisible.delete(divisionId);
        onDivisionVisibilityChange(updatedVisible);
      }
      
      // Clear selection if this division was selected
      if (selectedDivision?.id === divisionId) {
        onDivisionSelect(null);
      }
      
      toast({
        title: "Division deleted",
        description: "Construction division has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting division",
        description: "Failed to delete division. Please try again.",
        variant: "destructive",
      });
    },
  });

  const [selectedDrawings, setSelectedDrawings] = useState<Set<number>>(new Set());
  const [exportMode, setExportMode] = useState(false);
  const [selectedDivisionsForExport, setSelectedDivisionsForExport] = useState<Set<number>>(new Set());
  const exportAreaRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Sidebar handleFileUpload called');
    const files = Array.from(event.target.files || []);
    console.log('Files selected in sidebar:', files.length, files.map(f => f.name));
    if (files.length > 0) {
      console.log('About to call onFileUpload prop with files');
      onFileUpload(files);
      // Keep Import/Export section open for multiple uploads
    } else {
      console.log('No files selected in sidebar');
    }
  };

  const handleFolderFileUpload = (event: React.ChangeEvent<HTMLInputElement>, folderId: string) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      console.log('Direct folder upload:', files.length, 'files to folder', folderId);
      
      // Find drawings already in this folder to determine if this is a revision
      const folderDrawings = drawings.filter(d => d.folderId?.toString() === folderId);
      const isRevision = folderDrawings.length > 0;
      
      // Call the upload function with folder pre-selected and revision flag
      onFileUpload(files, folderId, isRevision);
      
      // Reset the input
      event.target.value = '';
    }
  };

  const handleDrawingSelection = (drawing: Drawing) => {
    onDrawingSelect(drawing);
    // Auto-collapse Drawings section after selection
    setDrawingsCollapsed(true);
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const startEditing = (folder: DrawingFolder) => {
    setEditingFolderId(folder.id.toString());
    setEditingFolderName(folder.name);
  };

  const cancelEditing = () => {
    setEditingFolderId(null);
    setEditingFolderName("");
  };

  const saveRename = async (folderId: string) => {
    if (editingFolderName.trim() && editingFolderName.trim() !== "") {
      await renameFolderMutation.mutateAsync({
        folderId,
        newName: editingFolderName.trim()
      });
    } else {
      cancelEditing();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, folderId: string) => {
    if (e.key === 'Enter') {
      saveRename(folderId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // Division editing functions
  const startEditingDivision = (division: ConstructionDivision) => {
    setEditingDivisionId(division.id);
    setEditingDivisionName(division.name);
    setEditingDivisionColor(division.color);
  };

  const cancelEditingDivision = () => {
    setEditingDivisionId(null);
    setEditingDivisionName("");
    setEditingDivisionColor("");
  };

  const saveDivisionEdit = async (divisionId: number) => {
    if (editingDivisionName.trim() && editingDivisionName.trim() !== "") {
      await updateDivisionMutation.mutateAsync({
        id: divisionId,
        name: editingDivisionName.trim(),
        color: editingDivisionColor
      });
    } else {
      cancelEditingDivision();
    }
  };

  const handleDivisionKeyPress = (e: React.KeyboardEvent, divisionId: number) => {
    if (e.key === 'Enter') {
      saveDivisionEdit(divisionId);
    } else if (e.key === 'Escape') {
      cancelEditingDivision();
    }
  };

  const handleDeleteFolder = (folderId: number, folderName: string) => {
    setFolderToDelete({ id: folderId, name: folderName });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (folderToDelete) {
      await deleteFolderMutation.mutateAsync(folderToDelete.id);
      setDeleteConfirmOpen(false);
      setFolderToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setFolderToDelete(null);
  };

  const generateAndSaveCSV = async (suggestedFilename: string, dataToExport?: typeof extractedData) => {
    // Use provided data or default to all extracted data
    const dataSource = dataToExport || extractedData;
    
    // Create simple, clean CSV content
    const csvRows = [];
    
    // Add simple header row
    csvRows.push([
      'Drawing Name',
      'Page Number', 
      'Construction Division',
      'Data Type',
      'Extracted Content',
      'Date Extracted',
      'Coordinates'
    ]);
    
    // Process each division's data in a simple format
    Object.entries(dataSource).forEach(([divisionId, items]) => {
      const division = constructionDivisions.find(d => d.id === parseInt(divisionId));
      const divisionName = division ? division.name : `Division ${divisionId}`;
      
      items.forEach(item => {
        try {
          const drawingName = item.sourceLocation.split(' - ')[0] || 'Unknown Drawing';
          const pageName = item.sourceLocation.split(' - ')[1] || 'Unknown Page';
          const dateStr = item.extractedAt ? new Date(item.extractedAt).toLocaleDateString() : new Date().toLocaleDateString();
          const coordinates = item.sourceLocation.includes('coords:') ? 
            item.sourceLocation.split('coords:')[1].replace(/[()]/g, '').trim() : '';
          
          // Handle table data by creating separate rows for each table row
          if (item.data && typeof item.data === 'string' && item.data.includes('|') && item.data.includes('---')) {
            const lines = item.data.trim().split('\n');
            const headers = lines[0].split('|').map(h => h.trim()).filter(h => h);
            const dataRows = lines.slice(2).map(line => 
              line.split('|').map(cell => cell.trim()).filter(cell => cell)
            );
            
            // Add table header row
            csvRows.push([
              drawingName,
              pageName,
              divisionName,
              `${item.type} - Headers`,
              headers.join(' | '),
              dateStr,
              coordinates
            ]);
            
            // Add each data row
            dataRows.forEach((row, index) => {
              csvRows.push([
                drawingName,
                pageName,
                divisionName,
                `${item.type} - Data Row ${index + 1}`,
                row.join(' | '),
                dateStr,
                coordinates
              ]);
            });
          } else {
            // Regular text data
            const cleanText = (item.data || '')
              .replace(/\n/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            
            csvRows.push([
              drawingName,
              pageName,
              divisionName,
              item.type || 'Text',
              cleanText,
              dateStr,
              coordinates
            ]);
          }
        } catch (error) {
          console.error('Error processing item for CSV export:', error);
          csvRows.push([
            item.sourceLocation ? item.sourceLocation.split(' - ')[0] : 'Unknown Drawing',
            item.sourceLocation ? item.sourceLocation.split(' - ')[1] : 'Unknown Page',
            divisionName,
            item.type || 'Error',
            'Error processing data',
            new Date().toLocaleDateString(),
            'Error'
          ]);
        }
      });
    });
    
    // Convert to CSV string with proper formatting
    const csvContent = csvRows.map(row => 
      row.map(cell => {
        const cellStr = cell.toString().replace(/"/g, '""');
        // Ensure cells are properly quoted for CSV
        return `"${cellStr}"`;
      }).join(',')
    ).join('\n');
    
    try {
      // Check if File System Access API is supported (modern browsers)
      if ('showSaveFilePicker' in window) {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: suggestedFilename,
          types: [
            {
              description: 'CSV files',
              accept: {
                'text/csv': ['.csv'],
              },
            },
          ],
        });
        
        const writableStream = await fileHandle.createWritable();
        await writableStream.write(csvContent);
        await writableStream.close();
        
        console.log(`CSV exported successfully to selected location: ${suggestedFilename}`);
      } else {
        // Fallback to standard download for older browsers
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', suggestedFilename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`CSV exported successfully: ${suggestedFilename}`);
      }
    } catch (error: any) {
      // User cancelled the save dialog or other error
      if (error?.name !== 'AbortError') {
        console.error('Export failed:', error);
        // Fallback to standard download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', suggestedFilename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const handleExportCSV = async () => {
    if (selectedDivisionsForExport.size === 0) {
      // No divisions selected, enter export selection mode
      setExportMode(true);
      return;
    }
    
    // Filter extractedData to only include selected divisions
    const filteredData: typeof extractedData = {};
    selectedDivisionsForExport.forEach(divisionId => {
      if (extractedData[divisionId]) {
        filteredData[divisionId] = extractedData[divisionId];
      }
    });
    
    // Prepare filename 
    const totalItems = Object.values(filteredData).reduce((sum, items) => sum + items.length, 0);
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultFilename = `koncurent-drawings-extracted-data-${totalItems}-items-${timestamp}.csv`;
    
    // Generate CSV with filtered data
    await generateAndSaveCSV(defaultFilename, filteredData);
    
    // Reset export mode and selection
    setExportMode(false);
    setSelectedDivisionsForExport(new Set());
  };

  const handleDivisionSelectionForExport = (divisionId: number) => {
    const newSelection = new Set(selectedDivisionsForExport);
    if (newSelection.has(divisionId)) {
      newSelection.delete(divisionId);
    } else {
      newSelection.add(divisionId);
    }
    setSelectedDivisionsForExport(newSelection);
  };

  const handleSelectAllDivisions = () => {
    const divisionsWithData = constructionDivisions
      .filter(division => visibleDivisions?.has(division.id) && extractedData[division.id]?.length > 0)
      .map(division => division.id);
    setSelectedDivisionsForExport(new Set(divisionsWithData));
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedDivisionsForExport(new Set());
  };

  // Auto-expand Import/Export section when extract button is needed
  useEffect(() => {
    if (pendingHighlightCount > 0 && drawingsSectionCollapsed) {
      setDrawingsSectionCollapsed(false);
    }
  }, [pendingHighlightCount, drawingsSectionCollapsed]);

  // Auto-cancel export mode when clicking outside export area
  useEffect(() => {
    if (!exportMode) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (exportAreaRef.current && !exportAreaRef.current.contains(event.target as Node)) {
        handleCancelExport();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [exportMode]);

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col" ref={exportAreaRef}>
      {/* Header */}
      <div className="px-6 py-8 border-b border-gray-200">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', paddingLeft: '8px' }}>
          <div style={{ flexShrink: 0 }}>
            <img 
              src={kLogo} 
              alt="Koncurent Logo" 
              style={{ 
                width: '96px', 
                height: '96px',
                borderRadius: '8px',
                objectFit: 'contain'
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '96px' }}>
            <h1 style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#111827', 
              margin: '0 0 8px 0',
              lineHeight: '1.2'
            }}>
              Koncurent Hi-LYTE
            </h1>
            <p style={{ 
              fontSize: '16px', 
              color: '#6B7280', 
              margin: '0 0 8px 0',
              lineHeight: '1.2'
            }}>
              Data Extraction Tool
            </p>
            <AIStatusIndicator />
          </div>
        </div>
      </div>

      {/* Collapsible Import/Export Section */}
      <div className="border-b border-gray-200">
        <div className="p-4">
          <button
            onClick={() => setDrawingsSectionCollapsed(!drawingsSectionCollapsed)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-sm font-semibold text-gray-900">Import/Export</h3>
            {drawingsSectionCollapsed ? (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            ) : (
              <Minus className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </div>
        
        {!drawingsSectionCollapsed && (
          <div className="px-4 pb-4">
            {/* Import Drawings Button */}
            <div className="relative mb-3">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full flex items-center space-x-2"
                disabled={isUploading}
              >
                <Download className="h-4 w-4" />
                <span>{isUploading ? "Importing..." : "Import Drawings"}</span>
              </Button>
            </div>
            
            {/* CSV Export Button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full flex items-center space-x-2 mb-2"
              onClick={handleExportCSV}
              disabled={exportMode ? selectedDivisionsForExport.size === 0 : Object.keys(extractedData).length === 0}
            >
              <Upload className="h-4 w-4" />
              <span>
                {exportMode 
                  ? selectedDivisionsForExport.size > 0 
                    ? `Export ${selectedDivisionsForExport.size} Division${selectedDivisionsForExport.size === 1 ? '' : 's'}`
                    : "Select Divisions to Export"
                  : "Export CSV"
                }
              </span>
            </Button>

            {/* Comprehensive Extraction - Single Page (OCR + AI + NLP) */}
            {currentDrawing && onSmartExtraction && (
              <Button
                variant="default"
                size="sm"
                className="w-full flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 mb-2"
                onClick={() => onSmartExtraction && onSmartExtraction()}
                disabled={isSmartExtracting}
              >
                {isSmartExtracting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4" />
                    <span>Full Extraction (Current Page)</span>
                  </>
                )}
              </Button>
            )}

            {/* Comprehensive Extraction - All Pages (OCR + AI + NLP) */}
            {currentDrawing && currentDrawing.totalPages > 1 && onSmartExtraction && (
              <Button
                variant="outline"
                size="sm"
                className="w-full flex items-center space-x-2 border-purple-300 text-purple-700 hover:bg-purple-50 mb-2"
                onClick={() => onSmartExtraction && onSmartExtraction(-1)} // -1 indicates bulk extraction
                disabled={isSmartExtracting}
              >
                {isSmartExtracting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                    <span>Processing All Pages...</span>
                  </>
                ) : (
                  <>
                    <Bot className="h-4 w-4" />
                    <span>Full Extraction (All {currentDrawing.totalPages || 0} Pages)</span>
                  </>
                )}
              </Button>
            )}

            {/* Enhanced NLP Analysis Button */}
            {currentDrawing && setShowEnhancedNLP && (
              <Button
                variant="outline"
                size="sm"
                className="w-full flex items-center space-x-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 mb-2"
                onClick={() => setShowEnhancedNLP(!showEnhancedNLP)}
              >
                <FileText className="h-4 w-4" />
                <span>{showEnhancedNLP ? 'Hide NLP Analysis' : 'Enhanced NLP Analysis'}</span>
              </Button>
            )}

            {/* Batch Extraction Button */}
            {pendingHighlightCount > 0 && onBatchExtract && (
              <Button
                variant="default"
                size="sm"
                className="w-full flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                onClick={onBatchExtract}
                disabled={isBatchExtracting}
              >
                {isBatchExtracting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Extract All ({pendingHighlightCount})</span>
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Smart Extraction Progress */}
      {isSmartExtracting && (
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-4 w-4 animate-spin text-purple-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Smart Extraction in Progress
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                {smartExtractionProgress || "AI is analyzing the drawing and extracting construction elements..."}
              </p>
            </div>
          </div>
          <Progress value={bulkExtractionProgressPercent} className="mt-2 h-2" />
        </div>
      )}

      {/* Collapsible Drawings Section */}
      <div className="border-b border-gray-200">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-sm font-semibold text-gray-900">Drawings ({drawings.length})</h3>
              <div className="flex items-center space-x-1">
                <HelpTooltip content="Create folders to organize your drawings by project, phase, or any custom system that works for your workflow.">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setShowCreateFolder(true);
                      resetFolderAutoHideTimer();
                    }}
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </HelpTooltip>
                
                {/* Gear icon to toggle folder action visibility */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newShowState = !showFolderActions;
                    setShowFolderActions(newShowState);
                    
                    if (newShowState) {
                      // Start auto-hide timer when showing actions
                      startFolderAutoHideTimer();
                    } else {
                      // Clear auto-hide timer when hiding actions
                      if (folderAutoHideTimer) {
                        clearTimeout(folderAutoHideTimer);
                        setFolderAutoHideTimer(null);
                      }
                    }
                  }}
                  className="h-6 w-6 p-0 hover:bg-gray-100"
                  title="Toggle folder actions"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Selection Controls - inline with title */}
              {!drawingsCollapsed && drawings.length > 0 && (
                <div className="flex items-center space-x-2">
                  {selectedDrawings.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDrawings(new Set())}
                        className="h-6 px-2 text-xs text-gray-600 hover:text-gray-700"
                      >
                        Deselect All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (onDrawingDelete) {
                            selectedDrawings.forEach(id => onDrawingDelete(id));
                            setSelectedDrawings(new Set());
                          }
                        }}
                        className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete ({selectedDrawings.size})
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setDrawingsCollapsed(!drawingsCollapsed)}
              className="flex items-center"
            >
              {drawingsCollapsed ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <Minus className="h-4 w-4 text-gray-500" />
              )}
            </button>
          </div>
        </div>
        
        {!drawingsCollapsed && (
          <div className="px-4 pb-4">
            {/* Folders List */}
            {folders.length > 0 && (
              <div className="mb-2">
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {folders.map((folder) => {
                    const folderIdStr = folder.id.toString();
                    const isExpanded = expandedFolders.has(folderIdStr);
                    const isEditing = editingFolderId === folderIdStr;
                    return (
                      <div key={folder.id} className="space-y-1">
                        <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                          <button
                            onClick={() => toggleFolder(folder.id.toString())}
                            className="flex items-center hover:bg-gray-100 rounded p-1 transition-colors"
                            title={isExpanded ? 'Collapse folder' : 'Expand folder'}
                          >
                            {isExpanded ? (
                              <FolderOpen className="h-4 w-4 text-blue-500" />
                            ) : (
                              <Folder className="h-4 w-4 text-gray-500" />
                            )}
                          </button>
                          
                          {isEditing ? (
                            <input
                              type="text"
                              value={editingFolderName}
                              onChange={(e) => setEditingFolderName(e.target.value)}
                              onKeyDown={(e) => handleKeyPress(e, folder.id.toString())}
                              onBlur={() => saveRename(folder.id.toString())}
                              className="flex-1 text-sm font-medium text-gray-700 bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => toggleFolder(folder.id.toString())}
                              onDoubleClick={() => startEditing(folder)}
                              className="flex-1 text-left text-sm font-medium text-gray-700 hover:text-blue-600 cursor-pointer"
                            >
                              {folder.name}
                            </button>
                          )}
                          
                          {/* Folder action icons - only show if enabled */}
                          {showFolderActions && (
                            <div className="flex items-center space-x-1">
                              {/* Import to folder button */}
                              <div className="relative group">
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  multiple
                                  onChange={(e) => {
                                    handleFolderFileUpload(e, folder.id.toString());
                                    resetFolderAutoHideTimer();
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  disabled={isUploading}
                                />
                                <button
                                  className="flex items-center p-1"
                                  title="Import drawings to this folder"
                                  disabled={isUploading}
                                  onMouseDown={resetFolderAutoHideTimer}
                                >
                                  <Download className="h-3 w-3 text-gray-400 group-hover:text-green-600" />
                                </button>
                              </div>
                              
                              {/* Rename folder button */}
                              <button
                                onClick={() => {
                                  startEditing(folder);
                                  resetFolderAutoHideTimer();
                                }}
                                className="flex items-center hover:text-blue-600 p-1"
                                title="Rename folder"
                                onMouseDown={resetFolderAutoHideTimer}
                              >
                                <Edit3 className="h-3 w-3 text-gray-400 hover:text-blue-600" />
                              </button>
                              
                              {/* Delete folder button */}
                              <button
                                onClick={() => {
                                  handleDeleteFolder(folder.id, folder.name);
                                  resetFolderAutoHideTimer();
                                }}
                                className="flex items-center hover:text-red-600 p-1"
                                title="Delete folder"
                                onMouseDown={resetFolderAutoHideTimer}
                              >
                                <Trash2 className="h-3 w-3 text-gray-400 hover:text-red-600" />
                              </button>
                            </div>
                          )}
                        </div>
                        {isExpanded && (
                          <div className="ml-6 pl-2 border-l border-gray-200 space-y-1">
                            {(() => {
                              const folderDrawings = drawings.filter(d => d.folderId?.toString() === folder.id.toString());
                              return folderDrawings.length > 0 ? (
                                folderDrawings.map((drawing) => {
                                  const isSelected = currentDrawing?.id === drawing.id;
                                  return (
                                    <div
                                      key={drawing.id}
                                      className={`p-2 rounded-lg border transition-colors group ${
                                        isSelected 
                                          ? 'bg-blue-50 border-blue-200' 
                                          : 'border-gray-200 hover:bg-gray-50'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-2">
                                        <FileImage className={`h-3 w-3 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                                        <div 
                                          className="flex-1 min-w-0 cursor-pointer"
                                          onClick={() => handleDrawingSelection(drawing)}
                                        >
                                          <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium text-gray-900 truncate">
                                              {drawing.name}
                                            </p>
                                            <div className="flex items-center space-x-1">
                                              {onViewProfile && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onViewProfile(drawing.id);
                                                  }}
                                                  className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600"
                                                  title="View drawing profile"
                                                >
                                                  <FileText className="h-2.5 w-2.5" />
                                                </Button>
                                              )}
                                              {onDrawingDelete && (
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDrawingToDelete(drawing);
                                                    setDrawingDeleteDialogOpen(true);
                                                  }}
                                                  className="h-5 w-5 p-0 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                  title="Delete drawing"
                                                >
                                                  <Trash2 className="h-2.5 w-2.5" />
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                          <div className="flex items-center text-xs text-gray-500 space-x-2">
                                            <span>{formatFileSize(drawing.fileSize)}</span>
                                            <span>•</span>
                                            <span>{drawing.totalPages || 1} page{(drawing.totalPages || 1) > 1 ? 's' : ''}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-xs text-gray-500 italic p-1">
                                  No drawings in this folder yet
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Drawings List - Only show uncategorized drawings */}
            <div className="max-h-48 overflow-y-auto">
              {(() => {
                const uncategorizedDrawings = drawings.filter(d => !d.folderId);
                return uncategorizedDrawings.length > 0 ? (
                  <div className="space-y-2">
                    {uncategorizedDrawings.map((drawing) => {
                    const isSelected = currentDrawing?.id === drawing.id;
                    const isSelectedForDeletion = selectedDrawings.has(drawing.id);
                    
                    return (
                      <div
                        key={drawing.id}
                        className={`p-2 rounded-xl border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newSelected = new Set(selectedDrawings);
                              if (isSelectedForDeletion) {
                                newSelected.delete(drawing.id);
                              } else {
                                newSelected.add(drawing.id);
                              }
                              setSelectedDrawings(newSelected);
                            }}
                            className={`w-3 h-3 rounded border flex items-center justify-center ${
                              isSelectedForDeletion
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            {isSelectedForDeletion && <Check className="h-1.5 w-1.5" />}
                          </button>
                          
                          <FileImage className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                          
                          <div 
                            className="flex-1 min-w-0"
                            onClick={() => handleDrawingSelection(drawing)}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-gray-900 truncate">
                                {drawing.name}
                              </p>
                              {onViewProfile && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onViewProfile(drawing.id);
                                  }}
                                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                                >
                                  <FileText className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <div className="flex items-center text-xs text-gray-500 space-x-2">
                              <span>{formatFileSize(drawing.fileSize)}</span>
                              <span>•</span>
                              <span>{drawing.totalPages || 1} page{(drawing.totalPages || 1) > 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                              <Calendar className="h-3 w-3" />
                              <span>{drawing.uploadedAt ? new Date(drawing.uploadedAt).toLocaleDateString() : 'Unknown date'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">

        {/* Construction Divisions */}
        <HelpTooltip content="Select construction divisions to focus AI extraction on specific work types. Each division has industry-standard templates for organized data capture.">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <h3 className="text-sm font-semibold text-gray-900">
                  {exportMode ? "Select Divisions to Export" : "Construction Divisions"}
                </h3>
                {onManageDivisions && !exportMode && (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCreateDivision(true);
                        resetDivisionAutoHideTimer();
                      }}
                      className="h-6 w-6 p-0 hover:bg-gray-100"
                      title="Add Construction Division"
                    >
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newShowState = !showDivisionActions;
                        setShowDivisionActions(newShowState);
                        
                        if (newShowState) {
                          // Start auto-hide timer when showing actions
                          startDivisionAutoHideTimer();
                        } else {
                          // Clear auto-hide timer when hiding actions
                          if (divisionAutoHideTimer) {
                            clearTimeout(divisionAutoHideTimer);
                            setDivisionAutoHideTimer(null);
                          }
                        }
                      }}
                      className="h-6 w-6 p-0 hover:bg-gray-100"
                      title="Toggle Division Actions"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              {exportMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAllDivisions}
                  className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                  title="Select All Divisions with Data"
                >
                  Select All
                </Button>
              )}
            </div>
            
            <div className="space-y-2">
            {/* Create new division form - compact like existing division bubble */}
            {showCreateDivision && (
              <div className="w-full rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 relative">
                <div className="flex items-center px-4 py-3">
                  <div className="relative" ref={colorPickerRef}>
                    <button
                      className="w-4 h-4 rounded-full flex-shrink-0 border border-white hover:ring-2 hover:ring-gray-300 transition-all cursor-pointer"
                      style={{ backgroundColor: newDivisionColor }}
                      title="Click to choose color"
                      onClick={() => setShowColorPicker(!showColorPicker)}
                    />
                    
                    {/* Color picker dropdown */}
                    {showColorPicker && (
                      <div className="absolute left-0 bg-white border border-gray-200 rounded-lg shadow-xl p-2 z-[9999]" 
                           style={{ 
                             top: 'calc(100% + 4px)',
                             minWidth: '180px'
                           }}>
                        <div style={{ 
                          display: 'grid',
                          gridTemplateColumns: 'repeat(6, 1fr)',
                          gap: '5px'
                        }}>
                          {[
                            // Row 1: Blues & Cyans
                            '#3B82F6', '#1E40AF', '#0EA5E9', '#06B6D4', '#0891B2', '#164E63',
                            // Row 2: Reds & Pinks
                            '#EF4444', '#DC2626', '#B91C1C', '#EC4899', '#F472B6', '#BE185D',
                            // Row 3: Greens 
                            '#10B981', '#059669', '#84CC16', '#65A30D', '#14B8A6', '#0F766E',
                            // Row 4: Yellows & Oranges
                            '#F59E0B', '#D97706', '#F97316', '#EA580C', '#FBBF24', '#92400E',
                            // Row 5: Purples & Indigos
                            '#8B5CF6', '#7C3AED', '#6366F1', '#4F46E5', '#6D28D9', '#581C87',
                            // Row 6: Earth tones & Grays
                            '#8B5A2B', '#A3A3A3', '#6B7280', '#374151', '#1F2937', '#0F172A'
                          ].map((color) => (
                            <button
                              key={color}
                              onClick={() => {
                                setNewDivisionColor(color);
                                setShowColorPicker(false);
                              }}
                              className={`rounded-full border-2 hover:scale-110 transition-transform ${
                                newDivisionColor === color ? 'border-gray-800 shadow-md' : 'border-gray-300'
                              }`}
                              style={{ 
                                backgroundColor: color,
                                width: '22px',
                                height: '22px',
                                minWidth: '22px',
                                minHeight: '22px'
                              }}
                              title={`Select color`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    value={newDivisionName}
                    onChange={(e) => setNewDivisionName(e.target.value)}
                    placeholder="Enter division name..."
                    className="flex-1 ml-3 text-sm font-medium bg-transparent border-none outline-none placeholder-gray-400"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newDivisionName.trim()) {
                        createDivisionMutation.mutate({
                          name: newDivisionName.trim(),
                          color: newDivisionColor
                        });
                      } else if (e.key === 'Escape') {
                        setShowCreateDivision(false);
                        setNewDivisionName("");
                        setNewDivisionColor("#3B82F6");
                        setShowColorPicker(false);
                      }
                    }}
                  />
                  
                  {/* Action buttons only */}
                  <div className="flex items-center space-x-1 ml-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newDivisionName.trim()) {
                          createDivisionMutation.mutate({
                            name: newDivisionName.trim(),
                            color: newDivisionColor
                          });
                        }
                      }}
                      disabled={!newDivisionName.trim() || createDivisionMutation.isPending}
                      className="h-6 w-6 p-0"
                      title="Create division"
                    >
                      {createDivisionMutation.isPending ? (
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCreateDivision(false);
                        setNewDivisionName("");
                        setNewDivisionColor("#3B82F6");
                        setShowColorPicker(false);
                      }}
                      className="h-6 w-6 p-0"
                      title="Cancel"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {constructionDivisions
              .filter(division => {
                // Show all divisions when action icons are visible (gear toggled on)
                if (showDivisionActions) return true;
                // Otherwise filter by visibility
                return !visibleDivisions || visibleDivisions.has(division.id);
              })
              .sort((a, b) => {
                // Put newly created division at the top
                if (newlyCreatedDivisionId === a.id) return -1;
                if (newlyCreatedDivisionId === b.id) return 1;
                
                // Sort by division code for proper ordering (handles decimals like "00.1")
                if (a.code && b.code) {
                  const aCodeNum = parseFloat(a.code);
                  const bCodeNum = parseFloat(b.code);
                  
                  if (!isNaN(aCodeNum) && !isNaN(bCodeNum)) {
                    return aCodeNum - bCodeNum;
                  }
                  
                  return a.code.localeCompare(b.code);
                }
                
                // Fallback to name comparison if no codes
                return a.name.localeCompare(b.name);
              })
              .map((division) => {
              const isSelected = selectedDivision?.id === division.id;
              const itemCount = extractedData[division.id]?.length || 0;
              const isSelectedForExport = selectedDivisionsForExport.has(division.id);
              const hasData = itemCount > 0;
              
              return (
                <div
                  key={division.id}
                  className={`w-full rounded-2xl border transition-colors ${
                    exportMode
                      ? isSelectedForExport
                        ? 'border-green-500 bg-green-50'
                        : hasData
                          ? 'border-gray-200 hover:border-green-300'
                          : 'border-gray-100 bg-gray-50'
                      : isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start">
                    {/* Main selection button */}
                    <button
                      onClick={() => {
                        if (exportMode) {
                          if (hasData) {
                            handleDivisionSelectionForExport(division.id);
                          }
                        } else {
                          onDivisionSelect(division);
                        }
                      }}
                      onDoubleClick={() => {
                        if (!exportMode) {
                          // Double click to view extracted data for this division
                          if (itemCount > 0) {
                            onDivisionSelect(division);
                            setShowDataTable(true);
                          }
                        }
                      }}
                      className={`flex-1 px-4 py-3 text-left min-h-[3.5rem] ${
                        exportMode && !hasData ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                      }`}
                      disabled={exportMode && !hasData}
                    >
                      <div className="flex items-start space-x-3">
                        {exportMode ? (
                          <div className="w-4 h-4 rounded border mt-0.5 flex-shrink-0 flex items-center justify-center bg-white">
                            {isSelectedForExport && (
                              <Check className="h-3 w-3 text-green-600" />
                            )}
                          </div>
                        ) : (
                          <div
                            className="w-4 h-4 rounded-full border border-white mt-0.5 flex-shrink-0"
                            style={{ backgroundColor: division.color }}
                          />
                        )}
                        <div className="flex-1 min-w-0 pr-4">
                          {editingDivisionId === division.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingDivisionName}
                                onChange={(e) => setEditingDivisionName(e.target.value)}
                                onKeyDown={(e) => handleDivisionKeyPress(e, division.id)}
                                onBlur={() => saveDivisionEdit(division.id)}
                                className="w-full text-xs font-medium text-gray-700 bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                autoFocus
                              />
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-3 h-3 rounded-full border border-gray-300 cursor-pointer"
                                  style={{ backgroundColor: editingDivisionColor }}
                                  onClick={() => setShowColorPicker(!showColorPicker)}
                                />
                                <span className="text-xs text-gray-500">Click color to change</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className={`text-xs font-medium leading-tight break-words ${
                                exportMode && !hasData ? 'text-gray-400' : 'text-gray-900'
                              }`}>
                                {division.name}
                              </p>
                              <p className={`text-xs mt-1 ${
                                exportMode && !hasData 
                                  ? 'text-gray-300' 
                                  : hasData 
                                    ? 'text-blue-600 font-medium' 
                                    : 'text-gray-500'
                              }`}>
                                {itemCount} items extracted
                                {exportMode && !hasData && ' (no data)'}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                    
                    {/* Action Icons - show when showDivisionActions is true or for newly created divisions */}
                    {!exportMode && (showDivisionActions || newlyCreatedDivisionId === division.id) && (
                      <div className="flex items-center self-center space-x-1">
                        {/* Visibility Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onDivisionVisibilityChange && visibleDivisions) {
                              const updatedVisible = new Set(visibleDivisions);
                              if (updatedVisible.has(division.id)) {
                                updatedVisible.delete(division.id);
                              } else {
                                updatedVisible.add(division.id);
                              }
                              onDivisionVisibilityChange(updatedVisible);
                            }
                            resetDivisionAutoHideTimer();
                          }}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title={visibleDivisions?.has(division.id) ? "Hide division" : "Show division"}
                          onMouseDown={resetDivisionAutoHideTimer}
                        >
                          {visibleDivisions?.has(division.id) ? (
                            <Eye className="h-3 w-3 text-gray-400" />
                          ) : (
                            <EyeOff className="h-3 w-3 text-gray-400" />
                          )}
                        </button>
                        
                        {/* Edit Division */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingDivision(division);
                            resetDivisionAutoHideTimer();
                          }}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Edit division"
                          onMouseDown={resetDivisionAutoHideTimer}
                        >
                          <Edit3 className="h-3 w-3 text-gray-400" />
                        </button>
                        
                        {/* Delete Division - only show for user-created divisions */}
                        {!division.isDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDivisionToDelete(division);
                              setDeleteDialogOpen(true);
                              resetDivisionAutoHideTimer();
                            }}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                            title="Delete division"
                            onMouseDown={resetDivisionAutoHideTimer}
                            disabled={deleteDivisionMutation.isPending}
                          >
                            <Trash2 className={`h-3 w-3 ${deleteDivisionMutation.isPending ? 'text-gray-400' : 'text-red-500'}`} />
                          </button>
                        )}
                      </div>
                    )}
                    
                    {/* Expand button - always show in normal mode to view template/data */}
                    {!exportMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDivisionSelect(division);
                          
                          // Always open data table and auto-scroll to bottom
                          setShowDataTable(true);
                          
                          // Auto-scroll to bottom after DOM update, using requestAnimationFrame for smoothness
                          requestAnimationFrame(() => {
                            setTimeout(() => {
                              const targetPosition = document.documentElement.scrollHeight - window.innerHeight;
                              window.scrollTo({
                                top: Math.max(0, targetPosition),
                                behavior: 'smooth'
                              });
                            }, 150);
                          });
                        }}
                        className="p-2 hover:bg-gray-100 rounded-r-2xl transition-colors"
                        title={itemCount > 0 ? "View extracted data" : "View template"}
                      >
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </HelpTooltip>
      </div>

      {/* Bottom Action Panel */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {/* AI Training button removed - learning happens automatically in background */}
      </div>

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreateFolder={async (folderName: string) => {
          await createFolderMutation.mutateAsync(folderName);
        }}
      />

      {/* Delete Folder Confirmation Modal */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Folder
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete "{folderToDelete?.name}"? All drawings in this folder will be moved to uncategorized. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteFolderMutation.isPending}
            >
              {deleteFolderMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Folder'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Division Confirmation Modal */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Division
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete "{divisionToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setDivisionToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (divisionToDelete) {
                  deleteDivisionMutation.mutate(divisionToDelete.id);
                  setDeleteDialogOpen(false);
                  setDivisionToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteDivisionMutation.isPending}
            >
              {deleteDivisionMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Division'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Drawing Confirmation Modal */}
      <AlertDialog open={drawingDeleteDialogOpen} onOpenChange={setDrawingDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Drawing
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete "{drawingToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDrawingDeleteDialogOpen(false);
              setDrawingToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (drawingToDelete && onDrawingDelete) {
                  onDrawingDelete(drawingToDelete.id);
                  setDrawingDeleteDialogOpen(false);
                  setDrawingToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Drawing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}