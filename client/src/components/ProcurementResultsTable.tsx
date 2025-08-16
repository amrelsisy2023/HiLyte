import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Package, MapPin, Hash, StickyNote } from "lucide-react";

interface ProcurementItem {
  itemName: string;
  csiDivision: {
    code: string;
    name: string;
    id: number;
    color: string;
  };
  drawingLocation: {
    sheetNumber: string;
    sheetName: string;
    coordinates: { x: number; y: number; width: number; height: number };
    drawingDetail?: string;
    zone?: string;
  };
  quantity?: string;
  notes?: string;
  specifications?: string;
  confidence: number;
  calloutId: string;
}

interface ProcurementResults {
  extractedItems: ProcurementItem[];
  summary: {
    totalItems: number;
    divisionsFound: number;
    averageConfidence: number;
  };
  colorCoding: {
    [divisionId: string]: {
      color: string;
      items: number;
    };
  };
  drawingAnnotations: {
    highlights: Array<{
      coordinates: { x: number; y: number; width: number; height: number };
      color: string;
      calloutId: string;
      divisionCode: string;
    }>;
    callouts: Array<{
      position: { x: number; y: number };
      text: string;
      color: string;
      itemId: string;
    }>;
  };
}

interface ProcurementResultsTableProps {
  results: ProcurementResults;
  onItemSelect?: (item: ProcurementItem) => void;
  onExport?: () => void;
}

export function ProcurementResultsTable({ 
  results, 
  onItemSelect,
  onExport 
}: ProcurementResultsTableProps) {
  
  const handleItemClick = (item: ProcurementItem) => {
    if (onItemSelect) {
      onItemSelect(item);
    }
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = [
      'Callout ID',
      'Item Name', 
      'CSI Division Code',
      'CSI Division Name',
      'Drawing Sheet',
      'Sheet Name',
      'Drawing Detail',
      'Zone/Grid',
      'Quantity',
      'Notes',
      'Specifications',
      'Confidence'
    ];

    const csvContent = [
      headers.join(','),
      ...results.extractedItems.map(item => [
        `"${item.calloutId}"`,
        `"${item.itemName}"`,
        `"${item.csiDivision.code}"`,
        `"${item.csiDivision.name}"`,
        `"${item.drawingLocation.sheetNumber}"`,
        `"${item.drawingLocation.sheetName}"`,
        `"${item.drawingLocation.drawingDetail || ''}"`,
        `"${item.drawingLocation.zone || ''}"`,
        `"${item.quantity || ''}"`,
        `"${item.notes || ''}"`,
        `"${item.specifications || ''}"`,
        `"${(item.confidence * 100).toFixed(1)}%"`
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procurement-items-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Procurement Extraction Results
              </h3>
              <p className="text-sm text-gray-600">
                {results.summary.totalItems} items found across {results.summary.divisionsFound} CSI divisions 
                (Avg. confidence: {(results.summary.averageConfidence * 100).toFixed(1)}%)
              </p>
            </div>
          </div>
          <Button
            onClick={onExport || handleExportCSV}
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Color coding legend */}
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(results.colorCoding).map(([divisionId, info]) => (
            <Badge
              key={divisionId}
              variant="outline"
              style={{ borderColor: info.color, color: info.color }}
              className="text-xs"
            >
              <div 
                className="w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: info.color }}
              />
              {info.items} items
            </Badge>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Callout
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CSI Division
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Drawing Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Details
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Confidence
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.extractedItems.map((item, index) => (
              <tr 
                key={index}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.csiDivision.color }}
                    />
                    <span className="text-sm font-medium text-gray-900">
                      {item.calloutId}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {item.itemName}
                  </div>
                  {item.specifications && (
                    <div className="text-xs text-gray-500 mt-1">
                      {item.specifications.length > 50 
                        ? item.specifications.substring(0, 50) + '...' 
                        : item.specifications}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <Badge
                    style={{ 
                      backgroundColor: item.csiDivision.color + '20',
                      borderColor: item.csiDivision.color,
                      color: item.csiDivision.color
                    }}
                    className="text-xs"
                  >
                    {item.csiDivision.code}
                  </Badge>
                  <div className="text-xs text-gray-600 mt-1">
                    {item.csiDivision.name}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm text-gray-900 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-gray-400" />
                    {item.drawingLocation.sheetNumber}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.drawingLocation.sheetName}
                  </div>
                  {item.drawingLocation.drawingDetail && (
                    <div className="text-xs text-blue-600 mt-1">
                      Detail: {item.drawingLocation.drawingDetail}
                    </div>
                  )}
                  {item.drawingLocation.zone && (
                    <div className="text-xs text-gray-500">
                      Zone: {item.drawingLocation.zone}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-sm text-gray-900">
                    {item.quantity && (
                      <>
                        <Hash className="h-3 w-3 text-gray-400" />
                        {item.quantity}
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  {item.notes && (
                    <div className="flex items-start gap-1 text-sm text-gray-600">
                      <StickyNote className="h-3 w-3 text-gray-400 mt-0.5" />
                      <span className="text-xs">
                        {item.notes.length > 40 
                          ? item.notes.substring(0, 40) + '...' 
                          : item.notes}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      item.confidence >= 0.9 
                        ? 'bg-green-100 text-green-800'
                        : item.confidence >= 0.7
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {(item.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleItemClick(item);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {results.extractedItems.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p>No procurement items found in this drawing.</p>
        </div>
      )}
    </div>
  );
}

export default ProcurementResultsTable;