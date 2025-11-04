
'use client';

import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { Note, SyncQueueItem, SyncOperation } from '@/types/notes';

const DB_NAME = 'BlockWiseNotes';
const DB_VERSION = 1;
const NOTES_STORE = 'notes';
const SYNC_QUEUE_STORE = 'syncQueue';

interface BlockWiseDB extends DBSchema {
  [NOTES_STORE]: {
    key: string;
    value: Note;
    indexes: {
      user_id: string;
      subject_id: string;
      chapter_id: string;
      storage_type: string;
    };
  };
  [SYNC_QUEUE_STORE]: {
    key: number;
    value: SyncQueueItem;
    indexes: {
      status: string;
      note_id: string;
      created_at: string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<BlockWiseDB>> | null = null;

const initDB = () => {
  if (dbPromise) return dbPromise;

  dbPromise = openDB<BlockWiseDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        const store = db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
        store.createIndex('user_id', 'user_id', { unique: false });
        store.createIndex('subject_id', 'subject_id', { unique: false });
        store.createIndex('chapter_id', 'chapter_id', { unique: false });
        store.createIndex('storage_type', 'storage_type', { unique: false });
      }
      if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
        const store = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('note_id', 'note_id', { unique: false });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    },
  });

  return dbPromise;
};

// Notes Store Helpers
export const addNote = async (note: Note): Promise<void> => {
  const db = await initDB();
  await db.put(NOTES_STORE, note);
};

export const getNote = async (id: string): Promise<Note | undefined> => {
  const db = await initDB();
  return db.get(NOTES_STORE, id);
};

export const getAllNotes = async (): Promise<Note[]> => {
  const db = await initDB();
  return db.getAll(NOTES_STORE);
};

export const updateNote = async (id: string, updates: Partial<Note>): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(NOTES_STORE, 'readwrite');
  const store = tx.objectStore(NOTES_STORE);
  const note = await store.get(id);
  if (note) {
    await store.put({ ...note, ...updates });
  }
  await tx.done;
};

export const deleteNote = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete(NOTES_STORE, id);
};

// Sync Queue Store Helpers
export const addToSyncQueue = async (operation: SyncOperation, noteId: string, payload?: Partial<Note>): Promise<void> => {
  const db = await initDB();
  const item: Omit<SyncQueueItem, 'id'> = {
    note_id: noteId,
    operation,
    status: 'pending',
    payload: payload || null,
    created_at: new Date().toISOString(),
    last_attempt: null,
    retry_count: 0,
  };
  await db.add(SYNC_QUEUE_STORE, item as SyncQueueItem);
};

export const getSyncQueue = async (): Promise<SyncQueueItem[]> => {
  const db = await initDB();
  return db.getAllFromIndex(SYNC_QUEUE_STORE, 'created_at');
};

export const removeSyncQueueItem = async (id: number): Promise<void> => {
  const db = await initDB();
  await db.delete(SYNC_QUEUE_STORE, id);
};

export const updateSyncQueueItem = async (id: number, updates: Partial<SyncQueueItem>): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(SYNC_QUEUE_STORE);
    const item = await store.get(id);
    if(item) {
        await store.put({ ...item, ...updates });
    }
    await tx.done;
}
