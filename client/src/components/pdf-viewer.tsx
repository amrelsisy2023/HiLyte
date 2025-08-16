import React, { useState, useRef, useEffect } from 'react';
import { Drawing, ConstructionDivision } from '@shared/schema';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X, MousePointer, Square, Loader2, Brain, Check, XCircle, CheckCircle2, RefreshCw, Grid3X3, Copy, Move, Settings, BookOpen, Search, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { AiReviewPanel } from './ai-review-panel';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SheetMetadata {
  pageNumber: number;
  sheetNumber?: string;
  sheetTitle?: string;
  displayLabel: string;
  isValid: boolean;
}

interface PDFViewerProps {
  drawing: Drawing;
  selectedDivision: ConstructionDivision | null;
  onDataExtracted: (extractedData: {
    type: string;
    sourceLocation: string;
    data: string;
  }) => void;
  onMarqueeDeleted?: (marqueeId: string) => void;
  onBatchExtractionReady?: (extractFn: () => Promise<void>, highlightCount: number, isExtracting: boolean) => void;
  onBatchProgress?: (extracted: number, total: number, currentArea: string) => void;
  navigateToPage?: number;
  triggerClearMarquees?: number;
}

// Global storage for marquee selections per drawing
const globalMarqueeStorage: Record<number, Array<{ 
  id: string;
  baseX: number; 
  baseY: number; 
  baseWidth: number; 
  baseHeight: number; 
  page: number; 
  color: string; 
  baseZoom: number; 
  divisionName: string;
  divisionId: number;
  extractedDataId?: number;
  aiGenerated?: boolean;
  pending?: boolean;
}>> = {};

// Expose to window for external access
(window as any).globalMarqueeStorage = globalMarqueeStorage;

