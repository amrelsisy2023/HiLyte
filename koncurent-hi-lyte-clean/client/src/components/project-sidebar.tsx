import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CloudUpload, FileImage, Eye, Loader2, ChevronDown, ChevronRight, FileText, Calendar, Folder, FolderPlus, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import CreateFolderModal from "./CreateFolderModal";
import type { Project, Drawing, ConstructionDivision, DrawingFolder } from "@shared/schema";

interface ProjectSidebarProps {
  projects: Project[];
  drawings: Drawing[];
  currentProject: Project | null;
  currentDrawing: Drawing | null;
  onProjectSelect: (project: Project) => void;
  onDrawingSelect: (drawing: Drawing) => void;
  onFileUpload: (files: File[]) => void;
  isUploading: boolean;
  currentPage?: number;
  onPageSelect?: (page: number) => void;
  constructionDivisions?: ConstructionDivision[];
  selectedDivision?: ConstructionDivision | null;
  onDivisionSelect?: (division: ConstructionDivision) => void;
  extractedData?: Record<number, Array<{
    id: string;
    type: string;
    extractedAt: Date;
    sourceLocation: string;
    items: Array<Record<string, any>>;
  }>>;
}

interface ExtractedDataItem {
  id: string;
  type: string;
  extractedAt: Date;
  sourceLocation: string;
  items: Array<Record<string, any>>;
}

// Sample extracted data for demonstration
const sampleExtractedData: Record<number, ExtractedDataItem[]> = {
  1: [
    {
      id: "concrete-1",
      type: "Mix Design Schedule",
      extractedAt: new Date(),
      sourceLocation: "Page 1 - Foundation Plan",
      items: [
        { mix: "3000 PSI", slump: "4-6 in", aggregate: "3/4 max", cement: "Type I/II" },
        { mix: "4000 PSI", slump: "3-5 in", aggregate: "1/2 max", cement: "Type III" }
      ]
    }
  ],
  2: [
    {
      id: "openings-1",
      type: "Door Schedule",
      extractedAt: new Date(),
      sourceLocation: "Page 2 - Floor Plan",
      items: [
        { mark: "A1", size: "3'0\" x 7'0\"", type: "Solid Core Wood", hardware: "Grade 1 Lever" },
        { mark: "B1", size: "2'8\" x 7'0\"", type: "Hollow Metal", hardware: "Panic Bar" }
      ]
    }
  ],
  8: [
    {
      id: "hvac-1", 
      type: "Equipment Schedule",
      extractedAt: new Date(),
      sourceLocation: "Page 3 - HVAC Plan",
      items: [
        { tag: "AHU-1", type: "Air Handler", capacity: "5000 CFM", location: "Roof" },
        { tag: "EF-1", type: "Exhaust Fan", capacity: "1200 CFM", location: "Kitchen" }
      ]
    }
  ]
};

