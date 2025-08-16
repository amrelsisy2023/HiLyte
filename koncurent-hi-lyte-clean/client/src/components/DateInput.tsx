import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format, parse, isValid } from "date-fns";

interface DateInputProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
}

export default function DateInput({ value, onChange, placeholder = "Type date: MM/DD/YYYY or use calendar" }: DateInputProps) {
  const [inputValue, setInputValue] = useState(value ? format(value, "MM/dd/yyyy") : "");

  // Sync input value with prop value changes
  useEffect(() => {
    if (value) {
      const formattedValue = format(value, "MM/dd/yyyy");
      if (inputValue !== formattedValue) {
        setInputValue(formattedValue);
      }
    } else if (inputValue && !value) {
      // Only clear if we don't have a valid partial date being typed
      const isPartialValid = /^\d{1,2}(\/\d{1,2}(\/\d{0,4})?)?$/.test(inputValue);
      if (!isPartialValid) {
        setInputValue("");
      }
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    setInputValue(dateStr);
    
    // Clear date if input is empty
    if (dateStr === "") {
      onChange(null);
      return;
    }
    
    // Try to parse various date formats
    const formats = ["MM/dd/yyyy", "M/d/yyyy", "MM/d/yyyy", "M/dd/yyyy"];
    
    for (const formatStr of formats) {
      try {
        const parsedDate = parse(dateStr, formatStr, new Date());
        if (isValid(parsedDate) && dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          onChange(parsedDate);
          return;
        }
      } catch {
        // Continue to next format
      }
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date || null);
    if (date) {
      setInputValue(format(date, "MM/dd/yyyy"));
    } else {
      setInputValue("");
    }
  };

  const formatInputValue = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.target as HTMLInputElement;
    const cursorPos = input.selectionStart || 0;
    
    // Auto-add slashes for convenience
    if (e.key >= '0' && e.key <= '9') {
      const newValue = inputValue + e.key;
      if (newValue.length === 2 || newValue.length === 5) {
        const formatted = newValue + '/';
        setInputValue(formatted);
        e.preventDefault();
      }
    }
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          placeholder={placeholder}
          className="pr-10 hover:border-blue-400 focus:border-blue-500 transition-colors duration-200"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            // Allow numbers, slash, and navigation keys
            const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
            const isNumberOrSlash = /[\d\/]/.test(e.key) && e.key.length === 1;
            const isAllowedKey = allowedKeys.includes(e.key);
            const isCtrlKey = e.ctrlKey || e.metaKey;
            
            if (!isNumberOrSlash && !isAllowedKey && !isCtrlKey) {
              e.preventDefault();
              return;
            }
            
            // Auto-format while typing
            formatInputValue(e);
          }}
          onFocus={(e) => e.target.select()}
        />
        <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="px-3 hover:bg-blue-50 hover:border-blue-400 transition-colors duration-200"
          >
            📅
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <DayPicker
            mode="single"
            selected={value || undefined}
            onSelect={handleCalendarSelect}
            className="rounded-md border"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 hover:opacity-100 hover:bg-gray-100 rounded transition-colors",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-blue-100 hover:text-blue-700 rounded-md transition-colors cursor-pointer",
              day_selected: "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white",
              day_today: "bg-gray-100 text-gray-900 font-semibold",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
              day_hidden: "invisible",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}