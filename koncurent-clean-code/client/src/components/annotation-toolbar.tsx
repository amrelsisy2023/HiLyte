import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ConstructionDivision } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { 
  MousePointer, 
  Square, 
  Minus, 
  Plus, 
  Undo, 
  Redo,
  GripVertical
} from "lucide-react";

interface AnnotationToolbarProps {
  tool: string;
  onToolChange: (tool: string) => void;
  selectedDivision: ConstructionDivision | null;
  onDivisionChange: (division: ConstructionDivision) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export default function AnnotationToolbar({
  tool,
  onToolChange,
  selectedDivision,
  onDivisionChange,
  zoom,
  onZoomChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: AnnotationToolbarProps) {
  const { data: divisions } = useQuery<ConstructionDivision[]>({
    queryKey: ['/api/construction-divisions'],
  });

  // Draggable state
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => {
    onZoomChange(Math.min(zoom + 25, 500));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(zoom - 25, 25));
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      // Add boundary constraints
      const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 300));
      const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 200));
      
      setPosition({
        x: newX,
        y: newY
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Effect to handle global mouse events
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div 
      ref={toolbarRef}
      className="absolute z-30 toolbar-floating rounded-lg shadow-lg border border-gray-200 p-3 select-none"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`
      }}
    >
      {/* Drag Handle */}
      <div 
        className="flex items-center justify-center w-full h-6 mb-2 cursor-grab hover:bg-gray-100 rounded transition-colors border-b border-gray-200"
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        title="Drag to move toolbar"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      {/* Status Panel */}
      <div className="mb-3 p-2 bg-gray-50 rounded border">
        <div className="text-xs font-medium text-gray-600 mb-1">Current Tool:</div>
        <div className="text-sm font-semibold text-gray-800 capitalize">{tool}</div>
        {selectedDivision && (
          <>
            <div className="text-xs font-medium text-gray-600 mt-2 mb-1">Selected Division:</div>
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: selectedDivision.color }}
              />
              <div className="text-sm font-semibold text-gray-800">{selectedDivision.name}</div>
            </div>
          </>
        )}
        {!selectedDivision && tool === 'marquee' && (
          <div className="text-xs text-red-600 mt-2">Select a division first</div>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        {/* Zoom Controls */}
        <div className="flex items-center space-x-1 pr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 25}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-gray-700 px-2 min-w-16 text-center">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 500}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Annotation Tools */}
        <div className="flex items-center space-x-1 px-2">
          <Button
            variant={tool === 'cursor' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToolChange('cursor')}
            title="Cursor Tool"
          >
            <MousePointer className="h-4 w-4" />
          </Button>
          <Button
            variant={tool === 'marquee' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToolChange('marquee')}
            title="Marquee Selection Tool"
            disabled={!selectedDivision}
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>



        {/* Undo/Redo */}
        <div className="flex items-center space-x-1 pl-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Panel */}
      <div className="mt-3 p-2 bg-gray-50 rounded border">
        <div className="text-xs text-gray-600 mb-1">Current Status:</div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <span className="font-medium">Tool:</span>
            <span className="capitalize text-blue-600">{tool}</span>
          </div>
          {selectedDivision ? (
            <div className="flex items-center space-x-2">
              <span className="font-medium">Division:</span>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedDivision.color }}
              />
              <span className="text-green-600">{selectedDivision.name}</span>
            </div>
          ) : (
            <span className="text-orange-600">Select a division to start</span>
          )}
        </div>
        {selectedDivision && tool !== 'pan' && (
          <div className="text-xs text-gray-500 mt-1">
            Click and drag on the drawing to {tool === 'highlight' ? 'highlight' : `draw ${tool}s`}
          </div>
        )}
      </div>
    </div>
  );
}
