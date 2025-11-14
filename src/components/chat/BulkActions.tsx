// BulkActions - Batch Operations Component
// =======================================
// Manages batch operations for selected conversations

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  CheckSquare, 
  Square, 
  Archive, 
  Trash2, 
  PinOff, 
  Download, 
  Share2,
  MoreHorizontal,
  X
} from 'lucide-react';

interface BulkActionsProps {
  selectedCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onUnpin: () => void;
  className?: string;
}

export function BulkActions({
  selectedCount,
  onSelectAll,
  onClearSelection,
  onArchive,
  onDelete,
  onUnpin,
  className = ''
}: BulkActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle delete with confirmation
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className={cn("bg-accent/50 rounded-lg p-3 space-y-3", className)}>
      {/* Selection info and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="font-medium">
            {selectedCount} selected
          </Badge>
        </div>
        
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectAll}
            className="h-8 text-xs"
          >
            <CheckSquare className="h-3 w-3 mr-1" />
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onArchive}
          className="justify-start"
        >
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onUnpin}
          className="justify-start"
        >
          <PinOff className="h-4 w-4 mr-2" />
          Unpin
        </Button>
      </div>

      {/* Dangerous actions */}
      <div className="space-y-2">
        <Separator />
        
        {/* Export conversations */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // TODO: Implement export functionality
            console.log('Exporting conversations...');
          }}
          className="w-full justify-start"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Selected
        </Button>

        {/* Share conversations */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // TODO: Implement share functionality
            console.log('Sharing conversations...');
          }}
          className="w-full justify-start"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <MoreHorizontal className="h-4 w-4 mr-2" />
              More Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => {
              // TODO: Implement duplicate functionality
              console.log('Duplicating conversations...');
            }}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              // TODO: Implement merge functionality
              console.log('Merging conversations...');
            }}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Merge
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Conversations</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedCount} conversation{selectedCount === 1 ? '' : 's'}? 
                    This action cannot be undone and will permanently remove all messages and data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default BulkActions;