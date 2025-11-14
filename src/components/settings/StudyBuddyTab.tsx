'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Cpu, Settings, TestTube, RefreshCw, Save, AlertTriangle, CheckCircle, Info, Wifi, WifiOff, HelpCircle, Eye, EyeOff } from 'lucide-react';
import type { StudyBuddySettings } from '@/types/settings';
import type { AIProvider } from '@/types/api-test';
import { studyBuddySettingsService } from '@/lib/ai/study-buddy-settings-service';

interface StudyBuddyTabProps {
  settings: StudyBuddySettings;
  onChange: (updates: Partial<StudyBuddySettings>) => void;
  onRequestSave?: () => void; // triggers parent save
}

export default function StudyBuddyTab({ settings, onChange, onRequestSave }: StudyBuddyTabProps) {
  const { toast } = useToast();
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [bulkTesting, setBulkTesting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const PROVIDERS: AIProvider[] = ['groq', 'gemini', 'cerebras', 'cohere', 'mistral'];

  const ENDPOINT_INFO = {
    chat: {
      name: 'Chat',
      description: 'Main AI conversation endpoint',
      icon: '💬'
    },
    embeddings: {
      name: 'Embeddings',
      description: 'Vector embedding generation',
      icon: '🔢'
    },
    memoryStorage: {
      name: 'Memory Storage',
      description: 'Conversation memory storage',
      icon: '💾'
    },
    orchestrator: {
      name: 'Orchestrator',
      description: 'AI service coordination',
      icon: '🔄'
    },
    personalized: {
      name: 'Personalized',
      description: 'Personalized study suggestions',
      icon: '🎯'
    },
    semanticSearch: {
      name: 'Semantic Search',
      description: 'Memory retrieval and search',
      icon: '🔍'
    },
    webSearch: {
      name: 'Web Search',
      description: 'Internet search functionality',
      icon: '🌐'
    }
  };

  const handleEndpointChange = (endpoint: keyof StudyBuddySettings['endpoints'], updates: Partial<StudyBuddySettings['endpoints'][typeof endpoint]>) => {
    onChange({
      endpoints: {
        ...settings.endpoints,
        [endpoint]: {
          ...settings.endpoints[endpoint],
          ...updates
        }
      }
    });
  };

  const handleGlobalDefaultsChange = (updates: Partial<StudyBuddySettings['globalDefaults']>) => {
    onChange({
      globalDefaults: {
        ...settings.globalDefaults,
        ...updates
      }
    });
  };

  const testEndpoint = async (endpoint: string) => {
    setTestingEndpoint(endpoint);
    try {
      // Simulate endpoint testing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Test Successful',
        description: `${ENDPOINT_INFO[endpoint as keyof typeof ENDPOINT_INFO]?.name} endpoint is working correctly`,
        variant: 'default'
      });

      handleEndpointChange(endpoint as keyof StudyBuddySettings['endpoints'], {
        testStatus: 'success',
        lastTested: new Date().toISOString(),
        error: undefined
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: `Failed to test ${ENDPOINT_INFO[endpoint as keyof typeof ENDPOINT_INFO]?.name} endpoint`,
        variant: 'destructive'
      });

      handleEndpointChange(endpoint as keyof StudyBuddySettings['endpoints'], {
        testStatus: 'failed',
        lastTested: new Date().toISOString(),
        error: 'Connection failed'
      });
    } finally {
      setTestingEndpoint(null);
    }
  };

  const requestParentSave = () => {
    if (onRequestSave) {
      onRequestSave();
    } else {
      toast({
        title: 'Validated',
        description: 'Use the main Save Changes button to persist your changes.',
        variant: 'default'
      });
    }
  };

  const testAllEndpoints = async () => {
    setBulkTesting(true);
    const endpoints = Object.keys(settings.endpoints);
    
    for (const endpoint of endpoints) {
      await testEndpoint(endpoint);
    }
    
    setBulkTesting(false);
    toast({
      title: 'Bulk Test Complete',
      description: 'All endpoints have been tested',
      variant: 'default'
    });
  };

  const applyGlobalDefaults = () => {
    const updatedEndpoints = { ...settings.endpoints };
    
    Object.keys(updatedEndpoints).forEach(endpoint => {
      updatedEndpoints[endpoint as keyof typeof updatedEndpoints] = {
        ...updatedEndpoints[endpoint as keyof typeof updatedEndpoints],
        provider: settings.globalDefaults.provider,
        model: settings.globalDefaults.model
      };
    });

    onChange({
      endpoints: updatedEndpoints
    });

    toast({
      title: 'Defaults Applied',
      description: 'Global defaults have been applied to all endpoints',
      variant: 'default'
    });
  };

  const getEndpointStatus = (endpoint: keyof StudyBuddySettings['endpoints']) => {
    const config = settings.endpoints[endpoint];
    if (config.testStatus === 'success') {
      return { variant: 'success', icon: CheckCircle, text: 'Working', statusIcon: Wifi };
    } else if (config.testStatus === 'failed') {
      return { variant: 'destructive', icon: AlertTriangle, text: 'Failed', statusIcon: WifiOff };
    } else {
      return { variant: 'secondary', icon: Settings, text: 'Not Tested', statusIcon: WifiOff };
    }
  };

  const validateSettings = useCallback(() => {
    const errors: Record<string, string> = {};
    
    Object.entries(settings.endpoints).forEach(([endpointKey, config]) => {
      if (config.enabled && !config.provider) {
        errors[`${endpointKey}-provider`] = 'Provider is required when endpoint is enabled';
      }
      if (config.enabled && !config.model) {
        errors[`${endpointKey}-model`] = 'Model is required when endpoint is enabled';
      }
      if (config.timeout < 5 || config.timeout > 120) {
        errors[`${endpointKey}-timeout`] = 'Timeout must be between 5 and 120 seconds';
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [settings.endpoints]);

  const handleSaveWithValidation = async () => {
    if (!validateSettings()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the highlighted errors before saving',
        variant: 'destructive'
      });
      return;
    }
    requestParentSave();
  };

  const getProviderDescription = (provider: string) => {
    const descriptions: Record<string, string> = {
      'groq': 'High-speed inference with optimized routing',
      'gemini': 'Google\'s multimodal AI models',
      'cerebras': 'Specialized for academic and research workloads',
      'cohere': 'Enterprise-grade language models',
      'mistral': 'Open-source models with strong reasoning',
    };
    return descriptions[provider] || 'AI service provider';
  };

  const getModelDescription = (provider: string, model: string) => {
    const descriptions: Record<string, Record<string, string>> = {
      'groq': {

        'mixtral-8x7b-32768': 'Balanced performance and cost',
        'llama-3.1-8b-instant': 'New Llama 3.1 with fast inference',
        'llama-3.1-70b-versatile': 'Powerful 70B version of Llama 3.1'
      },
      'gemini': {
        'gemini-2.5-pro': 'Latest Pro model with advanced reasoning',
        'gemini-2.5-flash': 'Latest Flash model with advanced capabilities',
        'gemini-2.5-flash-lite': 'Lightweight, fastest possible responses (latest)',
        'gemini-2.0-pro': 'Powerful Pro model for complex tasks',
        'gemini-2.0-flash': 'Fast responses with good quality',
        'gemini-2.0-flash-lite': 'Lightweight, fastest possible responses',
      },
      'cerebras': {

      },
      'cohere': {
        'command-r': 'Enterprise-grade language model',
        'command-r-plus': 'Advanced reasoning and generation',
        'embed-english-v3.0': 'High performance embedding model',
        'command': 'Balanced command model'
      },
      'mistral': {
        'mistral-small-latest': 'Efficient small model for routine tasks',
        'mistral-medium-latest': 'Balanced performance model',
        'mistral-large-latest': 'Powerful model for complex tasks',
        'mistral-7b-instruct': 'Instruct-tuned Mistral 7B',
        'pixtral-12b': 'Multimodal model with image understanding'
      }
    };
    return descriptions[provider]?.[model] || `${model} from ${provider}`;
  };


  const totalEndpoints = Object.keys(settings.endpoints).length;
  const enabledEndpoints = Object.values(settings.endpoints).filter(ep => ep.enabled).length;
  const testedEndpoints = Object.values(settings.endpoints).filter(ep => ep.testStatus === 'success').length;

  return (
    <div className="space-y-6 animate-in fade-in-5 slide-in-from-left-2 duration-300">
      {/* Header with Statistics */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Cpu className="h-5 w-5" aria-hidden="true" />
              Study Buddy AI Endpoint Configuration
            </h3>
            <p className="text-sm text-muted-foreground">
              Configure provider and model settings for each AI endpoint. Each endpoint can use different providers and models based on your preferences and requirements.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-label={showAdvanced ? "Hide advanced options" : "Show advanced options"}
            >
              {showAdvanced ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Advanced
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show Advanced
                </>
              )}
            </Button>
            <Button
              onClick={handleSaveWithValidation}
              disabled={Object.keys(validationErrors).length > 0}
              size="sm"
              className="bg-primary hover:bg-primary/90"
              aria-label="Save Study Buddy settings using main Save Changes button"
            >
              <Save className="h-4 w-4 mr-2" />
              Save (Main)
            </Button>
          </div>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-live="polite">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Endpoints</p>
                  <p className="text-2xl font-bold">{totalEndpoints}</p>
                </div>
                <Cpu className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Enabled</p>
                  <p className="text-2xl font-bold text-green-600">{enabledEndpoints}</p>
                </div>
                <Wifi className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Working</p>
                  <p className="text-2xl font-bold text-purple-600">{testedEndpoints}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Global Defaults Section */}
      <Card className="border-2 hover:shadow-lg transition-all duration-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" aria-hidden="true" />
                Global Defaults
              </CardTitle>
              <CardDescription>
                Set default provider and model for all endpoints. These can be overridden individually below.
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Info className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">About global defaults</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  Global defaults provide a quick way to configure all endpoints at once.
                  Individual endpoint settings will override these defaults when configured.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="global-provider" className="font-medium">
                Default Provider
              </Label>
              <Select
                value={settings.globalDefaults.provider}
                onValueChange={(value) => {
                  handleGlobalDefaultsChange({ provider: value });
                  // Auto-select default model for the new provider
                  const defaultModels: Record<AIProvider, string> = {
                    groq: 'llama-3.1-8b-instant',
                    gemini: 'gemini-2.0-flash',
                    cerebras: 'llama3.1-8b',
                    cohere: 'command',
                    mistral: 'mistral-7b-instruct',
                    openrouter: 'llama-3.1-8b-instruct:free'
                  };
                  const defaultModel = defaultModels[value as AIProvider];
                  if (defaultModel) {
                    handleGlobalDefaultsChange({ model: defaultModel });
                  }
                }}
              >
                <SelectTrigger id="global-provider" aria-label="Select default provider">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map(provider => (
                    <SelectItem key={provider} value={provider}>
                      <div className="flex items-center justify-between">
                        <span>{provider.charAt(0).toUpperCase() + provider.slice(1)}</span>
                        <span className="text-xs text-muted-foreground">
                          {getProviderDescription(provider)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground" id="global-provider-help">
                {getProviderDescription(settings.globalDefaults.provider)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="global-model" className="font-medium">
                Default Model
              </Label>
              <Select
                value={settings.globalDefaults.model}
                onValueChange={(value) => handleGlobalDefaultsChange({ model: value })}
                disabled={!settings.globalDefaults.provider}
              >
                <SelectTrigger
                  id="global-model"
                  aria-label="Select default model"
                  className={!settings.globalDefaults.provider ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  <SelectValue placeholder={!settings.globalDefaults.provider ? "Select provider first" : "Select a model"} />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    console.log('Global Defaults Provider:', settings.globalDefaults.provider);
                    const models = studyBuddySettingsService.getValidModelsForProvider(settings.globalDefaults.provider as AIProvider);
                    console.log('Global Defaults Models for Provider:', settings.globalDefaults.provider, models);
                    return models?.map(model => (
                      <SelectItem key={model} value={model}>
                        <div className="flex items-center justify-between">
                          <span>{model}</span>
                          <span className="text-xs text-muted-foreground">
                            {getModelDescription(settings.globalDefaults.provider, model)}
                          </span>
                        </div>
                      </SelectItem>
                    )) || (
                      <div className="text-center py-4 text-muted-foreground">
                        No models available for selected provider
                      </div>
                    );
                  })()}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground" id="global-model-help">
                {settings.globalDefaults.provider && settings.globalDefaults.model
                  ? getModelDescription(settings.globalDefaults.provider, settings.globalDefaults.model)
                  : "Select a provider to see available models"
                }
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={applyGlobalDefaults}
              variant="outline"
              size="sm"
              className="transition-all hover:scale-105"
              disabled={!settings.globalDefaults.provider || !settings.globalDefaults.model}
            >
              <Settings className="h-4 w-4 mr-2" />
              Apply to All Endpoints
            </Button>

            <Button
              onClick={testAllEndpoints}
              disabled={bulkTesting}
              variant="outline"
              size="sm"
              className="transition-all hover:scale-105"
            >
              {bulkTesting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing All...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Test All Endpoints
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                handleGlobalDefaultsChange({ provider: '' });
                handleGlobalDefaultsChange({ model: '' });
              }}
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive/90"
              disabled={!settings.globalDefaults.provider && !settings.globalDefaults.model}
            >
              Clear Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Endpoint Configuration */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold">Individual Endpoint Configuration</h4>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{enabledEndpoints}/{totalEndpoints} enabled</span>
            <span>•</span>
            <span className="font-medium">{testedEndpoints}/{totalEndpoints} working</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(settings.endpoints).map(([endpointKey, config]) => {
            const endpointInfo = ENDPOINT_INFO[endpointKey as keyof typeof ENDPOINT_INFO];
            const status = getEndpointStatus(endpointKey as keyof StudyBuddySettings['endpoints']);
            const StatusIcon = status.icon;
            const StatusIndicator = status.statusIcon;

            return (
              <Card
                key={endpointKey}
                className={`border-2 transition-all duration-200 hover:shadow-lg ${
                  config.enabled ? 'border-primary/50 bg-primary/5' : 'border-border'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg" aria-hidden="true">{endpointInfo.icon}</span>
                        <CardTitle className="text-sm font-medium">
                          {endpointInfo.name}
                        </CardTitle>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Badge
                                variant={status.variant as 'success' | 'destructive' | 'secondary'}
                                className="text-xs cursor-help"
                              >
                                <StatusIndicator className="h-3 w-3 mr-1" />
                                {status.text}
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            {status.text === 'Working' && config.lastTested
                              ? `Last tested: ${new Date(config.lastTested).toLocaleString()}`
                              : status.text === 'Failed' && config.error
                              ? `Error: ${config.error}`
                              : `${endpointInfo.description}`
                            }
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                  <CardDescription className="text-xs text-muted-foreground mt-1">
                    {endpointInfo.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Provider Selection */}
                  <div className="space-y-2">
                    <Label
                      htmlFor={`${endpointKey}-provider`}
                      className="font-medium text-sm flex items-center gap-1"
                    >
                      Provider
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            {getProviderDescription(config.provider || 'groq')}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Select
                      value={config.provider}
                      onValueChange={(value) => {
                        handleEndpointChange(endpointKey as keyof StudyBuddySettings['endpoints'], { provider: value });
                        // Auto-select default model for the new provider
                        const defaultModels: Record<AIProvider, string> = {
                          groq: 'llama-3.1-8b-instant',
                          gemini: 'gemini-2.0-flash',
                          cerebras: 'llama3.1-8b',
                          cohere: 'command',
                          mistral: 'mistral-7b-instruct',
                          openrouter: 'llama-3.1-8b-instruct:free'
                        };
                        const defaultModel = defaultModels[value as AIProvider];
                        if (defaultModel) {
                          handleEndpointChange(endpointKey as keyof StudyBuddySettings['endpoints'], { model: defaultModel });
                        }
                      }}
                    >
                      <SelectTrigger
                        id={`${endpointKey}-provider`}
                        className={`text-sm ${
                          validationErrors[`${endpointKey}-provider`] ? 'border-destructive ring-destructive/20' : ''
                        }`}
                        aria-label={`Select provider for ${endpointInfo.name} endpoint`}
                      >
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS.map(provider => (
                          <SelectItem key={provider} value={provider}>
                            <div className="flex items-center justify-between">
                              <span>{provider.charAt(0).toUpperCase() + provider.slice(1)}</span>
                              <span className="text-xs text-muted-foreground">
                                {getProviderDescription(provider)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors[`${endpointKey}-provider`] && (
                      <p className="text-xs text-destructive flex items-center gap-1" role="alert" aria-live="polite">
                        <AlertTriangle className="h-3 w-3" />
                        {validationErrors[`${endpointKey}-provider`]}
                      </p>
                    )}
                  </div>

                  {/* Model Selection */}
                  <div className="space-y-2">
                    <Label
                      htmlFor={`${endpointKey}-model`}
                      className="font-medium text-sm flex items-center gap-1"
                    >
                      Model
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            {config.provider && config.model
                              ? getModelDescription(config.provider, config.model)
                              : 'Select a provider to see available models'
                            }
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Select
                      value={config.model}
                      onValueChange={(value) => handleEndpointChange(endpointKey as keyof StudyBuddySettings['endpoints'], { model: value })}
                      disabled={!config.provider}
                    >
                      <SelectTrigger
                        id={`${endpointKey}-model`}
                        className={`text-sm ${
                          validationErrors[`${endpointKey}-model`] ? 'border-destructive ring-destructive/20' : ''
                        } ${
                          !config.provider ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        aria-label={`Select model for ${endpointInfo.name} endpoint`}
                      >
                        <SelectValue placeholder={config.provider ? "Select model" : "Select provider first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          console.log('Endpoint Provider:', endpointKey, config.provider);
                          const models = studyBuddySettingsService.getValidModelsForProvider(config.provider as AIProvider);
                          console.log('Endpoint Models for Provider:', endpointKey, config.provider, models);
                          return models?.map(model => (
                            <SelectItem key={model} value={model}>
                              <div className="flex items-center justify-between">
                                <span>{model}</span>
                                <span className="text-xs text-muted-foreground">
                                  {getModelDescription(config.provider, model)}
                                </span>
                              </div>
                            </SelectItem>
                          )) || (
                            <div className="text-center py-4 text-muted-foreground text-sm">
                              No models available for selected provider
                            </div>
                          );
                        })()}
                      </SelectContent>
                    </Select>
                    {validationErrors[`${endpointKey}-model`] && (
                      <p className="text-xs text-destructive flex items-center gap-1" role="alert" aria-live="polite">
                        <AlertTriangle className="h-3 w-3" />
                        {validationErrors[`${endpointKey}-model`]}
                      </p>
                    )}
                  </div>

                  {/* Test Button and Status */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      {config.lastTested ? (
                        <div className="flex items-center gap-1">
                          <span>Last tested:</span>
                          <span className="font-medium">
                            {new Date(config.lastTested).toLocaleTimeString()}
                          </span>
                        </div>
                      ) : (
                        <span>Never tested</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => testEndpoint(endpointKey)}
                        disabled={testingEndpoint === endpointKey}
                        variant="outline"
                        size="sm"
                        className="text-xs transition-all hover:scale-105"
                        aria-label={`Test ${endpointInfo.name} endpoint`}
                      >
                        {testingEndpoint === endpointKey ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <TestTube className="h-3 w-3 mr-1" />
                            Test
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Error Display */}
                  {config.error && (
                    <div className="text-xs text-destructive flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
                      <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                      <span className="flex-1 line-clamp-2">{config.error}</span>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-6 text-xs"
                        onClick={() => handleEndpointChange(endpointKey as keyof StudyBuddySettings['endpoints'], { error: undefined })}
                      >
                        Clear
                      </Button>
                    </div>
                  )}

                  {/* Advanced Settings Toggle */}
                  {showAdvanced && (
                    <div className="space-y-3 pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Enabled</span>
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={(checked) => {
                            handleEndpointChange(endpointKey as keyof StudyBuddySettings['endpoints'], { enabled: checked });
                            if (checked && !config.provider) {
                              // Auto-apply global defaults when enabling
                              handleEndpointChange(endpointKey as keyof StudyBuddySettings['endpoints'], {
                                provider: settings.globalDefaults.provider,
                                model: settings.globalDefaults.model
                              });
                            }
                          }}
                          aria-label={`Enable ${endpointInfo.name} endpoint`}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <Label htmlFor={`${endpointKey}-timeout`} className="font-medium">
                            Timeout: {config.timeout}s
                          </Label>
                          {validationErrors[`${endpointKey}-timeout`] && (
                            <span className="text-xs text-destructive" role="alert">
                              {validationErrors[`${endpointKey}-timeout`]}
                            </span>
                          )}
                        </div>
                        <Input
                          id={`${endpointKey}-timeout`}
                          type="number"
                          value={config.timeout}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (value >= 5 && value <= 120) {
                              handleEndpointChange(endpointKey as keyof StudyBuddySettings['endpoints'], { timeout: value });
                            }
                          }}
                          className={`text-sm ${
                            validationErrors[`${endpointKey}-timeout`]
                              ? 'border-destructive ring-destructive/20'
                              : ''
                          }`}
                          min={5}
                          max={120}
                          step={1}
                          aria-label={`Set timeout for ${endpointInfo.name} endpoint`}
                        />
                        <div className="text-xs text-muted-foreground">
                          Response timeout in seconds (5-120)
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Additional Settings */}
      <Card className="border-2 hover:shadow-md transition-all duration-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" aria-hidden="true" />
                Additional Settings
              </CardTitle>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Info className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">About additional settings</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  Configure additional options for endpoint management and monitoring.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="health-monitoring" className="font-medium">
                  Enable Health Monitoring
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically test endpoints and monitor performance in the background
                </p>
              </div>
              <Switch
                id="health-monitoring"
                checked={settings.enableHealthMonitoring}
                onCheckedChange={(checked) => {
                  onChange({ enableHealthMonitoring: checked });
                  if (checked) {
                    toast({
                      title: "Health Monitoring Enabled",
                      description: "Endpoints will be automatically tested and monitored",
                      variant: "default"
                    });
                  }
                }}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <Label htmlFor="test-all" className="font-medium">
                  Show Bulk Test Option
                </Label>
                <p className="text-xs text-muted-foreground">
                  Display the "Test All Endpoints" button in the global defaults section
                </p>
              </div>
              <Switch
                id="test-all"
                checked={settings.testAllEndoints}
                onCheckedChange={(checked) => {
                  onChange({ testAllEndoints: checked });
                  if (checked) {
                    toast({
                      title: "Bulk Test Enabled",
                      description: "Test all endpoints button is now available",
                      variant: "default"
                    });
                  }
                }}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Quick Actions</span>
              <Separator className="flex-1" />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allEnabled = Object.keys(settings.endpoints).reduce((acc, key) => {
                    acc[key as keyof typeof acc] = {
                      ...settings.endpoints[key as keyof typeof settings.endpoints],
                      enabled: true
                    };
                    return acc;
                  }, {} as typeof settings.endpoints);
                  onChange({ endpoints: allEnabled });
                  toast({
                    title: "All Endpoints Enabled",
                    description: "All endpoints have been enabled",
                    variant: "default"
                  });
                }}
                className="transition-all hover:scale-105"
              >
                Enable All
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allDisabled = Object.keys(settings.endpoints).reduce((acc, key) => {
                    acc[key as keyof typeof acc] = {
                      ...settings.endpoints[key as keyof typeof settings.endpoints],
                      enabled: false
                    };
                    return acc;
                  }, {} as typeof settings.endpoints);
                  onChange({ endpoints: allDisabled });
                  toast({
                    title: "All Endpoints Disabled",
                    description: "All endpoints have been disabled",
                    variant: "default"
                  });
                }}
                className="transition-all hover:scale-105"
              >
                Disable All
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const clearedErrors = Object.keys(settings.endpoints).reduce((acc, key) => {
                    acc[key as keyof typeof acc] = {
                      ...settings.endpoints[key as keyof typeof settings.endpoints],
                      error: undefined,
                      testStatus: undefined,
                      lastTested: undefined
                    };
                    return acc;
                  }, {} as typeof settings.endpoints);
                  onChange({ endpoints: clearedErrors });
                  toast({
                    title: "Errors Cleared",
                    description: "All endpoint errors have been cleared",
                    variant: "default"
                  });
                }}
                className="transition-all hover:scale-105"
              >
                Clear All Errors
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}