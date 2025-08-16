import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Save, X, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { ConstructionDivision } from '@shared/schema';


interface ConstructionDivisionManagerProps {
  isOpen: boolean;
  onClose: () => void;
  visibleDivisions?: Set<number>;
  onDivisionVisibilityChange?: (visibleDivisions: Set<number>) => void;
  extractedData?: Record<number, Array<{
    id: string;
    type: string;
    extractedAt: Date;
    sourceLocation: string;
    data: string;
  }>>;
}

export default function ConstructionDivisionManager({ 
  isOpen, 
  onClose, 
  visibleDivisions = new Set(),
  onDivisionVisibilityChange,
  extractedData = {}
}: ConstructionDivisionManagerProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newDivisionName, setNewDivisionName] = useState('');
  const [newDivisionCode, setNewDivisionCode] = useState('');
  const [newDivisionColor, setNewDivisionColor] = useState('#3B82F6');

  const [showAddForm, setShowAddForm] = useState(false);
  const [localVisibleDivisions, setLocalVisibleDivisions] = useState<Set<number>>(new Set(visibleDivisions));
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [divisionToDelete, setDivisionToDelete] = useState<ConstructionDivision | null>(null);
  const { toast } = useToast();

  // Fetch construction divisions
  const { data: divisions = [], isLoading } = useQuery<ConstructionDivision[]>({
    queryKey: ['/api/construction-divisions'],
    enabled: isOpen,
  });

  // Use the extracted data passed as props (same source as sidebar)
  const extractedDataByDivision = extractedData;

  // Update local visibility state when modal opens or visibility prop changes
  React.useEffect(() => {
    if (isOpen) {
      setLocalVisibleDivisions(new Set(visibleDivisions));
    }
  }, [isOpen, visibleDivisions, divisions]);

  // Visibility toggle helpers
  const handleToggleVisibility = (divisionId: number) => {
    const newVisible = new Set(localVisibleDivisions);
    if (newVisible.has(divisionId)) {
      newVisible.delete(divisionId);
    } else {
      newVisible.add(divisionId);
    }
    setLocalVisibleDivisions(newVisible);
    if (onDivisionVisibilityChange) {
      onDivisionVisibilityChange(newVisible);
    }
  };

  const handleShowAll = () => {
    const allIds = new Set(divisions?.map(d => d.id) || []);
    setLocalVisibleDivisions(allIds);
    if (onDivisionVisibilityChange) {
      onDivisionVisibilityChange(allIds);
    }
  };

  const handleHideAll = () => {
    const newVisible = new Set<number>();
    setLocalVisibleDivisions(newVisible);
    if (onDivisionVisibilityChange) {
      onDivisionVisibilityChange(newVisible);
    }
  };

  // Add division mutation
  const addDivisionMutation = useMutation({
    mutationFn: async (data: { name: string; code: string; color: string }) => {
      const response = await fetch('/api/construction-divisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add division');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/construction-divisions'] });
      setNewDivisionName('');
      setNewDivisionCode('');
      setNewDivisionColor('#3B82F6');
      setShowAddForm(false);
      toast({ title: 'Division added successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to add division', variant: 'destructive' });
    },
  });

  // Update division mutation
  const updateDivisionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; color: string } }) => {
      const response = await fetch(`/api/construction-divisions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update division');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/construction-divisions'] });
      setEditingId(null);
      setEditingName('');
      toast({ title: 'Division updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update division', variant: 'destructive' });
    },
  });

  // Delete division mutation
  const deleteDivisionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/construction-divisions/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete division');
      // No need to parse JSON for 204 No Content response
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/construction-divisions'] });
      toast({ title: 'Division deleted successfully' });
    },
    onError: (error) => {
      console.error('Delete division error:', error);
      toast({ title: 'Failed to delete division', variant: 'destructive' });
    },
  });



  const handleStartEdit = (division: ConstructionDivision) => {
    setEditingId(division.id);
    setEditingName(division.name);
  };

  const handleSaveEdit = (division: ConstructionDivision) => {
    if (editingName.trim()) {
      updateDivisionMutation.mutate({
        id: division.id,
        data: { name: editingName.trim(), color: division.color },
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleAddDivision = () => {
    if (newDivisionName.trim() && newDivisionCode.trim()) {
      // Format the name to include the code: "00.1 - TEST"
      const formattedName = `${newDivisionCode.trim()} - ${newDivisionName.trim()}`;
      
      addDivisionMutation.mutate({
        name: formattedName,
        code: newDivisionCode.trim(),
        color: newDivisionColor,
      });
    }
  };

  const handleCancelAdd = () => {
    setNewDivisionName('');
    setNewDivisionCode('');
    setNewDivisionColor('#3B82F6');
    setShowAddForm(false);
  };

  const handleDeleteClick = (division: ConstructionDivision) => {
    setDivisionToDelete(division);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (divisionToDelete) {
      deleteDivisionMutation.mutate(divisionToDelete.id);
      setDeleteConfirmOpen(false);
      setDivisionToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setDivisionToDelete(null);
  };



  const predefinedColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#0EA5E9', '#E11D48', '#059669', '#D97706', '#7C3AED',
    '#DB2777', '#0891B2', '#65A30D', '#EA580C', '#4F46E5',
    '#DC2626', '#16A34A', '#CA8A04', '#9333EA', '#BE185D',
    '#0284C7', '#15803D', '#A16207', '#7C2D12', '#374151'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-semibold text-gray-900">Manage Construction Divisions</h2>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Add new division */}
          <div className="mb-6">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full p-4 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors text-blue-600 font-medium flex flex-col items-center"
              >
                <Plus className="h-5 w-5 mb-2" />
                Add Division
              </button>
            ) : (
              <div className="p-4 rounded-2xl border-2 border-blue-300 bg-blue-50 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-blue-900">Add New Division</h3>
                  <Button variant="ghost" size="sm" onClick={handleCancelAdd}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Division Name</label>
                    <Input
                      value={newDivisionName}
                      onChange={(e) => setNewDivisionName(e.target.value)}
                      placeholder="e.g., Thermal and Moisture Protection"
                      className="text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddDivision();
                        } else if (e.key === 'Escape') {
                          handleCancelAdd();
                        }
                      }}
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Division Code</label>
                    <Input
                      value={newDivisionCode}
                      onChange={(e) => setNewDivisionCode(e.target.value)}
                      placeholder="e.g., 07"
                      className="text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddDivision();
                        } else if (e.key === 'Escape') {
                          handleCancelAdd();
                        }
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700">Division Color</label>
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm cursor-pointer ring-2 ring-gray-200 hover:ring-blue-300 transition-all"
                        style={{ backgroundColor: newDivisionColor }}
                        onClick={() => document.getElementById('color-picker')?.click()}
                        title="Click to use custom color"
                      />
                      <input
                        id="color-picker"
                        type="color"
                        value={newDivisionColor}
                        onChange={(e) => setNewDivisionColor(e.target.value)}
                        className="w-0 h-0 opacity-0"
                      />
                      <div className="flex flex-wrap gap-1">
                        {predefinedColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setNewDivisionColor(color)}
                            className={`w-6 h-6 rounded-full border-2 border-white shadow-sm cursor-pointer hover:scale-110 transition-transform ${
                              newDivisionColor === color ? 'ring-2 ring-blue-400' : 'ring-1 ring-gray-200'
                            }`}
                            style={{ backgroundColor: color }}
                            title={`Use ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleAddDivision}
                      disabled={!newDivisionName.trim() || !newDivisionCode.trim() || addDivisionMutation.isPending}
                      className="flex-1"
                      size="sm"
                    >
                      {addDivisionMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Division
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelAdd}
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Visibility Controls */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Division Visibility</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
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
          </div>

          {/* Existing divisions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Existing Divisions</h3>
            
            {isLoading ? (
              <div className="text-center py-8 text-gray-500 text-sm">Loading divisions...</div>
            ) : divisions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">No divisions found</div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {divisions.map((division) => (
                    <div
                      key={division.id}
                      className="w-full rounded-2xl border transition-colors bg-white border-gray-200 hover:border-gray-300"
                    >
                      <div className="flex items-start px-4 py-3 min-h-[3.5rem]">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          <div
                            className="w-4 h-4 rounded-full border border-white mt-0.5 flex-shrink-0"
                            style={{ backgroundColor: division.color }}
                          />
                          <div className="flex-1 min-w-0 pr-4">
                            {editingId === division.id ? (
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="text-xs font-medium"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleSaveEdit(division);
                                  } else if (e.key === 'Escape') {
                                    handleCancelEdit();
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <p className="text-xs font-medium text-gray-900 leading-tight break-words">
                                {division.name}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {extractedDataByDivision[division.id]?.length || 0} items extracted
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1 mt-1">
                          {editingId === division.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(division)}
                                disabled={updateDivisionMutation.isPending}
                                className="p-1.5 rounded hover:bg-gray-100 text-green-600 hover:text-green-700"
                              >
                                <Save className="h-3 w-3" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleToggleVisibility(division.id)}
                                className={`p-1.5 rounded hover:bg-gray-100 ${
                                  localVisibleDivisions.has(division.id)
                                    ? 'text-blue-600 hover:text-blue-700' 
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                                title={localVisibleDivisions.has(division.id) ? 'Hide division' : 'Show division'}
                              >
                                {localVisibleDivisions.has(division.id) ? (
                                  <Eye className="h-3 w-3" />
                                ) : (
                                  <EyeOff className="h-3 w-3" />
                                )}
                              </button>
                              <button
                                onClick={() => handleStartEdit(division)}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                              >
                                <Edit className="h-3 w-3" />
                              </button>

                              {/* Only show delete button for custom divisions (not default ones) */}
                              {!division.isDefault && (
                                <button
                                  onClick={() => handleDeleteClick(division)}
                                  disabled={deleteDivisionMutation.isPending}
                                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
                                  title="Delete custom division"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Construction Division
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              Are you sure you want to delete "{divisionToDelete?.name}"? This action cannot be undone and will remove all data associated with this division.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDelete}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteDivisionMutation.isPending}
            >
              {deleteDivisionMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete Division'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}