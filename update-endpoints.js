const fs = require('fs');
const path = 'C:\\Users\\kunal\\Ruther\\ROUTE\\src\\app\\(app)\\study-buddy\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace each endpoint configuration separately with its unique context
// Chat endpoint
content = content.replace(
  /endpoint="chat"\s+label="Chat"\s+value=\{preferences\.provider\}\s+model=\{preferences\.model\}\s+onProviderChange=\{\(provider\) => savePreferences\(\{ provider \}\)\}\s+onModelChange=\{\(model\) => savePreferences\(\{ model \}\)\}/,
  `endpoint="chat"
                      label="Chat"
                      value={preferences.endpointProviders?.chat || preferences.provider}
                      model={preferences.endpointModels?.chat || preferences.model}
                      onProviderChange={(provider) => savePreferences({ 
                        endpointProviders: { 
                          ...preferences.endpointProviders, 
                          chat: provider 
                        } 
                      })}
                      onModelChange={(model) => savePreferences({ 
                        endpointModels: { 
                          ...preferences.endpointModels, 
                          chat: model 
                        } 
                      })}`
);

// Embeddings endpoint
content = content.replace(
  /endpoint="embeddings"\s+label="Embeddings"\s+value=\{preferences\.provider\}\s+model=\{preferences\.model\}\s+onProviderChange=\{\(provider\) => savePreferences\(\{ provider \}\)\}\s+onModelChange=\{\(model\) => savePreferences\(\{ model \}\)\}/,
  `endpoint="embeddings"
                      label="Embeddings"
                      value={preferences.endpointProviders?.embeddings || preferences.provider}
                      model={preferences.endpointModels?.embeddings || preferences.model}
                      onProviderChange={(provider) => savePreferences({ 
                        endpointProviders: { 
                          ...preferences.endpointProviders, 
                          embeddings: provider 
                        } 
                      })}
                      onModelChange={(model) => savePreferences({ 
                        endpointModels: { 
                          ...preferences.endpointModels, 
                          embeddings: model 
                        } 
                      })}`
);

// Memory Storage endpoint
content = content.replace(
  /endpoint="memoryStorage"\s+label="Memory Storage"\s+value=\{preferences\.provider\}\s+model=\{preferences\.model\}\s+onProviderChange=\{\(provider\) => savePreferences\(\{ provider \}\)\}\s+onModelChange=\{\(model\) => savePreferences\(\{ model \}\)\}/,
  `endpoint="memoryStorage"
                      label="Memory Storage"
                      value={preferences.endpointProviders?.memoryStorage || preferences.provider}
                      model={preferences.endpointModels?.memoryStorage || preferences.model}
                      onProviderChange={(provider) => savePreferences({ 
                        endpointProviders: { 
                          ...preferences.endpointProviders, 
                          memoryStorage: provider 
                        } 
                      })}
                      onModelChange={(model) => savePreferences({ 
                        endpointModels: { 
                          ...preferences.endpointModels, 
                          memoryStorage: model 
                        } 
                      })}`
);

// Orchestrator endpoint
content = content.replace(
  /endpoint="orchestrator"\s+label="Orchestrator"\s+value=\{preferences\.provider\}\s+model=\{preferences\.model\}\s+onProviderChange=\{\(provider\) => savePreferences\(\{ provider \}\)\}\s+onModelChange=\{\(model\) => savePreferences\(\{ model \}\)\}/,
  `endpoint="orchestrator"
                      label="Orchestrator"
                      value={preferences.endpointProviders?.orchestrator || preferences.provider}
                      model={preferences.endpointModels?.orchestrator || preferences.model}
                      onProviderChange={(provider) => savePreferences({ 
                        endpointProviders: { 
                          ...preferences.endpointProviders, 
                          orchestrator: provider 
                        } 
                      })}
                      onModelChange={(model) => savePreferences({ 
                        endpointModels: { 
                          ...preferences.endpointModels, 
                          orchestrator: model 
                        } 
                      })}`
);

// Personalized endpoint
content = content.replace(
  /endpoint="personalized"\s+label="Personalized"\s+value=\{preferences\.provider\}\s+model=\{preferences\.model\}\s+onProviderChange=\{\(provider\) => savePreferences\(\{ provider \}\)\}\s+onModelChange=\{\(model\) => savePreferences\(\{ model \}\)\}/,
  `endpoint="personalized"
                      label="Personalized"
                      value={preferences.endpointProviders?.personalized || preferences.provider}
                      model={preferences.endpointModels?.personalized || preferences.model}
                      onProviderChange={(provider) => savePreferences({ 
                        endpointProviders: { 
                          ...preferences.endpointProviders, 
                          personalized: provider 
                        } 
                      })}
                      onModelChange={(model) => savePreferences({ 
                        endpointModels: { 
                          ...preferences.endpointModels, 
                          personalized: model 
                        } 
                      })}`
);

// Semantic Search endpoint
content = content.replace(
  /endpoint="semanticSearch"\s+label="Semantic Search"\s+value=\{preferences\.provider\}\s+model=\{preferences\.model\}\s+onProviderChange=\{\(provider\) => savePreferences\(\{ provider \}\)\}\s+onModelChange=\{\(model\) => savePreferences\(\{ model \}\)\}/,
  `endpoint="semanticSearch"
                      label="Semantic Search"
                      value={preferences.endpointProviders?.semanticSearch || preferences.provider}
                      model={preferences.endpointModels?.semanticSearch || preferences.model}
                      onProviderChange={(provider) => savePreferences({ 
                        endpointProviders: { 
                          ...preferences.endpointProviders, 
                          semanticSearch: provider 
                        } 
                      })}
                      onModelChange={(model) => savePreferences({ 
                        endpointModels: { 
                          ...preferences.endpointModels, 
                          semanticSearch: model 
                        } 
                      })}`
);

// Web Search endpoint
content = content.replace(
  /endpoint="webSearch"\s+label="Web Search"\s+value=\{preferences\.provider\}\s+model=\{preferences\.model\}\s+onProviderChange=\{\(provider\) => savePreferences\(\{ provider \}\)\}\s+onModelChange=\{\(model\) => savePreferences\(\{ model \}\)\}/,
  `endpoint="webSearch"
                      label="Web Search"
                      value={preferences.endpointProviders?.webSearch || preferences.provider}
                      model={preferences.endpointModels?.webSearch || preferences.model}
                      onProviderChange={(provider) => savePreferences({ 
                        endpointProviders: { 
                          ...preferences.endpointProviders, 
                          webSearch: provider 
                        } 
                      })}
                      onModelChange={(model) => savePreferences({ 
                        endpointModels: { 
                          ...preferences.endpointModels, 
                          webSearch: model 
                        } 
                      })}`
);

fs.writeFileSync(path, content);
console.log('Updated all endpoint configurations to support endpoint-specific providers and models');