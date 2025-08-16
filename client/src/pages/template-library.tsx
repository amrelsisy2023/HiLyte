import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Plus, 
  Edit, 
  Copy, 
  Trash2, 
  Save, 
  X, 
  BookOpen, 
  FileText,
  Settings,
  Download,
  Upload,
  ArrowLeft,

} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

interface TemplateColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'dimension' | 'boolean';
  description?: string;
  required?: boolean;
  example?: string;
}

interface ExtractionTemplate {
  id: string;
  name: string;
  description: string;
  columns: TemplateColumn[];
  divisionId?: number;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface ConstructionDivision {
  id: number;
  name: string;
  color: string;
  extractionTemplate?: string;
}

const COLUMN_TYPES = [
  { value: 'text', label: 'Text', description: 'General text content' },
  { value: 'number', label: 'Number', description: 'Numeric values' },
  { value: 'date', label: 'Date', description: 'Date values' },
  { value: 'dimension', label: 'Dimension', description: 'Measurements with units' },
  { value: 'boolean', label: 'Yes/No', description: 'True/false values' }
];

export default function TemplateLibrary() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExtractionTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<Partial<ExtractionTemplate>>({
    name: '',
    description: '',
    columns: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch construction divisions
  const { data: divisions = [] } = useQuery<ConstructionDivision[]>({
    queryKey: ['/api/construction-divisions'],
  });

  // Fetch default templates
  const { data: defaultTemplates = [] } = useQuery<ExtractionTemplate[]>({
    queryKey: ['/api/extraction-templates/defaults'],
  });

  // Get all templates from divisions
  const getAllTemplates = (): ExtractionTemplate[] => {
    const divisionTemplates: ExtractionTemplate[] = divisions
      .filter(div => div.extractionTemplate)
      .map(div => {
        try {
          const template = JSON.parse(div.extractionTemplate!);
          return {
            ...template,
            id: `division-${div.id}`,
            divisionId: div.id,
            isDefault: false
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as ExtractionTemplate[];

    return [
      ...defaultTemplates.map(t => ({ ...t, isDefault: true })),
      ...divisionTemplates
    ];
  };

  const allTemplates = getAllTemplates();
  const filteredTemplates = allTemplates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: ExtractionTemplate) => {
      if (template.divisionId) {
        // Update existing division template
        return apiRequest(`/api/construction-divisions/${template.divisionId}/template`, "POST", template);
      } else {
        // Create new template (would need new endpoint for global templates)
        throw new Error('Global template creation not yet implemented');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/construction-divisions'] });
      toast({
        title: "Template saved",
        description: "Your template has been saved successfully.",
      });
      setShowCreateDialog(false);
      setEditingTemplate(null);
      resetNewTemplate();
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save template.",
        variant: "destructive",
      });
    },
  });



  const resetNewTemplate = () => {
    setNewTemplate({
      name: '',
      description: '',
      columns: []
    });
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    resetNewTemplate();
    setShowCreateDialog(true);
  };

  const handleEditTemplate = (template: ExtractionTemplate) => {
    if (template.isDefault) {
      // For default templates, create a copy
      setNewTemplate({
        name: `${template.name} (Copy)`,
        description: template.description,
        columns: [...template.columns]
      });
      setEditingTemplate(null);
    } else {
      setEditingTemplate(template);
      setNewTemplate(template);
    }
    setShowCreateDialog(true);
  };

  const handleCopyTemplate = (template: ExtractionTemplate) => {
    setNewTemplate({
      name: `${template.name} (Copy)`,
      description: template.description,
      columns: [...template.columns]
    });
    setEditingTemplate(null);
    setShowCreateDialog(true);
  };

  const handleSaveTemplate = () => {
    if (!newTemplate.name || !newTemplate.columns?.length) {
      toast({
        title: "Validation Error",
        description: "Template name and at least one column are required.",
        variant: "destructive",
      });
      return;
    }

    // For now, save to first available division
    // In a real system, we'd allow selecting division or creating global templates
    const targetDivision = divisions[0];
    if (!targetDivision) {
      toast({
        title: "No divisions available",
        description: "Please create a construction division first.",
        variant: "destructive",
      });
      return;
    }

    const templateToSave: ExtractionTemplate = {
      ...newTemplate,
      id: editingTemplate?.id || `template-${Date.now()}`,
      divisionId: editingTemplate?.divisionId || targetDivision.id,
      columns: newTemplate.columns || []
    } as ExtractionTemplate;

    saveTemplateMutation.mutate(templateToSave);
  };

  const addColumn = () => {
    console.log('Template Library - Add column clicked!', { 
      newTemplate: newTemplate, 
      currentColumns: newTemplate.columns?.length || 0 
    });
    
    // Use functional state update to avoid closure issues
    setNewTemplate(currentTemplate => {
      const newColumns = [
        ...(currentTemplate.columns || []),
        {
          name: `Column ${(currentTemplate.columns?.length || 0) + 1}`,
          type: 'text' as const,
          description: '',
          required: false
        }
      ];
      
      const updatedTemplate = {
        ...currentTemplate,
        columns: newColumns
      };
      
      console.log('Template Library - Column added successfully, new columns:', newColumns);
      console.log('Template Library - Updated template state:', updatedTemplate);
      
      return updatedTemplate;
    });
  };

  const updateColumn = (index: number, updates: Partial<TemplateColumn>) => {
    const updatedColumns = [...(newTemplate.columns || [])];
    updatedColumns[index] = { ...updatedColumns[index], ...updates };
    setNewTemplate({ ...newTemplate, columns: updatedColumns });
  };

  const removeColumn = (index: number) => {
    const updatedColumns = (newTemplate.columns || []).filter((_, i) => i !== index);
    setNewTemplate({ ...newTemplate, columns: updatedColumns });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Main
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BookOpen className="h-8 w-8 text-blue-600" />
                Template Library
              </h1>
            </div>
            <p className="text-gray-600 mt-2">
              Create and manage extraction templates for consistent data capture
            </p>
          </div>
          <Button onClick={handleCreateTemplate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>

        {/* Search and filters */}
        <div className="mb-6">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Construction Divisions with AI Templates */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Construction Divisions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {divisions.map((division) => {
              const template = division.extractionTemplate ? 
                (() => {
                  try {
                    return JSON.parse(division.extractionTemplate);
                  } catch {
                    return null;
                  }
                })() : null;

              return (
                <Card key={division.id} className="relative group hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: division.color }}
                      />
                      <CardTitle className="text-lg">{division.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {template && template.columns ? (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-gray-700">
                          Template: {template.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          {template.description}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {template.columns.slice(0, 4).map((column: any, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {column.name} ({column.type})
                            </Badge>
                          ))}
                          {template.columns.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.columns.length - 4} more
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTemplate({
                              ...template,
                              id: `division-${division.id}`,
                              divisionId: division.id
                            })}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <div className="text-sm text-gray-500 mb-3">
                          No template created yet
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateTemplate()}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Create Template
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* All Templates */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">All Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="relative group hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        {template.name}
                      </CardTitle>
                      {template.isDefault && (
                        <Badge variant="secondary" className="mt-1">
                          System Template
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyTemplate(template)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">{template.description}</p>
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      Columns ({template.columns.length}):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {template.columns.slice(0, 3).map((column, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {column.name}
                        </Badge>
                      ))}
                      {template.columns.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.columns.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first template to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreateTemplate}>
                Create Template
              </Button>
            )}
          </div>
        )}

        {/* Create/Edit Template Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="template-dialog-description">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </DialogTitle>
              <div id="template-dialog-description" className="sr-only">
                Create or edit a template with custom columns for data extraction
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Basic info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Template Name</label>
                  <Input
                    value={newTemplate.name || ''}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="e.g., Door Schedule, Equipment List"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Input
                    value={newTemplate.description || ''}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    placeholder="Brief description of this template"
                  />
                </div>
              </div>

              {/* Columns */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Columns ({(newTemplate.columns || []).length})</h3>
                  <Button onClick={addColumn} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Column
                  </Button>
                </div>

                <div className="space-y-4">
                  {(newTemplate.columns || []).map((column, index) => (
                    <Card key={`${column.name}-${index}-${newTemplate.columns?.length || 0}`} className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Column Name</label>
                          <Input
                            value={column.name}
                            onChange={(e) => updateColumn(index, { name: e.target.value })}
                            placeholder="Column name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Type</label>
                          <select
                            value={column.type}
                            onChange={(e) => updateColumn(index, { type: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {COLUMN_TYPES.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeColumn(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                        <Input
                          value={column.description || ''}
                          onChange={(e) => updateColumn(index, { description: e.target.value })}
                          placeholder="What this column contains"
                        />
                      </div>
                    </Card>
                  ))}
                </div>

                {(!newTemplate.columns || newTemplate.columns.length === 0) && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <Settings className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No columns added yet</p>
                    <Button onClick={addColumn} variant="outline" className="mt-2">
                      Add First Column
                    </Button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveTemplate}
                  disabled={saveTemplateMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}