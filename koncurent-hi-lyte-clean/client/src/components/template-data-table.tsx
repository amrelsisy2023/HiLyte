import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X, Download, Trash2, Plus, Eye, EyeOff, Settings, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AddColumnForm from "./add-column-form";
import ColumnManager from "./column-manager";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

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
  divisionId: number;
}

interface ExtractedDataItem {
  id: string;
  type: string;
  extractedAt: Date;
  sourceLocation: string;
  data: string;
}

interface TemplateDataTableProps {
  selectedDivision: {
    id: number;
    name: string;
    color: string;
  };
  extractedData: ExtractedDataItem[];
  onNavigateToPage?: (pageNumber: number) => void;
  onDeleteExtractedData?: (extractionId: string) => void;
  onDeleteData?: () => void;
  onDataChange?: () => void;
}

export default function TemplateDataTable({ 
  selectedDivision, 
  extractedData, 
  onNavigateToPage,
  onDeleteExtractedData,
  onDeleteData,
  onDataChange
}: TemplateDataTableProps) {
  const [template, setTemplate] = useState<ExtractionTemplate | null>(null);
  const [structuredData, setStructuredData] = useState<Record<string, any>[]>([]);
  const [editingCell, setEditingCell] = useState<{rowIndex: number, columnName: string} | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [showAddColumnForm, setShowAddColumnForm] = useState(false);
  const [editingColumnIndex, setEditingColumnIndex] = useState<number | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [activeColumnForDrag, setActiveColumnForDrag] = useState<string | null>(null);
  const [isEditingNewColumn, setIsEditingNewColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const { toast } = useToast();

  // Removed debug logging to improve performance

  // Handle global clicks to hide drag handles
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as Element;
      // Check if the click was outside of column headers
      if (!target.closest('th')) {
        setActiveColumnForDrag(null);
      }
    };

    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  // Load template for this division
  useEffect(() => {
    loadTemplate();
  }, [selectedDivision?.id]);

  // Parse extracted data when template changes or prepare template-only display
  useEffect(() => {
    if (template) {
      if (extractedData.length > 0) {
        parseExtractedDataWithTemplate();
      } else {
        // Show empty template structure when no data exists
        setStructuredData([]);
      }
    }
  }, [template, extractedData]);

  // Auto-update template when new columns are detected in data
  const updateTemplateIfNeeded = async (newColumns: string[]) => {
    if (!template || newColumns.length === 0) return;
    
    const existingColumnNames = template.columns.map(col => col.name);
    const missingColumns = newColumns.filter(col => !existingColumnNames.includes(col));
    
    // Only update if there are genuinely new columns to add
    if (missingColumns.length > 0) {
      console.log('Detected new columns, updating template:', missingColumns);
      
      const updatedTemplate = {
        ...template,
        columns: [
          ...template.columns,
          ...missingColumns.map(columnName => ({
            name: columnName,
            type: 'text' as const,
            description: `Auto-generated column for ${columnName}`,
            required: false,
            example: ''
          }))
        ]
      };
      
      try {
        const response = await apiRequest(`/api/construction-divisions/${selectedDivision.id}/template`, "POST", updatedTemplate);
        if (response.ok) {
          setTemplate(updatedTemplate);
          // Removed toast to prevent modal-like popup when switching divisions
        }
      } catch (error) {
        console.error('Failed to update template:', error);
      }
    }
  };

  const loadTemplate = async () => {
    try {
      const response = await apiRequest(`/api/construction-divisions/${selectedDivision.id}/template`, "GET");
      const templateData = await response.json();
      setTemplate(templateData);
    } catch (error) {
      console.error('Failed to load template:', error);
      setTemplate(null);
    }
  };

  const parseExtractedDataWithTemplate = async () => {
    if (!template) return;

    console.log('=== PARSING EXTRACTED DATA ===');
    console.log('Template:', template);
    console.log('Extracted data items:', extractedData.length);
    console.log('Full extracted data:', extractedData);

    const allRows: Record<string, any>[] = [];
    const allDetectedColumns = new Set<string>();
    
    extractedData.forEach((item, index) => {
      console.log(`Processing item ${index}:`, item);
      
      try {
        // Try to parse as JSON first (if data was extracted with template)
        if (item.data.startsWith('[') || item.data.startsWith('{')) {
          console.log('Item has JSON format, parsing...');
          const parsedData = JSON.parse(item.data);
          if (Array.isArray(parsedData)) {
            parsedData.forEach(row => {
              Object.keys(row).forEach(key => allDetectedColumns.add(key));
            });
            allRows.push(...parsedData.map(row => ({ ...row, _sourceId: item.id })));
          } else {
            Object.keys(parsedData).forEach(key => allDetectedColumns.add(key));
            allRows.push({ ...parsedData, _sourceId: item.id });
          }
        } else {
          console.log('Item has plain text format, checking for table data...');
          // For plain text extractions, create a simple row with the text content
          // This handles cases where AI extraction returns plain text instead of structured data
          const textContent = item.data.trim();
          if (textContent && textContent.length > 0) {
            console.log('Creating row from text content');
            // Create a default row with the extracted text
            const row = {
              'Extracted Text': textContent,
              'Source': item.sourceLocation,
              'Extracted At': new Date(item.extractedAt).toLocaleString(),
              _sourceId: item.id
            };
            allDetectedColumns.add('Extracted Text');
            allDetectedColumns.add('Source');
            allDetectedColumns.add('Extracted At');
            allRows.push(row);
          }
          
          // Also try to parse markdown/CSV format and map to template columns
          const tableData = parseTableData(item.data);
          if (tableData) {
            console.log('Found table data in text:', tableData);
            // Add detected headers to our column set
            tableData.headers.forEach(header => allDetectedColumns.add(header));
            
            const mappedRows = mapToTemplateColumns(tableData, template);
            allRows.push(...mappedRows.map(row => ({ ...row, _sourceId: item.id })));
          }
        }
      } catch (error) {
        console.error('Error parsing extracted data:', error);
      }
    });

    // Check if we need to update the template with new columns
    // Only update if there's actually new data to process
    const detectedColumnArray = Array.from(allDetectedColumns);
    if (detectedColumnArray.length > 0 && allRows.length > 0) {
      await updateTemplateIfNeeded(detectedColumnArray);
    }

    console.log('Final structured data being set:', allRows);
    console.log('All detected columns:', detectedColumnArray);
    setStructuredData(allRows);
  };

  const startEditingColumnName = (columnIndex: number, currentName: string) => {
    setEditingColumnIndex(columnIndex);
    setEditingColumnName(currentName);
  };

  const toggleColumnVisibility = (columnName: string) => {
    const newHiddenColumns = new Set(hiddenColumns);
    if (newHiddenColumns.has(columnName)) {
      newHiddenColumns.delete(columnName);
    } else {
      newHiddenColumns.add(columnName);
    }
    setHiddenColumns(newHiddenColumns);
  };

  const deleteColumn = async (columnIndex: number) => {
    try {
      if (!template) return;
      
      const columnToDelete = template.columns[columnIndex];
      
      // Remove the column from template
      const updatedTemplate = {
        ...template,
        columns: template.columns.filter((_, index) => index !== columnIndex)
      };
      
      // Update template in database
      const response = await apiRequest(`/api/construction-divisions/${selectedDivision.id}/template`, "POST", updatedTemplate);
      
      if (response.ok) {
        setTemplate(updatedTemplate);
        
        // Update local data by removing the column from all rows
        const updatedData = structuredData.map(row => {
          const newRow = { ...row };
          delete newRow[columnToDelete.name];
          return newRow;
        });
        setStructuredData(updatedData);
      } else {
        throw new Error('Failed to update template in database');
      }
      
    } catch (error) {
      console.error('Failed to delete column:', error);
      toast({
        title: "Delete Failed",
        description: "Could not delete column. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateColumn = async (columnIndex: number, updates: Partial<TemplateColumn>) => {
    try {
      if (!template) return;
      
      const updatedTemplate = {
        ...template,
        columns: template.columns.map((column, index) => 
          index === columnIndex ? { ...column, ...updates } : column
        )
      };
      
      const response = await apiRequest(`/api/construction-divisions/${selectedDivision.id}/template`, "POST", updatedTemplate);
      
      if (response.ok) {
        setTemplate(updatedTemplate);
        
        // Removed toast to prevent modal-like popup when switching divisions
      } else {
        throw new Error('Failed to update template in database');
      }
      
    } catch (error) {
      console.error('Failed to update column:', error);
      toast({
        title: "Update Failed",
        description: "Could not update column. Please try again.",
        variant: "destructive",
      });
    }
  };

  const saveColumnName = async (columnIndex: number) => {
    if (!template || !editingColumnName.trim()) {
      setEditingColumnIndex(null);
      setEditingColumnName('');
      return;
    }

    const updatedTemplate = { ...template };
    const oldName = updatedTemplate.columns[columnIndex].name;
    updatedTemplate.columns[columnIndex].name = editingColumnName.trim();

    try {
      const response = await apiRequest(`/api/construction-divisions/${selectedDivision.id}/template`, "POST", updatedTemplate);
      if (response.ok) {
        setTemplate(updatedTemplate);
        
        // Update existing data to use the new column name
        const updatedStructuredData = structuredData.map(row => {
          if (row[oldName] !== undefined) {
            const newRow = { ...row };
            newRow[editingColumnName.trim()] = newRow[oldName];
            delete newRow[oldName];
            return newRow;
          }
          return row;
        });
        setStructuredData(updatedStructuredData);
        

      }
    } catch (error) {
      console.error('Failed to rename column:', error);
      toast({
        title: "Error",
        description: "Failed to rename column",
        variant: "destructive",
      });
    }

    setEditingColumnIndex(null);
    setEditingColumnName('');
  };

  const handleAddColumn = async (columnData: { name: string; type: string; description?: string; required: boolean }) => {
    setIsAddingColumn(true);
    try {
      if (!template) return;
      
      // Create new column with unique name
      let columnName = columnData.name;
      let counter = 1;
      while (template.columns.some(col => col.name === columnName)) {
        columnName = `${columnData.name} ${counter}`;
        counter++;
      }
      
      const newColumn: TemplateColumn = {
        name: columnName,
        type: columnData.type as 'text' | 'number',
        description: columnData.description || '',
        required: columnData.required,
        example: ''
      };
      
      // Update template with new column
      const updatedTemplate = {
        ...template,
        columns: [...template.columns, newColumn]
      };
      
      // Save to database
      const response = await apiRequest(`/api/construction-divisions/${selectedDivision.id}/template`, "POST", updatedTemplate);
      
      if (response.ok) {
        setTemplate(updatedTemplate);
        
        // Update local state
        const updatedData = structuredData.map(row => ({
          ...row,
          [columnName]: '' // Add empty value for new column
        }));
        setStructuredData(updatedData);
        
        setShowAddColumnForm(false);
      } else {
        throw new Error('Failed to save template to database');
      }
      
    } catch (error) {
      console.error('Error adding column:', error);
      toast({
        title: "Error",
        description: `Failed to add column: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsAddingColumn(false);
    }
  };

  const handleDragEnd = async (result: any) => {
    // Reset active column for drag
    setActiveColumnForDrag(null);
    
    if (!result.destination || !template) return;
    
    const items = Array.from(template.columns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    const updatedTemplate = {
      ...template,
      columns: items
    };
    
    try {
      const response = await apiRequest(`/api/construction-divisions/${selectedDivision.id}/template`, "POST", updatedTemplate);
      if (response.ok) {
        setTemplate(updatedTemplate);
      }
    } catch (error) {
      console.error('Failed to reorder columns:', error);
    }
  };

  const handleCreateNewColumn = async () => {
    if (!template || !newColumnName.trim()) return;
    
    setIsAddingColumn(true);
    
    const newColumn: TemplateColumn = {
      name: newColumnName.trim(),
      type: 'text',
      required: false,
      description: 'User-created column'
    };
    
    const updatedTemplate = {
      ...template,
      columns: [...template.columns, newColumn]
    };
    
    try {
      const response = await apiRequest(`/api/construction-divisions/${selectedDivision.id}/template`, "POST", updatedTemplate);
      if (response.ok) {
        setTemplate(updatedTemplate);
        setIsEditingNewColumn(false);
        setNewColumnName('');
        
        // Removed toast to prevent modal-like popup when switching divisions
      }
    } catch (error) {
      console.error('Failed to create column:', error);
      toast({
        title: "Error",
        description: "Failed to create column. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAddingColumn(false);
    }
  };

  // Check localStorage for the "don't ask again" preference
  const shouldSkipDeleteConfirmation = () => {
    return localStorage.getItem('skipDeleteConfirmation') === 'true';
  };

  // Handle delete extraction data
  const handleDeleteData = () => {
    if (shouldSkipDeleteConfirmation()) {
      performDelete();
    } else {
      setShowDeleteDialog(true);
    }
  };

  // Perform the actual deletion
  const performDelete = async () => {
    try {
      const response = await apiRequest(`/api/extracted-data?divisionId=${selectedDivision.id}`, "DELETE");
      if (response.ok) {
        toast({
          title: "Success",
          description: "All extracted data has been deleted.",
        });
        onDataUpdate?.(); // Refresh the data
      } else {
        throw new Error('Failed to delete data');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete data. Please try again.",
        variant: "destructive",
      });
    }
    setShowDeleteDialog(false);
  };

  // Handle confirm delete with optional "don't ask again"
  const handleConfirmDelete = () => {
    if (dontAskAgain) {
      localStorage.setItem('skipDeleteConfirmation', 'true');
    }
    performDelete();
  };

  const parseTableData = (data: string) => {
    // Parse markdown table format
    const lines = data.trim().split('\n');
    
    let headerLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('|') && lines[i].trim() !== '' && !lines[i].includes('---')) {
        headerLineIndex = i;
        break;
      }
    }
    
    if (headerLineIndex === -1) return null;
    
    const headers = lines[headerLineIndex].split('|').map(h => h.trim()).filter(h => h);
    
    let separatorIndex = -1;
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      if (lines[i].includes('---')) {
        separatorIndex = i;
        break;
      }
    }
    
    if (separatorIndex === -1) return null;
    
    const rows = lines.slice(separatorIndex + 1)
      .filter(line => line.includes('|') && line.trim() !== '')
      .map(line => {
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        while (cells.length < headers.length) {
          cells.push('');
        }
        return cells.slice(0, headers.length);
      });
    
    return { headers, rows };
  };

  const mapToTemplateColumns = (tableData: { headers: string[], rows: string[][] }, template: ExtractionTemplate) => {
    const templateColumns = template.columns;
    const mappedRows: Record<string, any>[] = [];
    
    tableData.rows.forEach(row => {
      const mappedRow: Record<string, any> = {};
      
      // Try to map each template column to the best matching header
      templateColumns.forEach(templateCol => {
        const matchingHeaderIndex = findBestMatchingHeader(templateCol.name, tableData.headers);
        
        if (matchingHeaderIndex !== -1 && row[matchingHeaderIndex]) {
          const value = row[matchingHeaderIndex];
          
          // Convert based on column type
          switch (templateCol.type) {
            case 'number':
              mappedRow[templateCol.name] = parseFloat(value) || value;
              break;
            case 'boolean':
              mappedRow[templateCol.name] = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
              break;
            default:
              mappedRow[templateCol.name] = value;
          }
        } else {
          mappedRow[templateCol.name] = '';
        }
      });
      
      mappedRows.push(mappedRow);
    });
    
    return mappedRows;
  };

  const findBestMatchingHeader = (templateColumn: string, headers: string[]): number => {
    const templateLower = templateColumn.toLowerCase();
    
    // Exact match
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].toLowerCase() === templateLower) {
        return i;
      }
    }
    
    // Partial match
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].toLowerCase().includes(templateLower) || templateLower.includes(headers[i].toLowerCase())) {
        return i;
      }
    }
    
    return -1;
  };

  const startCellEdit = (rowIndex: number, columnName: string) => {
    setEditingCell({ rowIndex, columnName });
    setEditingValue(structuredData[rowIndex][columnName] || '');
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
    setEditingValue('');
  };

  const saveCellEdit = async () => {
    if (!editingCell) return;
    
    console.log('🔥 SAVING CELL EDIT:', editingCell, 'Value:', editingValue);
    console.log('🔥 Current structuredData length:', structuredData.length);
    
    try {
      const updatedData = [...structuredData];
      const { rowIndex, columnName } = editingCell;
      
      updatedData[rowIndex] = {
        ...updatedData[rowIndex],
        [columnName]: editingValue
      };
      
      console.log('UPDATED DATA:', updatedData);
      
      // Persist changes to backend FIRST if the row has a _sourceId
      const rowData = updatedData[rowIndex];
      if (rowData._sourceId) {
        console.log('PERSISTING TO BACKEND:', rowData._sourceId, 'New value:', editingValue);
        
        const response = await apiRequest(`/api/extracted-data/${rowData._sourceId}`, "PATCH", {
          data: editingValue
        });
        
        console.log('Backend response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Backend error:', errorText);
          throw new Error(`Failed to persist changes: ${errorText}`);
        }
        
        console.log('Successfully persisted to backend');
      }
      
      // Only update frontend state after successful backend save
      setStructuredData(updatedData);
      
      // Force a re-parse of the data to ensure frontend shows updated values
      console.log('🔥 Triggering data re-parse after cell edit');
      // Trigger the parseExtractedDataWithTemplate to refresh the display
      setTimeout(() => {
        parseExtractedDataWithTemplate();
      }, 100);
      
      setEditingCell(null);
      setEditingValue('');
      
      toast({
        title: "Saved",
        description: "Changes have been saved successfully.",
      });
    } catch (error) {
      console.error('Failed to save cell edit:', error);
      toast({
        title: "Save Failed",
        description: "Could not save changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteRow = async (rowIndex: number) => {
    try {
      console.log('TemplateDataTable deleteRow: Starting delete for row index:', rowIndex);
      console.log('TemplateDataTable deleteRow: Total structured data rows:', structuredData.length);
      
      // Find the corresponding extracted data item
      const rowToDelete = structuredData[rowIndex];
      console.log('TemplateDataTable deleteRow: Row to delete:', rowToDelete);
      console.log('TemplateDataTable deleteRow: Row has _sourceId:', !!rowToDelete?._sourceId);
      console.log('TemplateDataTable deleteRow: Available extracted data:', extractedData.map(item => ({id: item.id, type: item.type})));
      
      if (!rowToDelete || !rowToDelete._sourceId) {
        console.error('TemplateDataTable deleteRow: No extracted data ID found for row');
        console.error('TemplateDataTable deleteRow: Row data keys:', rowToDelete ? Object.keys(rowToDelete) : 'No row data');
        toast({
          title: "Delete Failed", 
          description: "Could not identify the data to delete. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      const extractedDataId = rowToDelete._sourceId;
      console.log('TemplateDataTable deleteRow: Deleting extracted data ID:', extractedDataId);
      
      // Delete from the backend database
      const response = await fetch(`/api/extracted-data/${extractedDataId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }
      
      console.log('TemplateDataTable deleteRow: Backend delete successful');
      
      // Update local state
      const updatedData = structuredData.filter((_, index) => index !== rowIndex);
      setStructuredData(updatedData);
      setEditingCell(null);
      setEditingValue('');
      
      // Update the template examples if needed
      if (template) {
        const updatedTemplate = {
          ...template,
          columns: template.columns.map(col => {
            // Keep the example if data still exists, otherwise keep original
            const hasExampleInRemainingData = updatedData.some(row => row[col.name]);
            return {
              ...col,
              example: hasExampleInRemainingData ? 
                updatedData.find(row => row[col.name])?.[col.name] || col.example :
                col.example
            };
          })
        };
        
        await apiRequest(`/api/construction-divisions/${selectedDivision.id}/template`, "POST", updatedTemplate);
      }
      
      // Trigger parent data update to refresh queries and remove marquees
      if (onDataUpdate) {
        console.log('TemplateDataTable deleteRow: Calling onDataUpdate to refresh');
        onDataUpdate();
      }
      
      toast({
        title: "Deleted successfully",
        description: "Data has been removed from the table and drawing highlights.",
      });
    } catch (error) {
      console.error('TemplateDataTable deleteRow: Failed to delete row:', error);
      toast({
        title: "Delete Failed", 
        description: "Could not delete row. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReorderColumns = async (reorderedColumns: any[]) => {
    if (!template) return;
    
    try {
      const updatedTemplate = {
        ...template,
        columns: reorderedColumns
      };
      
      const response = await apiRequest(`/api/construction-divisions/${selectedDivision.id}/template`, "POST", updatedTemplate);
      if (response.ok) {
        setTemplate(updatedTemplate);
        toast({
          title: "Columns Reordered",
          description: "Column order has been updated",
        });
      }
    } catch (error) {
      console.error('Failed to reorder columns:', error);
      toast({
        title: "Reorder Failed",
        description: "Could not reorder columns. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddColumnFromManager = async (newColumn: any) => {
    if (!template) return;
    
    try {
      const updatedTemplate = {
        ...template,
        columns: [...template.columns, newColumn]
      };
      
      const response = await apiRequest(`/api/construction-divisions/${selectedDivision.id}/template`, "POST", updatedTemplate);
      if (response.ok) {
        setTemplate(updatedTemplate);
        toast({
          title: "Column Added",
          description: `"${newColumn.name}" column has been added`,
        });
      }
    } catch (error) {
      console.error('Failed to add column:', error);
      toast({
        title: "Add Failed",
        description: "Could not add column. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportAsCSV = () => {
    if (!template || structuredData.length === 0) return;
    
    const headers = template.columns.map(col => col.name);
    const csvContent = [
      headers.join(','),
      ...structuredData.map(row => 
        headers.map(header => {
          const value = row[header] || '';
          return `"${value.toString().replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${divisionName.replace(/[^a-zA-Z0-9]/g, '_')}_extracted_data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!template) {
    return (
      <div className="p-4">
        <div className="text-center text-gray-500">
          <p>Loading template...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Sub-header with extraction details and controls - always show */}
      <div className="border-b border-gray-200 px-4 py-3 bg-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="link"
              className="text-blue-600 hover:text-blue-800 p-0 h-auto font-medium"
              onClick={() => {
                // Navigate to first item's page if available
                if (extractedData.length > 0 && extractedData[0]?.sourceLocation) {
                  const pageMatch = extractedData[0].sourceLocation.match(/page (\d+)/i);
                  if (pageMatch) {
                    onNavigateToPage(parseInt(pageMatch[1]));
                  }
                }
              }}
            >
              Extraction 1 - {template?.columns?.[0]?.name || 'Sheet Number'} and {template?.columns?.[1]?.name || 'Sheet Name'}
            </Button>
            <span className="text-sm text-gray-500">
              {extractedData.length} items
            </span>
            {extractedData.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  // Clear data for this division
                  if (onDeleteData) {
                    onDeleteData();
                  }
                }}
                className="text-red-600 hover:text-red-800 h-6 w-6 p-0"
                title="Delete all extracted data"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              title="Settings"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Scrollable Table Container */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm">
        <div 
          className="template-table-scroll"
          style={{ 
            height: '400px',
            width: '100%',
            overflow: 'scroll',
            overflowX: 'scroll',
            overflowY: 'scroll',
            border: '1px solid #e5e7eb',
            position: 'relative'
          }}
          onClick={(e) => {
            // Hide drag handle when clicking outside of column headers
            if (!(e.target as Element).closest('th')) {
              setActiveColumnForDrag(null);
            }
          }}
        >
          <DragDropContext onDragEnd={handleDragEnd}>
            <table className="border-collapse"
              style={{ 
                tableLayout: 'auto',
                minWidth: '1200px',
                width: '1500px'
              }}>

                  <Droppable droppableId="columns" direction="horizontal">
                    {(provided) => (
                      <thead 
                        className="bg-gray-100 border-b border-gray-200" 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                      >
                        <tr>
                          {template.columns.filter(col => !hiddenColumns.has(col.name)).map((column, columnIndex) => {
                            const originalIndex = template.columns.findIndex(col => col.name === column.name);
                            return (
                              <Draggable key={column.name} draggableId={column.name} index={originalIndex}>
                                {(provided, snapshot) => (
                                  <th 
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`px-4 py-3 text-left text-sm font-medium text-gray-900 overflow-hidden whitespace-nowrap ${
                                      snapshot.isDragging ? 'bg-blue-50' : 
                                      activeColumnForDrag === column.name ? 'bg-blue-50/50' : ''
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center flex-1">
                                        <div 
                                          {...provided.dragHandleProps}
                                          className={`mr-2 cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-800 ${
                                            activeColumnForDrag === column.name ? 'opacity-100' : 'opacity-0'
                                          }`}
                                          title="Drag to reorder column"
                                        >
                                          <GripVertical className="h-4 w-4" />
                                        </div>
                                        {editingColumnIndex === columnIndex ? (
                                          <Input
                                            value={editingColumnName}
                                            onChange={(e) => setEditingColumnName(e.target.value)}
                                            className="text-sm h-6 px-2"
                                            onBlur={() => saveColumnName(columnIndex)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') {
                                                saveColumnName(columnIndex);
                                              } else if (e.key === 'Escape') {
                                                setEditingColumnIndex(null);
                                                setEditingColumnName('');
                                              }
                                            }}
                                            autoFocus
                                          />
                                        ) : (
                                          <div 
                                            className="flex items-center cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-colors flex-1"
                                            onClick={() => {
                                              if (activeColumnForDrag === column.name) {
                                                startEditingColumnName(columnIndex, column.name);
                                              } else {
                                                setActiveColumnForDrag(column.name);
                                              }
                                            }}
                                            title={activeColumnForDrag === column.name ? "Click to edit column name, or drag the grip to reorder" : "Click to activate drag handle, click again to edit name"}
                                          >
                                            {column.name}
                                            {column.required && <span className="text-red-500 ml-1">*</span>}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </th>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                          
                          {/* Blank Column for Creating New Columns */}
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-900 bg-gray-100 border-r border-gray-200">
                            {isEditingNewColumn ? (
                              <div className="relative">
                                <Input
                                  value={newColumnName}
                                  onChange={(e) => setNewColumnName(e.target.value)}
                                  className="text-sm h-6 px-2 bg-white border border-blue-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Column name..."
                                  onBlur={() => {
                                    if (newColumnName.trim()) {
                                      handleCreateNewColumn();
                                    } else {
                                      setIsEditingNewColumn(false);
                                      setNewColumnName('');
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleCreateNewColumn();
                                    } else if (e.key === 'Escape') {
                                      setIsEditingNewColumn(false);
                                      setNewColumnName('');
                                    }
                                  }}
                                  autoFocus
                                  disabled={isAddingColumn}
                                />
                              </div>
                            ) : (
                              <div 
                                className="flex items-center cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-colors text-gray-400"
                                onClick={() => setIsEditingNewColumn(true)}
                                title="Click to add a new column"
                              >
                                + New Column
                              </div>
                            )}
                          </th>
                          
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-900 bg-gray-100">
                            {/* Actions column header - now empty since gear moved to section header */}
                          </th>
                        </tr>
                      </thead>
                    )}
                  </Droppable>
                <tbody>
                  {structuredData.length === 0 ? (
                    /* Show template preview row when no data exists */
                    <tr className="bg-gray-50 text-gray-500">
                      {template.columns.filter(col => !hiddenColumns.has(col.name)).map((column, colIndex) => (
                        <td key={`template-${column.name}-${colIndex}`} className="px-4 py-3 text-sm italic border-r border-gray-200" style={{ width: 'inherit', maxWidth: 'inherit' }}>
                          <div className="px-2 py-1 w-full h-8 flex items-center">
                            <span className="text-gray-400 text-xs truncate block w-full">
                              {column.description || `Sample ${column.name.toLowerCase()}`}
                            </span>
                          </div>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm bg-gray-50 border-r border-gray-200">
                        <div className="h-8 flex items-center">
                          <span className="text-gray-300 text-xs">—</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right bg-gray-50">
                        <div className="h-8 flex items-center justify-end">
                          <span className="text-gray-300 text-xs">Template Preview</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    structuredData.map((row, rowIndex) => {
                      console.log('RENDERING DATA ROW:', rowIndex, row);
                      return (
                    <tr key={rowIndex} className={`${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors group`}>
                      {template.columns.filter(col => !hiddenColumns.has(col.name)).map((column, colIndex) => (
                        <td key={`${column.name}-${colIndex}-${rowIndex}`} className="px-4 py-3 text-sm overflow-hidden relative border-r border-gray-200" style={{ width: 'inherit', maxWidth: 'inherit' }}>
                          <div 
                            className={`relative w-full h-8 flex items-center transition-colors ${
                              editingCell?.rowIndex === rowIndex && editingCell?.columnName === column.name 
                                ? 'bg-white' 
                                : 'cursor-pointer hover:bg-gray-100'
                            }`}
                            style={{ 
                              minHeight: '32px',
                              boxSizing: 'border-box'
                            }}
                            onClick={() => startCellEdit(rowIndex, column.name)}
                            title={editingCell ? undefined : "Click to edit this cell"}
                          >
                            {editingCell?.rowIndex === rowIndex && editingCell?.columnName === column.name ? (
                              <input
                                type={column.type === 'number' ? 'number' : 'text'}
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={saveCellEdit}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    saveCellEdit();
                                  } else if (e.key === 'Escape') {
                                    cancelCellEdit();
                                  }
                                }}
                                className="absolute inset-0 w-full h-full bg-white border border-blue-200 rounded px-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                style={{ 
                                  boxSizing: 'border-box',
                                  zIndex: 10
                                }}
                                autoFocus
                              />
                            ) : (
                              <div className="px-2 py-1 w-full h-full flex items-center">
                                <span className="text-gray-900 truncate block w-full">
                                  {row[column.name] || <span className="text-gray-400">[blank]</span>}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      ))}
                      
                      {/* Blank column cell */}
                      <td className="px-4 py-3 text-sm bg-white border-r border-gray-200">
                        <div className="h-8 flex items-center">
                          <span className="text-gray-300 text-xs">—</span>
                        </div>
                      </td>
                      
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRow(rowIndex)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            title="Delete this row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </DragDropContext>
        </div>
      </div>

      {/* Add Column Form */}
      {showAddColumnForm && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Add New Column</CardTitle>
          </CardHeader>
          <CardContent>
            <AddColumnForm
              onAddColumn={handleAddColumn}
              onCancel={() => setShowAddColumnForm(false)}
              isLoading={isAddingColumn}
            />
          </CardContent>
        </Card>
      )}

      {/* Column Manager Modal */}
      <Dialog open={showColumnManager} onOpenChange={setShowColumnManager}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <ColumnManager
            columns={template?.columns || []}
            onUpdateColumn={updateColumn}
            onDeleteColumn={(index) => {
              deleteColumn(index);
              setShowColumnManager(false);
            }}
            onReorderColumns={handleReorderColumns}
            onAddColumn={handleAddColumnFromManager}
            onClose={() => setShowColumnManager(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Extracted Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all extracted data for this construction division. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox 
              id="dont-ask-again" 
              checked={dontAskAgain}
              onCheckedChange={(checked) => setDontAskAgain(checked === true)}
            />
            <label htmlFor="dont-ask-again" className="text-sm text-gray-600 cursor-pointer">
              Don't ask again for future deletions
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setDontAskAgain(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete All Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}