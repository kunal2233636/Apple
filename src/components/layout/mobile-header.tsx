
'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { BookOpen, BrainCircuit, LogOut, Settings } from 'lucide-react';
import ThemeToggle from '@/components/ui/theme-toggle';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { getCurrentUser, signOut } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function MobileHeader() {
    const isMobile = useIsMobile();
    const [isClient, setIsClient] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();
    const pathname = usePathname();
  
    useEffect(() => {
      setIsClient(true);
      const fetchUser = async () => {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      };
      fetchUser();
    }, []);

    const handleSignOut = async () => {
        await signOut();
        router.push('/auth');
    };
  
    if (!isClient || !isMobile) {
      return null;
    }

  return (
    <header className="fixed top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm md:hidden">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Link href="/dashboard" className="flex items-center gap-2">
          <BrainCircuit className="h-6 w-6 text-primary" />
          <span className="font-bold">BlockWise</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

      {user && (
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
                >
                <Avatar className="h-10 w-10">
                    <AvatarImage
                    src="https://picsum.photos/seed/user-avatar/40/40"
                    alt="User avatar"
                    data-ai-hint="user avatar"
                    />
                    <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 rounded-2xl shadow-xl" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.email?.split('@')[0]}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                    </p>
                </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/study-buddy')} className="m-1 rounded-lg">
                    <BookOpen className="mr-2 h-4 w-4" />
                    <span>Study Buddy</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/settings')} className="m-1 rounded-lg">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:bg-destructive/10 focus:text-destructive m-1 rounded-lg">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      )}
      </div>
    </header>
  );
}

    