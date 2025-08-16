import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CloudUpload, FileImage, Loader2, Calendar, Table, ChevronDown, ChevronRight, Trash2, Check } from "lucide-react";
import { Project, Drawing, ConstructionDivision } from "@shared/schema";
import UploadArea from "@/components/upload-area";
import DataTable from "@/components/data-table";
import { formatFileSize } from "@/lib/file-utils";
import kLogo from "@assets/Hubspot Scheduler Logo Image (1)_1751563530272.png";

interface DataExtractionSidebarProps {
  projects: Project[];
  drawings: Drawing[];
  currentProject: Project | null;
  currentDrawing: Drawing | null;
  onProjectSelect: (project: Project) => void;
  onDrawingSelect: (drawing: Drawing) => void;
  onDrawingDelete?: (drawingId: number) => void;
  onFileUpload: (files: File[]) => void;
  isUploading: boolean;
  constructionDivisions: ConstructionDivision[];
  selectedDivision: ConstructionDivision | null;
  onDivisionSelect: (division: ConstructionDivision) => void;
  extractedData: Record<number, Array<{
    id: string;
    type: string;
    extractedAt: Date;
    sourceLocation: string;
    items: Array<Record<string, any>>;
  }>>;
  showDataTable?: boolean;
}

export default function DataExtractionSidebar({
  projects,
  drawings,
  currentProject,
  currentDrawing,
  onProjectSelect,
  onDrawingSelect,
  onDrawingDelete,
  onFileUpload,
  isUploading,
  constructionDivisions,
  selectedDivision,
  onDivisionSelect,
  extractedData,
  showDataTable = false,
}: DataExtractionSidebarProps) {
  const [drawingsCollapsed, setDrawingsCollapsed] = useState(false);
  const [selectedDrawings, setSelectedDrawings] = useState<Set<number>>(new Set());

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header - Completely Rewritten */}
      <div className="px-6 py-8 border-b border-gray-200">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px' }}>
          <div style={{ flexShrink: 0 }}>
            <img 
              src={kLogo} 
              alt="Koncurent Logo" 
              style={{ 
                width: '96px', 
                height: '96px',
                borderRadius: '8px',
                objectFit: 'contain'
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '96px' }}>
            <h1 style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#111827', 
              margin: '0 0 8px 0',
              lineHeight: '1.2'
            }}>
              Koncurent Hi-LYTE
            </h1>
            <p style={{ 
              fontSize: '16px', 
              color: '#6B7280', 
              margin: '0',
              lineHeight: '1.2'
            }}>
              Data Extraction Tool
            </p>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="p-4 border-b border-gray-200">
        <UploadArea onFileUpload={onFileUpload} isUploading={isUploading} />
      </div>

      {/* Drawings List */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setDrawingsCollapsed(!drawingsCollapsed)}
              className="flex items-center space-x-2 text-sm font-semibold text-gray-900 hover:text-gray-700"
            >
              {drawingsCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <span>Uploaded Drawings ({drawings.length})</span>
            </button>
            
            {selectedDrawings.size > 0 && !drawingsCollapsed && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  {selectedDrawings.size} selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (onDrawingDelete) {
                      selectedDrawings.forEach(id => onDrawingDelete(id));
                      setSelectedDrawings(new Set());
                    }
                  }}
                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {!drawingsCollapsed && (
          <div className="flex-1 px-4 overflow-y-auto">
            <div className="space-y-2 py-2">
              {drawings.length > 0 ? (
                <div className="space-y-2">
                  {drawings.map((drawing) => {
                    const isSelected = currentDrawing?.id === drawing.id;
                    const isSelectedForDeletion = selectedDrawings.has(drawing.id);
                    
                    return (
                      <div
                        key={drawing.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newSelected = new Set(selectedDrawings);
                              if (isSelectedForDeletion) {
                                newSelected.delete(drawing.id);
                              } else {
                                newSelected.add(drawing.id);
                              }
                              setSelectedDrawings(newSelected);
                            }}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              isSelectedForDeletion
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            {isSelectedForDeletion && <Check className="h-2 w-2" />}
                          </button>
                          
                          <FileImage className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                          
                          <div 
                            className="flex-1 min-w-0"
                            onClick={() => onDrawingSelect(drawing)}
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {drawing.name}
                                {drawing.pageNumber && drawing.pageNumber > 1 && ` (Page ${drawing.pageNumber})`}
                              </p>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <span>{drawing.fileType?.toUpperCase()}</span>
                                <span>•</span>
                                <span>{formatFileSize(drawing.fileSize)}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 mt-1">
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(drawing.uploadedAt || new Date()).toLocaleDateString()}</span>
                              </div>
                              {drawing.totalPages && drawing.totalPages > 1 && (
                                <span className="text-xs text-blue-600 font-medium">
                                  {drawing.totalPages} pages total
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileImage className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No drawings uploaded yet</p>
                  <p className="text-xs">Upload PDF files to get started</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Construction Divisions Panel */}
      <Separator />
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Construction Divisions</h3>
        <div className="space-y-2">
          {constructionDivisions.map((division) => {
            const isSelected = selectedDivision?.id === division.id;
            return (
              <button
                key={division.id}
                onClick={() => onDivisionSelect(division)}
                className={`w-full px-4 py-3 rounded-lg border text-left transition-colors ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white"
                    style={{ backgroundColor: division.color }}
                  />
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="text-sm font-medium text-gray-900 whitespace-nowrap">
                      {division.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {extractedData[division.id]?.length || 0} items extracted
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data Table Panel */}
      {showDataTable && selectedDivision && (
        <>
          <Separator />
          <div className="p-4 border-t">
            <div className="flex items-center space-x-2 mb-3">
              <Table className="h-4 w-4 text-gray-600" />
              <h3 className="text-sm font-semibold text-gray-900">
                {selectedDivision.name} Data
              </h3>
            </div>
            <DataTable
              divisionName={selectedDivision.name}
              divisionColor={selectedDivision.color}
              divisionId={selectedDivision.id}
              drawingId={currentDrawing?.id}
              extractedData={extractedData[selectedDivision.id] || []}
            />
          </div>
        </>
      )}
    </div>
  );
}