import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right';
  offset?: { x: number; y: number };
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'import-drawings',
    title: 'Import Your Drawings',
    description: 'Start by uploading your PDF drawings or construction documents here. You can drag and drop files or click to browse.',
    target: '[data-tour="import-drawings"]',
    position: 'bottom',
  },
  {
    id: 'folders',
    title: 'Organize with Folders',
    description: 'Create folders to organize your drawings by project or phase. Click the folder icon to create new folders.',
    target: '[data-tour="folders"]',
    position: 'right',
  },
  {
    id: 'divisions',
    title: 'Construction Divisions',
    description: 'Select which construction divisions to focus on. This helps the AI extract relevant data from your drawings.',
    target: '[data-tour="divisions"]',
    position: 'right',
  },
  {
    id: 'drawing-canvas',
    title: 'Interactive Drawing View',
    description: 'View your drawings here. Use the marquee tool to select areas for data extraction, or zoom and pan to navigate large drawings.',
    target: '[data-tour="drawing-canvas"]',
    position: 'left',
  },
  {
    id: 'data-extraction',
    title: 'Extract Data',
    description: 'After selecting areas on your drawing, click Extract to use AI-powered data extraction. Results appear in organized tables.',
    target: '[data-tour="extract-button"]',
    position: 'top',
  },
];

interface OnboardingTourProps {
  isVisible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function OnboardingTour({ isVisible, onComplete, onSkip }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [highlightPosition, setHighlightPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const currentTourStep = TOUR_STEPS[currentStep];

  useEffect(() => {
    if (!isVisible || !currentTourStep) return;

    const updatePosition = () => {
      const targetElement = document.querySelector(currentTourStep.target);
      if (!targetElement) return;

      const rect = targetElement.getBoundingClientRect();
      const tooltipOffset = currentTourStep.offset || { x: 0, y: 0 };
      
      // Set highlight position
      setHighlightPosition({
        x: rect.left - 8,
        y: rect.top - 8,
        width: rect.width + 16,
        height: rect.height + 16,
      });

      // Calculate tooltip position based on preferred position
      let x = rect.left + tooltipOffset.x;
      let y = rect.top + tooltipOffset.y;

      switch (currentTourStep.position) {
        case 'top':
          x = rect.left + rect.width / 2;
          y = rect.top - 20;
          break;
        case 'bottom':
          x = rect.left + rect.width / 2;
          y = rect.bottom + 20;
          break;
        case 'left':
          x = rect.left - 20;
          y = rect.top + rect.height / 2;
          break;
        case 'right':
          x = rect.right + 20;
          y = rect.top + rect.height / 2;
          break;
      }

      setTooltipPosition({ x, y });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [currentStep, currentTourStep, isVisible]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!isVisible || !currentTourStep) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-[9998]" />
      
      {/* Highlight circle */}
      <div
        className="fixed bg-white rounded-lg z-[9999] pointer-events-none"
        style={{
          left: highlightPosition.x,
          top: highlightPosition.y,
          width: highlightPosition.width,
          height: highlightPosition.height,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
        }}
      />

      {/* Tooltip */}
      <div
        className="fixed z-[10000] max-w-sm"
        style={{
          left: tooltipPosition.x,
          top: tooltipPosition.y,
          transform: (() => {
            switch (currentTourStep.position) {
              case 'top':
                return 'translate(-50%, -100%)';
              case 'bottom':
                return 'translate(-50%, 0%)';
              case 'left':
                return 'translate(-100%, -50%)';
              case 'right':
                return 'translate(0%, -50%)';
              default:
                return 'translate(-50%, -50%)';
            }
          })(),
        }}
      >
        <div className="bg-white rounded-lg shadow-xl border p-4 relative">
          {/* Arrow pointing to target */}
          <div
            className={`absolute w-3 h-3 bg-white transform rotate-45 border ${
              currentTourStep.position === 'top' ? 'bottom-[-6px] left-1/2 -translate-x-1/2 border-t-0 border-l-0' :
              currentTourStep.position === 'bottom' ? 'top-[-6px] left-1/2 -translate-x-1/2 border-b-0 border-r-0' :
              currentTourStep.position === 'left' ? 'right-[-6px] top-1/2 -translate-y-1/2 border-t-0 border-l-0' :
              'left-[-6px] top-1/2 -translate-y-1/2 border-b-0 border-r-0'
            }`}
          />
          
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-900">{currentTourStep.title}</h3>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <p className="text-gray-600 mb-4 leading-relaxed">
            {currentTourStep.description}
          </p>
          
          <div className="flex justify-between items-center">
            <div className="flex space-x-1">
              {TOUR_STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <div className="flex space-x-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  className="flex items-center space-x-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>
              )}
              
              <Button
                size="sm"
                onClick={handleNext}
                className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700"
              >
                <span>{currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}</span>
                {currentStep < TOUR_STEPS.length - 1 && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          <div className="text-center mt-3">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip tour
            </button>
          </div>
        </div>
      </div>
    </>
  );
}