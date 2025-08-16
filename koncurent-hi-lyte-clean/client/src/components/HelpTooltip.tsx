import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface HelpTooltipProps {
  content: string;
  side?: "top" | "right" | "bottom" | "left";
  children: React.ReactNode;
  showIcon?: boolean;
}

export default function HelpTooltip({ 
  content, 
  side = "top", 
  children, 
  showIcon = false 
}: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative inline-flex items-center">
            {children}
            {showIcon && (
              <HelpCircle className="h-3 w-3 text-gray-400 ml-1 opacity-70" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}