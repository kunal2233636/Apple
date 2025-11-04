
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Brain, Book, ClipboardList, History, BarChart2, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useState } from 'react';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

const navItems = [
    { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { href: '/topics', label: 'Syllabus', icon: Book },
    { href: '/revision', label: 'SpaRE', icon: History },
    { href: '/gamification', label: 'Progress', icon: Trophy },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [revisionQueueCount, setRevisionQueueCount] = useState(0); 
  const [spareTodayCount, setSpareTodayCount] = useState(0);

  useEffect(() => {
    setIsClient(true);
    const fetchUserAndData = async () => {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        if (currentUser) {
            fetchCounts(currentUser.id);
        }
    };
    fetchUserAndData();
  }, []);

  const fetchCounts = async (userId: string) => {
    const todayString = new Date().toISOString().split('T')[0];

    const { count: queueRes } = await supabaseBrowserClient.from('revision_queue').select('id', { count: 'exact' }).eq('user_id', userId);
    const { count: spareRes } = await supabaseBrowserClient.from('topics').select('id', { count: 'exact' }).eq('user_id', userId).eq('is_in_spare', true).lt('revision_count', 5).lte('next_revision_date', todayString)
    
    setRevisionQueueCount(queueRes || 0);
    setSpareTodayCount(spareRes || 0);
  };


  if (!isClient || !isMobile) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 h-20 bg-background/95 backdrop-blur-sm border-t md:hidden">
      <div className="grid h-full grid-cols-4">
        {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            
            const getCountForHref = (href: string) => {
                if (href === '/revision-queue') return revisionQueueCount;
                if (href === '/revision') return spareTodayCount;
                return 0;
            };
            const count = getCountForHref(item.href);

            return (
                <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        'flex flex-col items-center justify-center gap-1 text-sm font-medium transition-colors relative',
                        isActive
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    {count > 0 && (
                        <div className="absolute top-2 right-4 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                            {count}
                        </div>
                    )}
                    <item.icon className="h-6 w-6" />
                    <span>{item.label}</span>
                </Link>
            )
        })}
      </div>
    </nav>
  );
}
