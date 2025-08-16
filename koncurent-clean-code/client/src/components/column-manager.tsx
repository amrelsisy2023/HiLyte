import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, GripVertical, Plus } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface TemplateColumn {
  name: string;
  type: 'text' | 'auto' | 'number' | 'date' | 'dimension' | 'boolean';
  description?: string;
  required?: boolean;
  example?: string;
}

interface ColumnManagerProps {
  columns: TemplateColumn[];
  onUpdateColumn: (columnIndex: number, updates: Partial<TemplateColumn>) => void;
  onDeleteColumn: (columnIndex: number) => void;
  onReorderColumns: (reorderedColumns: TemplateColumn[]) => void;
  onAddColumn: (column: TemplateColumn) => void;
  onClose: () => void;
}

export default function ColumnManager({ columns, onUpdateColumn, onDeleteColumn, onReorderColumns, onAddColumn, onClose }: ColumnManagerProps) {
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnType, setNewColumnType] = useState<'text' | 'auto' | 'number' | 'date' | 'dimension' | 'boolean'>('text');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }

    const reorderedColumns = Array.from(columns);
    const [reorderedItem] = reorderedColumns.splice(result.source.index, 1);
    reorderedColumns.splice(result.destination.index, 0, reorderedItem);

    onReorderColumns(reorderedColumns);
  };

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) return;
    
    setIsAddingColumn(true);
    try {
      const newColumn: TemplateColumn = {
        name: newColumnName.trim(),
        type: newColumnType,
        description: `User-added ${newColumnType} column`,
        required: false,
        example: ''
      };
      
      await onAddColumn(newColumn);
      setNewColumnName('');
      setNewColumnType('text');
    } catch (error) {
      console.error('Failed to add column:', error);
    } finally {
      setIsAddingColumn(false);
    }
  };

  const handleEditColumn = (index: number) => {
    setEditingColumnIndex(index);
    setEditingName(columns[index].name);
  };

  const handleSaveEdit = (index: number) => {
    if (editingName.trim()) {
      onUpdateColumn(index, { name: editingName.trim() });
    }
    setEditingColumnIndex(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingColumnIndex(null);
    setEditingName('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Manage Columns</h3>
      </div>
      
      {/* Add New Column Form */}
      <div className="p-3 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
        <div className="flex items-center space-x-2 mb-2">
          <Plus className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-600">Add New Column</span>
        </div>
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Enter column name..."
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddColumn();
              }
            }}
            disabled={isAddingColumn}
          />
          <Select value={newColumnType} onValueChange={(value: any) => setNewColumnType(value)}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">text</SelectItem>
              <SelectItem value="auto">auto</SelectItem>
              <SelectItem value="number">number</SelectItem>
              <SelectItem value="date">date</SelectItem>
              <SelectItem value="dimension">dimension</SelectItem>
              <SelectItem value="boolean">boolean</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleAddColumn} 
            disabled={!newColumnName.trim() || isAddingColumn}
            size="sm"
          >
            {isAddingColumn ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </div>

      {/* Existing Columns with Drag & Drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="columns">
          {(provided) => (
            <div 
              {...provided.droppableProps} 
              ref={provided.innerRef}
              className="space-y-2 max-h-96 overflow-y-auto"
            >
              {columns.map((column, index) => (
                <Draggable key={column.name} draggableId={column.name} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`grid grid-cols-12 gap-4 items-center p-4 rounded-lg border transition-colors ${
                        snapshot.isDragging ? 'bg-blue-50 border-blue-200 shadow-lg' : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {/* Drag Handle */}
                      <div className="col-span-1 flex justify-center">
                        <div 
                          {...provided.dragHandleProps}
                          className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                      </div>
                      
                      {/* Column Name */}
                      <div className="col-span-3">
                        {editingColumnIndex === index ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="flex-1 text-sm font-medium h-8 px-3 border border-blue-300 bg-blue-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEdit(index);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                              autoFocus
                              placeholder="Column name"
                            />
                            {column.required && <span className="text-red-500 text-sm">*</span>}
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span 
                              className="font-medium text-sm cursor-pointer hover:text-blue-600 truncate" 
                              onClick={() => handleEditColumn(index)}
                              title="Click to edit"
                            >
                              {column.name}
                            </span>
                            {column.required && <span className="text-red-500 text-sm">*</span>}
                          </div>
                        )}
                      </div>

                      {/* Type Badge */}
                      <div className="col-span-2">
                        {editingColumnIndex === index ? (
                          <Select 
                            value={column.type} 
                            onValueChange={(value: any) => onUpdateColumn(index, { type: value })}
                          >
                            <SelectTrigger className="w-full h-8 text-sm border border-blue-300 bg-blue-50 focus:border-blue-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">text</SelectItem>
                              <SelectItem value="auto">auto</SelectItem>
                              <SelectItem value="number">number</SelectItem>
                              <SelectItem value="date">date</SelectItem>
                              <SelectItem value="dimension">dimension</SelectItem>
                              <SelectItem value="boolean">boolean</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge 
                            variant="outline" 
                            className="text-sm h-7 px-3 cursor-pointer hover:bg-gray-100 w-full justify-center"
                            onClick={() => handleEditColumn(index)}
                            title="Click to edit"
                          >
                            {column.type}
                          </Badge>
                        )}
                      </div>

                      {/* Edit Buttons (only show when editing) */}
                      <div className="col-span-2">
                        {editingColumnIndex === index ? (
                          <div className="flex items-center space-x-2">
                            <button 
                              onClick={() => handleSaveEdit(index)} 
                              className="h-8 w-8 rounded text-white bg-green-600 hover:bg-green-700 flex items-center justify-center text-sm transition-colors"
                              title="Save changes"
                            >
                              ✓
                            </button>
                            <button 
                              onClick={handleCancelEdit} 
                              className="h-8 w-8 rounded text-gray-600 bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-sm transition-colors"
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        ) : null}
                      </div>
                      
                      {/* Required Checkbox */}
                      <div className="col-span-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`required-${index}`}
                            checked={column.required || false}
                            onCheckedChange={(checked) => 
                              onUpdateColumn(index, { required: checked as boolean })
                            }
                            className="h-4 w-4"
                          />
                          <label 
                            htmlFor={`required-${index}`}
                            className="text-sm text-gray-600 cursor-pointer whitespace-nowrap"
                          >
                            Required
                          </label>
                        </div>
                      </div>
                      
                      {/* Delete Button */}
                      <div className="col-span-1 flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteColumn(index)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete Column"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}