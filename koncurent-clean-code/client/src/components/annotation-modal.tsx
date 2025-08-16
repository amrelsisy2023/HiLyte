import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ConstructionDivision } from "@shared/schema";

interface AnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (annotation: {
    divisionId: number;
    notes: string;
    priority: string;
  }) => void;
}

export default function AnnotationModal({
  isOpen,
  onClose,
  onSave,
}: AnnotationModalProps) {
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [priority, setPriority] = useState("medium");

  const { data: divisions } = useQuery({
    queryKey: ['/api/construction-divisions'],
  });

  const handleSave = () => {
    if (!selectedDivisionId) return;
    
    onSave({
      divisionId: parseInt(selectedDivisionId),
      notes,
      priority,
    });
    
    // Reset form
    setSelectedDivisionId("");
    setNotes("");
    setPriority("medium");
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setSelectedDivisionId("");
    setNotes("");
    setPriority("medium");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Annotation Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="division">Construction Division</Label>
            <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a division" />
              </SelectTrigger>
              <SelectContent>
                {divisions?.map((division) => (
                  <SelectItem key={division.id} value={division.id.toString()}>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: division.color }}
                      />
                      <span>{division.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add notes about this annotation..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          
          <div>
            <Label>Priority</Label>
            <div className="flex space-x-2 mt-2">
              <Button
                variant={priority === "low" ? "default" : "outline"}
                size="sm"
                onClick={() => setPriority("low")}
                className="text-green-700 hover:bg-green-50"
              >
                Low
              </Button>
              <Button
                variant={priority === "medium" ? "default" : "outline"}
                size="sm"
                onClick={() => setPriority("medium")}
                className="text-yellow-700 hover:bg-yellow-50"
              >
                Medium
              </Button>
              <Button
                variant={priority === "high" ? "default" : "outline"}
                size="sm"
                onClick={() => setPriority("high")}
                className="text-red-700 hover:bg-red-50"
              >
                High
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!selectedDivisionId}
          >
            Save Annotation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
