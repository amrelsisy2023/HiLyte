import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, DollarSign, Users, FileText, Calendar, X } from "lucide-react";
import { format } from "date-fns";

interface DrawingProfile {
  id: number;
  drawingId: number;
  industry: string;
  projectType: string;
  budgetRange: string;
  estimatedBudget?: string;
  projectComplexity: string;
  teamSize: string;
  contractorType: string;
  softwareUsed: string[];
  specialRequirements?: string;
  projectStartDate?: Date;
  projectEndDate?: Date;
  createdAt: Date;
}

interface DrawingProfileViewerProps {
  isOpen: boolean;
  onClose: () => void;
  drawingId: number;
  drawingName: string;
}

export default function DrawingProfileViewer({ 
  isOpen, 
  onClose, 
  drawingId, 
  drawingName 
}: DrawingProfileViewerProps) {
  const [profile, setProfile] = useState<DrawingProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && drawingId) {
      fetchProfile();
    }
  }, [isOpen, drawingId]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/drawing-profiles/${drawingId}`);
      if (response.ok) {
        const profileData = await response.json();
        // Convert date strings back to Date objects
        if (profileData.projectStartDate) {
          profileData.projectStartDate = new Date(profileData.projectStartDate);
        }
        if (profileData.projectEndDate) {
          profileData.projectEndDate = new Date(profileData.projectEndDate);
        }
        if (profileData.createdAt) {
          profileData.createdAt = new Date(profileData.createdAt);
        }
        setProfile(profileData);
      } else if (response.status === 404) {
        setError("No profile found for this drawing. It may have been created before profiles were added.");
      } else {
        setError("Failed to load drawing profile.");
      }
    } catch (err) {
      setError("Failed to load drawing profile.");
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Drawing Profile: {drawingName}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading profile...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">{error}</div>
            <Button variant="outline" onClick={fetchProfile}>
              Try Again
            </Button>
          </div>
        )}

        {profile && (
          <div className="space-y-6">
            {/* Project Information */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Project Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Industry:</span>
                  <div className="mt-1">
                    <Badge variant="secondary">{profile.industry}</Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Project Type:</span>
                  <div className="mt-1">
                    <Badge variant="secondary">{profile.projectType}</Badge>
                  </div>
                </div>
                {profile.projectStartDate && (
                  <div>
                    <span className="font-medium text-gray-700">Start Date:</span>
                    <div className="mt-1 flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      {format(profile.projectStartDate, "PPP")}
                    </div>
                  </div>
                )}
                {profile.projectEndDate && (
                  <div>
                    <span className="font-medium text-gray-700">End Date:</span>
                    <div className="mt-1 flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      {format(profile.projectEndDate, "PPP")}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Budget Information */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Budget Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Budget Range:</span>
                  <div className="mt-1">
                    <Badge variant="secondary">{profile.budgetRange}</Badge>
                  </div>
                </div>
                {profile.estimatedBudget && (
                  <div>
                    <span className="font-medium text-gray-700">Specific Budget:</span>
                    <div className="mt-1 text-gray-900">${profile.estimatedBudget}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Team & Project Details */}
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Team & Project Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Project Complexity:</span>
                  <div className="mt-1">
                    <Badge variant="secondary">{profile.projectComplexity}</Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Team Size:</span>
                  <div className="mt-1">
                    <Badge variant="secondary">{profile.teamSize}</Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Your Role:</span>
                  <div className="mt-1">
                    <Badge variant="secondary">{profile.contractorType}</Badge>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Software Used:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {profile.softwareUsed.map((software, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {software}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Context */}
            {profile.specialRequirements && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-semibold text-gray-900">Special Requirements</h3>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {profile.specialRequirements}
                </div>
              </div>
            )}

            {/* Profile Created */}
            <div className="text-xs text-gray-500 text-center pt-4 border-t">
              Profile created on {format(profile.createdAt, "PPP 'at' p")}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}