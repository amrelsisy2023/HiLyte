import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Brain, X, Lightbulb } from "lucide-react";

export function TrainingNotification() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already seen the notification enough times
    const seenCount = parseInt(localStorage.getItem('trainingNotificationSeen') || '0');
    const maxShows = 2; // Show maximum 2 times
    
    if (seenCount < maxShows) {
      // Show notification after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
        // Increment the seen count
        localStorage.setItem('trainingNotificationSeen', (seenCount + 1).toString());
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Mark as seen when manually dismissed
    const currentCount = parseInt(localStorage.getItem('trainingNotificationSeen') || '0');
    localStorage.setItem('trainingNotificationSeen', Math.max(currentCount, 2).toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <Alert className="border-blue-200 bg-blue-50">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-blue-600" />
            <Lightbulb className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="flex-1">
            <AlertDescription className="text-sm">
              <strong className="text-blue-800">AI Training Active!</strong>
              <br />
              Every manual highlight you make teaches the AI to better recognize data patterns. 
              Check the training dashboard to see your progress.
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </Alert>
    </div>
  );
}