
'use client';

import { 
    getNote, 
    updateNote as updateLocalNote,
    getSyncQueue,
    removeSyncQueueItem,
    updateSyncQueueItem,
    addNote as addLocalNote
} from './indexedDB';
import { supabaseBrowserClient } from './supabase';
import type { Note, NoteUpdate, NoteInsert } from '@/types/notes';

// Helper to upload content to GDrive
async function uploadToGDrive(title: string, content: string, fileId?: string | null): Promise<string | null> {
  const response = await fetch('/api/gdrive/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, fileId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload to Google Drive');
  }

  const { fileId: newFileId } = await response.json();
  return newFileId;
}

// Syncs a single note from local to cloud (Supabase + GDrive)
export async function syncNoteToCloud(note: Note): Promise<void> {
    console.log(`[Sync] Starting sync for note: ${note.id}`);

    // Failsafe validation
    if (!note.subject_id) {
        console.error(`[Sync] Aborting sync for note ${note.id}: subject_id is missing.`);
        throw new Error('Validation Error: subject_id is required.');
    }

    let gdriveFileId = note.gdrive_file_id;
    
    if (note.storage_type === 'gdrive' || note.storage_type === 'both') {
        try {
            console.log(`[Sync] Uploading content to GDrive for note: ${note.id}`);
            gdriveFileId = await uploadToGDrive(note.title, note.content || '', note.gdrive_file_id);
            console.log(`[Sync] GDrive upload successful. File ID: ${gdriveFileId}`);
        } catch (error) {
            console.error(`[Sync] GDrive upload failed for note ${note.id}:`, error);
            throw new Error('Google Drive sync failed.');
        }
    }

    const notePayload = {
      ...note,
      id: note.id,
      gdrive_file_id: gdriveFileId,
      is_synced: true,
      updated_at: new Date().toISOString(),
    }
    
    // Use upsert to handle both create and update
    const { error: supabaseError } = await supabaseBrowserClient
        .from('notes')
        .upsert(notePayload, { onConflict: 'id' });

    if (supabaseError) {
        console.error(`[Sync] Supabase upsert failed for note ${note.id}:`, supabaseError);
        throw new Error('Supabase sync failed.');
    }
    
    console.log(`[Sync] Supabase upsert successful for note: ${note.id}`);
    
    await updateLocalNote(note.id, { 
        gdrive_file_id: gdriveFileId,
        is_synced: true,
        updated_at: notePayload.updated_at,
    });
    console.log(`[Sync] Finished sync for note: ${note.id}`);
}


// Processes the entire sync queue
export async function processSyncQueue(): Promise<void> {
    const queue = await getSyncQueue();
    const pendingItems = queue.filter(item => item.status === 'pending');
    
    if (pendingItems.length === 0) {
        console.log('[Sync] Queue is empty. Nothing to process.');
        return;
    }

    console.log(`[Sync] Processing ${pendingItems.length} items from the sync queue.`);

    for (const item of pendingItems) {
        try {
            await updateSyncQueueItem(item.id, { status: 'processing', last_attempt: new Date().toISOString() });

            let noteToSync: Note | null = null;
            
            if (item.operation === 'create') {
                noteToSync = item.payload as Note;
            } else {
                noteToSync = await getNote(item.note_id) as Note;
            }

            if (!noteToSync) {
                console.warn(`[Sync] Note ${item.note_id} for queue item ${item.id} not found. Removing from queue.`);
                await removeSyncQueueItem(item.id);
                continue;
            }

            switch (item.operation) {
                case 'create':
                case 'update':
                    await syncNoteToCloud(noteToSync);
                    break;
                case 'delete':
                    // TODO: Implement delete logic (delete from Supabase, then GDrive)
                    console.log(`[Sync] Delete operation for ${item.note_id} needs to be implemented.`);
                    break;
            }

            // If successful, remove from queue
            await removeSyncQueueItem(item.id);
            console.log(`[Sync] Successfully processed and removed item ${item.id} from queue.`);

        } catch (error: any) {
            console.error(`[Sync] Failed to process queue item ${item.id}:`, error);
            const newRetryCount = (item.retry_count || 0) + 1;
            
            let status: 'pending' | 'failed' = 'pending';
            
            // If it's a validation error, don't retry.
            if (error.message.includes('Validation Error')) {
                status = 'failed';
            } else if (newRetryCount >= 3) {
                 status = 'failed';
                console.error(`[Sync] Item ${item.id} has failed 3 times. Marking as failed.`);
            }

            await updateSyncQueueItem(item.id, {
                status,
                retry_count: newRetryCount,
            });
        }
    }
}

// Function to trigger a sync, can be called manually or by event listeners
let isSyncing = false;
let listenersRegistered = false;

export async function triggerSync() {
    if (isSyncing) {
        console.log('[Sync] Sync already in progress.');
        return;
    }
    if (!navigator.onLine) {
        console.log('[Sync] User is offline. Sync aborted.');
        return;
    }

    isSyncing = true;
    console.log('[Sync] Starting manual sync process...');
    try {
        await processSyncQueue();
    } catch (error) {
        console.error('[Sync] Error during manual sync process:', error);
    } finally {
        isSyncing = false;
        console.log('[Sync] Manual sync process finished.');
    }
}

// Safe sync trigger that prevents multiple triggers
export function safeTriggerSync() {
    // Prevent multiple calls within 5 seconds
    const lastSyncTime = (window as any).__lastSyncTime || 0;
    const now = Date.now();
    if (now - lastSyncTime < 5000) {
        console.log('[Sync] Skipping sync - too recent');
        return;
    }
    (window as any).__lastSyncTime = now;
    triggerSync();
}

// Setup event listeners for auto-syncing
if (typeof window !== 'undefined' && !listenersRegistered) {
    window.addEventListener('online', safeTriggerSync);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            safeTriggerSync();
        }
    });
    listenersRegistered = true;
    console.log('[Sync] Event listeners registered for auto-sync');
}
