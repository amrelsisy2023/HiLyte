import { useRef, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CanvasManager, type CanvasAnnotation } from "@/lib/canvas-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ConstructionDivision, Annotation } from "@shared/schema";

export function useCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasManagerRef = useRef<CanvasManager | null>(null);
  const [tool, setTool] = useState('cursor');
  const [selectedDivision, setSelectedDivision] = useState<ConstructionDivision | null>(null);
  const [zoom, setZoom] = useState(100);
  const [annotations, setAnnotations] = useState<CanvasAnnotation[]>([]);
  const [history, setHistory] = useState<CanvasAnnotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize canvas manager
  const initializeCanvas = useCallback((canvas: HTMLCanvasElement) => {
    if (canvasManagerRef.current) {
      canvasManagerRef.current = null;
    }
    
    canvasManagerRef.current = new CanvasManager(canvas);
    canvasManagerRef.current.setTool(tool);
    
    if (selectedDivision) {
      canvasManagerRef.current.setColor(selectedDivision.color);
      canvasManagerRef.current.setDivisionId(selectedDivision.id);
    }
  }, [tool, selectedDivision]);

  // Update tool when changed
  const updateTool = useCallback((newTool: string) => {
    setTool(newTool);
    if (canvasManagerRef.current) {
      canvasManagerRef.current.setTool(newTool);
    }
  }, []);

  // Update selected division
  const updateSelectedDivision = useCallback((division: ConstructionDivision) => {
    setSelectedDivision(division);
    if (canvasManagerRef.current) {
      canvasManagerRef.current.setColor(division.color);
      canvasManagerRef.current.setDivisionId(division.id);
    }
  }, []);

  // Save annotations mutation
  const saveAnnotationsMutation = useMutation({
    mutationFn: async (drawingId: number) => {
      const canvasAnnotations = canvasManagerRef.current?.getAnnotations() || [];
      
      // Convert canvas annotations to API format
      const apiAnnotations = canvasAnnotations.map(annotation => ({
        drawingId,
        divisionId: annotation.divisionId,
        type: annotation.type,
        coordinates: JSON.stringify(annotation.points),
        strokeWidth: annotation.strokeWidth,
        opacity: annotation.opacity,
        notes: null,
        priority: 'medium' as const,
      }));

      // Save each annotation
      const promises = apiAnnotations.map(annotation =>
        apiRequest('POST', '/api/annotations', annotation)
      );

      return Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Annotations saved",
        description: "Your annotations have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/annotations'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to save annotations",
        description: "There was an error saving your annotations. Please try again.",
        variant: "destructive",
      });
      console.error('Save annotations error:', error);
    },
  });

  // History management
  const addToHistory = useCallback((newAnnotations: CanvasAnnotation[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...newAnnotations]);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const previousAnnotations = history[newIndex];
      setAnnotations(previousAnnotations);
      
      if (canvasManagerRef.current) {
        canvasManagerRef.current.loadAnnotations(previousAnnotations);
      }
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextAnnotations = history[newIndex];
      setAnnotations(nextAnnotations);
      
      if (canvasManagerRef.current) {
        canvasManagerRef.current.loadAnnotations(nextAnnotations);
      }
    }
  }, [historyIndex, history]);

  // Save annotations function
  const saveAnnotations = useCallback(async (drawingId: number) => {
    return saveAnnotationsMutation.mutateAsync(drawingId);
  }, [saveAnnotationsMutation]);

  return {
    canvasRef,
    tool,
    setTool: updateTool,
    selectedDivision,
    setSelectedDivision: updateSelectedDivision,
    zoom,
    setZoom,
    annotations,
    saveAnnotations,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    initializeCanvas,
    isLoading: saveAnnotationsMutation.isPending,
  };
}
