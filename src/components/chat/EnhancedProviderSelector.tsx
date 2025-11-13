'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw } from 'lucide-react';
import { useStudyBuddy } from '@/hooks/use-study-buddy';
import type { StudyBuddySettings } from '@/types/settings';
import type { AIProvider } from '@/types/api-test';

interface EndpointConfigProps {
  endpoint: keyof StudyBuddySettings['endpoints'];
  label: string;
  settings: StudyBuddySettings;
  onSettingsChange: (newSettings: StudyBuddySettings) => void;
}

const EnhancedProviderSelector: React.FC<EndpointConfigProps> = ({ 
  endpoint, 
  label, 
  settings,
  onSettingsChange
}) => {
  const endpointConfig = settings.endpoints[endpoint];
  
  const availableProviders: AIProvider[] = ['groq', 'gemini', 'cerebras', 'cohere', 'mistral'];

  const providerModels: Record<AIProvider, string[]> = {
    groq: ['llama3-8b-8192', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'llama-3.1-8b-instant', 'llama-3.1-70b-versatile'],
    gemini: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash'],
    cerebras: ['llama3-8b', 'llama3-70b'],
    cohere: ['command-r', 'command-r-plus', 'embed-english-v3.0', 'command'],
    mistral: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest', 'mistral-7b-instruct', 'pixtral-12b']
  };

  const handleProviderChange = (provider: AIProvider) => {
    const newSettings = {
      ...settings,
      endpoints: {
        ...settings.endpoints,
        [endpoint]: {
          ...endpointConfig,
          provider,
          model: providerModels[provider][0] // Set to first available model for provider
        }
      }
    };
    onSettingsChange(newSettings);
  };

  const handleModelChange = (model: string) => {
    const newSettings = {
      ...settings,
      endpoints: {
        ...settings.endpoints,
        [endpoint]: {
          ...endpointConfig,
          model
        }
      }
    };
    onSettingsChange(newSettings);
  };

  const handleFallbackProviderChange = (fallbackProvider: string) => {
    const newSettings = {
      ...settings,
      endpoints: {
        ...settings.endpoints,
        [endpoint]: {
          ...endpointConfig,
          fallbackProvider: fallbackProvider === 'none' ? undefined : (fallbackProvider as AIProvider)
        }
      }
    };
    onSettingsChange(newSettings);
  };

  const handleFallbackModelChange = (fallbackModel: string) => {
    const newSettings = {
      ...settings,
      endpoints: {
        ...settings.endpoints,
        [endpoint]: {
          ...endpointConfig,
          fallbackModel: fallbackModel === 'none' ? undefined : fallbackModel
        }
      }
    };
    onSettingsChange(newSettings);
  };

  const handleEnableToggle = () => {
    const newSettings = {
      ...settings,
      endpoints: {
        ...settings.endpoints,
        [endpoint]: {
          ...endpointConfig,
          enabled: !endpointConfig.enabled
        }
      }
    };
    onSettingsChange(newSettings);
  };

  const handleTestClick = () => {
    // In a real implementation, this would test the provider connection
    console.log(`Testing ${endpoint} configuration...`);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium flex items-center gap-2">
          <Settings className="h-4 w-4" />
          {label}
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${endpointConfig.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {endpointConfig.enabled ? 'Active' : 'Inactive'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnableToggle}
            className="h-8 w-8 p-0"
          >
            <div className="w-4 h-4 rounded-full bg-current" style={{ 
              background: endpointConfig.enabled ? 'currentColor' : 'transparent',
              border: '1px solid currentColor'
            }} />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Provider Selection */}
        <div className="space-y-2">
          <Label className="text-sm">Primary Provider</Label>
          <Select value={endpointConfig.provider} onValueChange={handleProviderChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableProviders.map(provider => (
                <SelectItem key={provider} value={provider}>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Model Selection */}
        <div className="space-y-2">
          <Label className="text-sm">Model</Label>
          <Select value={endpointConfig.model} onValueChange={handleModelChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providerModels[endpointConfig.provider as AIProvider]?.map(model => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              )) || []}
            </SelectContent>
          </Select>
        </div>

        {/* Fallback Provider */}
        <div className="space-y-2">
          <Label className="text-sm">Fallback Provider</Label>
          <Select 
            value={endpointConfig.fallbackProvider || 'none'} 
            onValueChange={handleFallbackProviderChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {availableProviders
                .filter(p => p !== endpointConfig.provider)
                .map(provider => (
                  <SelectItem key={provider} value={provider}>
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Fallback Model */}
        {endpointConfig.fallbackProvider && (
          <div className="space-y-2">
            <Label className="text-sm">Fallback Model</Label>
            <Select 
              value={endpointConfig.fallbackModel || 'none'} 
              onValueChange={handleFallbackModelChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Default</SelectItem>
                {providerModels[endpointConfig.fallbackProvider as AIProvider]?.map(model => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Test Button */}
        <div className="pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleTestClick}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Test Connection
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default EnhancedProviderSelector;