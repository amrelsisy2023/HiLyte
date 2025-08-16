import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Trash2, GripVertical, Plus, X, Settings } from "lucide-react";
import ColumnManagementModal from "./ColumnManagementModal";

interface DataRow {
  id: string;
  [key: string]: any;
}

interface TemplateColumn {
  name: string;
  type: 'text' | 'number' | 'date' | 'dimension' | 'boolean';
  description?: string;
  required?: boolean;
  example?: string;
}

interface CleanDataTableProps {
  selectedDivision: {
    id: number;
    name: string;
    color: string;
  };
  extractedData: any[];
  drawingId?: number;
  onClose?: () => void;
  showColumnManager?: boolean;
  onShowColumnManagerChange?: (show: boolean) => void;
  triggerDeleteAll?: number;
}

export default function CleanDataTable({ 
  selectedDivision, 
  extractedData, 
  drawingId, 
  onClose,
  showColumnManager = false,
  onShowColumnManagerChange,
  triggerDeleteAll = 0
}: CleanDataTableProps) {
  const [data, setData] = useState<DataRow[]>([]);
  const [columns, setColumns] = useState<TemplateColumn[]>([]);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<{row: number, col: string} | null>(null);
  const [editingHeader, setEditingHeader] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [localShowColumnManager, setLocalShowColumnManager] = useState(false);
  
  const { toast } = useToast();

  // Drag and drop handlers for column reordering
  const handleDragStart = (e: React.DragEvent, columnName: string) => {
    setDraggedColumn(columnName);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, columnName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnName);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnName: string) => {
    e.preventDefault();
    
    if (!draggedColumn || draggedColumn === targetColumnName) {
      setDraggedColumn(null);
      setDragOverColumn(null);
      return;
    }

    // Reorder columns
    const newColumns = [...columns];
    const draggedIndex = newColumns.findIndex(col => col.name === draggedColumn);
    const targetIndex = newColumns.findIndex(col => col.name === targetColumnName);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [draggedCol] = newColumns.splice(draggedIndex, 1);
      newColumns.splice(targetIndex, 0, draggedCol);
      
      // CRITICAL: Force complete re-render by updating both arrays with new references
      setColumns([...newColumns]);
      
      // Force React to completely re-render by setting data to empty first, then updating
      setData([]);
      
      // Use setTimeout to ensure React processes the empty state first
      setTimeout(() => {
        const reorderedData = data.map(row => {
          const newRow: DataRow = { id: row.id };
          // Rebuild each row with exact column order
          newColumns.forEach(col => {
            newRow[col.name] = row[col.name] || '';
          });
          return newRow;
        });
        setData(reorderedData);
      }, 0);
      
      console.log('CleanDataTable - Column reorder completed:', newColumns.map(c => c.name));

      // Save the updated template back to the server
      try {
        await fetch(`/api/construction-divisions/${selectedDivision.id}/template`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${selectedDivision.name} Template`,
            description: `Template for ${selectedDivision.name}`,
            columns: newColumns
          })
        });
        
        console.log('CleanDataTable - Template updated with reordered columns');
        toast({
          title: "Column reordered",
          description: `Moved "${draggedColumn}" column and saved template.`,
        });
      } catch (error) {
        console.error('CleanDataTable - Failed to save template:', error);
        toast({
          title: "Reorder succeeded but save failed",
          description: "Column was reordered but couldn't save to template",
          variant: "destructive",
        });
      }
    }

    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  // Helper functions to generate division-specific examples
  const getExampleItem = (divisionName: string): string => {
    if (divisionName.includes('Door')) return '3\'-0" x 7\'-0" Hollow Metal Door';
    if (divisionName.includes('Window')) return '4\'-0" x 3\'-0" Aluminum Window';
    if (divisionName.includes('Electrical')) return 'Duplex Receptacle';
    if (divisionName.includes('Plumbing')) return 'Water Closet';
    if (divisionName.includes('HVAC')) return 'Supply Air Diffuser';
    if (divisionName.includes('Fire')) return 'Smoke Detector';
    if (divisionName.includes('Security')) return 'Card Reader';
    if (divisionName.includes('Structural')) return 'W12x26 Steel Beam';
    if (divisionName.includes('Concrete')) return '#4 Rebar';
    return 'Sample Item';
  };

  const getExampleType = (divisionName: string): string => {
    if (divisionName.includes('Door')) return 'Hollow Metal';
    if (divisionName.includes('Window')) return 'Aluminum Frame';
    if (divisionName.includes('Electrical')) return '20A GFCI';
    if (divisionName.includes('Plumbing')) return 'Floor Mount';
    if (divisionName.includes('HVAC')) return '4-Way';
    if (divisionName.includes('Fire')) return 'Photoelectric';
    return 'Standard';
  };

  const getExampleSize = (divisionName: string): string => {
    if (divisionName.includes('Door')) return '3\'-0" x 7\'-0"';
    if (divisionName.includes('Window')) return '4\'-0" x 3\'-0"';
    if (divisionName.includes('Electrical')) return '4" x 4"';
    if (divisionName.includes('HVAC')) return '12" x 12"';
    return 'Standard';
  };

  const getExampleMounting = (divisionName: string): string => {
    if (divisionName.includes('Electrical')) return 'Wall Mount';
    if (divisionName.includes('HVAC')) return 'Ceiling Mount';
    if (divisionName.includes('Fire')) return 'Ceiling Mount';
    if (divisionName.includes('Plumbing')) return 'Floor Mount';
    return 'Surface Mount';
  };

  const getExampleLocation = (divisionName: string): string => {
    if (divisionName.includes('Door')) return 'Main Entrance';
    if (divisionName.includes('Electrical')) return 'Office 101';
    if (divisionName.includes('Plumbing')) return 'Restroom A';
    if (divisionName.includes('HVAC')) return 'Conference Room';
    return 'Room 101';
  };

  const getExampleComments = (divisionName: string): string => {
    if (divisionName.includes('Door')) return 'Include hardware package';
    if (divisionName.includes('Electrical')) return 'Hospital grade';
    if (divisionName.includes('HVAC')) return 'VAV controlled';
    if (divisionName.includes('Fire')) return 'Addressable system';
    return 'Per specifications';
  };

  const getExampleAssembly = (divisionName: string): string => {
    if (divisionName.includes('Door')) return 'Complete door assembly with frame and hardware';
    if (divisionName.includes('Window')) return 'Aluminum window with insulated glass';
    if (divisionName.includes('Electrical')) return 'GFCI receptacle with cover plate';
    return 'Complete assembly per manufacturer';
  };

  const getGenericExample = (columnName: string, divisionName: string): string => {
    const lowerCol = columnName.toLowerCase();
    if (lowerCol.includes('manufacturer')) return 'ABC Company';
    if (lowerCol.includes('model')) return 'Model-123';
    if (lowerCol.includes('finish')) return 'Brushed Steel';
    if (lowerCol.includes('color')) return 'White';
    if (lowerCol.includes('voltage')) return '120V';
    if (lowerCol.includes('phase')) return 'Single';
    if (lowerCol.includes('rating')) return 'Class A';
    if (lowerCol.includes('material')) return 'Steel';
    return 'Example';
  };

  // Delete mutation for bidirectional deletion (table data + marquee highlights)
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      // Delete all extracted data for this division using existing endpoint
      const response = await fetch(`/api/extracted-data?divisionId=${selectedDivision.id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }
      return response;
    },
    onSuccess: () => {
      // Invalidate queries to refresh the UI
      if (drawingId) {
        queryClient.invalidateQueries({ queryKey: ["/api/extracted-data", drawingId] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/extracted-data'] });
      
      toast({
        title: "All data deleted",
        description: "All extracted data and drawing highlights have been removed.",
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: "Failed to delete extracted data. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleDeleteAll = () => {
    if (!deleteAllMutation.isPending) {
      deleteAllMutation.mutate();
    }
  };

  // Load template for this division from backend
  useEffect(() => {
    const loadTemplate = async () => {
      console.log('CleanDataTable - Loading template for division:', selectedDivision.id, selectedDivision.name);
      setTemplateLoading(true);
      
      try {
        const response = await fetch(`/api/construction-divisions/${selectedDivision.id}/template`);
        console.log('CleanDataTable - Template response status:', response.status);
        
        if (response.ok) {
          const template = await response.json();
          console.log('CleanDataTable - Template loaded:', template);
          
          if (template.columns && template.columns.length > 0) {
            console.log('CleanDataTable - Setting columns from template:', template.columns);
            setColumns(template.columns);
          } else {
            console.log('CleanDataTable - No template columns found, keeping empty');
            // Keep empty columns array when template has no columns
            setColumns([]);
          }
        } else {
          console.log('CleanDataTable - Template not found, keeping empty');
          // Keep empty columns when template doesn't exist
          setColumns([]);
        }
      } catch (error) {
        console.error('CleanDataTable - Failed to load template:', error);
        // Keep empty columns on error
        setColumns([]);
      } finally {
        setTemplateLoading(false);
      }
    };
    
    loadTemplate();
  }, [selectedDivision.id]);

  // Convert extracted data to table format - SMART EXTRACTION MODE
  useEffect(() => {
    if (extractedData && extractedData.length > 0) {
      console.log('CleanDataTable - Processing Smart Extraction data:', extractedData);
      
      // Check if this is Smart Extraction data (has type smart_extraction or itemName structure)
      const isSmartExtractionData = extractedData.some(item => {
        // Check for smart_extraction type
        if (item.type === 'smart_extraction') return true;
        
        // Check for itemName or procurementData structure
        if (item.itemName || item.csiDivision || item.procurementData) return true;
        
        // Check if data contains JSON with itemName
        if (item.data) {
          try {
            const parsedData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
            if (parsedData.itemName || parsedData.procurementData || parsedData.specification) return true;
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        return false;
      });
      
      if (isSmartExtractionData) {
        console.log('CleanDataTable - Detected Smart Extraction data, creating dynamic columns');
        
        // DYNAMIC COLUMN GENERATION: Analyze all items to find all data fields
        const allDataFields = new Set<string>();
        extractedData.forEach(item => {
          // Parse the JSON data from the database if needed
          let itemData: any = {};
          try {
            itemData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data || {};
          } catch (error) {
            console.error('Failed to parse item data:', item.data);
            itemData = {};
          }

          // Add standard Smart Extraction fields
          if (itemData.itemName || item.itemName) allDataFields.add('Item Name');
          if (itemData.category || item.category) allDataFields.add('Category');
          if (itemData.location?.sheetNumber || itemData.location?.sheetName || item.location?.sheetNumber || item.location?.sheetName) {
            allDataFields.add('Location');
          }
          
          // Add CSI Division field
          if (itemData.csiDivision || item.csiDivision) allDataFields.add('CSI Division');
          
          // Add dynamic procurement data fields
          const procurementData = itemData.procurementData || item.procurementData || {};
          Object.keys(procurementData).forEach(key => {
            if (procurementData[key] && key !== 'id') {
              // Format field names nicely
              const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
              allDataFields.add(fieldName);
            }
          });
          
          // Also check for other data fields in the main data object
          const mainDataFields = itemData.data || {};
          Object.keys(mainDataFields).forEach(key => {
            if (mainDataFields[key] && key !== 'id') {
              const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
              allDataFields.add(fieldName);
            }
          });
        });
        
        // Create dynamic columns based on actual data - prioritize key fields first
        const priorityFields = ['Item Name', 'Category', 'CSI Division', 'Quantity', 'Unit', 'Specification', 'Location', 'Notes'];
        const otherFields = Array.from(allDataFields).filter(field => !priorityFields.includes(field));
        
        const dynamicColumns: TemplateColumn[] = [];
        
        // Add priority fields in order if they exist
        priorityFields.forEach(field => {
          if (allDataFields.has(field)) {
            dynamicColumns.push({
              name: field,
              type: (field.toLowerCase().includes('quantity') || field.toLowerCase().includes('count') ? 'number' : 'text') as 'text' | 'number',
              description: field === 'Item Name' ? 'Construction item name' :
                          field === 'Category' ? 'Item category (material, equipment, fixture, etc.)' :
                          field === 'CSI Division' ? 'Construction Specification Institute division' :
                          field === 'Quantity' ? 'Item quantity' :
                          field === 'Unit' ? 'Unit of measurement' :
                          field === 'Specification' ? 'Technical specification' :
                          field === 'Location' ? 'Drawing location' :
                          field === 'Notes' ? 'Additional notes' :
                          `${field} information from drawing`
            });
          }
        });
        
        // Add remaining fields
        otherFields.forEach(field => {
          dynamicColumns.push({
            name: field,
            type: (field.toLowerCase().includes('quantity') || field.toLowerCase().includes('count') ? 'number' : 'text') as 'text' | 'number',
            description: `${field} information from drawing`
          });
        });
        
        console.log('CleanDataTable - Generated dynamic columns:', dynamicColumns);
        setColumns(dynamicColumns);
        
        // Process smart extraction data with dynamic structure
        const processedSmartData: DataRow[] = extractedData.map((item, index) => {
          const row: DataRow = { id: item.id || `smart-${index}` };
          
          // Parse the JSON data from the database
          let itemData: any = {};
          try {
            itemData = typeof item.data === 'string' ? JSON.parse(item.data) : item.data;
          } catch (error) {
            console.error('Failed to parse item data:', item.data);
            itemData = {};
          }
          
          // Map data to dynamic columns
          dynamicColumns.forEach(col => {
            const colName = col.name;
            
            if (colName === 'Item Name') {
              row[colName] = itemData.itemName || item.itemName || '';
            } else if (colName === 'Category') {
              row[colName] = itemData.category || item.category || '';
            } else if (colName === 'CSI Division') {
              const csiDiv = itemData.csiDivision || item.csiDivision;
              row[colName] = csiDiv?.name || csiDiv || '';
            } else if (colName === 'Location') {
              const location = itemData.location || item.location || {};
              // Prioritize sheet name over sheet number for better readability
              let locationDisplay = location.sheetName || '';
              
              // Fallback to sheet number only if no sheet name is available
              if (!locationDisplay && location.sheetNumber && location.sheetNumber !== 'Unknown') {
                locationDisplay = `Sheet ${location.sheetNumber}`;
              }
              
              // Final fallback to source location if available
              if (!locationDisplay) {
                locationDisplay = item.sourceLocation || '';
              }
              
              row[colName] = locationDisplay;
            } else {
              // Check for field in procurementData or data object
              const procurementData = itemData.procurementData || item.procurementData || {};
              const mainDataFields = itemData.data || {};
              const fieldKey = colName.toLowerCase();
              
              // Try multiple field mappings
              let value = procurementData[fieldKey] || 
                         procurementData[colName] ||
                         mainDataFields[fieldKey] ||
                         mainDataFields[colName] ||
                         itemData[fieldKey] ||
                         itemData[colName] ||
                         '';
              
              row[colName] = value;
            }
          });
          
          return row;
        });
        
        console.log('CleanDataTable - Processed Smart Extraction rows:', processedSmartData);
        setData(processedSmartData);
        setTemplateLoading(false);
        return; // Exit early for smart extraction data
      }
      
      // FALLBACK: Legacy template-based processing for non-Smart Extraction data
      const processedData: DataRow[] = extractedData.map((item, index) => {
        const row: DataRow = { id: item.id || `row-${index}` };
        
        // Map extracted data to template columns
        columns.forEach((col, colIndex) => {
          if (colIndex === 0) {
            row[col.name] = `A-${100 + index + 1}`; // Sheet number
          } else if (col.name === 'CSI Division') {
            row[col.name] = selectedDivision.name;
          } else if (col.name === 'Item' || col.name === 'Comments') {
            row[col.name] = item.data || '';
          } else if (col.name === 'Mark') {
            row[col.name] = (index + 1).toString();
          } else if (col.name === 'Count') {
            row[col.name] = '1';
          } else {
            row[col.name] = '[blank]';
          }
        });
        
        return row;
      });
      setData(processedData);
      setTemplateLoading(false);
    } else {
      // No extracted data - load template rows
      // Try to load saved template data from localStorage first
      let templateRows: DataRow[] = [];
      
      try {
        const savedData = localStorage.getItem(`template-data-${selectedDivision.id}`);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          console.log('CleanDataTable - Loaded template data from localStorage:', parsedData);
          templateRows = parsedData;
        }
      } catch (error) {
        console.error('CleanDataTable - Failed to load template data from localStorage:', error);
      }
      
      // If no saved data, create fresh template rows
      if (templateRows.length === 0) {
        templateRows = Array.from({ length: 25 }, (_, index) => {
          const row: DataRow = { id: `template-${index}` };
          
          columns.forEach((col) => {
            if (index === 0) {
              // First row shows example data from the column template, but is fully editable
              row[col.name] = col.example || '';
            } else {
              // All other rows start empty
              row[col.name] = '';
            }
          });
          
          return row;
        });
      }
      
      setData(templateRows);
      setTemplateLoading(false);
    }
  }, [extractedData, columns, selectedDivision]);

  // Handle delete all trigger from parent
  const lastTriggerValueRef = useRef(0);
  
  useEffect(() => {
    if (triggerDeleteAll > 0 && triggerDeleteAll !== lastTriggerValueRef.current && !deleteAllMutation.isPending) {
      lastTriggerValueRef.current = triggerDeleteAll;
      handleDeleteAll();
    }
  }, [triggerDeleteAll]);

  const handleCellClick = (rowIndex: number, columnName: string) => {
    setEditingCell({ row: rowIndex, col: columnName });
    setEditValue(data[rowIndex]?.[columnName] || '');
  };

  const handleHeaderClick = (columnName: string) => {
    setEditingHeader(columnName);
    setEditValue(columnName);
  };

  const handleSaveCell = async () => {
    if (!editingCell) return;
    
    const { row, col } = editingCell;
    const rowData = data[row];
    
    // Update local state
    const updatedData = [...data];
    updatedData[row] = { ...rowData, [col]: editValue };
    setData(updatedData);
    
    // Save to backend if this row has a real extracted data ID
    if (rowData.id && !rowData.id.startsWith('template-')) {
      try {
        await fetch(`/api/extracted-data/${rowData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: editValue })
        });
        
        toast({
          title: "Saved",
          description: "Cell updated successfully",
        });
      } catch (error) {
        console.error('Save failed:', error);
        toast({
          title: "Save Failed",
          description: "Could not save changes",
          variant: "destructive",
        });
      }
    } else if (rowData.id && rowData.id.startsWith('template-')) {
      // For template rows, save the updated data as template examples
      try {
        const templateData: Record<string, any> = {};
        columns.forEach((column, index) => {
          templateData[column.name] = updatedData[row][column.name] || '';
        });
        
        // Save template data to localStorage for persistence
        localStorage.setItem(`template-data-${selectedDivision.id}`, JSON.stringify(updatedData));
        
        console.log('CleanDataTable - Template data saved to localStorage');
      } catch (error) {
        console.error('CleanDataTable - Failed to save template data:', error);
      }
    }
    
    setEditingCell(null);
    setEditValue('');
  };

  const handleSaveHeader = async () => {
    if (!editingHeader) return;
    
    const updatedColumns = columns.map(col => 
      col.name === editingHeader ? { ...col, name: editValue } : col
    );
    setColumns(updatedColumns);
    
    // Update data keys
    const updatedData = data.map(row => {
      const newRow = { ...row };
      if (newRow[editingHeader] !== undefined) {
        newRow[editValue] = newRow[editingHeader];
        delete newRow[editingHeader];
      }
      return newRow;
    });
    setData(updatedData);
    
    setEditingHeader(null);
    setEditValue('');

    // Save the updated template back to the server
    try {
      await fetch(`/api/construction-divisions/${selectedDivision.id}/template`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${selectedDivision.name} Template`,
          description: `Template for ${selectedDivision.name}`,
          columns: updatedColumns
        })
      });
      
      console.log('CleanDataTable - Template updated with renamed column');
      toast({
        title: "Column Renamed",
        description: `Column renamed and saved to template`,
      });
    } catch (error) {
      console.error('CleanDataTable - Failed to save template:', error);
      toast({
        title: "Save Failed",
        description: "Could not save column changes to template",
        variant: "destructive",
      });
    }
  };



  const addColumn = async () => {
    if (!newColumnName.trim()) return;
    
    const newColumn: TemplateColumn = {
      name: newColumnName,
      type: 'text'
    };
    
    const newColumns = [...columns, newColumn];
    setColumns(newColumns);
    
    // Add empty values for existing rows
    const updatedData = data.map(row => ({
      ...row,
      [newColumnName]: ''
    }));
    setData(updatedData);
    
    setNewColumnName('');
    setShowAddColumn(false);

    // Save the updated template back to the server
    try {
      await fetch(`/api/construction-divisions/${selectedDivision.id}/template`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${selectedDivision.name} Template`,
          description: `Template for ${selectedDivision.name}`,
          columns: newColumns
        })
      });
      
      console.log('CleanDataTable - Template updated with new column:', newColumn);
      toast({
        title: "Column Added",
        description: `Column "${newColumnName}" saved to template`,
      });
    } catch (error) {
      console.error('CleanDataTable - Failed to save template:', error);
      toast({
        title: "Save Failed",
        description: "Could not save column to template",
        variant: "destructive",
      });
    }
  };

  const deleteColumn = async (columnName: string) => {
    const updatedColumns = columns.filter(col => col.name !== columnName);
    setColumns(updatedColumns);
    
    // Remove column from data
    const updatedData = data.map(row => {
      const newRow = { ...row };
      delete newRow[columnName];
      return newRow;
    });
    setData(updatedData);

    // Save the updated template back to the server
    try {
      await fetch(`/api/construction-divisions/${selectedDivision.id}/template`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${selectedDivision.name} Template`,
          description: `Template for ${selectedDivision.name}`,
          columns: updatedColumns
        })
      });
      
      console.log('CleanDataTable - Template updated with deleted column');
      toast({
        title: "Column Deleted",
        description: `Column "${columnName}" removed from template`,
      });
    } catch (error) {
      console.error('CleanDataTable - Failed to save template:', error);
      toast({
        title: "Save Failed",
        description: "Could not save column changes to template",
        variant: "destructive",
      });
    }
  };



  if (templateLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex items-center justify-center" style={{ height: '400px' }}>
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <div className="text-sm text-gray-600">Loading template...</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white" 
      style={{ 
        height: '400px', 
        width: '100%', 
        overflow: 'hidden',
        margin: '0',
        padding: '0',
        boxSizing: 'border-box'
      }}
    >
      {/* Simplified header - no action icons since they're moved to main header */}
      <div className="px-0 py-2 bg-gray-50 w-full">
        <span className="text-xs text-gray-500 ml-4">
          Data extraction table - use marquee selection on drawings to add data
        </span>
      </div>

      {/* Properly scrollable table container - FIXED FOR REAL HORIZONTAL SCROLLING */}
      <div 
        className="bg-white"
        style={{ 
          height: 'calc(100% - 48px)', 
          width: '100%',
          overflowX: 'auto',
          overflowY: 'auto',
          position: 'relative',
          margin: '0',
          padding: '0',
          boxSizing: 'border-box'
        }}
      >
        {columns.length === 0 ? (
          <div className="flex items-center justify-center h-full" style={{ width: '100%', minWidth: '100%' }}>
            <div className="text-center text-gray-400">
              <div className="text-sm">No columns defined</div>
              <div className="text-xs mt-1">Run Smart Extraction to generate table columns automatically</div>
            </div>
          </div>
        ) : (
          <table 
            className="text-sm border-collapse w-full"
            style={{ 
              width: '100%',
              minWidth: '100%'
            }}
          >
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.name}
                  className={`px-3 py-2 text-center font-medium text-gray-700 border-b border-r border-gray-200 cursor-pointer hover:bg-gray-100 relative group transition-colors duration-200 ${
                    draggedColumn === column.name ? 'opacity-50' : ''
                  } ${dragOverColumn === column.name ? 'bg-blue-100' : ''}`}
                  onClick={() => handleHeaderClick(column.name)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, column.name)}
                  onDragOver={(e) => handleDragOver(e, column.name)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.name)}
                  onDragEnd={handleDragEnd}
                  style={{ 
                    width: `${100 / columns.length}%`,
                    minWidth: '150px'
                  }}
                >
                  <div className="flex items-center justify-center gap-1 w-full">
                    <GripVertical 
                      className="h-3 w-3 text-gray-500 group-hover:text-gray-700 transition-colors duration-200 cursor-grab active:cursor-grabbing flex-shrink-0" 
                      style={{ opacity: 1 }}
                    />
                    {editingHeader === column.name ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSaveHeader}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveHeader();
                          if (e.key === 'Escape') {
                            setEditingHeader(null);
                            setEditValue('');
                          }
                        }}
                        className="w-full border-none outline-none bg-transparent font-medium text-xs text-center"
                        autoFocus
                      />
                    ) : (
                      <span className="text-xs text-center flex-1">{column.name}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                {columns.map((column) => (
                  <td
                    key={`${row.id}-${column.name}`}
                    className="px-3 py-2 border-r border-gray-100 cursor-pointer text-xs text-center hover:bg-blue-50 transition-colors duration-150"
                    onClick={() => handleCellClick(rowIndex, column.name)}
                    style={{ 
                      width: `${100 / columns.length}%`,
                      minWidth: '150px'
                    }}
                  >
                    {editingCell?.row === rowIndex && editingCell?.col === column.name ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSaveCell}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveCell();
                          if (e.key === 'Escape') {
                            setEditingCell(null);
                            setEditValue('');
                          }
                        }}
                        className="w-full border-none outline-none bg-transparent text-xs text-center focus:bg-white focus:shadow-sm"
                        autoFocus
                      />
                    ) : (
                      <div className="min-h-4 text-center flex items-center justify-center w-full">
                        {row[column.name] === '[blank]' ? (
                          <span className="text-blue-500 text-xs font-medium">[blank]</span>
                        ) : (
                          <span 
                            className="text-xs w-full text-gray-700"
                          >
                            {row[column.name] || (
                              <span className="text-gray-300 italic">Click to edit</span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>

      {/* Column Management Modal */}
      <ColumnManagementModal
        isOpen={localShowColumnManager || showColumnManager}
        onClose={() => {
          setLocalShowColumnManager(false);
          onShowColumnManagerChange?.(false);
        }}
        columns={columns}
        onColumnsUpdate={(updatedColumns) => {
          setColumns(updatedColumns);
          // Update data structure for new columns
          const updatedData = data.map(row => {
            const newRow = { ...row };
            updatedColumns.forEach(col => {
              if (!(col.name in newRow)) {
                newRow[col.name] = '';
              }
            });
            return newRow;
          });
          setData(updatedData);
        }}
        selectedDivision={selectedDivision}
      />
    </div>
  );
}