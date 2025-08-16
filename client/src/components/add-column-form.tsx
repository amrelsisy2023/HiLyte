import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X } from "lucide-react";

interface TemplateColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'dimension' | 'boolean';
  description?: string;
  required?: boolean;
  example?: string;
}

interface AddColumnFormProps {
  onAddColumn: (column: { name: string; type: string; description?: string; required: boolean }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function AddColumnForm({ onAddColumn, onCancel, isLoading }: AddColumnFormProps) {
  const [columnName, setColumnName] = useState('');
  const [columnType, setColumnType] = useState<'text' | 'number' | 'date' | 'dimension' | 'boolean'>('text');
  const [description, setDescription] = useState('');
  const [required, setRequired] = useState(false);
  const [example, setExample] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!columnName.trim()) return;
    
    const newColumn = {
      name: columnName.trim(),
      type: columnType,
      description: description.trim() || undefined,
      required
    };
    
    onAddColumn(newColumn);
    
    // Reset form
    setColumnName('');
    setColumnType('text');
    setDescription('');
    setRequired(false);
    setExample('');
  };

  return (
    <div className="border-t border-gray-200 p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">Add New Column</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Column Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="e.g., Material, Finish"
              className="text-sm"
              required
            />
          </div>
          
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Data Type
            </label>
            <Select value={columnType} onValueChange={(value: any) => setColumnType(value)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="dimension">Dimension</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="boolean">Yes/No</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Description
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this column represents..."
            className="text-sm min-h-[60px]"
          />
        </div>
        
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Example Value
          </label>
          <Input
            value={example}
            onChange={(e) => setExample(e.target.value)}
            placeholder="e.g., Steel, 6'-8&quot;, Yes"
            className="text-sm"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="required-checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded border-gray-300"
          />
          <label htmlFor="required-checkbox" className="text-xs text-gray-700">
            Required field
          </label>
        </div>
        
        <div className="flex justify-end space-x-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={!columnName.trim() || isLoading}
          >
            <Plus className="h-4 w-4 mr-1" />
            {isLoading ? 'Adding...' : 'Add Column'}
          </Button>
        </div>
      </form>
    </div>
  );
}