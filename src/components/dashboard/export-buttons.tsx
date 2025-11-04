'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, Mail, Loader2 } from 'lucide-react';
import type { ExportRequest } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface ExportButtonsProps {
  onExport: (type: ExportRequest['type'], format: ExportRequest['format']) => void;
  isExporting: boolean;
}

const exportOptions = [
  {
    label: 'Export Usage Report',
    value: 'usage-report' as const,
    description: 'API usage data and metrics',
    icon: <FileText className="h-4 w-4" />
  },
  {
    label: 'Export Fallback Log',
    value: 'fallback-log' as const,
    description: 'Fallback events and chain usage',
    icon: <FileText className="h-4 w-4" />
  },
  {
    label: 'Export Dashboard Snapshot',
    value: 'dashboard-snapshot' as const,
    description: 'Complete dashboard export',
    icon: <Download className="h-4 w-4" />
  }
];

const formatOptions = [
  {
    label: 'Download CSV',
    value: 'csv' as const,
    icon: <FileText className="h-4 w-4" />
  },
  {
    label: 'Download PDF',
    value: 'pdf' as const,
    icon: <FileText className="h-4 w-4" />
  },
  {
    label: 'Email Report',
    value: 'email' as const,
    icon: <Mail className="h-4 w-4" />
  }
];

export function ExportButtons({ onExport, isExporting }: ExportButtonsProps) {
  const handleExport = (type: ExportRequest['type'], format: ExportRequest['format']) => {
    if (!isExporting) {
      onExport(type, format);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Quick CSV Export */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleExport('usage-report', 'csv')}
        disabled={isExporting}
        className="flex items-center gap-2"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">Export CSV</span>
      </Button>

      {/* More Options Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isExporting}>
            <span className="hidden sm:inline mr-2">More</span>
            <Download className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[250px]">
          <DropdownMenuLabel>Export Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {exportOptions.map((option) => (
            <DropdownMenuItem key={option.value} className="cursor-pointer">
              <div className="flex items-start gap-3 w-full">
                <div className="mt-0.5">{option.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          {/* Format options for CSV */}
          <div className="px-2 py-1">
            <div className="text-xs font-medium text-muted-foreground mb-1">CSV Formats</div>
            {formatOptions.slice(0, 2).map((format) => (
              <DropdownMenuItem
                key={format.value}
                onClick={() => handleExport('usage-report', format.value)}
                className="cursor-pointer"
                disabled={isExporting}
              >
                <div className="flex items-center gap-2">
                  {isExporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    format.icon
                  )}
                  <span>{format.label}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Email option */}
          <DropdownMenuItem
            onClick={() => handleExport('usage-report', 'email')}
            className="cursor-pointer"
            disabled={isExporting}
          >
            <div className="flex items-center gap-2">
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              <span>Email Report</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}