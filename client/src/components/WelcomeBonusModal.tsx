import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface WelcomeBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeBonusModal({ isOpen, onClose }: WelcomeBonusModalProps) {
  const [isCrediting, setIsCrediting] = useState(false);
  const [creditGranted, setCreditGranted] = useState(false);
  const { toast } = useToast();

  const handleStartExtracting = async () => {
    if (creditGranted) {
      onClose();
      return;
    }

    setIsCrediting(true);
    try {
      // Add the $10 welcome bonus credits
      const response = await fetch('/api/ai-credits/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 10.00,
          type: 'signup_bonus',
          description: 'Welcome bonus - $10 AI Credits gift from Koncurent'
        }),
      });

      if (response.ok) {
        setCreditGranted(true);
        // Invalidate credits balance query to refresh the UI
        queryClient.invalidateQueries({ queryKey: ["/api/ai-credits/balance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/ai-credits/transactions"] });
        
        toast({
          title: "Welcome bonus added!",
          description: "$10.00 in AI Credits has been added to your account.",
        });
        
        // Close modal after a brief delay to show success
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        throw new Error('Failed to add welcome bonus');
      }
    } catch (error) {
      console.error('Error adding welcome bonus:', error);
      toast({
        title: "Error",
        description: "Failed to add welcome bonus. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCrediting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Gift className="h-6 w-6 text-green-600" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            Welcome Gift! 🎉
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {creditGranted ? (
              <>
                A gift of <span className="font-semibold text-green-600">$10.00</span> has been added to your AI Credits.
                Start extracting data from your construction drawings right away!
              </>
            ) : (
              <>
                Claim your <span className="font-semibold text-green-600">$10.00</span> welcome gift in AI Credits.
                Perfect for getting started with data extraction!
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center justify-center space-x-2 rounded-lg bg-green-50 p-4">
          <Sparkles className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            {creditGranted ? "AI Credits Balance: $10.00" : "Welcome Gift: $10.00 AI Credits"}
          </span>
        </div>
        
        <div className="flex justify-center">
          <Button 
            onClick={handleStartExtracting} 
            className="bg-green-600 hover:bg-green-700"
            disabled={isCrediting}
          >
            {isCrediting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {creditGranted ? "Start Extracting Data" : isCrediting ? "Adding Credits..." : "Claim $10 Gift & Start"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}