import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DayPicker } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Building2, DollarSign, Users, FileText } from "lucide-react";
import { format } from "date-fns";
import DateInput from "./DateInput";
import { cn } from "@/lib/utils";

interface DrawingProfile {
  industry: string;
  projectType: string;
  projectStartDate: Date | null;
  projectEndDate: Date | null;
  estimatedBudget: string;
  budgetRange: string;
  softwareUsed: string[];
  projectComplexity: string;
  specialRequirements: string;
  teamSize: string;
  contractorType: string;
}

interface DrawingProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: DrawingProfile) => void;
  drawingName: string;
}

const industries = [
  "Healthcare",
  "Institutional",
  "Housing/Residential", 
  "Commercial/Office",
  "Industrial/Manufacturing",
  "Education",
  "Hospitality",
  "Retail",
  "Mixed-Use",
  "Infrastructure",
  "Other"
];

const projectTypes = [
  "New Construction",
  "Renovation/Remodel",
  "Addition",
  "Tenant Improvement",
  "Infrastructure Upgrade", 
  "Maintenance/Repair",
  "Mixed Scope"
];

const budgetRanges = [
  "Under $100K",
  "$100K - $500K", 
  "$500K - $1M",
  "$1M - $5M",
  "$5M - $10M",
  "$10M - $50M",
  "Over $50M"
];

const softwareOptions = [
  "PlanGrid",
  "Bluebeam",
  "Fieldwire",
  "Buildertrend",
  "CoConstruct",
  "Other/None"
];

const complexityLevels = [
  "Simple (Single trade, straightforward)",
  "Moderate (Multiple trades, standard complexity)",
  "Complex (Many trades, custom systems)",
  "Highly Complex (Critical systems, specialized requirements)"
];

const teamSizes = [
  "Small (1-5 people)",
  "Medium (6-15 people)", 
  "Large (16-50 people)",
  "Enterprise (50+ people)"
];

const contractorTypes = [
  "General Contractor",
  "Specialty Contractor", 
  "Design-Build",
  "Construction Manager",
  "Project Manager",
  "Assistant Project Manager",
  "Owner/Developer",
  "Architect/Engineer",
  "Other"
];

