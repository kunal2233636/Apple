import type { Database } from '@/lib/database.types';
import type { Subject, Chapter } from '@/app/(app)/topics/page';

// 1. Union Types
export type StorageType = 'local' | 'gdrive' | 'both';
export type SyncStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type SyncOperation = 'create' | 'update' | 'delete';


// 2. Supabase-derived Types
export type Note = Database['public']['Tables']['notes']['Row'];
export type NoteInsert = Database['public']['Tables']['notes']['Insert'];
export type NoteUpdate = Database['public']['Tables']['notes']['Update'];
export type SyncQueueItem = Database['public']['Tables']['sync_queue']['Row'];
export type UserGDriveCredentials = Database['public']['Tables']['user_gdrive_credentials']['Row'];
export type UserGDriveCredentialsInsert = Database['public']['Tables']['user_gdrive_credentials']['Insert'];


// 3. Extended type with relations
export type NoteWithRelations = Note & {
  subject?: Pick<Subject, 'id' | 'name' | 'color' | 'category'>;
  chapter?: Pick<Chapter, 'id' | 'name'>;
};


// 4. Form data type
export type NoteFormData = {
  subject_id: string;
  chapter_id?: string;
  title: string;
  content: string;
  storage_type: StorageType;
};
