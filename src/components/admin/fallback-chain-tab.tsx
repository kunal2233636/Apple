'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  GripVertical, 
  Save, 
  RotateCcw, 
  ArrowRight, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FallbackTier {
  id: string;
  tier: number;
  provider: string;
  name: string;
  logo: string;
  enabled: boolean;
  draggable: boolean;
  color: string;
}

interface FallbackChainTabProps {
  onUnsavedChanges: (hasChanges: boolean) => void;
}

const defaultTiers: FallbackTier[] = [
  {
    id: 'tier-1',
    tier: 1,
    provider: 'groq',
    name: 'Groq',
    logo: '🚀',
    enabled: true,
    draggable: true,
    color: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
  },
  {
    id: 'tier-2',
    tier: 2,
    provider: 'cerebras',
    name: 'Cerebras',
    logo: '🧠',
    enabled: true,
    draggable: true,
    color: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
  },
  {
    id: 'tier-3',
    tier: 3,
    provider: 'mistral',
    name: 'Mistral',
    logo: '🌪️',
    enabled: true,
    draggable: true,
    color: 'bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800'
  },
  {
    id: 'tier-4',
    tier: 4,
    provider: 'openrouter',
    name: 'OpenRouter',
    logo: '🛣️',
    enabled: true,
    draggable: true,
    color: 'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800'
  },
  {
    id: 'tier-5',
    tier: 5,
    provider: 'cache',
    name: 'Response Cache',
    logo: '💾',
    enabled: true,
    draggable: false,
    color: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
  },
  {
    id: 'tier-6',
    tier: 6,
    provider: 'graceful',
    name: 'Graceful Degradation',
    logo: '🛡️',
    enabled: true,
    draggable: false,
    color: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800'
  }
];

export function FallbackChainTab({ onUnsavedChanges }: FallbackChainTabProps) {
  const [tiers, setTiers] = useState<FallbackTier[]>(defaultTiers);
  const [saving, setSaving] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDragStart = (e: React.DragEvent, tierId: string) => {
    setDraggedItem(tierId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetTierId: string) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem === targetTierId) return;
    
    const draggedIndex = tiers.findIndex(t => t.id === draggedItem);
    const targetIndex = tiers.findIndex(t => t.id === targetTierId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const draggedTier = tiers[draggedIndex];
    const targetTier = tiers[targetIndex];
    
    // Only allow reordering of draggable tiers
    if (!draggedTier.draggable || !targetTier.draggable) {
      toast({
        variant: 'destructive',
        title: 'Cannot Reorder',
        description: 'Cache and graceful degradation tiers cannot be reordered.'
      });
      return;
    }
    
    // Create new array with reordered items
    const newTiers = [...tiers];
    newTiers.splice(draggedIndex, 1);
    newTiers.splice(targetIndex, 0, draggedTier);
    
    // Update tier numbers for draggable items only
    const updatedTiers = newTiers.map((tier, index) => ({
      ...tier,
      tier: tier.draggable ? index + 1 : tier.tier
    }));
    
    setTiers(updatedTiers);
    setDraggedItem(null);
    onUnsavedChanges(true);
    
    toast({
      title: 'Fallback Chain Updated',
      description: `Reordered fallback chain successfully.`
    });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleToggleEnabled = (tierId: string) => {
    setTiers(prev => prev.map(tier => 
      tier.id === tierId ? { ...tier, enabled: !tier.enabled } : tier
    ));
    onUnsavedChanges(true);
  };

  const saveFallbackConfiguration = async () => {
    setSaving(true);
    
    try {
      // Simulate saving
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      onUnsavedChanges(false);
      toast({
        title: 'Configuration Saved',
        description: 'Fallback chain configuration has been saved successfully.'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Failed to save fallback chain configuration.'
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaultOrder = () => {
    const confirmed = window.confirm('Are you sure you want to reset the fallback chain to the default order?');
    if (!confirmed) return;

    setTiers(defaultTiers);
    onUnsavedChanges(false);
    
    toast({
      title: 'Configuration Reset',
      description: 'Fallback chain has been reset to default order.'
    });
  };

  const getTierStatus = (tier: FallbackTier) => {
    if (!tier.enabled) return 'disabled';
    if (tier.provider === 'cache') return 'cache';
    if (tier.provider === 'graceful') return 'graceful';
    return 'provider';
  };

  const renderTierCard = (tier: FallbackTier, index: number) => {
    const status = getTierStatus(tier);
    const isDragged = draggedItem === tier.id;
    
    return (
      <Card 
        key={tier.id}
        className={`relative transition-all duration-200 ${
          isDragged ? 'opacity-50 scale-95' : ''
        } ${tier.color} ${
          tier.draggable ? 'cursor-move hover:shadow-lg' : ''
        } ${!tier.enabled ? 'opacity-60' : ''}`}
        draggable={tier.draggable}
        onDragStart={(e) => handleDragStart(e, tier.id)}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, tier.id)}
        onDragEnd={handleDragEnd}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {tier.draggable ? (
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                ) : (
                  <div className="w-4" />
                )}
                <div className="text-2xl">{tier.logo}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Tier {tier.tier}
                  </Badge>
                  {tier.draggable ? (
                    <Badge variant="secondary" className="text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Draggable
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      Fixed
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={tier.enabled}
                onCheckedChange={() => handleToggleEnabled(tier.id)}
                disabled={!tier.draggable}
              />
              {tier.enabled ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-2">
            <h3 className="font-semibold">{tier.name}</h3>
            <p className="text-sm text-muted-foreground">
              {status === 'provider' && `Tier ${tier.tier} AI provider for primary requests`}
              {status === 'cache' && 'Serves cached responses for repeated queries'}
              {status === 'graceful' && 'Final fallback for handling failures gracefully'}
              {status === 'disabled' && 'This tier is currently disabled'}
            </p>
            
            {!tier.enabled && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                Disabled - will be skipped in fallback chain
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const draggableTiers = tiers.filter(t => t.draggable);
  const fixedTiers = tiers.filter(t => !t.draggable);

  return (
    <div className="p-6 space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap gap-3">
        <Button 
          onClick={saveFallbackConfiguration}
          disabled={saving}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Fallback Configuration'}
        </Button>
        <Button 
          onClick={resetToDefaultOrder}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Default Order
        </Button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">Fallback Chain Configuration</p>
            <p className="text-blue-700 dark:text-blue-200 mt-1">
              Drag and drop the draggable tiers to reorder them. The first enabled provider will be attempted first,
              followed by the rest in order. Cache and graceful degradation tiers are always active and cannot be reordered.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Request Flow Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tiers.map((tier, index) => {
              const status = getTierStatus(tier);
              return (
                <div key={tier.id} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge variant={tier.enabled ? "default" : "secondary"}>
                      {tier.tier}
                    </Badge>
                    <div className="text-lg">{tier.logo}</div>
                    <span className={`font-medium ${!tier.enabled ? 'opacity-60' : ''}`}>
                      {tier.name}
                    </span>
                    {!tier.enabled && (
                      <Badge variant="outline" className="text-xs">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  {index < tiers.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Draggable Tiers */}
      {draggableTiers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Configurable Tiers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {draggableTiers.map((tier) => renderTierCard(tier, tier.tier))}
          </div>
        </div>
      )}

      {/* Fixed Tiers */}
      {fixedTiers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Tiers (Always Active)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fixedTiers.map((tier) => renderTierCard(tier, tier.tier))}
          </div>
        </div>
      )}
    </div>
  );
}