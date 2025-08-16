import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { ConstructionDivision } from "@shared/schema";

interface DivisionVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  divisions: ConstructionDivision[];
  visibleDivisions: Set<number>;
  onVisibilityChange: (divisionId: number, visible: boolean) => void;
  onApplyChanges: (visibleDivisions: Set<number>) => void;
}

export default function DivisionVisibilityModal({
  isOpen,
  onClose,
  divisions,
  visibleDivisions,
  onVisibilityChange,
  onApplyChanges
}: DivisionVisibilityModalProps) {
  const [localVisibleDivisions, setLocalVisibleDivisions] = useState<Set<number>>(new Set(visibleDivisions));

  // Update local state when props change
  useEffect(() => {
    setLocalVisibleDivisions(new Set(visibleDivisions));
  }, [visibleDivisions, isOpen]);

  const handleToggleVisibility = (divisionId: number) => {
    const newVisible = new Set(localVisibleDivisions);
    if (newVisible.has(divisionId)) {
      newVisible.delete(divisionId);
    } else {
      newVisible.add(divisionId);
    }
    setLocalVisibleDivisions(newVisible);
  };

  const handleShowAll = () => {
    const allIds = new Set(divisions.map(d => d.id));
    setLocalVisibleDivisions(allIds);
  };

  const handleHideAll = () => {
    setLocalVisibleDivisions(new Set());
  };

  const handleApply = () => {
    onApplyChanges(localVisibleDivisions);
    onClose();
  };

  const handleCancel = () => {
    setLocalVisibleDivisions(new Set(visibleDivisions));
    onClose();
  };

  const hasChanges = JSON.stringify([...localVisibleDivisions].sort()) !== JSON.stringify([...visibleDivisions].sort());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Division Visibility</DialogTitle>
          <DialogDescription>
            Choose which construction divisions to show on the PDF viewer
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShowAll}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-2" />
              Show All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleHideAll}
              className="flex-1"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Hide All
            </Button>
          </div>

          {/* Division List - Fixed scrolling with exact sidebar styling */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-y-auto pr-2 space-y-2" style={{ maxHeight: '400px' }}>
              {divisions.map((division) => {
                const isVisible = localVisibleDivisions.has(division.id);
                
                return (
                  <div
                    key={division.id}
                    className={`w-full rounded-2xl border transition-colors cursor-pointer ${
                      isVisible 
                        ? 'border-blue-500 bg-white' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    onClick={() => handleToggleVisibility(division.id)}
                  >
                    <div className="flex items-start px-4 py-3 min-h-[3.5rem]">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div
                          className="w-4 h-4 rounded-full border border-white mt-0.5 flex-shrink-0"
                          style={{ backgroundColor: division.color }}
                        />
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-xs font-medium text-gray-900 leading-tight break-words">
                            {division.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            0 items extracted
                          </p>
                        </div>
                      </div>
                      
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors mt-2 ${
                        isVisible
                          ? 'bg-gray-100 text-green-600 hover:bg-gray-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}>
                        {isVisible ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg text-center">
            {localVisibleDivisions.size} of {divisions.length} divisions visible
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1"
            disabled={!hasChanges}
          >
            Apply Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}