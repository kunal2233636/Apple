
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Book,
  BrainCircuit,
  Calendar,
  LayoutDashboard,
  History,
  X,
  ClipboardList,
  BarChart2,
  GraduationCap,
  Bug,
  Trophy,
  List,
  Archive,
  MessageSquare,
  BookOpen,
  FileArchive,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import ThemeToggle from '@/components/ui/theme-toggle';
import { useState, useEffect } from 'react';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, tooltip: 'Dashboard' },
  { href: '/study-buddy', label: 'Study Buddy', icon: BookOpen, tooltip: 'Study Buddy' },
  { href: '/schedule', label: 'Schedule', icon: Calendar, tooltip: 'Schedule' },
  { href: '/topics', label: 'Syllabus', icon: Book, tooltip: 'Syllabus' },
  { href: '/boards', label: 'Boards', icon: GraduationCap, tooltip: 'Boards' },
  { href: '/files', label: 'Files', icon: FileArchive, tooltip: 'Files' },
  { href: '/resources', label: 'Resources', icon: Archive, tooltip: 'Resources' },
  { href: '/revision-queue', label: 'Revision Queue', icon: ClipboardList, tooltip: 'Revision Queue' },
  { href: '/revision', label: 'SpaRE', icon: History, tooltip: 'Spaced Revision' },
  { href: '/analytics', label: 'Analytics', icon: BarChart2, tooltip: 'Analytics' },
  { href: '/gamification', label: 'Gamification', icon: Trophy, tooltip: 'Gamification' },
  { href: '/points-history', label: 'Points History', icon: History, tooltip: 'Points History' },
];

const devNavItems = [
    { href: '/boards/debug', label: 'Debug Panel', icon: Bug, tooltip: 'Debug Panel' },
    { href: '/activity-logs', label: 'Activity Logs', icon: List, tooltip: 'Activity Logs' },
];

export default function AppSidebarContent() {
  const pathname = usePathname();
  const { setOpenMobile, state } = useSidebar();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [revisionQueueCount, setRevisionQueueCount] = useState(0); 
  const [spareTodayCount, setSpareTodayCount] = useState(0);

  useEffect(() => {
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


  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-sidebar-primary" />
            <span
              className={cn(
                'text-lg font-semibold text-foreground transition-opacity duration-300',
                state === 'collapsed' && 'opacity-0'
              )}
            >
              BlockWise
            </span>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setOpenMobile(false)}>
            <X className="h-5 w-5" />
          </Button>
        <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="p-4">
        <SidebarMenu>
          {navItems.map((item) => {
            const getCountForHref = (href: string) => {
                if (href === '/revision-queue') return revisionQueueCount;
                if (href === '/revision') return spareTodayCount;
                return 0;
            };
            const count = getCountForHref(item.href);

            return (
                 <SidebarMenuItem key={item.href}>
                    <Link href={item.href} className="w-full relative">
                        <SidebarMenuButton
                        isActive={pathname.startsWith(item.href)}
                        tooltip={{ children: item.tooltip, side: 'right', align: 'center' }}
                        >
                        <item.icon />
                        <span className={cn('transition-opacity duration-300', state === 'collapsed' && 'opacity-0')}>
                            {item.label}
                        </span>
                        {count > 0 && (
                            <span className={cn(
                                "absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs",
                                state === 'collapsed' && 'h-2 w-2 right-1.5 p-0 top-1.5 text-transparent'
                            )}>
                                {state === 'expanded' && count}
                            </span>
                        )}
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
         {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 pt-4 border-t border-sidebar-border">
                <p className={cn("px-3 py-1 text-xs font-semibold text-muted-foreground transition-opacity duration-300", state === 'collapsed' && 'opacity-0')}>
                    Development
                </p>
                <SidebarMenu>
                    {devNavItems.map(item => (
                         <SidebarMenuItem key={item.href}>
                            <Link href={item.href} className="w-full relative">
                                <SidebarMenuButton
                                    isActive={pathname.startsWith(item.href)}
                                    tooltip={{ children: item.tooltip, side: 'right', align: 'center' }}
                                >
                                <item.icon />
                                <span className={cn('transition-opacity duration-300', state === 'collapsed' && 'opacity-0')}>
                                    {item.label}
                                </span>
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </div>
        )}
      </SidebarContent>
    </>
  );
}
