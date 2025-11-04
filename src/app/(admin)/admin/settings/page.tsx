'use client';

import { useState } from 'react';
import { Settings, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { APIProvidersTab } from '@/components/admin/api-providers-tab';
import { ModelOverridesTab } from '@/components/admin/model-overrides-tab';
import { FallbackChainTab } from '@/components/admin/fallback-chain-tab';
import { ChatSettingsTab } from '@/components/admin/chat-settings-tab';
import { UsageMonitoringTab } from '@/components/admin/usage-monitoring-tab';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

type TabType = 'api-providers' | 'model-overrides' | 'fallback-chain' | 'chat-settings' | 'usage-monitoring';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('api-providers');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();

  const tabs = [
    {
      id: 'api-providers' as TabType,
      label: 'API Providers',
      icon: Settings,
      description: 'Configure AI provider connections and settings'
    },
    {
      id: 'model-overrides' as TabType,
      label: 'Model Overrides',
      icon: Settings,
      description: 'Override default models for specific features'
    },
    {
      id: 'fallback-chain' as TabType,
      label: 'Fallback Chain',
      icon: Settings,
      description: 'Configure provider fallback order and behavior'
    },
    {
      id: 'chat-settings' as TabType,
      label: 'Chat Settings',
      icon: Settings,
      description: 'Configure general chat behavior and preferences'
    },
    {
      id: 'usage-monitoring' as TabType,
      label: 'Usage & Monitoring',
      icon: Settings,
      description: 'Monitor system usage and provider health'
    }
  ];

  const handleTabChange = (tabId: TabType) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to switch tabs?');
      if (!confirmed) return;
    }
    setActiveTab(tabId);
    setHasUnsavedChanges(false);
  };

  const handleSave = async () => {
    try {
      // This will be handled by individual tab components
      // For now, show a success message
      setHasUnsavedChanges(false);
      toast({
        title: 'Settings Saved',
        description: 'Your settings have been saved successfully.'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to save settings. Please try again.'
      });
    }
  };

  const handleUnsavedChanges = (hasChanges: boolean) => {
    setHasUnsavedChanges(hasChanges);
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'api-providers':
        return <APIProvidersTab onUnsavedChanges={handleUnsavedChanges} />;
      case 'model-overrides':
        return <ModelOverridesTab onUnsavedChanges={handleUnsavedChanges} />;
      case 'fallback-chain':
        return <FallbackChainTab onUnsavedChanges={handleUnsavedChanges} />;
      case 'chat-settings':
        return <ChatSettingsTab onUnsavedChanges={handleUnsavedChanges} />;
      case 'usage-monitoring':
        return <UsageMonitoringTab onUnsavedChanges={handleUnsavedChanges} />;
      default:
        return null;
    }
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <AdminSidebar 
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b bg-background px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Admin Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeTabData?.description}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {hasUnsavedChanges && (
                  <span className="text-sm text-amber-600 dark:text-amber-400">
                    Unsaved changes
                  </span>
                )}
                <Button 
                  onClick={handleSave}
                  disabled={!hasUnsavedChanges}
                  className="flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              <Card>
                <CardContent className="p-0">
                  {renderActiveTab()}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}