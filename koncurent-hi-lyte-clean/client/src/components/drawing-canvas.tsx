import { forwardRef, useEffect, useRef, useState } from "react";
import type { Drawing, Annotation } from "@shared/schema";

interface DrawingCanvasProps {
  drawing: Drawing;
  tool: string;
  selectedDivision: any;
  zoom: number;
  annotations: Annotation[];
  onAnnotationClick: (annotation: Annotation) => void;
  currentPage?: number;
}

const DrawingCanvas = forwardRef<HTMLCanvasElement, DrawingCanvasProps>(
  ({ drawing, tool, selectedDivision, zoom, annotations, onAnnotationClick, currentPage = 1 }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [isPdf, setIsPdf] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
    const [currentRect, setCurrentRect] = useState<{x: number, y: number, width: number, height: number} | null>(null);
    const [isLoadingPage, setIsLoadingPage] = useState(false);
    const [savedSelections, setSavedSelections] = useState<Array<{
      rect: {x: number, y: number, width: number, height: number},
      division: any,
      id: string
    }>>([]);

    useEffect(() => {
      if (!drawing) return;
      setIsPdf(drawing.fileType === 'application/pdf');
      setSavedSelections([]); // Clear selections when switching drawings
    }, [drawing]);

    useEffect(() => {
      if (!drawing || !imageRef.current || isPdf) return;

      const img = imageRef.current;
      img.onload = () => {
        if (ref && 'current' in ref && ref.current) {
          const canvas = ref.current;
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
        }
      };
    }, [drawing, ref, isPdf]);

    // Redraw all selections and current selection
    const redrawCanvas = () => {
      if (!ref || !('current' in ref) || !ref.current) return;
      
      const canvas = ref.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw saved selections
      savedSelections.forEach(selection => {
        ctx.strokeStyle = selection.division.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(selection.rect.x, selection.rect.y, selection.rect.width, selection.rect.height);
        
        // Draw division label
        ctx.fillStyle = selection.division.color;
        ctx.globalAlpha = 0.9;
        ctx.font = '12px Arial';
        ctx.fillText(selection.division.name, selection.rect.x + 5, selection.rect.y - 5);
      });
      
      // Draw current selection rectangle
      if (currentRect) {
        ctx.setLineDash([]);
        ctx.strokeStyle = selectedDivision?.color || '#000';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.7;
        ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      }
    };

    // Canvas selection functionality
    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool === 'cursor' || !ref || !('current' in ref) || !ref.current || !selectedDivision) return;
      
      e.preventDefault();
      setIsDrawing(true);
      const canvas = ref.current;
      const rect = canvas.getBoundingClientRect();
      
      // Account for zoom scaling
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      setStartPoint({x, y});
      setCurrentRect({x, y, width: 0, height: 0});
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || tool === 'cursor' || !ref || !('current' in ref) || !ref.current || !selectedDivision || !startPoint) return;
      
      const canvas = ref.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      // Update current rectangle
      const width = x - startPoint.x;
      const height = y - startPoint.y;
      
      setCurrentRect({
        x: Math.min(startPoint.x, x),
        y: Math.min(startPoint.y, y),
        width: Math.abs(width),
        height: Math.abs(height)
      });
    };

    const handleMouseUp = () => {
      if (!isDrawing || !selectedDivision || !currentRect || !startPoint) return;
      setIsDrawing(false);
      
      // Only save if rectangle has meaningful size
      if (currentRect.width > 10 && currentRect.height > 10) {
        const newSelection = {
          rect: currentRect,
          division: selectedDivision,
          id: `selection-${Date.now()}`
        };
        
        setSavedSelections(prev => [...prev, newSelection]);
        
        console.log('Data selection completed:', {
          area: currentRect,
          division: selectedDivision,
          description: `Selected area assigned to ${selectedDivision.name}`
        });
        
        // Extract data from the selected area and organize it
        extractDataFromSelection(newSelection, selectedDivision);
        
        alert(`Data area selected and assigned to ${selectedDivision.name}\nLocation: (${Math.round(currentRect.x)}, ${Math.round(currentRect.y)})\nSize: ${Math.round(currentRect.width)} x ${Math.round(currentRect.height)}`);
      }
      
      // Reset current selection
      setCurrentRect(null);
      setStartPoint(null);
    };

    // Data extraction function
    const extractDataFromSelection = async (selection: any, division: any) => {
      // Simulate data extraction from the selected area
      const mockExtractedData = generateMockDataForDivision(division.name, selection);
      
      console.log(`Extracted data from ${division.name}:`, mockExtractedData);
      
      // In a real implementation, this would:
      // 1. Send the selected area coordinates to an OCR/AI service
      // 2. Extract text and table data from that specific region
      // 3. Parse and structure the data based on the construction division
      // 4. Store the organized data in the database
      
      // For now, show what would be extracted
      alert(`Data extracted from selected area:\n\n${formatExtractedData(mockExtractedData)}`);
    };
    
    const generateMockDataForDivision = (divisionName: string, selection: any) => {
      switch (divisionName) {
        case '08 - Openings':
          return {
            type: 'Door Schedule',
            items: [
              { mark: 'A1', size: '3\'0" x 7\'0"', type: 'Solid Core Wood', hardware: 'Grade 1 Lever', quantity: 12 },
              { mark: 'B1', size: '2\'8" x 7\'0"', type: 'Hollow Metal', hardware: 'Panic Bar', quantity: 8 },
              { mark: 'C1', size: '3\'0" x 8\'0"', type: 'Glass Storefront', hardware: 'Push/Pull', quantity: 4 }
            ]
          };
        case '23 - HVAC':
          return {
            type: 'Equipment Schedule',
            items: [
              { tag: 'AHU-1', type: 'Air Handler', capacity: '5000 CFM', location: 'Roof', notes: 'Variable Speed' },
              { tag: 'EF-1', type: 'Exhaust Fan', capacity: '1200 CFM', location: 'Kitchen', notes: 'Grease Rated' },
              { tag: 'HW-1', type: 'Hot Water Heater', capacity: '80 Gal', location: 'Mechanical', notes: 'Gas Fired' }
            ]
          };
        case '26 - Electrical':
          return {
            type: 'Panel Schedule',
            items: [
              { circuit: '1-2', description: 'Kitchen Equipment', breaker: '20A 2P', load: '16A' },
              { circuit: '3', description: 'Lighting - Zone 1', breaker: '15A 1P', load: '12A' },
              { circuit: '5-6', description: 'HVAC Unit', breaker: '30A 2P', load: '24A' }
            ]
          };
        default:
          return {
            type: 'General Schedule',
            items: [
              { item: 'Component 1', specification: 'Type A', quantity: '10 EA', notes: 'Standard' },
              { item: 'Component 2', specification: 'Type B', quantity: '5 EA', notes: 'Special' }
            ]
          };
      }
    };
    
    const formatExtractedData = (data: any) => {
      let formatted = `${data.type}:\n\n`;
      data.items.forEach((item: any, index: number) => {
        formatted += `Item ${index + 1}:\n`;
        Object.entries(item).forEach(([key, value]) => {
          formatted += `  ${key}: ${value}\n`;
        });
        formatted += '\n';
      });
      return formatted;
    };

    // Redraw canvas when selections change
    useEffect(() => {
      redrawCanvas();
    }, [savedSelections, currentRect, selectedDivision]);

    // Effect to handle PDF page changes
    useEffect(() => {
      if (isPdf && currentPage) {
        setIsLoadingPage(true);
        console.log(`Navigating to page ${currentPage} for PDF ${drawing.name}`);
      }
    }, [currentPage, isPdf, drawing.name]);

    const drawingUrl = drawing ? `/api/drawings/${drawing.id}/file` : '';
    const pdfUrl = isPdf && drawing ? `${drawingUrl}#page=${currentPage}&toolbar=0&navpanes=0` : drawingUrl;

    return (
      <div 
        ref={containerRef}
        className="w-full h-full bg-white overflow-auto"
      >
        <div
          className="drawing-wrapper relative"
          style={{ 
            transform: `scale(${zoom / 100})`, 
            transformOrigin: 'top left',
            width: 'max-content',
            height: 'max-content',
            minWidth: '100%',
            minHeight: '100%'
          }}
        >
          {/* Architectural Drawing */}
          {drawing.fileType?.includes('pdf') && drawing.pageNumber && drawing.pageNumber > 1 ? (
            // Individual PDF page rendered as PNG
            <div className="relative">
              <img
                ref={imageRef}
                src={drawingUrl}
                alt={drawing.name}
                className="block max-w-none"
                onLoad={() => {
                  if (ref && 'current' in ref && ref.current && imageRef.current) {
                    const canvas = ref.current;
                    const img = imageRef.current;
                    canvas.width = img.naturalWidth || 1200;
                    canvas.height = img.naturalHeight || 800;
                    redrawCanvas();
                  }
                }}
                onError={() => console.error('Failed to load page image')}
              />
            </div>
          ) : isPdf ? (
            // Original PDF file
            <div className="relative">
              {isLoadingPage && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
                  <div className="text-gray-600">Loading PDF...</div>
                </div>
              )}
              <iframe
                key={`pdf-${drawing.id}`}
                src={drawingUrl}
                className="block border-0"
                style={{ 
                  width: '1200px',
                  height: '800px',
                  position: 'relative',
                  zIndex: 1
                }}
                onLoad={() => {
                  console.log('PDF loaded:', drawingUrl);
                  setIsLoadingPage(false);
                  setTotalPages(drawing.totalPages || 1);
                }}
                onError={(e) => {
                  console.error('PDF load error:', e, drawingUrl);
                  setIsLoadingPage(false);
                }}
              />
              {/* PDF Annotation Overlay */}
              <canvas
                ref={ref}
                className={`absolute top-0 left-0 ${tool === 'marquee' ? 'cursor-crosshair' : 'cursor-default'}`}
                width={1200}
                height={800}
                style={{
                  pointerEvents: 'auto',
                  zIndex: 2
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => setIsDrawing(false)}
              />
            </div>
          ) : (
            <div className="relative">
              <img
                ref={imageRef}
                src={drawingUrl}
                alt="Architectural drawing"
                className="block"
                style={{ 
                  maxWidth: 'none',
                  width: 'auto', 
                  height: 'auto',
                  position: 'relative',
                  zIndex: 1
                }}
                onLoad={() => console.log('Image loaded:', drawingUrl)}
                onError={(e) => console.error('Image load error:', e, drawingUrl)}
              />
              {/* Image Annotation Canvas */}
              <canvas
                ref={ref}
                className={`absolute top-0 left-0 ${tool === 'marquee' ? 'cursor-crosshair' : 'cursor-default'}`}
                style={{
                  pointerEvents: 'auto',
                  zIndex: 2
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => setIsDrawing(false)}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
);

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;