'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  Settings, 
  GitBranch, 
  MessageSquare, 
  BarChart3,
  AlertTriangle
} from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface AdminSidebarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const iconMap = {
  'api-providers': Wifi,
  'model-overrides': Settings,
  'fallback-chain': GitBranch,
  'chat-settings': MessageSquare,
  'usage-monitoring': BarChart3,
};

export function AdminSidebar({ tabs, activeTab, onTabChange }: AdminSidebarProps) {
  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h2 className="text-lg font-semibold">Admin Panel</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          System Configuration
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {tabs.map((tab) => {
            const Icon = iconMap[tab.id as keyof typeof iconMap] || Settings;
            const isActive = activeTab === tab.id;
            
            return (
              <li key={tab.id}>
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tab.label}
                    </p>
                    <p className={cn(
                      'text-xs truncate',
                      isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                      {tab.description}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Status Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
          <span>System Healthy</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <AlertTriangle className="h-3 w-3" />
          <span>6 Providers Active</span>
        </div>
      </div>
    </div>
  );
}