import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Save, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TemplateColumn {
  name: string;
  type: 'text' | 'auto' | 'number' | 'date' | 'dimension' | 'boolean';
  description?: string;
  required?: boolean;
  example?: string;
}

interface ExtractionTemplate {
  id: string;
  name: string;
  description: string;
  columns: TemplateColumn[];
  divisionId: number;
}

interface Props {
  division: {
    id: number;
    name: string;
    code: string;
    color: string;
  };
  onTemplateUpdate?: () => void;
}

export function TemplateManager({ division, onTemplateUpdate }: Props) {
  const [template, setTemplate] = useState<ExtractionTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);
  const [newColumn, setNewColumn] = useState<TemplateColumn>({
    name: '',
    type: 'text',
    description: '',
    required: false,
    example: ''
  });
  const { toast } = useToast();

  // Load existing template
  useEffect(() => {
    loadTemplate();
  }, [division.id]);

  const loadTemplate = async () => {
    try {
      const response = await apiRequest(`/api/construction-divisions/${division.id}/template`, "GET");
      const data = await response.json();
      setTemplate(data);
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  };

  const saveTemplate = async () => {
    if (!template) {
      console.error('No template to save');
      return;
    }

    console.log('Attempting to save template:', template);
    console.log('Division ID:', division.id);

    try {
      const response = await apiRequest(`/api/construction-divisions/${division.id}/template`, "POST", template);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Template save response:', result);
      
      toast({
        title: "Template Saved",
        description: `Template for ${division.name} has been updated.`,
      });
      setIsEditing(false);
      onTemplateUpdate?.();
    } catch (error) {
      console.error('Template save error:', error);
      toast({
        title: "Error",
        description: `Failed to save template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const createDefaultTemplate = () => {
    const defaultTemplate: ExtractionTemplate = {
      id: `custom-${division.id}-${Date.now()}`,
      name: `${division.name} Schedule`,
      description: `Custom extraction template for ${division.name}`,
      columns: [
        { name: 'Mark', type: 'text', description: 'Item mark/number', required: true },
        { name: 'Count', type: 'number', description: 'Quantity', required: true },
        { name: 'Description', type: 'text', description: 'Item description', required: true },
        { name: 'Comments', type: 'text', description: 'Additional notes' }
      ],
      divisionId: division.id
    };
    setTemplate(defaultTemplate);
    setIsEditing(true);
  };

  const addColumn = () => {
    console.log('Add column clicked!', { template: !!template, newColumnName: newColumn.name });
    if (!template || !newColumn.name.trim()) {
      console.log('Add column failed - missing template or name');
      return;
    }

    console.log('Adding column:', newColumn);
    setTemplate({
      ...template,
      columns: [...template.columns, { ...newColumn }]
    });

    setNewColumn({
      name: '',
      type: 'text',
      description: '',
      required: false,
      example: ''
    });
    
    console.log('Column added successfully');
  };

  const removeColumn = (index: number) => {
    if (!template) return;
    
    setTemplate({
      ...template,
      columns: template.columns.filter((_, i) => i !== index)
    });
  };

  const updateColumn = (index: number, updatedColumn: TemplateColumn) => {
    if (!template) return;
    
    const updatedColumns = [...template.columns];
    updatedColumns[index] = updatedColumn;
    setTemplate({
      ...template,
      columns: updatedColumns
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-purple-600"
          title="Manage extraction template"
        >
          <Settings className="h-3 w-3" />
        </button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Extraction Template - {division.name}
          </DialogTitle>
        </DialogHeader>

        {!template ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No extraction template configured for this division.
            </p>
            <Button onClick={createDefaultTemplate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Template Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {!isEditing ? (
                      <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button onClick={saveTemplate} size="sm">
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isEditing && (
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      value={template.name}
                      onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="template-description">Description</Label>
                    <Input
                      id="template-description"
                      value={template.description}
                      onChange={(e) => setTemplate({ ...template, description: e.target.value })}
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Template Columns */}
            <Card>
              <CardHeader>
                <CardTitle>Template Columns</CardTitle>
                <CardDescription>
                  Define the structure that AI will use to extract data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {template.columns.map((column, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 border rounded-lg bg-gray-50/50">
                      {editingColumnIndex === index ? (
                        // Edit mode for this column
                        <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Column Name</Label>
                              <Input
                                value={column.name}
                                onChange={(e) => updateColumn(index, { ...column, name: e.target.value })}
                                className="border-gray-300 focus:border-purple-500"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Type</Label>
                              <Select
                                value={column.type}
                                onValueChange={(value: any) => updateColumn(index, { ...column, type: value })}
                              >
                                <SelectTrigger className="border-gray-300 focus:border-purple-500">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="auto">Auto</SelectItem>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="dimension">Dimension</SelectItem>
                                  <SelectItem value="date">Date</SelectItem>
                                  <SelectItem value="boolean">Yes/No</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Description</Label>
                              <Input
                                value={column.description || ''}
                                onChange={(e) => updateColumn(index, { ...column, description: e.target.value })}
                                placeholder="Optional description"
                                className="border-gray-300 focus:border-purple-500"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Example</Label>
                              <Input
                                value={column.example || ''}
                                onChange={(e) => updateColumn(index, { ...column, example: e.target.value })}
                                placeholder="Example value"
                                className="border-gray-300 focus:border-purple-500"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={column.required}
                                onChange={(e) => updateColumn(index, { ...column, required: e.target.checked })}
                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                              />
                              <span className="font-medium">Required field</span>
                            </label>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => setEditingColumnIndex(null)}
                                variant="outline"
                                size="sm"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => setEditingColumnIndex(null)}
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // Display mode
                        <>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-lg text-gray-900">{column.name}</span>
                              <Badge variant="secondary" className="text-xs px-2 py-1">
                                {column.type}
                              </Badge>
                              {column.required && (
                                <Badge variant="destructive" className="text-xs px-2 py-1">
                                  Required
                                </Badge>
                              )}
                            </div>
                            {column.description && (
                              <p className="text-sm text-gray-600 mt-1">{column.description}</p>
                            )}
                            {column.example && (
                              <p className="text-xs text-gray-500 mt-1">Example: {column.example}</p>
                            )}
                          </div>
                          {isEditing && (
                            <div className="flex gap-2">
                              <Button
                                onClick={() => setEditingColumnIndex(index)}
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                onClick={() => removeColumn(index)}
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  {isEditing && (
                    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/30">
                      <h4 className="font-semibold text-gray-900 mb-4">Add New Column</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-column-name" className="text-sm font-medium text-gray-700">
                            Column Name
                          </Label>
                          <Input
                            id="new-column-name"
                            value={newColumn.name}
                            onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                            placeholder="e.g. Mark, Count, Description"
                            className="border-gray-300 focus:border-purple-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-column-type" className="text-sm font-medium text-gray-700">
                            Type
                          </Label>
                          <Select
                            value={newColumn.type}
                            onValueChange={(value: any) => setNewColumn({ ...newColumn, type: value })}
                          >
                            <SelectTrigger className="border-gray-300 focus:border-purple-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="auto">Auto</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="dimension">Dimension</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="boolean">Yes/No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-column-description" className="text-sm font-medium text-gray-700">
                            Description
                          </Label>
                          <Input
                            id="new-column-description"
                            value={newColumn.description}
                            onChange={(e) => setNewColumn({ ...newColumn, description: e.target.value })}
                            placeholder="Optional description"
                            className="border-gray-300 focus:border-purple-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-column-example" className="text-sm font-medium text-gray-700">
                            Example
                          </Label>
                          <Input
                            id="new-column-example"
                            value={newColumn.example}
                            onChange={(e) => setNewColumn({ ...newColumn, example: e.target.value })}
                            placeholder="Example value"
                            className="border-gray-300 focus:border-purple-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={newColumn.required}
                            onChange={(e) => setNewColumn({ ...newColumn, required: e.target.checked })}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="font-medium">Required field</span>
                        </label>
                        <Button 
                          onClick={addColumn} 
                          disabled={!newColumn.name.trim()}
                          className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Column
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">How Templates Work:</h4>
              <ul className="space-y-1">
                <li>• AI will analyze marquee selections and map data to these columns</li>
                <li>• Missing values will be marked as null instead of being guessed</li>
                <li>• Templates ensure consistent data structure across extractions</li>
                <li>• You can customize templates per construction division</li>
              </ul>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}