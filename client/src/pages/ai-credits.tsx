import { AiCreditsDashboard } from "@/components/ai-credits-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function AiCreditsPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLocation("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
          <h1 className="text-3xl font-bold">AI Credits</h1>
          <p className="text-muted-foreground mt-2">
            Manage your AI credits for enhanced document analysis and extraction
          </p>
        </div>
        
        <AiCreditsDashboard />
      </div>
    </div>
  );
}