
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { SupabaseClient, User, createClient } from '@supabase/supabase-js'
import type { Database } from './database.types';
import type { Note, NoteInsert, NoteUpdate, UserGDriveCredentialsInsert, NoteWithRelations } from '@/types/notes';
import * as idb from './indexedDB';
import { triggerSync } from './syncEngine';
import { v4 as uuidv4 } from 'uuid';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// This client is for server-side operations if needed.
// Note: this is not a singleton, a new instance is created every time.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// This is a singleton instance of the browser client.
let browserClient: SupabaseClient<Database> | null = null;

function getBrowserClient(): SupabaseClient<Database> {
  if (browserClient === null) {
    browserClient = createPagesBrowserClient<Database>();
  }
  return browserClient;
}

export const supabaseBrowserClient = getBrowserClient();


export const signUp = async (email: string, password: string) => {
    const supabase = getBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };
  
  export const signIn = async (email: string, password: string) => {
    const supabase = getBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };
  
  export const signOut = async () => {
    const supabase = getBrowserClient();
    const { error } = await supabase.auth.signOut();
    return { error };
  };
  
  export const getCurrentUser = async (): Promise<User | null> => {
    const supabase = getBrowserClient();
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
  
      if (error) {
        console.error('Supabase getSession error:', error.message);
        // Only sign out if it's a specific auth token error, not general connection errors
        if (error.message.includes('JWT') || error.message.includes('token') || error.message.includes('refresh')) {
          await supabase.auth.signOut();
        }
        return null;
      }
      
      if (session) {
        return session.user;
      }
    } catch (err) {
      console.error('An unexpected error occurred getting the user session:', err);
      // Only sign out on specific auth-related errors, not network or general errors
      if (err instanceof Error && (err.message.includes('JWT') || err.message.includes('token') || err.message.includes('refresh'))) {
        await supabase.auth.signOut();
      }
      return null;
    }
    return null;
  };

export const notesClient = {
  async getNotes(userId: string) {
    // For now, we primarily fetch from IndexedDB.
    // A more advanced implementation would fetch from Supabase, then merge with local.
    const localNotes = await idb.getAllNotes();
    const userNotes = localNotes.filter(n => n.user_id === userId);
    
    // We need to enrich with subject/chapter info, which is not in IDB.
    // This is a limitation for now. Let's return what we have.
    // The UI will need to handle potentially missing subject/chapter data if offline.
     const enrichedNotes = userNotes.map(note => {
      // This is a placeholder. In a real app, you'd have subjects/chapters in IDB.
      return {
        ...note,
        subject: { id: 0, name: '...', color: '#ccc', category: 'OTHERS' },
        chapter: { id: 0, name: '...' }
      }
    }) as NoteWithRelations[];
    
    // Simulate Supabase response structure
    return { data: enrichedNotes, error: null };
  },

  async createNote(noteData: NoteInsert) {
    const now = new Date().toISOString();
    const newNote: NoteInsert = {
      id: uuidv4(),
      ...noteData,
      created_at: now,
      updated_at: now,
      is_synced: false,
    };
    
    await idb.addNote(newNote as any);
    await idb.addToSyncQueue('create', newNote.id!, newNote);
    
    triggerSync();
    
    return { data: newNote, error: null };
  },

  async updateNote(id: string, updates: NoteUpdate) {
    const updatedData = { ...updates, updated_at: new Date().toISOString(), is_synced: false };
    await idb.updateNote(id, updatedData);
    await idb.addToSyncQueue('update', id, updatedData);

    triggerSync();
    
    const finalNote = await idb.getNote(id);
    return { data: finalNote, error: null };
  },

  async deleteNote(id: string) {
    await idb.deleteNote(id);
    await idb.addToSyncQueue('delete', id);
    
    triggerSync();
    
    return { error: null };
  }
};

export const saveGoogleCredentials = async (credentials: {
    userId: string;
    accessToken: string;
    refreshToken: string;
    expiryDate: Date;
}) => {
    const { userId, accessToken, refreshToken, expiryDate } = credentials;

    const upsertData: UserGDriveCredentialsInsert = {
        user_id: userId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry_date: expiryDate.toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseBrowserClient
        .from('user_gdrive_credentials')
        .upsert(upsertData, { onConflict: 'user_id' });

    if (error) {
        console.error('Error saving Google credentials to Supabase:', error);
        throw error;
    }
};

    