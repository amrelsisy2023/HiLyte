import { useRef, useEffect, useState } from 'react';
import { Drawing, ConstructionDivision } from '@shared/schema';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface DataExtractionCanvasProps {
  drawing: Drawing;
  selectedDivision: ConstructionDivision | null;
  onDataExtracted: (extractedData: {
    type: string;
    sourceLocation: string;
    data: string;
  }) => void;
  triggerClearMarquees?: number;
}

interface MarqueeSelection {
  x: number;
  y: number;
  width: number;
  height: number;
  isSelecting: boolean;
}

export default function DataExtractionCanvas({
  drawing,
  selectedDivision,
  onDataExtracted,
  triggerClearMarquees,
}: DataExtractionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { toast } = useToast();
  const [marquee, setMarquee] = useState<MarqueeSelection>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    isSelecting: false,
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });

  // Debug: Log when selectedDivision changes
  useEffect(() => {
    console.log('=== DataExtractionCanvas rendered ===');
    console.log('selectedDivision:', selectedDivision);
    console.log('drawing:', drawing);
    console.log('Canvas element:', canvasRef.current);
    console.log('Image element:', imageRef.current);
  }, [selectedDivision, drawing]);

  // Force a console log on component mount
  useEffect(() => {
    console.log('=== DataExtractionCanvas MOUNTED ===');
  }, []);

  // Handle clearing marquees when data is deleted
  useEffect(() => {
    if (triggerClearMarquees && triggerClearMarquees > 0) {
      console.log('Clearing marquee selection in DataExtractionCanvas');
      setMarquee({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        isSelecting: false,
      });
      setIsDrawing(false);
    }
  }, [triggerClearMarquees]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw marquee selection if active
    if (marquee.isSelecting || marquee.width > 0) {
      ctx.strokeStyle = selectedDivision?.color || '#0066cc';
      ctx.fillStyle = `${selectedDivision?.color || '#0066cc'}20`;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      ctx.fillRect(marquee.x, marquee.y, marquee.width, marquee.height);
      ctx.strokeRect(marquee.x, marquee.y, marquee.width, marquee.height);
    }
  }, [marquee, selectedDivision]);

  const getCanvasCoordinates = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = image.naturalWidth / rect.width;
    const scaleY = image.naturalHeight / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    console.log('=== handleMouseDown called ===');
    console.log('selectedDivision:', selectedDivision);
    
    if (!selectedDivision) {
      console.log('No division selected, ignoring mouse down');
      return;
    }

    const coords = getCanvasCoordinates(e);
    console.log('Mouse down coordinates:', coords);
    setStartPoint(coords);
    setIsDrawing(true);
    setMarquee({
      x: coords.x,
      y: coords.y,
      width: 0,
      height: 0,
      isSelecting: true,
    });
    console.log('Drawing state set to true, marquee initialized');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !selectedDivision) return;

    const coords = getCanvasCoordinates(e);
    const width = coords.x - startPoint.x;
    const height = coords.y - startPoint.y;

    setMarquee({
      x: width < 0 ? coords.x : startPoint.x,
      y: height < 0 ? coords.y : startPoint.y,
      width: Math.abs(width),
      height: Math.abs(height),
      isSelecting: true,
    });
  };

  const handleMouseUp = async () => {
    console.log('=== handleMouseUp called ===');
    console.log('isDrawing:', isDrawing);
    console.log('selectedDivision:', selectedDivision);
    console.log('marquee:', marquee);
    
    if (!isDrawing || !selectedDivision) {
      console.log('Early return: missing drawing state or division');
      return;
    }

    setIsDrawing(false);
    
    // Only proceed if we have a meaningful selection
    if (marquee.width > 10 && marquee.height > 10) {
      console.log('=== CREDIT CHECK TRIGGERED ===');
      console.log('Marquee size sufficient, checking credits...');
      
      // Check AI credits immediately when marquee selection is completed
      try {
        const response = await fetch('/api/ai-credits/balance');
        if (response.ok) {
          const creditData = await response.json();
          
          // If balance is zero or very low, show the credit alert immediately
          if (creditData.balance <= 0) {
            toast({
              title: "Insufficient AI Credits",
              description: "You need more AI credits to extract data. Click to purchase credits.",
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
            
            // Clear selection immediately since we can't proceed
            setMarquee({
              x: 0,
              y: 0,
              width: 0,
              height: 0,
              isSelecting: false,
            });
            return;
          }
        }
      } catch (error) {
        console.error('Failed to check credits:', error);
      }

      // If we have credits, proceed with real extraction
      try {
        const currentPage = 1; // Default to page 1 for now
        
        console.log('Starting real data extraction...', {
          drawingId: drawing.id,
          page: currentPage,
          region: {
            x: marquee.x,
            y: marquee.y,
            width: marquee.width,
            height: marquee.height,
          },
          division: selectedDivision.name
        });

        toast({
          title: "Extracting data...",
          description: "Processing your selection with AI",
        });

        // Call the real OCR/AI extraction API
        const response = await fetch(`/api/drawings/${drawing.id}/ocr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            page: currentPage,
            region: {
              x: marquee.x,
              y: marquee.y,
              width: marquee.width,
              height: marquee.height,
            },
            divisionId: selectedDivision.id
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Extraction failed');
        }

        const result = await response.json();
        console.log('Extraction result from API:', result);

        // Format the real extracted data
        const extractedData = {
          type: 'text', // Always text for now, could use result.extractionMethod if needed
          sourceLocation: JSON.stringify({
            x: marquee.x,
            y: marquee.y,
            width: marquee.width,
            height: marquee.height,
            page: currentPage,
          }),
          data: result.text || '', // Use the text field from API response
          confidence: result.confidence || 0,
          divisionId: selectedDivision.id
        };

        console.log('Formatted extracted data before onDataExtracted:', extractedData);
        onDataExtracted(extractedData);
        console.log('onDataExtracted called successfully');

        toast({
          title: "Data extracted successfully",
          description: `Extracted ${result.text?.length || 0} characters with ${Math.round((result.confidence || 0) * 100)}% confidence`,
        });

      } catch (error) {
        console.error('Extraction failed:', error);
        toast({
          title: "Extraction failed",
          description: error instanceof Error ? error.message : 'Failed to extract data from selection',
          variant: "destructive",
        });
      }
    }

    // Clear selection after extraction
    setTimeout(() => {
      setMarquee({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        isSelecting: false,
      });
    }, 1000);
  };

  const getFileUrl = () => {
    // For extracted PDF pages, use the processed page image
    if (drawing.pageNumber && drawing.pageNumber > 1) {
      return `/uploads/pages/page.${drawing.pageNumber}.png`;
    }
    // For original files, use the standard file endpoint
    return `/api/drawings/${drawing.id}/file`;
  };

  return (
    <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      <div className="relative w-full h-full">
        {/* Image */}
        <img
          ref={imageRef}
          src={getFileUrl()}
          alt={drawing.name}
          className="w-full h-full object-contain"
          onLoad={() => {
            // Trigger canvas redraw when image loads
            setMarquee(prev => ({ ...prev }));
          }}
        />

        {/* Canvas overlay for marquee selection */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          style={{ 
            pointerEvents: selectedDivision ? 'auto' : 'none',
            opacity: selectedDivision ? 1 : 0.5,
          }}
          onClick={() => console.log('=== CANVAS CLICKED ===', { selectedDivision })}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Instruction overlay */}
        {!selectedDivision && (
          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg shadow-lg text-center">
              <h3 className="text-lg font-semibold mb-2">Select a Construction Division</h3>
              <p className="text-gray-600">
                Choose a division from the left sidebar to start extracting data
              </p>
            </div>
          </div>
        )}

        {/* Selection status */}
        {selectedDivision && (
          <div className="absolute top-4 left-4 bg-white p-2 rounded-lg shadow-lg">
            <div className="flex items-center space-x-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedDivision.color }}
              />
              <span className="text-sm font-medium">{selectedDivision.name}</span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Click and drag to select data area
            </p>
          </div>
        )}
      </div>
    </div>
  );
}