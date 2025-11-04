
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { notesClient, getCurrentUser } from '@/lib/supabase';
import { getSyncQueue, getAllNotes, deleteNote as deleteLocalNote, removeSyncQueueItem } from '@/lib/indexedDB';
import { triggerSync } from '@/lib/syncEngine';
import type { User } from '@supabase/supabase-js';
import type { Note, SyncQueueItem } from '@/types/notes';
import { CheckCircle, Cloud, AlertCircle, Loader2, Play, Database, Bug, RefreshCw, ExternalLink, Trash2, TestTube2, XCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
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
import { testActivityLogging } from '@/lib/ai/test-logger';

type TestResult = {
  testName: string;
  success: boolean;
  message: string;
  data?: any;
};

export default function DebugPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  
  // Debug Panel State
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [localNotes, setLocalNotes] = useState<Note[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loggerTestResults, setLoggerTestResults] = useState<TestResult[] | null>(null);

  const refreshDebugData = useCallback(async () => {
    try {
        const queue = await getSyncQueue();
        setSyncQueue(queue);
        const notes = await getAllNotes();
        setLocalNotes(notes);
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Failed to refresh debug data', description: e.message });
    }
  }, [toast]);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    fetchUser();
    refreshDebugData();
  }, [refreshDebugData]);

  const handleCreateNote = async (storageType: 'local' | 'gdrive') => {
    if (!user) {
      toast({ variant: 'destructive', title: 'User not logged in' });
      return;
    }
    setIsProcessing(true);
    const noteData = {
      title: `Test Note (${storageType}) - ${new Date().toLocaleTimeString()}`,
      content: 'This is a sample note content.',
      subject_id: 1, // Hardcoded for testing. Ensure a subject with id 1 exists.
      storage_type: storageType,
    };
    try {
      await notesClient.createNote(noteData as any);
      toast({ title: 'Sample Note Created', description: `Storage type: ${storageType}` });
      await refreshDebugData();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to create note', description: e.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleForceSync = async () => {
    setIsProcessing(true);
    toast({ title: 'Manual Sync Triggered' });
    try {
        await triggerSync();
        await refreshDebugData();
        toast({ title: 'Sync Completed!' });
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Sync failed', description: e.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCleanup = async () => {
    setIsProcessing(true);
    try {
      const allLocalNotes = await getAllNotes();
      const invalidNotes = allLocalNotes.filter(n => !n.subject_id);
      const invalidNoteIds = new Set(invalidNotes.map(n => n.id));
      
      console.log(`Found ${invalidNotes.length} notes without subject_id.`);

      for (const note of invalidNotes) {
        await deleteLocalNote(note.id);
        console.log(`Deleted invalid note from IndexedDB: ${note.id}`);
      }

      const allQueueItems = await getSyncQueue();
      let cleanedQueueCount = 0;

      for (const item of allQueueItems) {
        if (invalidNoteIds.has(item.note_id) || item.status === 'failed') {
          await removeSyncQueueItem(item.id);
          console.log(`Removed item from sync queue: ${item.id} for note ${item.note_id}`);
          cleanedQueueCount++;
        }
      }
      
      toast({
        title: 'Cleanup Complete',
        description: `Deleted ${invalidNotes.length} notes and ${cleanedQueueCount} queue items.`
      });
      
      await refreshDebugData();

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Cleanup failed', description: e.message });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleRunLoggerTest = async () => {
      if (!user) {
          toast({ variant: 'destructive', title: 'User not found', description: 'Cannot run test without a user.'});
          return;
      }
      setIsProcessing(true);
      setLoggerTestResults(null);
      toast({ title: 'Running Logger Test...' });
      const { success, message, testResults } = await testActivityLogging(user.id);
      setLoggerTestResults(testResults);
      toast({
          variant: success ? 'default' : 'destructive',
          title: success ? 'Logger Test Passed' : 'Logger Test Failed',
          description: message,
      });
      setIsProcessing(false);
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bug /> Notes & Sync Debug Panel</CardTitle>
          <CardDescription>Use these tools to test the notes feature and Google Drive synchronization.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actions Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <Button className="w-full" onClick={() => handleCreateNote('local')} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin" /> : 'Create Local Note'}
             </Button>
             <Button className="w-full" onClick={() => handleCreateNote('gdrive')} disabled={isProcessing || status !== 'authenticated'}>
                {isProcessing ? <Loader2 className="animate-spin" /> : 'Create GDrive Note'}
             </Button>
             <Separator />
             <Button className="w-full" variant="secondary" onClick={handleForceSync} disabled={isProcessing}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Force Sync
             </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full" variant="destructive" disabled={isProcessing}>
                    <Trash2 className="mr-2 h-4 w-4" /> Clean Invalid Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Clean Invalid Note Data?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This will permanently delete any local notes that are missing a subject ID and remove them from the sync queue. This action cannot be undone.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCleanup} className={cn(buttonVariants({ variant: "destructive" }))}>Yes, Clean Data</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

             <a href="/docs/GOOGLE_DRIVE_SETUP.md" target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View Setup Guide
            </a>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Live Status</CardTitle>
                    <Button variant="ghost" size="sm" onClick={refreshDebugData} disabled={isProcessing}><RefreshCw className={cn("mr-2 h-4 w-4", isProcessing && "animate-spin")}/> Refresh</Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                    <span className="font-medium">Google Drive Connection</span>
                    {status === 'loading' ? (
                        <Loader2 className="animate-spin" />
                    ) : status === 'authenticated' ? (
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle />
                            <span>Connected</span>
                        </div>
                    ) : (
                         <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle />
                            <span>Disconnected</span>
                        </div>
                    )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                    <span className="font-medium">IndexedDB Status</span>
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle />
                        <span>Available</span>
                    </div>
                </div>
                 <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                    <span className="font-medium">Current User ID</span>
                    <div className="text-xs font-mono bg-background p-1 rounded">{user?.id || 'N/A'}</div>
                </div>
            </CardContent>
        </Card>
        
        {/* Debug Panels */}
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-semibold mb-2">Sync Queue ({syncQueue.length})</h3>
                    <ScrollArea className="h-64 p-3 border rounded-md">
                        {syncQueue.length > 0 ? (
                            <div className="space-y-2">
                                {syncQueue.map(item => (
                                    <div key={item.id} className="text-xs p-2 bg-background rounded-md">
                                        <div className="flex items-center gap-1.5">
                                          <b>Op:</b> <Badge variant="secondary">{item.operation}</Badge> | <b>Status:</b> <Badge variant={item.status === 'failed' ? 'destructive' : 'outline'}>{item.status}</Badge>
                                        </div>
                                        <div className="truncate mt-1"><b>Note ID:</b> {item.note_id}</div>
                                        <div><b>Retries:</b> {item.retry_count}</div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-sm text-muted-foreground text-center pt-8">Queue is empty.</div>}
                    </ScrollArea>
                </div>
                 <div>
                    <h3 className="font-semibold mb-2">Local Notes ({localNotes.length})</h3>
                    <ScrollArea className="h-64 p-3 border rounded-md">
                        {localNotes.length > 0 ? (
                            <div className="space-y-2">
                                {localNotes.map(note => (
                                    <div key={note.id} className="text-xs p-2 bg-background rounded-md">
                                        <div className="truncate font-medium">{note.title}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant={note.storage_type === 'gdrive' ? 'default' : 'secondary'}>{note.storage_type}</Badge>
                                            {note.is_synced ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Loader2 className="h-3 w-3 text-amber-500 animate-spin" />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="text-sm text-muted-foreground text-center pt-8">No local notes.</div>}
                    </ScrollArea>
                </div>
            </CardContent>
        </Card>
        
        {/* Logger Test Panel */}
        <Card className="lg:col-span-3">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><TestTube2 /> Activity Logger Test</CardTitle>
                    <Button onClick={handleRunLoggerTest} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Play className="mr-2 h-4 w-4" />}
                        Run Logger Test
                    </Button>
                </div>
                <CardDescription>Verify that the `activity_logs` table is set up and working correctly.</CardDescription>
            </CardHeader>
            {loggerTestResults && (
                 <CardContent>
                    <h3 className="font-semibold mb-2">Test Results:</h3>
                    <div className="space-y-2">
                        {loggerTestResults.map((result, index) => (
                            <div key={index} className={cn("flex items-start gap-3 p-3 rounded-md text-sm", result.success ? "bg-green-50 dark:bg-green-900/30" : "bg-red-50 dark:bg-red-900/30")}>
                                {result.success ? <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" /> : <XCircle className="h-5 w-5 text-destructive mt-0.5" />}
                                <div className="flex-1">
                                    <p className="font-semibold">{result.testName}</p>
                                    <p className="text-muted-foreground">{result.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            )}
        </Card>
      </div>
    </div>
  );
}

    