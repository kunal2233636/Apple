'use client';

import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      {/* Full-width layout without sidebar for dashboard */}
      <div className={cn(
        "flex w-full flex-col",
        // Override the default app layout padding for dashboard
        pathname.startsWith('/user/dashboard') && "px-0 py-0"
      )}>
        <main className={cn(
          "flex-1 space-y-6 p-6",
          // Special styling for dashboard - full width
          pathname.startsWith('/user/dashboard') && "px-6 py-6 max-w-none"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}