import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { validateFile } from "@/lib/file-utils";
import type { Drawing } from "@shared/schema";

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, projectId }: { file: File; projectId?: number }) => {
      const formData = new FormData();
      formData.append('drawing', file);
      
      if (projectId) {
        formData.append('projectId', projectId.toString());
      }

      const response = await fetch('/api/drawings/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
        const error = new Error(errorData.message || 'Upload failed');
        // Pass through error type for special handling
        (error as any).errorType = errorData.errorType;
        throw error;
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload successful",
        description: `${data.name} has been uploaded successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/drawings'] });
    },
    onError: (error: any) => {
      // Don't show toast for trial limit errors - let the modal handle it
      if (error.errorType === 'TRIAL_LIMIT_EXCEEDED') {
        return;
      }
      
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your file.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const uploadFile = async (file: File, projectId?: number): Promise<Drawing> => {
    const validation = validateFile(file);
    
    if (!validation.isValid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
      });
      throw new Error(validation.error);
    }

    setIsUploading(true);
    
    try {
      const result = await uploadMutation.mutateAsync({ file, projectId });
      return result;
    } catch (error) {
      setIsUploading(false);
      throw error;
    }
  };

  return {
    uploadFile,
    isUploading,
  };
}