export default function PDFViewer({
  drawing,
  selectedDivision,
  onDataExtracted,
  onMarqueeDeleted,
  onBatchExtractionReady,
  onBatchProgress,
  navigateToPage,
  triggerClearMarquees,
}: PDFViewerProps) {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  
  // Handle external navigation to specific page
  useEffect(() => {
    console.log('PDFViewer navigateToPage effect:', { navigateToPage, currentPage });
    if (navigateToPage && navigateToPage !== currentPage && navigateToPage > 0) {
      console.log('PDFViewer setting page to:', navigateToPage);
      setCurrentPage(navigateToPage);
    }
  }, [navigateToPage, currentPage]);
  
  // Fetch sheet metadata for dynamic thumbnail labels
  const { data: sheetMetadata = [], refetch: refetchMetadata } = useQuery<SheetMetadata[]>({
    queryKey: ['drawings', drawing.id, 'metadata'],
    queryFn: async () => {
      const response = await fetch(`/api/drawings/${drawing.id}/metadata`);
      if (!response.ok) return [];
      return response.json();
    },
    staleTime: 1 * 1000, // Cache for 1 second (very short for immediate updates)
    refetchInterval: 2 * 1000, // Refetch every 2 seconds to catch AI updates
  });
  const [zoom, setZoom] = useState(0.35); // Start zoomed out to account for higher resolution images
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [marqueeStartPoint, setMarqueeStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredSelection, setHoveredSelection] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTool, setActiveTool] = useState<'cursor' | 'marquee'>('cursor');
  const [pendingHighlights, setPendingHighlights] = useState<Array<{
    id: string;
    baseX: number; 
    baseY: number; 
    baseWidth: number; 
    baseHeight: number; 
    page: number; 
    color: string; 
    baseZoom: number; 
    divisionName: string;
    divisionId: number;
  }>>([]);
  const [batchExtracting, setBatchExtracting] = useState(false);
  const [scrollContainer, setScrollContainer] = useState<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{page: number, matches: number, text?: string}>>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [imageSize, setImageSize] = useState({ width: 2400, height: 1600 });
  const [currentPageText, setCurrentPageText] = useState<string>('');
  
  // Pan/drag state
  const [isDragging, setIsDragging] = useState(false);
  
  // OCR extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });
  
  // AI Auto-analyze state
  const [isAutoAnalyzing, setIsAutoAnalyzing] = useState(false);
  const aiAnalyzeCancelledRef = useRef(false);
  const [aiAnalyzeProgress, setAiAnalyzeProgress] = useState({ currentPage: 0, totalPages: 0 });
  const [aiHighlightedAreas, setAiHighlightedAreas] = useState<Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'data' | 'header' | 'critical';
    description: string;
    suggestedDivision?: {
      id: number;
      name: string;
      code: string;
      color: string;
      confidence: number;
    };
  }>>([]);
  const [pendingAiAreas, setPendingAiAreas] = useState<any[]>([]);
  const [showAiReviewPanel, setShowAiReviewPanel] = useState(false);
  
  // AI Review Panel handlers
  const handleApproveArea = (areaId: string) => {
    const area = pendingAiAreas.find(a => a.id === areaId);
    if (!area) return;
    
    // Convert pending area to permanent marquee
    if (!globalMarqueeStorage[drawing.id]) {
      globalMarqueeStorage[drawing.id] = [];
    }
    
    // Update the area to approved state (remove pending flag)
    const marqueeIndex = globalMarqueeStorage[drawing.id].findIndex(m => m.id === areaId);
    if (marqueeIndex !== -1) {
      globalMarqueeStorage[drawing.id][marqueeIndex].pending = false;
    }
    
    // Remove from pending areas
    setPendingAiAreas(prev => prev.filter(a => a.id !== areaId));
    setForceUpdate(prev => prev + 1);
  };

  const handleRejectArea = (areaId: string) => {
    // Remove from both pending areas and marquee storage
    setPendingAiAreas(prev => prev.filter(a => a.id !== areaId));
    globalMarqueeStorage[drawing.id] = globalMarqueeStorage[drawing.id].filter(m => m.id !== areaId);
    setForceUpdate(prev => prev + 1);
  };

  const handleApproveAll = () => {
    // Approve all pending areas
    if (globalMarqueeStorage[drawing.id]) {
      globalMarqueeStorage[drawing.id].forEach(marquee => {
        if (marquee.pending) {
          marquee.pending = false;
        }
      });
    }
    setPendingAiAreas([]);
    setShowAiReviewPanel(false);
    setForceUpdate(prev => prev + 1);
  };

  const handleRejectAll = () => {
    // Remove all pending areas
    const pendingIds = pendingAiAreas.map(a => a.id);
    globalMarqueeStorage[drawing.id] = globalMarqueeStorage[drawing.id].filter(m => !pendingIds.includes(m.id));
    setPendingAiAreas([]);
    setShowAiReviewPanel(false);
    setForceUpdate(prev => prev + 1);
  };
  
  // Enhanced marquee refinement state
  const [editingMarquee, setEditingMarquee] = useState<string | null>(null);
  const [marqueeMode, setMarqueeMode] = useState<'auto' | 'manual' | 'refine'>('auto');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [snapToEdges, setSnapToEdges] = useState(true);
  const [showMarqueeTools, setShowMarqueeTools] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  // Function to create section navigation from sheet metadata
  const createSectionNavigation = () => {
    if (!sheetMetadata || sheetMetadata.length === 0) return [];
    
    // Map section prefixes to descriptive names
    const sectionMap: Record<string, string> = {
      'G': 'General',
      'D': 'Demolition', 
      'A': 'Architectural',
      'E': 'Electrical',
      'ED': 'Electrical Demo',
      'M': 'Mechanical',
      'MD': 'Mechanical Demo',
      'P': 'Plumbing',
      'PD': 'Plumbing Demo',
      'FP': 'Fire Protection',
      'S': 'Structural',
      'C': 'Civil',
      'L': 'Landscape'
    };
    
    const sections: Array<{ 
      name: string; 
      pageNumber: number; 
      sheetNumber: string;
      prefix: string;
    }> = [];
    
    // Find first page of each section
    const seenPrefixes = new Set<string>();
    
    sheetMetadata.forEach(sheet => {
      if (sheet.sheetNumber) {
        // Extract prefix (handle multi-character prefixes like 'ED', 'MD', 'PD')
        let prefix = '';
        if (sheet.sheetNumber.startsWith('ED-')) prefix = 'ED';
        else if (sheet.sheetNumber.startsWith('MD-')) prefix = 'MD';
        else if (sheet.sheetNumber.startsWith('PD-')) prefix = 'PD';
        else if (sheet.sheetNumber.startsWith('FP-')) prefix = 'FP';
        else prefix = sheet.sheetNumber.charAt(0);
        
        if (!seenPrefixes.has(prefix) && sectionMap[prefix]) {
          seenPrefixes.add(prefix);
          sections.push({
            name: sectionMap[prefix],
            pageNumber: sheet.pageNumber,
            sheetNumber: sheet.sheetNumber,
            prefix
          });
        }
      }
    });
    
    // Sort sections by their first appearance in the document
    return sections.sort((a, b) => a.pageNumber - b.pageNumber);
  };

  const sectionNavigation = createSectionNavigation();
  
  // Handle escape key to cancel marquee selection
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && marqueeStartPoint) {
        setMarqueeStartPoint(null);
        setIsSelecting(false);
        setMousePosition(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [marqueeStartPoint]);

  // Listen for external marquee storage updates and trigger re-render
  React.useEffect(() => {
    const handleMarqueeStorageUpdate = () => {
      console.log('Marquee storage updated externally, triggering re-render');
      setForceUpdate(prev => prev + 1);
    };

    window.addEventListener('marqueeStorageUpdated', handleMarqueeStorageUpdate);
    return () => window.removeEventListener('marqueeStorageUpdated', handleMarqueeStorageUpdate);
  }, []);

  // Auto-switch to marquee tool when a division is selected (but allow manual override)
  React.useEffect(() => {
    if (selectedDivision && activeTool === 'cursor') {
      setActiveTool('marquee');
    }
    // Don't auto-switch back to cursor when division is deselected
    // Allow user to manually control tool selection
  }, [selectedDivision]);

  // Load image dimensions when page changes
  React.useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height });
    };
    img.src = `/api/drawings/${drawing.id}/file?page=${currentPage}`;
  }, [drawing.id, currentPage]);

  // Handle clearing marquees when data is deleted
  React.useEffect(() => {
    if (triggerClearMarquees && triggerClearMarquees > 0 && drawing) {
      console.log('Clearing all marquee selections for drawing:', drawing.id);
      // Clear marquee storage for this drawing
      globalMarqueeStorage[drawing.id] = [];
      // Trigger redraw
      setForceUpdate(prev => prev + 1);
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('marqueeStorageUpdated'));
    }
  }, [triggerClearMarquees, drawing]);
  
  // Initialize marquees from extracted data if not already present
  React.useEffect(() => {
    if (!isInitialized && drawing) {
      // Fetch extracted data to restore marquees
      fetch(`/api/extracted-data?drawingId=${drawing.id}`)
        .then(response => response.json())
        .then((extractedDataItems) => {
          // Only restore marquees if none exist for this drawing
          if (!globalMarqueeStorage[drawing.id] || globalMarqueeStorage[drawing.id].length === 0) {
            globalMarqueeStorage[drawing.id] = [];
            
            // Create marquees for extracted data that has marquee-style sourceLocation
            extractedDataItems.forEach((item: any) => {
              if (item.sourceLocation && (item.sourceLocation.startsWith('marquee-') || item.sourceLocation.startsWith('highlight-'))) {
                try {
                  // Parse embedded marquee data from the data field
                  const dataString = item.data || '';
                  const marqueeDataMatch = dataString.match(/\|\|MARQUEE_DATA:(.+)$/);
                  
                  if (marqueeDataMatch) {
                    const marqueeData = JSON.parse(marqueeDataMatch[1]);
                    const marquee = {
                      id: item.sourceLocation,
                      baseX: marqueeData.baseX,
                      baseY: marqueeData.baseY,
                      baseWidth: marqueeData.baseWidth,
                      baseHeight: marqueeData.baseHeight,
                      page: marqueeData.page,
                      color: marqueeData.color,
                      baseZoom: 1,
                      divisionName: marqueeData.divisionName,
                      divisionId: marqueeData.divisionId,
                      aiGenerated: false // These are manual marquees from extracted data
                    };
                    globalMarqueeStorage[drawing.id].push(marquee);
                  }
                } catch (error) {
                  console.error('Failed to parse marquee data:', error);
                }
              }
            });
          }
          setIsInitialized(true);
          setForceUpdate(prev => prev + 1);
        })
        .catch(() => {
          setIsInitialized(true);
        });
    }
  }, [drawing, isInitialized]);
  
  // Get completed selections for current drawing
  const completedSelections = globalMarqueeStorage[drawing.id] || [];

  // AI Review functions
  const approveAiArea = async (pendingArea: any) => {
    try {
      // Create extracted data entry
      onDataExtracted({
        type: pendingArea.suggestedDivision?.name || 'AI Detected',
        sourceLocation: pendingArea.id,
        data: `${pendingArea.area.description}||MARQUEE_DATA:${JSON.stringify({
          baseX: pendingArea.scaledCoords.x,
          baseY: pendingArea.scaledCoords.y,
          baseWidth: pendingArea.scaledCoords.width,
          baseHeight: pendingArea.scaledCoords.height,
          page: currentPage,
          color: pendingArea.suggestedDivision?.color || '#3b82f6',
          divisionName: pendingArea.suggestedDivision?.name || 'AI Detected',
          divisionId: pendingArea.suggestedDivision?.id || 0,
          aiGenerated: true
        })}`
      });

      // Mark marquee as approved (remove pending status)
      const marquee = globalMarqueeStorage[drawing.id].find(m => m.id === pendingArea.id);
      if (marquee) {
        (marquee as any).pending = false;
      }

      // Remove from pending list
      setPendingAiAreas(prev => prev.filter(area => area.id !== pendingArea.id));
      
      // Send training example for AI learning (approved detection)
      try {
        await fetch('/api/ai/training/add-example', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            drawingId: drawing.id,
            page: currentPage,
            region: {
              x: Math.round(pendingArea.scaledCoords.x),
              y: Math.round(pendingArea.scaledCoords.y),
              width: Math.round(pendingArea.scaledCoords.width),
              height: Math.round(pendingArea.scaledCoords.height)
            },
            extractedText: pendingArea.area.description,
            divisionId: pendingArea.suggestedDivision?.id || 0,
            divisionName: pendingArea.suggestedDivision?.name || 'AI Detected',
            isManualSelection: false, // This is an approved AI detection
            wasApproved: true
          })
        });
        console.log('AI approval training example sent');
      } catch (trainingError) {
        console.error('Failed to send AI approval training example:', trainingError);
      }
      
      toast({
        title: "Area Approved",
        description: `${pendingArea.suggestedDivision?.name || 'AI Detection'} has been added to extracted data`,
      });
    } catch (error) {
      console.error('Failed to approve AI area:', error);
      toast({
        title: "Approval Failed",
        description: "Failed to approve detection. Please try again.",
        variant: "destructive",
      });
    }
  };

  const rejectAiArea = async (pendingArea: any) => {
    // Remove marquee from global storage
    globalMarqueeStorage[drawing.id] = globalMarqueeStorage[drawing.id].filter(m => m.id !== pendingArea.id);
    
    // Remove from pending list
    setPendingAiAreas(prev => prev.filter(area => area.id !== pendingArea.id));
    
    // Send training example for AI learning (rejected detection)
    try {
      await fetch('/api/ai/training/add-example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawingId: drawing.id,
          page: currentPage,
          region: {
            x: Math.round(pendingArea.scaledCoords.x),
            y: Math.round(pendingArea.scaledCoords.y),
            width: Math.round(pendingArea.scaledCoords.width),
            height: Math.round(pendingArea.scaledCoords.height)
          },
          extractedText: pendingArea.area.description,
          divisionId: pendingArea.suggestedDivision?.id || 0,
          divisionName: pendingArea.suggestedDivision?.name || 'AI Detected',
          isManualSelection: false, // This is a rejected AI detection
          wasApproved: false
        })
      });
      console.log('AI rejection training example sent');
    } catch (trainingError) {
      console.error('Failed to send AI rejection training example:', trainingError);
    }
    
    setForceUpdate(prev => prev + 1);
    
    toast({
      title: "Area Rejected",
      description: `${pendingArea.suggestedDivision?.name || 'AI Detection'} has been removed`,
    });
  };

  const approveAllAreas = async () => {
    for (const area of pendingAiAreas) {
      await approveAiArea(area);
    }
    setShowAiReviewPanel(false);
  };

  const rejectAllAreas = () => {
    for (const area of pendingAiAreas) {
      rejectAiArea(area);
    }
    setShowAiReviewPanel(false);
  };

  // Auto-close review panel when no pending areas remain
  React.useEffect(() => {
    if (pendingAiAreas.length === 0 && showAiReviewPanel) {
      setShowAiReviewPanel(false);
    }
  }, [pendingAiAreas.length, showAiReviewPanel]);

  // Enhanced marquee refinement functions
  const refineMarqueeEdges = async (marqueeId: string) => {
    const marquee = globalMarqueeStorage[drawing.id]?.find(m => m.id === marqueeId);
    if (!marquee) return;

    setEditingMarquee(marqueeId);
    setMarqueeMode('refine');
    
    // Send region to AI for precise edge detection
    try {
      const response = await fetch('/api/ai/refine-edges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawingId: drawing.id,
          page: currentPage,
          region: {
            x: marquee.baseX,
            y: marquee.baseY,
            width: marquee.baseWidth,
            height: marquee.baseHeight
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.refinedRegion) {
          // Update marquee with refined coordinates
          marquee.baseX = result.refinedRegion.x;
          marquee.baseY = result.refinedRegion.y;
          marquee.baseWidth = result.refinedRegion.width;
          marquee.baseHeight = result.refinedRegion.height;
          setForceUpdate(prev => prev + 1);
          
          toast({
            title: "Marquee Refined",
            description: "AI has improved the selection boundaries",
          });
        }
      }
    } catch (error) {
      console.error('Edge refinement failed:', error);
    }
    
    setEditingMarquee(null);
    setMarqueeMode('auto');
  };

  const snapMarqueeToGrid = (marqueeId: string) => {
    const marquee = globalMarqueeStorage[drawing.id]?.find(m => m.id === marqueeId);
    if (!marquee) return;

    const gridSize = 10; // 10px grid
    marquee.baseX = Math.round(marquee.baseX / gridSize) * gridSize;
    marquee.baseY = Math.round(marquee.baseY / gridSize) * gridSize;
    marquee.baseWidth = Math.round(marquee.baseWidth / gridSize) * gridSize;
    marquee.baseHeight = Math.round(marquee.baseHeight / gridSize) * gridSize;
    
    setForceUpdate(prev => prev + 1);
  };

  const duplicateMarquee = (marqueeId: string) => {
    const marquee = globalMarqueeStorage[drawing.id]?.find(m => m.id === marqueeId);
    if (!marquee) return;

    const newMarquee = {
      ...marquee,
      id: `manual-${Date.now()}`,
      baseX: marquee.baseX + 20,
      baseY: marquee.baseY + 20,
      aiGenerated: false
    };

    globalMarqueeStorage[drawing.id].push(newMarquee);
    setForceUpdate(prev => prev + 1);
  };

  // Batch extraction function
  const processBatchExtraction = async () => {
    if (pendingHighlights.length === 0) {
      toast({
        title: "No Highlights",
        description: "Please create some highlights first before extracting.",
        variant: "destructive",
      });
      return;
    }

    setBatchExtracting(true);
    
    try {
      let processedCount = 0;
      const totalHighlights = pendingHighlights.length;
      
      toast({
        title: "Batch Extraction Started",
        description: `Processing ${totalHighlights} highlighted areas...`,
      });

      // Process each highlight
      for (const highlight of pendingHighlights) {
        try {
          // Call OCR API for each highlight
          const response = await fetch(`/api/drawings/${drawing.id}/ocr`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              page: highlight.page,
              region: {
                x: Math.round(highlight.baseX),
                y: Math.round(highlight.baseY),
                width: Math.round(highlight.baseWidth),
                height: Math.round(highlight.baseHeight)
              }
            }),
          });

          if (response.ok) {
            const ocrResult = await response.json();
            
            // Create extracted data entry
            onDataExtracted({
              type: highlight.divisionName,
              sourceLocation: highlight.id,
              data: `${ocrResult.text}||MARQUEE_DATA:${JSON.stringify({
                baseX: highlight.baseX,
                baseY: highlight.baseY,
                baseWidth: highlight.baseWidth,
                baseHeight: highlight.baseHeight,
                page: highlight.page,
                color: highlight.color,
                divisionName: highlight.divisionName,
                divisionId: highlight.divisionId
              })}`
            });

            // Send training example to AI
            try {
              await fetch('/api/ai/training/add-example', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  drawingId: drawing.id,
                  page: highlight.page,
                  region: {
                    x: Math.round(highlight.baseX),
                    y: Math.round(highlight.baseY),
                    width: Math.round(highlight.baseWidth),
                    height: Math.round(highlight.baseHeight)
                  },
                  extractedText: ocrResult.text,
                  divisionId: highlight.divisionId,
                  divisionName: highlight.divisionName,
                  isManualSelection: true
                })
              });
            } catch (trainingError) {
              console.error('Failed to send training example:', trainingError);
            }
          } else {
            // Handle extraction error - still create entry with error message
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            onDataExtracted({
              type: highlight.divisionName,
              sourceLocation: highlight.id,
              data: `Text extraction failed: ${errorData.message}||MARQUEE_DATA:${JSON.stringify({
                baseX: highlight.baseX,
                baseY: highlight.baseY,
                baseWidth: highlight.baseWidth,
                baseHeight: highlight.baseHeight,
                page: highlight.page,
                color: highlight.color,
                divisionName: highlight.divisionName,
                divisionId: highlight.divisionId
              })}`
            });
          }
          
          processedCount++;
          
          // Update progress
          if (onBatchProgress) {
            onBatchProgress(processedCount, totalHighlights, `Area ${processedCount} of ${totalHighlights}`);
          }
        } catch (error) {
          console.error(`Failed to process highlight ${highlight.id}:`, error);
          // Create fallback entry
          onDataExtracted({
            type: highlight.divisionName,
            sourceLocation: highlight.id,
            data: `OCR processing unavailable||MARQUEE_DATA:${JSON.stringify({
              baseX: highlight.baseX,
              baseY: highlight.baseY,
              baseWidth: highlight.baseWidth,
              baseHeight: highlight.baseHeight,
              page: highlight.page,
              color: highlight.color,
              divisionName: highlight.divisionName,
              divisionId: highlight.divisionId
            })}`
          });
          processedCount++;
          
          // Update progress
          if (onBatchProgress) {
            onBatchProgress(processedCount, totalHighlights, `Area ${processedCount} of ${totalHighlights}`);
          }
        }
      }

      // Convert pending highlights to permanent marquees in storage
      if (!globalMarqueeStorage[drawing.id]) {
        globalMarqueeStorage[drawing.id] = [];
      }
      
      // Add extracted highlights as permanent marquees
      pendingHighlights.forEach(highlight => {
        const permanentMarquee = {
          id: highlight.id,
          baseX: highlight.baseX,
          baseY: highlight.baseY,
          baseWidth: highlight.baseWidth,
          baseHeight: highlight.baseHeight,
          page: highlight.page,
          color: highlight.color,
          baseZoom: highlight.baseZoom,
          divisionName: highlight.divisionName,
          divisionId: highlight.divisionId,
          aiGenerated: false,
          pending: false
        };
        
        // Only add if not already in storage
        const exists = globalMarqueeStorage[drawing.id].some(m => m.id === highlight.id);
        if (!exists) {
          globalMarqueeStorage[drawing.id].push(permanentMarquee);
        }
      });
      
      // Clear pending highlights since they're now permanent
      setPendingHighlights([]);
      
      // Force re-render to show the permanent marquees
      setForceUpdate(prev => prev + 1);
      
      toast({
        title: "Batch Extraction Complete",
        description: `Successfully processed ${processedCount} of ${totalHighlights} highlights.`,
      });

    } catch (error) {
      console.error('Batch extraction failed:', error);
      toast({
        title: "Batch Extraction Failed",
        description: "An error occurred during batch processing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBatchExtracting(false);
    }
  };

  // Communicate batch extraction state to parent
  useEffect(() => {
    if (onBatchExtractionReady) {
      onBatchExtractionReady(processBatchExtraction, pendingHighlights.length, batchExtracting);
    }
  }, [pendingHighlights.length, batchExtracting, onBatchExtractionReady]);

  const totalPages = drawing.totalPages || 1;

  // Handle search functionality with debouncing
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      setCurrentPageText('');
      return;
    }

    setIsSearching(true);
    try {
      console.log(`Starting hybrid AI+OCR search for: "${query.trim()}"`);
      
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minute timeout
      
      const response = await fetch(`/api/drawings/${drawing.id}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const results = await response.json();
        console.log('Search results received:', results);
        console.log('Search results count:', results.length);
        
        if (results.length > 0) {
          setSearchResults(results);
          setCurrentSearchIndex(0);
          
          // Jump to first result and set page text for highlighting
          console.log('Jumping to first result on page:', results[0].page);
          handlePageChange(results[0].page);
          setCurrentPageText(results[0].text || '');
          
          toast({
            title: "Search Complete",
            description: `Found ${results.length} pages with matches. AI confidence: ${Math.round(results[0].aiConfidence * 100)}%`,
          });
        } else {
          console.log('No search results found for query:', query.trim());
          setSearchResults([]);
          setCurrentSearchIndex(0);
          setCurrentPageText('');
          
          toast({
            title: "No Results",
            description: "No matches found for your search term.",
            variant: "destructive",
          });
        }
      } else {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Search failed:', error);
      
      if (error.name === 'AbortError') {
        toast({
          title: "Search Timeout",
          description: "Search took too long and was cancelled. Try searching for more specific terms.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Search Failed",
          description: "Could not search the drawing set. Please try again.",
          variant: "destructive",
        });
      }
      
      setSearchResults([]);
      setCurrentSearchIndex(0);
      setCurrentPageText('');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search function
  const debouncedSearch = (query: string) => {
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout
    const newTimeout = setTimeout(() => {
      handleSearch(query);
    }, 500); // Wait 500ms after user stops typing

    setSearchTimeout(newTimeout);
  };

  // Jump to next/previous search result
  const jumpToSearchResult = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % searchResults.length;
    } else {
      newIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    }
    
    setCurrentSearchIndex(newIndex);
    const targetResult = searchResults[newIndex];
    handlePageChange(targetResult.page);
    setCurrentPageText(targetResult.text || '');
  };

  // Cancel AI Auto-analyze
  const handleCancelAutoAnalyze = () => {
    aiAnalyzeCancelledRef.current = true;
    setIsAutoAnalyzing(false);
    setAiAnalyzeProgress({ currentPage: 0, totalPages: 0 });
    
    // Clear any AI-generated pending areas
    if (globalMarqueeStorage[drawing.id]) {
      globalMarqueeStorage[drawing.id] = globalMarqueeStorage[drawing.id].filter(m => !m.aiGenerated && !m.pending && !m.id.startsWith('ai-'));
    }
    setPendingAiAreas([]);
    setForceUpdate(prev => prev + 1);
    
    toast({
      title: "AI Auto-Analysis Cancelled",
      description: "Analysis stopped and AI-generated areas cleared.",
    });
  };

  // AI Auto-analyze handler - simplified to only analyze current page for testing
  const handleAutoAnalyze = async () => {
    setIsAutoAnalyzing(true);
    aiAnalyzeCancelledRef.current = false;
    
    try {
      // Clear existing AI-generated marquees for this page
      if (!globalMarqueeStorage[drawing.id]) {
        globalMarqueeStorage[drawing.id] = [];
      }
      globalMarqueeStorage[drawing.id] = globalMarqueeStorage[drawing.id].filter(m => 
        !(m.aiGenerated || m.pending || m.id.startsWith('ai-')) || m.page !== currentPage
      );
      
      let totalAreasFound = 0;
      const allPendingAreas: any[] = [];
      
      // Initialize progress for single page
      setAiAnalyzeProgress({ currentPage: 1, totalPages: 1 });
      
      // Process only the current page
      const page = currentPage;
      
      try {
        const response = await fetch(`/api/ai/auto-analyze/${drawing.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to analyze page ${page}`);
        }
        
        const result = await response.json();
        
        if (result.highlightedAreas && result.highlightedAreas.length > 0) {
          // Process areas for this page
          const pageAreas = result.highlightedAreas.map((area: any, index: number) => {
            const suggestedDivision = area.suggestedDivision;
            const marqueeId = `ai-${page}-${Date.now()}-${index}`;
            
            // COORDINATE SYSTEM FIX:
            // Our imageSize state is set to 2400x1600 which matches the AI image dimensions exactly
            // The AI coordinates should already be in the correct coordinate system relative to imageSize
            // The marquees are positioned using baseX * zoom, baseY * zoom, etc.
            // So we just need to use the AI coordinates directly as base coordinates
            
            const scaledX = area.x;
            const scaledY = area.y;
            const scaledWidth = area.width;
            const scaledHeight = area.height;
            
            // TEMP: Debug coordinate transformation in detail
            console.log('=== AI MARQUEE DEBUG ===');
            console.log('AI returned coordinates:', { x: area.x, y: area.y, width: area.width, height: area.height });
            console.log('Current imageSize state:', imageSize);
            console.log('Current zoom:', zoom);
            console.log('Final display coordinates:', {
              left: scaledX * zoom,
              top: scaledY * zoom,
              width: scaledWidth * zoom,
              height: scaledHeight * zoom
            });
            console.log('Expected on 2400x1600 image at 35% zoom should be:', {
              left: area.x * 0.35,
              top: area.y * 0.35,
              width: area.width * 0.35,
              height: area.height * 0.35
            });
            console.log('========================');
            
            // Create preview marquee
            const marquee = {
              id: marqueeId,
              baseX: scaledX,
              baseY: scaledY,
              baseWidth: scaledWidth,
              baseHeight: scaledHeight,
              page: page,
              color: suggestedDivision?.color || '#3b82f6',
              baseZoom: 1,
              divisionName: suggestedDivision?.name || 'AI Detected',
              divisionId: suggestedDivision?.id || 0,
              aiGenerated: true,
              pending: true
            };
            
            globalMarqueeStorage[drawing.id].push(marquee);
            
            // Visual feedback: briefly highlight areas on current page
            setAiHighlightedAreas(prev => [...prev, {
              x: area.x,
              y: area.y,
              width: area.width,
              height: area.height,
              type: area.type || 'data',
              description: area.description || '',
              suggestedDivision: area.suggestedDivision
            }]);
            
            return {
              id: marqueeId,
              area,
              suggestedDivision,
              page,
              scaledCoords: { x: scaledX, y: scaledY, width: scaledWidth, height: scaledHeight }
            };
          });
          
          allPendingAreas.push(...pageAreas);
          totalAreasFound += result.highlightedAreas.length;
        }
        
        // Brief delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (pageError) {
        console.error(`Error analyzing page ${page}:`, pageError);
      }
      
      // Update UI with all pending areas (only if not cancelled)
      if (!aiAnalyzeCancelledRef.current) {
        setPendingAiAreas(allPendingAreas);
        if (allPendingAreas.length > 0) {
          setShowAiReviewPanel(true);
        }
        
        setForceUpdate(prev => prev + 1);
        
        console.log('AI Auto-Analyze completed for current page:', {
          page: currentPage,
          totalAreasFound,
          marqueeCount: globalMarqueeStorage[drawing.id].length
        });
        
        toast({
          title: "AI Auto-Analysis Complete",
          description: `Analyzed page ${currentPage} and found ${totalAreasFound} potential data areas. Review and approve areas for extraction.`,
        });
      }
      
    } catch (error) {
      console.error('Auto-analyze failed:', error);
      toast({
        title: 'Auto-Analysis Failed',
        description: 'Failed to analyze drawing. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAutoAnalyzing(false);
      setAiAnalyzeProgress({ currentPage: 0, totalPages: 0 });
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setSelection(null); // Clear current selection when changing pages
      setIsSelecting(false);
    }
  };

  const handleZoomChange = (newZoom: number) => {
    if (scrollContainer) {
      // Remember current scroll position as a percentage
      const scrollTop = scrollContainer.scrollTop;
      const scrollLeft = scrollContainer.scrollLeft;
      const scrollHeight = scrollContainer.scrollHeight;
      const scrollWidth = scrollContainer.scrollWidth;
      
      const scrollTopPercent = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
      const scrollLeftPercent = scrollWidth > 0 ? scrollLeft / scrollWidth : 0;
      
      setZoom(newZoom);
      
      // Restore scroll position after zoom change
      setTimeout(() => {
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight * scrollTopPercent;
          scrollContainer.scrollLeft = scrollContainer.scrollWidth * scrollLeftPercent;
        }
      }, 10);
    } else {
      setZoom(newZoom);
    }
  };

  // Zoom functions with 10% increments
  const zoomIn = () => {
    handleZoomChange(Math.min(4, zoom + 0.1));
  };
  
  const zoomOut = () => {
    handleZoomChange(Math.max(0.1, zoom - 0.1));
  };
  
  const resetZoom = () => {
    handleZoomChange(1);
  };

  // Add keyboard shortcuts for zoom
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            zoomIn();
            break;
          case '-':
            e.preventDefault();
            zoomOut();
            break;
          case '0':
            e.preventDefault();
            resetZoom();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom, handleZoomChange]);

  // Handle scroll events within PDF viewer area
  React.useEffect(() => {
    if (!scrollContainer) return;

    const handleWheel = (e: WheelEvent) => {
      // Only handle wheel events if they're specifically targeting the PDF viewer area
      if (!e.target || !(e.target as HTMLElement).closest('[data-pdf-scroll-container]')) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      // Handle zoom with Ctrl/Cmd key
      if (e.ctrlKey || e.metaKey) {
        if (e.deltaY < 0) {
          zoomIn();
        } else if (e.deltaY > 0) {
          zoomOut();
        }
      } else {
        // Handle regular scrolling within the PDF viewer only
        scrollContainer.scrollTop += e.deltaY;
        scrollContainer.scrollLeft += e.deltaX;
      }
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel);
    };
  }, [scrollContainer, zoom, handleZoomChange]);

  const generateThumbnails = () => {
    const thumbnails = [];
    for (let i = 1; i <= totalPages; i++) {
      thumbnails.push(
        <div
          key={i}
          className={`relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all duration-200 ${
            currentPage === i ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handlePageChange(i);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          data-thumbnail-button
        >
          <img
            src={`/api/drawings/${drawing.id}/file?page=${i}`}
            alt={`Page ${i}`}
            className="w-full h-full object-cover pointer-events-none"
            style={{ height: '80px', width: 'auto' }}
            draggable={false}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white text-[10px] text-center py-1 px-1 pointer-events-none leading-tight">
            {(() => {
              const metadata = sheetMetadata.find(m => m.pageNumber === i);
              
              // Use AI-extracted valid metadata first
              if (metadata?.isValid && metadata.displayLabel) {
                return metadata.displayLabel;
              }
              
              // Enhanced fallback logic for better page identification
              if (i === 1) return "Cover Page";
              
              // Try to use partial metadata if available
              if (metadata?.sheetTitle && metadata.sheetTitle.trim() && metadata.sheetTitle !== null) {
                return metadata.sheetTitle;
              }
              if (metadata?.sheetNumber && metadata.sheetNumber.trim() && metadata.sheetNumber !== null) {
                return metadata.sheetNumber;
              }
              
              // Final fallback
              return `Page ${i}`;
            })()}
          </div>
        </div>
      );
    }
    return thumbnails;
  };

  return (
    <div className="h-full flex rounded-2xl overflow-hidden">
      {/* Main viewer area - isolated from zoom effects */}
      <div className="flex-1 flex flex-col bg-gray-100">
        {/* Toolbar - completely isolated */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            {/* Left Side - Page Navigation */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600 min-w-[100px] text-center">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Center - Section Navigation and Search */}
            <div className="flex items-center space-x-4">
              {/* Section Navigation Dropdown - Always visible */}
              <Select
                value={(() => {
                  if (sectionNavigation.length === 0) return '';
                  const currentSection = sectionNavigation.find(section => {
                    const nextSection = sectionNavigation.find(s => s.pageNumber > section.pageNumber);
                    const endPage = nextSection ? nextSection.pageNumber - 1 : totalPages;
                    return currentPage >= section.pageNumber && currentPage <= endPage;
                  });
                  return currentSection?.prefix || '';
                })()}
                onValueChange={(prefix) => {
                  if (sectionNavigation.length === 0) return;
                  const section = sectionNavigation.find(s => s.prefix === prefix);
                  if (section) {
                    handlePageChange(section.pageNumber);
                  }
                }}
                disabled={sectionNavigation.length === 0}
              >
                <SelectTrigger className={`w-[180px] h-8 ${sectionNavigation.length === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  <div className="flex items-center space-x-1">
                    <BookOpen className="h-4 w-4" />
                    <SelectValue placeholder="Jump to..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {sectionNavigation.length > 0 ? (
                    sectionNavigation.map((section) => (
                      <SelectItem key={section.prefix} value={section.prefix}>
                        <span className="font-medium">{section.name}</span>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="disabled" disabled>
                      <span className="text-gray-400">Waiting for AI to analyze sections...</span>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              
              {/* Search Bar */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search drawings..."
                    value={searchQuery}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setSearchQuery(newValue);
                      
                      if (!newValue.trim()) {
                        setSearchResults([]);
                        setCurrentSearchIndex(0);
                        if (searchTimeout) clearTimeout(searchTimeout);
                      } else {
                        debouncedSearch(newValue);
                      }
                    }}
                    className="pl-8 w-48 h-8 text-sm"
                    disabled={isSearching}
                  />
                  {isSearching && searchResults.length === 0 && (
                    <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                  {searchResults.length > 0 && !isSearching && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-xs text-black font-bold">{searchResults.length}</span>
                    </div>
                  )}
                </div>
                {searchResults.length > 0 && (
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-yellow-600 font-medium bg-yellow-100 px-2 py-1 rounded">
                      {currentSearchIndex + 1} of {searchResults.length} pages
                    </span>
                    {searchResults[currentSearchIndex]?.aiConfidence && (
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {Math.round(searchResults[currentSearchIndex].aiConfidence * 100)}% confidence
                      </span>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => jumpToSearchResult('prev')}
                      disabled={searchResults.length <= 1}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => jumpToSearchResult('next')}
                      disabled={searchResults.length <= 1}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Side - Zoom Controls */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={zoomOut}
                disabled={zoom <= 0.1}
                title="Zoom out 10% (Ctrl+-)"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <span className="text-sm text-gray-600 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={zoomIn}
                disabled={zoom >= 4}
                title="Zoom in 10% (Ctrl++)"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Tool Selection Toolbar - completely isolated */}
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {activeTool === 'marquee' && selectedDivision && (
                <span className="text-xs text-blue-600">
                  Selected: {selectedDivision.name}
                </span>
              )}
              {isExtracting && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs font-medium">AI Processing...</span>
                </div>
              )}
            </div>
            
            {/* Tool buttons and AI Auto-Analyze */}
            <div className="flex items-center space-x-2">
              <Button
                variant={activeTool === 'cursor' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setActiveTool('cursor');
                  setIsSelecting(false);
                  setSelection(null);
                }}
                className="flex items-center space-x-1"
              >
                <MousePointer className="h-4 w-4" />
                <span>Cursor</span>
              </Button>
              <Button
                variant={activeTool === 'marquee' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTool('marquee')}
                disabled={!selectedDivision}
                className="flex items-center space-x-1"
                title={!selectedDivision ? 'Select a construction division first' : 'Marquee selection tool'}
              >
                <Square className="h-4 w-4" />
                <span>Marquee</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleAutoAnalyze}
                disabled={isAutoAnalyzing}
                className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isAutoAnalyzing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                <span>{isAutoAnalyzing ? 'Analyzing...' : 'AI Auto-Analyze'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* PDF Display Area - Completely Isolated Container */}
        <div className="flex-1 bg-gray-100 relative" ref={containerRef}>
          <div 
            ref={setScrollContainer}
            className={`absolute inset-0 overflow-auto ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            data-pdf-scroll-container
            onMouseDown={(e) => {
              // Only handle drag if we're not in marquee mode or if the marquee layer isn't active
              // Also make sure the event is targeting the scroll container itself, not thumbnails
              if ((activeTool === 'cursor' || !selectedDivision) && e.target === e.currentTarget) {
                const rect = e.currentTarget.getBoundingClientRect();
                setIsDragging(true);
                setDragStart({ x: e.clientX, y: e.clientY });
                setScrollStart({ 
                  x: e.currentTarget.scrollLeft, 
                  y: e.currentTarget.scrollTop 
                });
                e.preventDefault();
              }
            }}
            onMouseMove={(e) => {
              if (isDragging && scrollContainer) {
                const deltaX = e.clientX - dragStart.x;
                const deltaY = e.clientY - dragStart.y;
                
                scrollContainer.scrollLeft = scrollStart.x - deltaX;
                scrollContainer.scrollTop = scrollStart.y - deltaY;
              }
            }}
            onMouseUp={() => {
              setIsDragging(false);
            }}
            onMouseLeave={() => {
              setIsDragging(false);
            }}
          >
            <div 
              className="p-4 flex justify-center items-start"
              style={{ 
                minWidth: '100%',
                minHeight: '100%',
                width: `${imageSize.width * zoom + 64}px`,
                height: `${imageSize.height * zoom + 64}px`
              }}
            >
              <div 
                className="bg-white shadow-lg relative"
                style={{ 
                  width: `${imageSize.width * zoom}px`,
                  height: `${imageSize.height * zoom}px`
                }}
              >
                <img
                  src={`/api/drawings/${drawing.id}/file?page=${currentPage}`}
                  alt={`${drawing.name} - Page ${currentPage}`}
                  className="w-full h-full object-contain"
                  style={{ 
                    width: `${imageSize.width * zoom}px`,
                    height: `${imageSize.height * zoom}px`
                  }}
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    const naturalWidth = img.naturalWidth;
                    const naturalHeight = img.naturalHeight;
                    
                    // Update imageSize to match the actual image dimensions if needed
                    if (naturalWidth !== imageSize.width || naturalHeight !== imageSize.height) {
                      setImageSize({ width: naturalWidth, height: naturalHeight });
                    }
                  }}
                />
              
              {/* Always show existing marquees and pending highlights */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Pending highlights for current page */}
                {pendingHighlights
                  .filter(highlight => highlight.page === currentPage)
                  .map((highlight) => (
                    <div
                      key={highlight.id}
                      className="absolute cursor-pointer group pointer-events-auto animate-pulse"
                      style={{
                        left: highlight.baseX * zoom,
                        top: highlight.baseY * zoom,
                        width: highlight.baseWidth * zoom,
                        height: highlight.baseHeight * zoom,
                        backgroundColor: highlight.color,
                        opacity: hoveredSelection === highlight.id ? 0.35 : 0.2,
                        boxShadow: hoveredSelection === highlight.id ? `0 0 10px ${highlight.color}40` : `0 0 8px ${highlight.color}30`,
                        transition: 'all 0.2s ease-in-out',
                      }}
                      onMouseEnter={() => setHoveredSelection(highlight.id)}
                      onMouseLeave={() => setHoveredSelection(null)}
                    >
                      {/* Delete button */}
                      {hoveredSelection === highlight.id && (
                        <button
                          onClick={() => {
                            setPendingHighlights(prev => prev.filter(h => h.id !== highlight.id));
                            setHoveredSelection(null);
                          }}
                          className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm z-50 transition-all duration-200 hover:bg-red-700 hover:scale-110 shadow-lg border-2 border-white"
                          title="Remove highlight"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      
                      {/* Tooltip for pending highlight */}
                      {hoveredSelection === highlight.id && (
                        <div
                          className="absolute bg-blue-900 border-blue-700 text-white text-xs font-medium px-2 py-1.5 rounded-lg z-40 pointer-events-none shadow-xl border max-w-[160px]"
                          style={{
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '12px',
                            textAlign: 'center',
                            wordWrap: 'break-word',
                            lineHeight: '1.2',
                          }}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            <span className="break-words">{highlight.divisionName}</span>
                          </div>
                          <div className="text-[10px] text-blue-200 mt-0.5 leading-tight">
                            Pending - Ready for Extraction
                          </div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent border-t-blue-900" />
                        </div>
                      )}
                    </div>
                  ))}

                {/* Completed selections for current page */}
                {completedSelections
                  .filter(sel => sel.page === currentPage)
                  .map((sel) => (
                    <div
                      key={sel.id}
                      className={`absolute border-2 cursor-pointer group pointer-events-auto ${
                        (sel as any).aiGenerated ? 'border-dashed animate-pulse' : 'border-solid'
                      }`}
                      style={{
                        left: sel.baseX * zoom,
                        top: sel.baseY * zoom,
                        width: sel.baseWidth * zoom,
                        height: sel.baseHeight * zoom,
                        borderColor: sel.color,
                        backgroundColor: sel.color,
                        opacity: hoveredSelection === sel.id ? 0.35 : ((sel as any).aiGenerated ? 0.25 : 0.15),
                        borderWidth: hoveredSelection === sel.id ? '3px' : '2px',
                        boxShadow: hoveredSelection === sel.id ? `0 0 10px ${sel.color}40` : ((sel as any).aiGenerated ? `0 0 8px ${sel.color}30` : 'none'),
                        transition: 'all 0.2s ease-in-out',
                      }}
                      onMouseEnter={() => setHoveredSelection(sel.id)}
                      onMouseLeave={() => setHoveredSelection(null)}
                    >
                      {/* Delete button */}
                      {hoveredSelection === sel.id && (
                        <button
                          onClick={() => {
                            console.log('Deleting marquee with ID:', sel.id);
                            // Remove from global storage
                            if (globalMarqueeStorage[drawing.id]) {
                              globalMarqueeStorage[drawing.id] = globalMarqueeStorage[drawing.id].filter(m => m.id !== sel.id);
                            }
                            // Notify parent about deletion
                            if (onMarqueeDeleted) {
                              onMarqueeDeleted(sel.id);
                            }
                            setHoveredSelection(null);
                            setForceUpdate(prev => prev + 1);
                          }}
                          className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm z-50 transition-all duration-200 hover:bg-red-700 hover:scale-110 shadow-lg border-2 border-white"
                          title="Delete marquee"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      
                      {/* Enhanced Tooltip with AI indicator */}
                      {hoveredSelection === sel.id && (
                        <div
                          className={`absolute text-white text-xs font-medium px-2 py-1.5 rounded-lg z-40 pointer-events-none shadow-xl border max-w-[160px] ${
                            (sel as any).aiGenerated ? 'bg-blue-900 border-blue-700' : 'bg-gray-900 border-gray-700'
                          }`}
                          style={{
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '12px',
                            textAlign: 'center',
                            wordWrap: 'break-word',
                            lineHeight: '1.2',
                          }}
                        >
                          <div className="flex items-center justify-center space-x-1">
                            {(sel as any).aiGenerated && <Brain className="h-3 w-3 flex-shrink-0" />}
                            <span className="break-words">{sel.divisionName}</span>
                          </div>
                          {(sel as any).aiGenerated && (
                            <div className="text-[10px] text-blue-200 mt-0.5 leading-tight">
                              AI Detected - Review & Confirm
                            </div>
                          )}
                          <div
                            className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-6 border-r-6 border-t-6 border-transparent ${
                              (sel as any).aiGenerated ? 'border-t-blue-900' : 'border-t-gray-900'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {/* Marquee selection overlay - when marquee tool is active */}
              {activeTool === 'marquee' && (
                <div 
                  className="absolute inset-0 cursor-crosshair"
                  onClick={async (e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / zoom;
                    const y = (e.clientY - rect.top) / zoom;
                    
                    if (!marqueeStartPoint) {
                      // First click - start marquee selection
                      setMarqueeStartPoint({ x, y });
                      setIsSelecting(true);
                    } else {
                      // Second click - complete selection and check credits first
                      const width = x - marqueeStartPoint.x;
                      const height = y - marqueeStartPoint.y;
                      
                      if (Math.abs(width) > 10 && Math.abs(height) > 10) {
                        // Check AI credits immediately when marquee selection is completed
                        try {
                          const response = await fetch('/api/ai-credits/balance');
                          if (response.ok) {
                            const creditData = await response.json();
                            
                            // If balance is zero or very low, show the credit modal immediately
                            if (creditData.balance <= 0) {
                              setShowCreditModal(true);
                              
                              // Reset selection state and don't create highlight
                              setMarqueeStartPoint(null);
                              setIsSelecting(false);
                              setMousePosition(null);
                              return;
                            }
                          }
                        } catch (error) {
                          console.error('Failed to check credits:', error);
                        }

                        const finalSelection = {
                          x: marqueeStartPoint.x,
                          y: marqueeStartPoint.y,
                          width,
                          height
                        };
                        setSelection(finalSelection);
                        
                        // Create pending highlight (no immediate extraction)
                        const highlightId = `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        
                        const newHighlight = {
                          id: highlightId,
                          baseX: Math.min(finalSelection.x, finalSelection.x + finalSelection.width),
                          baseY: Math.min(finalSelection.y, finalSelection.y + finalSelection.height),
                          baseWidth: Math.abs(finalSelection.width),
                          baseHeight: Math.abs(finalSelection.height),
                          page: currentPage,
                          color: selectedDivision?.color || '#3b82f6',
                          baseZoom: 1,
                          divisionName: selectedDivision?.name || 'Manual Selection',
                          divisionId: selectedDivision?.id || 0,
                          aiGenerated: false // Manual marquee selection
                        };
                        
                        // Add to pending highlights instead of extracting immediately
                        setPendingHighlights(prev => [...prev, newHighlight]);
                        
                        toast({
                          title: "Area Highlighted",
                          description: `Added highlight for ${selectedDivision?.name || 'Manual Selection'}. Use "Extract All" to process all highlights.`,
                        });
                        

                      }
                      
                      // Reset marquee selection state
                      setMarqueeStartPoint(null);
                      setIsSelecting(false);
                      setSelection(null);
                      setMousePosition(null);
                    }
                    
                    e.stopPropagation(); // Prevent triggering the drag functionality
                  }}
                  onMouseMove={(e) => {
                    if (marqueeStartPoint && !batchExtracting) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const currentX = (e.clientX - rect.left) / zoom;
                      const currentY = (e.clientY - rect.top) / zoom;
                      setMousePosition({ x: currentX, y: currentY });
                    }
                    

                  }}

                >
                  {/* Live marquee preview while selecting (not during batch extraction) */}
                  {marqueeStartPoint && mousePosition && !batchExtracting && selectedDivision && (
                    <div
                      className="absolute border-2 border-dashed"
                      style={{
                        left: Math.min(marqueeStartPoint.x, mousePosition.x) * zoom,
                        top: Math.min(marqueeStartPoint.y, mousePosition.y) * zoom,
                        width: Math.abs(mousePosition.x - marqueeStartPoint.x) * zoom,
                        height: Math.abs(mousePosition.y - marqueeStartPoint.y) * zoom,
                        borderColor: selectedDivision.color,
                        backgroundColor: selectedDivision.color,
                        opacity: 0.1,
                      }}
                    />
                  )}
                  
                  {/* Start point indicator (not during batch extraction) */}
                  {marqueeStartPoint && !batchExtracting && (
                    <div
                      className="absolute w-2 h-2 bg-blue-500 rounded-full border border-white"
                      style={{
                        left: (marqueeStartPoint.x * zoom) - 4,
                        top: (marqueeStartPoint.y * zoom) - 4,
                        zIndex: 1001,
                      }}
                    />
                  )}

                  {/* OCR Extraction Progress Indicator */}
                  {/* Search results indicator */}
                  {searchQuery && searchResults.length > 0 && (
                    <div className="absolute top-4 left-4 pointer-events-none z-[900]">
                      {(() => {
                        // Find the current page's search result
                        const currentPageResult = searchResults.find(result => result.page === currentPage);
                        if (!currentPageResult) return null;
                        
                        return (
                          <div className="bg-yellow-400 text-black px-3 py-2 rounded-lg shadow-lg border-2 border-yellow-500 font-semibold animate-pulse">
                            Found {currentPageResult.matches} match{currentPageResult.matches !== 1 ? 'es' : ''} for "{searchQuery}"
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {isExtracting && extractionProgress && (
                    <div
                      className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20 flex items-center justify-center"
                      style={{
                        left: extractionProgress.x * zoom,
                        top: extractionProgress.y * zoom,
                        width: extractionProgress.width * zoom,
                        height: extractionProgress.height * zoom,
                        minHeight: '60px',
                        zIndex: 1000,
                      }}
                    >
                      <div className="bg-white rounded-lg p-3 shadow-lg flex items-center space-x-2 border">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Extracting data...</span>
                      </div>
                    </div>
                  )}

                </div>
              )}
              

              
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thumbnails sidebar - aligned with PDF viewer */}
      <div className="w-32 bg-gray-50 border-l border-gray-200 flex-shrink-0 flex flex-col" data-thumbnails-sidebar>
        <div className="p-3 flex-shrink-0">
          <h4 className="text-xs font-semibold text-gray-900 mb-3">Pages</h4>
        </div>
        <div className="flex-1 px-3 pb-3 overflow-y-auto">
          <div className="space-y-2">
            {generateThumbnails()}
          </div>
        </div>
      </div>

      {/* AI Review Panel */}
      <AiReviewPanel
        isVisible={showAiReviewPanel}
        onClose={() => setShowAiReviewPanel(false)}
        pendingAreas={pendingAiAreas}
        onApproveArea={handleApproveArea}
        onRejectArea={handleRejectArea}
        onApproveAll={handleApproveAll}
        onRejectAll={handleRejectAll}
      />



      {/* Credit Alert Modal */}
      <Dialog open={showCreditModal} onOpenChange={setShowCreditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-500" />
              Insufficient AI Credits
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              You need more AI credits to extract data from drawings. Purchase credits to continue using AI-powered extraction.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button 
              onClick={() => {
                window.location.href = '/ai-credits';
                setShowCreditModal(false);
              }}
              className="w-full"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Purchase AI Credits
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowCreditModal(false)}
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