import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, X, Zap, Crown } from 'lucide-react';

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  isFree: boolean;
  cost?: string;
  capabilities: {
    supportsStreaming: boolean;
    supportsFunctionCalling: boolean;
    maxTokens: number;
  };
}

interface ModelSelectorProps {
  selectedModel?: string;
  onModelSelect: (model: string) => void;
  availableProviders: string[];
  className?: string;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelSelect,
  availableProviders,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customModel, setCustomModel] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);

  useEffect(() => {
    // Load available models from all providers
    loadAvailableModels();
  }, [availableProviders]);

  const loadAvailableModels = async () => {
    const allModels: ModelOption[] = [];
    
    // Free models from all providers
    const freeModels = [
      // OpenRouter Free Models
      {
        id: 'meta-llama/llama-3.1-8b-instruct:free',
        name: 'Llama 3.1 8B (Free)',
        provider: 'OpenRouter',
        isFree: true,
        cost: 'Free',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 128000 }
      },
      {
        id: 'meta-llama/llama-3.1-70b-instruct:free',
        name: 'Llama 3.1 70B (Free)',
        provider: 'OpenRouter',
        isFree: true,
        cost: 'Free',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 128000 }
      },
      {
        id: 'mistralai/mistral-7b-instruct:free',
        name: 'Mistral 7B (Free)',
        provider: 'OpenRouter',
        isFree: true,
        cost: 'Free',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 32000 }
      },
      {
        id: 'qwen/qwen-2-7b-instruct:free',
        name: 'Qwen 2 7B (Free)',
        provider: 'OpenRouter',
        isFree: true,
        cost: 'Free',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 131072 }
      },
      {
        id: 'microsoft/phi-3-mini-128k-instruct:free',
        name: 'Phi-3 Mini 128K (Free)',
        provider: 'OpenRouter',
        isFree: true,
        cost: 'Free',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 128000 }
      },
      {
        id: 'NousResearch/hermes-2-pro-llama-3-8b:free',
        name: 'Hermes 2 Pro Llama 3 8B (Free)',
        provider: 'OpenRouter',
        isFree: true,
        cost: 'Free',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 128000 }
      },
      {
        id: 'google/gemini-2.0-flash',
        name: 'Gemini 2.0 Flash (Free)',
        provider: 'Google',
        isFree: true,
        cost: 'Free',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: false, maxTokens: 1000000 }
      },
      {
        id: 'google/gemini-2.0-flash-lite',
        name: 'Gemini 2.0 Flash Lite (Free)',
        provider: 'Google',
        isFree: true,
        cost: 'Free',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: false, maxTokens: 1000000 }
      },
      {
        id: 'google/gemini-2.5-flash',
        name: 'Gemini 2.5 Flash (Free)',
        provider: 'Google',
        isFree: true,
        cost: 'Free',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: false, maxTokens: 1000000 }
      },
      {
        id: 'google/gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite (Free)',
        provider: 'Google',
        isFree: true,
        cost: 'Free',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: false, maxTokens: 1000000 }
      },
      
      // Groq Free Models
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B Versatile',
        provider: 'Groq',
        isFree: true,
        cost: 'Free',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 32768 }
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant',
        provider: 'Groq',
        isFree: true,
        cost: 'Free',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: false, maxTokens: 32768 }
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B 32K',
        provider: 'Groq',
        isFree: true,
        cost: 'Free',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 32768 }
      },
      {
        id: 'gemma2-9b-it',
        name: 'Gemma 2 9B IT',
        provider: 'Groq',
        isFree: true,
        cost: 'Free',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: false, maxTokens: 8192 }
      },

      // Paid Models (as fallback)
      {
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'OpenAI',
        isFree: false,
        cost: 'Paid',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 16385 }
      },
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        isFree: false,
        cost: 'Paid',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 128000 }
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        isFree: false,
        cost: 'Paid',
        capabilities: { supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 200000 }
      }
    ];
    
    allModels.push(...freeModels);
    setModels(allModels);
  };

  const handleModelSelect = (model: string) => {
    onModelSelect(model);
    setIsOpen(false);
  };

  const handleAddCustomModel = () => {
    if (customModel.trim()) {
      onModelSelect(customModel.trim());
      setCustomModel('');
      setShowCustomInput(false);
    }
  };

  const selectedModelInfo = models.find(m => m.id === selectedModel);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:bg-gray-50"
      >
        <div className="flex items-center space-x-2">
          {selectedModelInfo && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              selectedModelInfo.isFree ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {selectedModelInfo.isFree ? (
                <><Zap className="h-3 w-3 mr-1" />Free</>
              ) : (
                <><Crown className="h-3 w-3 mr-1" />Paid</>
              )}
            </span>
          )}
          <span className="text-sm font-medium text-gray-900">
            {selectedModelInfo ? selectedModelInfo.name : 'Select a model...'}
          </span>
          {selectedModelInfo && (
            <span className="text-xs text-gray-500">
              {selectedModelInfo.provider}
            </span>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-auto">
          <div className="py-1">
            {/* Free Models Section */}
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-green-50 border-b">
              💚 Free Models (Recommended)
            </div>
            {models.filter(m => m.isFree).map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model.id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50 ${
                  selectedModel === model.id ? 'bg-green-100 text-green-900' : 'text-gray-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{model.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-green-600 bg-green-100 px-1 py-0.5 rounded">FREE</span>
                    <span className="text-xs text-gray-500">{model.provider}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                  <span>{model.capabilities.maxTokens.toLocaleString()} tokens</span>
                  {model.capabilities.supportsStreaming && (
                    <span className="text-blue-500">• Streaming</span>
                  )}
                  {model.capabilities.supportsFunctionCalling && (
                    <span className="text-purple-500">• Function Calling</span>
                  )}
                </div>
              </button>
            ))}

            {/* Paid Models Section */}
            <div className="border-t border-gray-200 my-1"></div>
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-blue-50 border-b">
              💰 Premium Models
            </div>
            {models.filter(m => !m.isFree).map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model.id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                  selectedModel === model.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{model.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-blue-600 bg-blue-100 px-1 py-0.5 rounded">PAID</span>
                    <span className="text-xs text-gray-500">{model.provider}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                  <span>{model.capabilities.maxTokens.toLocaleString()} tokens</span>
                  {model.capabilities.supportsStreaming && (
                    <span className="text-blue-500">• Streaming</span>
                  )}
                  {model.capabilities.supportsFunctionCalling && (
                    <span className="text-purple-500">• Function Calling</span>
                  )}
                </div>
              </button>
            ))}

            {/* Custom Model Section */}
            <div className="border-t border-gray-200 my-1"></div>
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-purple-50 border-b">
              🔧 Custom Models
            </div>
            
            {!showCustomInput ? (
              <button
                onClick={() => setShowCustomInput(true)}
                className="w-full text-left px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add custom model</span>
              </button>
            ) : (
              <div className="px-3 py-2 space-y-2">
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="e.g., openai/gpt-4, anthropic/claude-3"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomModel()}
                  autoFocus
                />
                <div className="text-xs text-gray-500">
                  Enter any OpenAI/Anthropic/OpenRouter compatible model ID
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleAddCustomModel}
                    disabled={!customModel.trim()}
                    className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomModel('');
                    }}
                    className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
