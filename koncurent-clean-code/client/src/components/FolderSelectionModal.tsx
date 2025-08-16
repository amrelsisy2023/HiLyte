import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Folder, FolderPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { DrawingFolder } from "@shared/schema";

interface FolderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderSelected: (folderId: string | null) => void;
  drawingName?: string;
}

export default function FolderSelectionModal({
  isOpen,
  onClose,
  onFolderSelected,
  drawingName = "drawing"
}: FolderSelectionModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: folders = [] } = useQuery<DrawingFolder[]>({
    queryKey: ['/api/folders'],
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("/api/folders", "POST", { name });
      return response.json();
    },
    onSuccess: (newFolder: DrawingFolder) => {
      queryClient.invalidateQueries({ queryKey: ['/api/folders'] });
      setSelectedFolderId(newFolder.id.toString());
      setShowCreateNew(false);
      setNewFolderName("");
      toast({
        title: "Folder Created",
        description: `"${newFolder.name}" folder has been created.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create folder. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a folder name.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      await createFolderMutation.mutateAsync(newFolderName.trim());
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirm = () => {
    onFolderSelected(selectedFolderId);
    onClose();
  };

  const handleClose = () => {
    setSelectedFolderId(null);
    setShowCreateNew(false);
    setNewFolderName("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Folder for Drawing</DialogTitle>
          <p className="text-sm text-gray-600">
            Choose where to store "{drawingName}" or create a new folder.
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!showCreateNew ? (
            <>
              {/* Existing Folders Selection */}
              <div className="space-y-2">
                <Label htmlFor="folder-select">Choose Existing Folder</Label>
                <Select value={selectedFolderId || ""} onValueChange={setSelectedFolderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a folder..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uncategorized">
                      <div className="flex items-center space-x-2">
                        <Folder className="h-4 w-4 text-gray-400" />
                        <span>Uncategorized</span>
                      </div>
                    </SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <div className="flex items-center space-x-2">
                          <Folder className="h-4 w-4 text-blue-500" />
                          <span>{folder.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Create New Folder Option */}
              <div className="pt-2 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateNew(true)}
                  className="w-full"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create New Folder
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Create New Folder Form */}
              <div className="space-y-2">
                <Label htmlFor="new-folder-name">New Folder Name</Label>
                <Input
                  id="new-folder-name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateFolder();
                    }
                  }}
                />
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleCreateFolder}
                  disabled={isCreating || !newFolderName.trim()}
                  className="flex-1"
                >
                  {isCreating ? "Creating..." : "Create Folder"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateNew(false);
                    setNewFolderName("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={showCreateNew || (!selectedFolderId && selectedFolderId !== "uncategorized")}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}