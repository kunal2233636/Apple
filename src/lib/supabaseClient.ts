import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { SupabaseClient, User, createClient } from '@supabase/supabase-js'
import type { Database } from './database.types';

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

// Enhanced auth functions with better error handling
export const signUp = async (email: string, password: string) => {
  try {
    const supabase = getBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  } catch (err) {
    console.error('Sign up error:', err);
    return { 
      data: null, 
      error: { message: 'Network error occurred. Please check your connection.' } 
    };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const supabase = getBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  } catch (err) {
    console.error('Sign in error:', err);
    return { 
      data: null, 
      error: { message: 'Network error occurred. Please check your connection.' } 
    };
  }
};

export const signOut = async () => {
  try {
    const supabase = getBrowserClient();
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (err) {
    console.error('Sign out error:', err);
    return { 
      error: { message: 'Network error occurred. Please check your connection.' } 
    };
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const supabase = getBrowserClient();
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
    return null;
  } catch (err) {
    console.error('An unexpected error occurred getting the user session:', err);
    // Only sign out on specific auth-related errors, not network or general errors
    if (err instanceof Error && (err.message.includes('JWT') || err.message.includes('token') || err.message.includes('refresh'))) {
      const supabase = getBrowserClient();
      await supabase.auth.signOut();
    }
    return null;
  }
};