import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Bug, Lightbulb, MessageCircle, Zap } from "lucide-react";

interface BetaFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FeedbackFormData {
  feedbackType: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  reproductionSteps?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
}

export function BetaFeedbackModal({ isOpen, onClose }: BetaFeedbackModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<FeedbackFormData>({
    feedbackType: '',
    category: '',
    title: '',
    description: '',
    severity: '',
    reproductionSteps: '',
    expectedBehavior: '',
    actualBehavior: ''
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: FeedbackFormData) => {
      // Collect browser info
      const browserInfo = {
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        timestamp: new Date().toISOString()
      };

      return await apiRequest("POST", "/api/beta/feedback", {
        ...data,
        browserInfo
      });
    },
    onSuccess: () => {
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! Our team will review it soon.",
      });
      onClose();
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/beta/feedback/my"] });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      feedbackType: '',
      category: '',
      title: '',
      description: '',
      severity: '',
      reproductionSteps: '',
      expectedBehavior: '',
      actualBehavior: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.feedbackType || !formData.title || !formData.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    submitFeedbackMutation.mutate(formData);
  };

  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return <Bug className="h-4 w-4" />;
      case 'feature_request': return <Lightbulb className="h-4 w-4" />;
      case 'usability': return <Zap className="h-4 w-4" />;
      case 'general': return <MessageCircle className="h-4 w-4" />;
      default: return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Beta Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve Hi-LYTE by sharing your experience. Your feedback is invaluable for our beta testing process.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="feedbackType">Feedback Type *</Label>
              <Select value={formData.feedbackType} onValueChange={(value) => setFormData({...formData, feedbackType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">
                    <div className="flex items-center gap-2">
                      <Bug className="h-4 w-4" />
                      Bug Report
                    </div>
                  </SelectItem>
                  <SelectItem value="feature_request">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Feature Request
                    </div>
                  </SelectItem>
                  <SelectItem value="usability">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Usability Issue
                    </div>
                  </SelectItem>
                  <SelectItem value="general">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      General Feedback
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Upload & Processing</SelectItem>
                  <SelectItem value="extraction">AI Extraction</SelectItem>
                  <SelectItem value="ui">User Interface</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="templates">Templates</SelectItem>
                  <SelectItem value="export">Export & Download</SelectItem>
                  <SelectItem value="billing">Billing & Credits</SelectItem>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.feedbackType === 'bug' && (
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select value={formData.severity} onValueChange={(value) => setFormData({...formData, severity: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">
                    <Badge className={getSeverityColor('critical')}>Critical</Badge>
                  </SelectItem>
                  <SelectItem value="high">
                    <Badge className={getSeverityColor('high')}>High</Badge>
                  </SelectItem>
                  <SelectItem value="medium">
                    <Badge className={getSeverityColor('medium')}>Medium</Badge>
                  </SelectItem>
                  <SelectItem value="low">
                    <Badge className={getSeverityColor('low')}>Low</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="Brief summary of your feedback"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Detailed description of your feedback, issue, or suggestion"
              rows={4}
              required
            />
          </div>

          {formData.feedbackType === 'bug' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="reproductionSteps">Steps to Reproduce</Label>
                <Textarea
                  id="reproductionSteps"
                  value={formData.reproductionSteps}
                  onChange={(e) => setFormData({...formData, reproductionSteps: e.target.value})}
                  placeholder="1. Go to... 2. Click on... 3. See error..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expectedBehavior">Expected Behavior</Label>
                  <Textarea
                    id="expectedBehavior"
                    value={formData.expectedBehavior}
                    onChange={(e) => setFormData({...formData, expectedBehavior: e.target.value})}
                    placeholder="What should happen?"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="actualBehavior">Actual Behavior</Label>
                  <Textarea
                    id="actualBehavior"
                    value={formData.actualBehavior}
                    onChange={(e) => setFormData({...formData, actualBehavior: e.target.value})}
                    placeholder="What actually happened?"
                    rows={2}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={submitFeedbackMutation.isPending}
              className="min-w-[100px]"
            >
              {submitFeedbackMutation.isPending ? "Submitting..." : "Submit Feedback"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}