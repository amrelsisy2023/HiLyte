import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, GripVertical, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TemplateColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'dimension' | 'boolean';
  description?: string;
  required?: boolean;
  example?: string;
}

interface ColumnManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: TemplateColumn[];
  onColumnsUpdate: (columns: TemplateColumn[]) => void;
  selectedDivision: {
    id: number;
    name: string;
    color: string;
  };
}

export default function ColumnManagementModal({
  isOpen,
  onClose,
  columns,
  onColumnsUpdate,
  selectedDivision
}: ColumnManagementModalProps) {
  const [localColumns, setLocalColumns] = useState<TemplateColumn[]>([]);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<'text' | 'number' | 'date' | 'dimension' | 'boolean'>('text');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLocalColumns([...columns]);
  }, [columns]);

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    
    const newColumn: TemplateColumn = {
      name: newColumnName,
      type: newColumnType,
      required: false
    };
    
    const updatedColumns = [...localColumns, newColumn];
    setLocalColumns(updatedColumns);
    setNewColumnName('');
    setNewColumnType('text');
  };

  const handleDeleteColumn = (index: number) => {
    const updatedColumns = localColumns.filter((_, i) => i !== index);
    setLocalColumns(updatedColumns);
  };

  const handleColumnUpdate = (index: number, field: keyof TemplateColumn, value: any) => {
    const updatedColumns = localColumns.map((col, i) => 
      i === index ? { ...col, [field]: value } : col
    );
    setLocalColumns(updatedColumns);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    
    const updatedColumns = [...localColumns];
    const draggedColumn = updatedColumns.splice(draggedIndex, 1)[0];
    updatedColumns.splice(targetIndex, 0, draggedColumn);
    
    setLocalColumns(updatedColumns);
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    try {
      // Save to template
      await fetch(`/api/construction-divisions/${selectedDivision.id}/template`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${selectedDivision.name} Template`,
          description: `Template for ${selectedDivision.name}`,
          columns: localColumns
        })
      });
      
      // Update parent component
      onColumnsUpdate(localColumns);
      
      toast({
        title: "Template Updated",
        description: "Column changes saved successfully",
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to save template:', error);
      toast({
        title: "Save Failed",
        description: "Could not save column changes",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Manage Columns
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Add, edit, reorder, or remove columns for your data extraction template.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Add New Column Section */}
          <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Add New Column</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Input
                placeholder="Enter column name..."
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                className="flex-1"
              />
              
              <Select value={newColumnType} onValueChange={(value: string) => 
                setNewColumnType(value as 'text' | 'number' | 'date' | 'dimension' | 'boolean')
              }>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">text</SelectItem>
                  <SelectItem value="number">number</SelectItem>
                  <SelectItem value="date">date</SelectItem>
                  <SelectItem value="dimension">dimension</SelectItem>
                  <SelectItem value="boolean">boolean</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                onClick={handleAddColumn}
                disabled={!newColumnName.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6"
              >
                Add
              </Button>
            </div>
          </div>

          {/* Existing Columns */}
          <div className="space-y-3">
            {localColumns.map((column, index) => (
              <div
                key={`${column.name}-${index}`}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                  
                  <Input
                    value={column.name}
                    onChange={(e) => handleColumnUpdate(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  
                  {column.required && (
                    <span className="text-xs text-red-500">*</span>
                  )}
                  
                  <Select 
                    value={column.type} 
                    onValueChange={(value: string) => 
                      handleColumnUpdate(index, 'type', value as 'text' | 'number' | 'date' | 'dimension' | 'boolean')
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">text</SelectItem>
                      <SelectItem value="number">number</SelectItem>
                      <SelectItem value="date">date</SelectItem>
                      <SelectItem value="dimension">dimension</SelectItem>
                      <SelectItem value="boolean">boolean</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={column.required || false}
                      onCheckedChange={(checked) => 
                        handleColumnUpdate(index, 'required', !!checked)
                      }
                    />
                    <span className="text-sm text-gray-600">Required</span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteColumn(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {localColumns.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No columns defined yet</p>
                <p className="text-sm">Add your first column above</p>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}