function DivisionSection({ division, annotationCount }: { 
  division: ConstructionDivision; 
  annotationCount: number; 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const extractedItems = sampleExtractedData[division.id] || [];
  
  return (
    <div className="border border-gray-200 rounded-lg">
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <span className="h-4 w-4 text-gray-400 flex items-center justify-center text-xs">
              {isExpanded ? '▼' : '▶'}
            </span>
          </div>
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ backgroundColor: division.color }}
          />
          <span className="text-sm font-medium text-gray-900">{division.name}</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>{extractedItems.length} tables</span>
          <span>•</span>
          <span>{annotationCount} annotations</span>
        </div>
      </div>
      
      {isExpanded && extractedItems.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50">
          {extractedItems.map((item) => (
            <div 
              key={item.id} 
              className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-white transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2">
                  <span className="h-4 w-4 text-gray-400 mt-0.5 text-xs">📄</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.type}</div>
                    <div className="text-xs text-gray-600">{item.sourceLocation}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center">
                      <span className="mr-1 text-xs">📅</span>
                      {item.extractedAt.toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {item.items.length} items
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {isExpanded && extractedItems.length === 0 && (
        <div className="border-t border-gray-100 bg-gray-50 p-3">
          <div className="text-center text-xs text-gray-500">
            No data extracted yet
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectSidebar({
  projects,
  drawings,
  currentProject,
  currentDrawing,
  onProjectSelect,
  onDrawingSelect,
  onFileUpload,
  isUploading,
  currentPage = 1,
  onPageSelect,
}: ProjectSidebarProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<DrawingFolder | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const { toast } = useToast();

  const { data: divisions } = useQuery<ConstructionDivision[]>({
    queryKey: ['/api/construction-divisions'],
  });

  const { data: folders = [] } = useQuery<DrawingFolder[]>({
    queryKey: ['/api/folders'],
  });

  // Debug logging
  console.log('ProjectSidebar rendering:', { foldersCount: folders.length, folders });

  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (folderName: string) => {
      return await apiRequest("POST", "/api/folders", {
        name: folderName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      toast({
        title: "Folder created",
        description: "New folder has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating folder",
        description: "Failed to create folder. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    onFileUpload(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // TODO: Show folder selection modal instead of direct upload
    onFileUpload(files);
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getAnnotationCountByDivision = (divisionId: number) => {
    return annotations?.filter(a => a.divisionId === divisionId).length || 0;
  };

  const getDrawingDivisionColors = (drawingId: number) => {
    const drawingAnnotations = annotations?.filter(a => a.drawingId === drawingId) || [];
    const divisionIds = drawingAnnotations.map(a => a.divisionId).filter((id, index, arr) => arr.indexOf(id) === index);
    return divisionIds.map(id => divisions?.find(d => d.id === id)?.color).filter(Boolean);
  };

  return (
    <aside className="w-80 bg-white shadow-sm border-r border-gray-200 flex flex-col">
      {/* Project Navigation */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Project Drawings</h2>
        <div
          className={`w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed rounded-lg transition-colors group cursor-pointer ${
            dragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('sidebarFileInput')?.click()}
        >
          <input
            id="sidebarFileInput"
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleFileInput}
            disabled={isUploading}
          />
          
          {isUploading ? (
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          ) : (
            <CloudUpload className="h-5 w-5 text-gray-400 group-hover:text-blue-500" />
          )}
          
          <span className="text-gray-600 group-hover:text-blue-600 font-medium">
            {isUploading ? 'Uploading...' : 'Upload New Drawing'}
          </span>
        </div>
      </div>

      {/* Folders and Drawings List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {/* Header with Add Folder Button */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Drawings ({drawings.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowCreateFolder(true)}
              title="Create new folder"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Show folders if any exist */}
          {folders.length > 0 ? (
            <div className="space-y-2">
              {folders.map((folder) => {
                const folderDrawings = drawings.filter(d => d.folderId === folder.id);
                const isExpanded = expandedFolders.has(folder.id);
                
                return (
                  <div key={folder.id} className="space-y-1">
                    {/* Folder header */}
                    <div
                      className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                        selectedFolder?.id === folder.id 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleFolder(folder.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {isExpanded ? (
                            <FolderOpen className="h-5 w-5 text-blue-500" />
                          ) : (
                            <Folder className="h-5 w-5 text-blue-500" />
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {folder.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {folderDrawings.length} drawing{folderDrawings.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {new Date(folder.createdAt).toLocaleDateString()}
                          </span>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Drawings in folder */}
                    {isExpanded && (
                      <div className="ml-6 space-y-1">
                        {folderDrawings.length === 0 ? (
                          <div className="py-3 px-2 text-sm text-gray-500 italic">
                            No drawings in this folder yet
                          </div>
                        ) : (
                          folderDrawings.map((drawing) => {
                            const isSelected = currentDrawing?.id === drawing.id;
                            return (
                              <div
                                key={drawing.id}
                                className={`p-2 rounded cursor-pointer transition-colors ${
                                  isSelected 
                                    ? 'bg-blue-50 border border-blue-200' 
                                    : 'hover:bg-gray-50'
                                }`}
                                onClick={() => onDrawingSelect(drawing)}
                              >
                                <div className="flex items-center space-x-2">
                                  <FileImage className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {drawing.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {drawing.fileType?.includes('pdf') ? 'PDF' : 'Image'}
                                      {drawing.totalPages && drawing.totalPages > 1 && ` • ${drawing.totalPages} pages`}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Ungrouped drawings (drawings without folders) */}
          {(() => {
            const ungroupedDrawings = drawings.filter(d => !d.folderId);
            
            if (ungroupedDrawings.length === 0 && folders.length === 0) {
              return (
                <div className="text-center py-8">
                  <Folder className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">
                    No drawings uploaded yet
                  </p>
                  <p className="text-sm text-gray-400">
                    Upload PDF files to get started
                  </p>
                </div>
              );
            }

            if (ungroupedDrawings.length === 0) {
              return null; // All drawings are in folders
            }

            return (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700 px-1">
                  Uncategorized ({ungroupedDrawings.length})
                </div>
                {ungroupedDrawings.map((drawing) => {
                  const isSelected = currentDrawing?.id === drawing.id;
                  return (
                    <div
                      key={drawing.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      onClick={() => onDrawingSelect(drawing)}
                    >
                      <div className="flex items-center space-x-3">
                        <FileImage className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {drawing.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {drawing.fileType?.includes('pdf') ? 'PDF Document' : 'Image File'}
                            {drawing.totalPages && drawing.totalPages > 1 && ` • ${drawing.totalPages} pages`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </ScrollArea>

      {/* Construction Divisions Panel - Only show if constructionDivisions are provided and present */}
      {constructionDivisions && constructionDivisions.length > 0 && (
        <div className="border-t border-gray-200 p-4 flex flex-col min-h-0">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Construction Divisions</h3>
          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-3">
              {constructionDivisions.map((division) => (
                <div
                  key={division.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedDivision?.id === division.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => onDivisionSelect?.(division)}
                >
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: division.color }}
                    />
                    <span className="text-sm font-medium">{division.name}</span>
                  </div>
                  
                  {/* Show extracted data count for this division */}
                  {extractedData?.[division.id] && (
                    <div className="mt-2 text-xs text-gray-500">
                      {extractedData[division.id].length} extracted item(s)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreateFolder={async (folderName: string) => {
          await createFolderMutation.mutateAsync(folderName);
        }}
      />
    </aside>
  );
}
