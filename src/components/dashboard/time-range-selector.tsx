'use client';

import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Calendar, ChevronDown, Clock } from 'lucide-react';
import { TIME_RANGES } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface TimeRangeSelectorProps {
  selectedRange: string;
  onRangeChange: (range: string) => void;
  className?: string;
}

const timeRangeLabels = {
  '1h': 'Last 1 hour',
  '6h': 'Last 6 hours',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  'custom': 'Custom range...'
};

const getTimeRangeIcon = (range: string) => {
  switch (range) {
    case '1h':
    case '6h':
    case '24h':
      return <Clock className="h-4 w-4" />;
    case '7d':
    case '30d':
      return <Calendar className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
};

export function TimeRangeSelector({ selectedRange, onRangeChange, className }: TimeRangeSelectorProps) {
  const currentLabel = timeRangeLabels[selectedRange as keyof typeof timeRangeLabels] || 'Custom range...';

  const handleRangeSelect = (range: string) => {
    if (range === 'custom') {
      // In a real implementation, this would open a date picker
      console.log('Open custom date range picker');
      return;
    }
    onRangeChange(range);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn("min-w-[140px] justify-between", className)}
        >
          <div className="flex items-center gap-2">
            {getTimeRangeIcon(selectedRange)}
            <span className="truncate">{currentLabel}</span>
          </div>
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuLabel>Time Range</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {TIME_RANGES.map((range) => (
          <DropdownMenuItem
            key={range.value}
            onClick={() => handleRangeSelect(range.value)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              selectedRange === range.value && "bg-primary/10 text-primary font-medium"
            )}
          >
            {getTimeRangeIcon(range.value)}
            <span>{range.label}</span>
            {selectedRange === range.value && (
              <div className="ml-auto h-2 w-2 bg-primary rounded-full" />
            )}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleRangeSelect('custom')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Calendar className="h-4 w-4" />
          <span>Custom range...</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}