export default function DrawingProfileModal({ 
  isOpen, 
  onClose, 
  onSave, 
  drawingName 
}: DrawingProfileModalProps) {
  const [profile, setProfile] = useState<DrawingProfile>({
    industry: "",
    projectType: "",
    projectStartDate: null,
    projectEndDate: null,
    estimatedBudget: "",
    budgetRange: "",
    softwareUsed: [],
    projectComplexity: "",
    specialRequirements: "",
    teamSize: "",
    contractorType: ""
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const handleSoftwareToggle = (software: string) => {
    setProfile(prev => ({
      ...prev,
      softwareUsed: prev.softwareUsed.includes(software)
        ? prev.softwareUsed.filter(s => s !== software)
        : [...prev.softwareUsed, software]
    }));
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    onSave(profile);
    onClose();
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return profile.industry && profile.projectType;
      case 2:
        return profile.budgetRange;
      case 3:
        return profile.projectComplexity && profile.teamSize;
      case 4:
        return profile.contractorType;
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Drawing Profile Setup
          </DialogTitle>
          <DialogDescription>
            Help us understand your project context for better AI data extraction from "{drawingName}"
          </DialogDescription>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Project Basics */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Building2 className="h-5 w-5 text-blue-600" />
              Project Basics
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry *</Label>
                <Select value={profile.industry} onValueChange={(value) => setProfile(prev => ({ ...prev, industry: value }))}>
                  <SelectTrigger className="cursor-pointer hover:border-blue-400 transition-colors duration-200">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map(industry => (
                      <SelectItem key={industry} value={industry} className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150">{industry}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectType">Project Type *</Label>
                <Select value={profile.projectType} onValueChange={(value) => setProfile(prev => ({ ...prev, projectType: value }))}>
                  <SelectTrigger className="cursor-pointer hover:border-blue-400 transition-colors duration-200">
                    <SelectValue placeholder="Select project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectTypes.map(type => (
                      <SelectItem key={type} value={type} className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Project Start Date</Label>
                <DateInput
                  value={profile.projectStartDate}
                  onChange={(date) => setProfile(prev => ({ ...prev, projectStartDate: date }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Project End Date</Label>
                <DateInput
                  value={profile.projectEndDate}
                  onChange={(date) => setProfile(prev => ({ ...prev, projectEndDate: date }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Budget Information */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Budget Information
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budgetRange">Budget Range *</Label>
                <Select value={profile.budgetRange} onValueChange={(value) => setProfile(prev => ({ ...prev, budgetRange: value }))}>
                  <SelectTrigger className="cursor-pointer hover:border-blue-400 transition-colors duration-200">
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetRanges.map(range => (
                      <SelectItem key={range} value={range} className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150">{range}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimatedBudget">Specific Budget (Optional)</Label>
                <Input
                  id="estimatedBudget"
                  placeholder="e.g., $2,500,000"
                  value={profile.estimatedBudget}
                  onChange={(e) => setProfile(prev => ({ ...prev, estimatedBudget: e.target.value }))}
                  className="hover:border-blue-400 focus:border-blue-500 transition-colors duration-200"
                />
                <p className="text-sm text-gray-500">More specific budget helps AI understand project scale and material expectations</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Project Details */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Users className="h-5 w-5 text-blue-600" />
              Project Details
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectComplexity">Project Complexity *</Label>
                <Select value={profile.projectComplexity} onValueChange={(value) => setProfile(prev => ({ ...prev, projectComplexity: value }))}>
                  <SelectTrigger className="cursor-pointer hover:border-blue-400 transition-colors duration-200">
                    <SelectValue placeholder="Select complexity" />
                  </SelectTrigger>
                  <SelectContent>
                    {complexityLevels.map(level => (
                      <SelectItem key={level} value={level} className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150">{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamSize">Team Size *</Label>
                <Select value={profile.teamSize} onValueChange={(value) => setProfile(prev => ({ ...prev, teamSize: value }))}>
                  <SelectTrigger className="cursor-pointer hover:border-blue-400 transition-colors duration-200">
                    <SelectValue placeholder="Select team size" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamSizes.map(size => (
                      <SelectItem key={size} value={size} className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150">{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Software/Platforms Used (Select all that apply)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {softwareOptions.map(software => (
                  <div
                    key={software}
                    onClick={() => handleSoftwareToggle(software)}
                    className={`p-3 rounded-lg border-2 text-center cursor-pointer transition-all duration-200 hover:shadow-md transform hover:scale-105 ${
                      profile.softwareUsed.includes(software)
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <div className="text-sm font-medium">{software}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Additional Context */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <FileText className="h-5 w-5 text-blue-600" />
              Additional Context
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contractorType">Your Role *</Label>
                <Select value={profile.contractorType} onValueChange={(value) => setProfile(prev => ({ ...prev, contractorType: value }))}>
                  <SelectTrigger className="cursor-pointer hover:border-blue-400 transition-colors duration-200">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractorTypes.map(type => (
                      <SelectItem key={type} value={type} className="cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150">{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialRequirements">Special Requirements or Notes</Label>
                <Textarea
                  id="specialRequirements"
                  placeholder="Any special requirements, sustainability goals, building codes, or other important context..."
                  value={profile.specialRequirements}
                  onChange={(e) => setProfile(prev => ({ ...prev, specialRequirements: e.target.value }))}
                  rows={4}
                  className="hover:border-blue-400 focus:border-blue-500 transition-colors duration-200 resize-none"
                />
                <p className="text-sm text-gray-500">This helps AI understand specific terminology and requirements for your project</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`transition-all duration-200 ${
              currentStep === 1 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-100 hover:border-gray-400 hover:shadow-sm'
            }`}
          >
            Previous
          </Button>
          
          <div className="flex gap-2">
            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!isStepValid()}
                className={`bg-blue-600 hover:bg-blue-700 transition-all duration-200 ${
                  !isStepValid() 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:shadow-md transform hover:scale-105'
                }`}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={!isStepValid()}
                className={`bg-green-600 hover:bg-green-700 transition-all duration-200 ${
                  !isStepValid() 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:shadow-md transform hover:scale-105'
                }`}
              >
                Save Profile & Continue
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}