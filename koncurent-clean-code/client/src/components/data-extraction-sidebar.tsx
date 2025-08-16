import { useState } from "react";
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
  uploadingFileName?: string;
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
  uploadingFileName = '',
  constructionDivisions,
  selectedDivision,
  onDivisionSelect,
  extractedData,
  showDataTable = true,
}: DataExtractionSidebarProps) {
  const [uploadAreaOpen, setUploadAreaOpen] = useState(false);
  const [drawingsCollapsed, setDrawingsCollapsed] = useState(false);
  const [selectedDrawings, setSelectedDrawings] = useState<Set<number>>(new Set());

  // Group drawings by original PDF or display individually
  const groupedDrawings = new Map<number | string, Drawing[]>();
  
  drawings.forEach(drawing => {
    const groupKey = drawing.originalDrawingId || drawing.id;
    if (!groupedDrawings.has(groupKey)) {
      groupedDrawings.set(groupKey, []);
    }
    groupedDrawings.get(groupKey)!.push(drawing);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-3 mb-1">
          <img src={kLogo} alt="K" className="h-8 w-8" />
          <h2 className="text-lg font-semibold text-gray-900">Koncurent Drawing Wizard</h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">Upload • Select • Extract • Organize</p>
      </div>

      {/* Upload Section */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <Button
          onClick={() => setUploadAreaOpen(!uploadAreaOpen)}
          className="w-full"
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <CloudUpload className="mr-2 h-4 w-4" />
              Upload PDF Drawings
            </>
          )}
        </Button>
        
        {uploadAreaOpen && (
          <div className="mt-3">
            <UploadArea 
              onFileUpload={onFileUpload} 
              isUploading={isUploading}
              uploadingFileName={uploadingFileName}
              showProgress={isUploading && uploadingFileName.length > 0}
            />
          </div>
        )}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Drawings List */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
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
        
        <ScrollArea className="flex-1">
          <div className="px-4 pb-4">
            <div className="space-y-2 py-2">
            {/* Simple drawings list */}
            {drawings.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs text-gray-500 mb-2">
                  {drawings.length} drawings found
                </div>
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
                              <span>{drawing.uploadedAt ? new Date(drawing.uploadedAt).toLocaleDateString() : 'Unknown date'}</span>
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
        </ScrollArea>

        {/* Construction Divisions Panel */}
        <div className="border-t border-gray-200 bg-gray-50 flex flex-col min-h-0 flex-shrink-0">
          <div className="p-4 pb-2">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Construction Divisions</h3>
          </div>
          <div className="px-4 pb-4 max-h-48 overflow-y-auto">
            <div className="space-y-2">
              {constructionDivisions.map((division) => (
                <div
                  key={division.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedDivision?.id === division.id
                      ? 'border-blue-500 bg-blue-100 text-blue-900'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                  onClick={() => onDivisionSelect(division)}
                >
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: division.color }}
                    />
                    <span className="text-xs font-medium truncate">{division.name}</span>
                  </div>
                  
                  {/* Show extracted data count */}
                  {extractedData[division.id] && extractedData[division.id].length > 0 && (
                    <div className="mt-1 flex items-center space-x-1">
                      <Table className="h-3 w-3" />
                      <span className="text-xs text-gray-600">
                        {extractedData[division.id].length} item(s)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Data Table Panel - Shows when division is selected */}
          {showDataTable && selectedDivision && (
            <div className="border-t border-gray-200 bg-white">
              <div className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedDivision.color }}
                  />
                  <h4 className="text-sm font-semibold text-gray-900">
                    {selectedDivision.name} Data
                  </h4>
                </div>
                
                {extractedData[selectedDivision.id] && extractedData[selectedDivision.id].length > 0 ? (
                  <div className="max-h-64 overflow-hidden">
                    <DataTable
                      divisionName={selectedDivision.name}
                      divisionColor={selectedDivision.color}
                      divisionId={selectedDivision.id}
                      drawingId={currentDrawing?.id}
                      extractedData={extractedData[selectedDivision.id] as any}
                    />
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Table className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs">No data extracted yet</p>
                    <p className="text-xs">Select an area on the drawing to extract data</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}