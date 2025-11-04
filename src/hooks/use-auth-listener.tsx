"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowserClient, getCurrentUser } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';


type AuthContextType = {
    user: User | null;
}

const AuthContext = createContext<AuthContextType>({ user: null });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
    }
    fetchUser();

    const { data: { subscription } } = supabaseBrowserClient.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        router.push('/auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
