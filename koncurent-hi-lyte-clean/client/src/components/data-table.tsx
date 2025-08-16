import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileText, Edit, Trash2, Download } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DataTableProps {
  divisionName: string;
  divisionColor: string;
  divisionId: number;
  drawingId?: number; // Add drawingId to properly invalidate cache
  extractedData: Array<{
    id: string;
    type: string;
    extractedAt: Date;
    sourceLocation: string;
    data?: string;
    items?: Record<string, any>[];
  }>;
}

export default function DataTable({ divisionName, divisionColor, divisionId, drawingId, extractedData }: DataTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (extractedDataId: string) => {
      console.log('DataTable delete: Starting delete for ID:', extractedDataId);
      console.log('DataTable delete: Drawing ID:', drawingId);
      
      const response = await fetch(`/api/extracted-data/${extractedDataId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}`);
      }
      console.log('DataTable delete: Backend delete successful');
      return response;
    },
    onSuccess: () => {
      console.log('DataTable delete: onSuccess triggered');
      console.log('DataTable delete: About to invalidate queries for drawingId:', drawingId);
      
      // Use targeted invalidation that matches the working pattern in handleMarqueeDeleted
      if (drawingId) {
        queryClient.invalidateQueries({ queryKey: ["/api/extracted-data", drawingId] });
        console.log('DataTable delete: Invalidated specific query:', ["/api/extracted-data", drawingId]);
      }
      
      // Also invalidate broader queries
      queryClient.invalidateQueries({ queryKey: ['/api/extracted-data'] });
      console.log('DataTable delete: Invalidated broad query');
      
      // Force a window reload as a debugging step
      setTimeout(() => {
        console.log('DataTable delete: Force reloading page to test');
        window.location.reload();
      }, 1000);
      
      toast({
        title: "Deleted successfully",
        description: "Extracted data has been removed from the table and drawing highlights.",
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

  const handleDelete = (extractedDataId: string) => {
    console.log('DataTable handleDelete: Button clicked, ID:', extractedDataId);
    console.log('DataTable handleDelete: About to call mutation');
    deleteMutation.mutate(extractedDataId);
  };
  // Helper function to detect if content is a structured table (markdown or CSV)
  const isTableData = (item: any) => {
    // If it has items array, it's already structured data
    if (item.items && Array.isArray(item.items)) return true;
    
    const data = item.data;
    if (!data || typeof data !== 'string') return false;
    // Check for markdown table format
    const hasMarkdownTable = data.includes('|') && data.includes('---');
    // Check for CSV format (comma-separated with multiple rows)
    const hasCsvFormat = data.includes(',') && data.split('\n').length > 1;
    // Check for metadata comment indicating table structure
    const hasTableMetadata = data.includes('# Table Structure:');
    
    return hasMarkdownTable || hasCsvFormat || hasTableMetadata;
  };

  // Parse table data (markdown or CSV format) into structured data
  const parseTableData = (item: any) => {
    // If it has items array, convert it to table format
    if (item.items && Array.isArray(item.items) && item.items.length > 0) {
      const firstItem = item.items[0];
      const headers = Object.keys(firstItem);
      const rows = item.items.map((rowItem: any) => headers.map(header => rowItem[header] || ''));
      return { headers, rows };
    }
    
    const data = item.data;
    if (!data || typeof data !== 'string') return null;
    
    const lines = data.trim().split('\n');
    if (lines.length < 2) return null;
    
    // Check if it's the new CSV format with metadata
    if (data.includes('# Table Structure:')) {
      return parseAdvancedCSVFormat(data);
    }
    
    // Check if it's standard CSV format
    if (data.includes(',') && !data.includes('|')) {
      return parseStandardCSVFormat(data);
    }
    
    // Parse markdown table format
    return parseMarkdownTableFormat(data);
  };

  // Parse advanced CSV format with metadata
  const parseAdvancedCSVFormat = (data: string) => {
    const lines = data.trim().split('\n');
    let dataStartIndex = 0;
    
    // Skip metadata comment lines
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('#')) {
        dataStartIndex = i;
        break;
      }
    }
    
    if (dataStartIndex >= lines.length) return null;
    
    const dataLines = lines.slice(dataStartIndex);
    if (dataLines.length < 1) return null;
    
    // Parse CSV data
    const rows = dataLines.map(line => {
      // Handle quoted CSV cells
      const cells = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      
      if (current) {
        cells.push(current.trim());
      }
      
      return cells;
    }).filter(row => row.length > 0);
    
    if (rows.length === 0) return null;
    
    // First row is headers
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    return { headers, rows: dataRows };
  };

  // Parse standard CSV format
  const parseStandardCSVFormat = (data: string) => {
    const lines = data.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) return null;
    
    const rows = lines.map(line => line.split(',').map(cell => cell.trim()));
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    return { headers, rows: dataRows };
  };

  // Parse markdown table format
  const parseMarkdownTableFormat = (data: string) => {
    const lines = data.trim().split('\n');
    
    // Find the first line with table headers (contains |)
    let headerLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('|') && lines[i].trim() !== '' && !lines[i].includes('---')) {
        headerLineIndex = i;
        break;
      }
    }
    
    if (headerLineIndex === -1) return null;
    
    const headers = lines[headerLineIndex].split('|').map(h => h.trim()).filter(h => h);
    
    // Find separator line (contains ---)
    let separatorIndex = -1;
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      if (lines[i].includes('---')) {
        separatorIndex = i;
        break;
      }
    }
    
    if (separatorIndex === -1) return null;
    
    // Get all data rows after separator
    const rows = lines.slice(separatorIndex + 1)
      .filter(line => line.includes('|') && line.trim() !== '')
      .map(line => {
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell);
        // Ensure each row has the same number of columns as headers
        while (cells.length < headers.length) {
          cells.push('');
        }
        return cells.slice(0, headers.length); // Don't exceed header count
      });
    
    return { headers, rows };
  };

  // Export table data as CSV
  const exportAsCSV = (tableData: { headers: string[], rows: string[][] }, filename: string) => {
    const csvContent = [
      tableData.headers.join(','),
      ...tableData.rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-2">
        <div 
          className="w-4 h-4 rounded"
          style={{ backgroundColor: divisionColor }}
        />
        <h3 className="text-lg font-semibold">{divisionName} - Extracted Data</h3>
        <Badge variant="secondary">{extractedData.length} items</Badge>
      </div>

      {extractedData.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No data extracted yet</p>
              <p className="text-sm">Use the marquee tool to select areas from drawings</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {extractedData.map((item) => {
            const isTable = isTableData(item);
            const tableData = isTable ? parseTableData(item) : null;

            return (
              <Card key={item.id} className="border-l-4" style={{ borderLeftColor: divisionColor }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.type}</CardTitle>
                      <p className="text-sm text-gray-600">
                        From {item.sourceLocation}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      {isTable && tableData && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const filename = `${item.type.toLowerCase().replace(/\s+/g, '-')}-schedule-${new Date().toISOString().split('T')[0]}.csv`;
                            exportAsCSV(tableData, filename);
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Export CSV
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete extracted data?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently remove this extracted data from the table and any corresponding highlights in the drawings. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(item.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isTable && tableData ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {tableData.headers.map((header, index) => (
                              <TableHead key={index} className="font-semibold">
                                {header}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableData.rows.map((row: any, rowIndex: number) => (
                            <TableRow key={rowIndex}>
                              {row.map((cell: any, cellIndex: number) => (
                                <TableCell key={cellIndex}>
                                  {cell}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {item.data || (item.items ? JSON.stringify(item.items, null, 2) : 'No data available')}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}