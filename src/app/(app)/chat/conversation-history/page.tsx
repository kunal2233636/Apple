// Conversation History Test Page
// =============================
// Demonstrates the conversation sidebar functionality

'use client';

import React, { useState, Suspense } from 'react';
import { UniversalChatWithPersistence } from '@/components/chat/UniversalChatWithPersistence';
import { ConversationSidebar } from '@/components/chat/ConversationSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  MessageSquare, 
  History, 
  Settings, 
  Brain,
  TestTube,
  Code,
  Database
} from 'lucide-react';
import type { DatabaseConversation } from '@/hooks/useConversationPersistence';

export default function ConversationHistoryPage() {
  const [selectedConversation, setSelectedConversation] = useState<DatabaseConversation | null>(null);
  const [isStandaloneSidebar, setIsStandaloneSidebar] = useState(false);
  const [showFeatureDemo, setShowFeatureDemo] = useState(true);

  // Handle conversation selection
  const handleConversationSelect = (conversation: DatabaseConversation) => {
    setSelectedConversation(conversation);
    console.log('Selected conversation:', conversation);
  };

  // Handle new conversation
  const handleStartNewConversation = () => {
    console.log('Starting new conversation');
    setSelectedConversation(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <History className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Conversation History</h1>
                <p className="text-muted-foreground text-sm">
                  Comprehensive sidebar UI for conversation management
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="flex items-center space-x-1">
                <TestTube className="h-3 w-3" />
                <span>Test Environment</span>
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStandaloneSidebar(!isStandaloneSidebar)}
              >
                {isStandaloneSidebar ? 'Integrated View' : 'Standalone Sidebar'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {isStandaloneSidebar ? (
          // Standalone Sidebar Demo
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TestTube className="h-5 w-5" />
                  <span>Standalone Conversation Sidebar</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sidebar */}
                  <div className="space-y-4">
                    <ConversationSidebar
                      isOpen={true}
                      onToggle={() => {}}
                      onConversationSelect={handleConversationSelect}
                      currentConversationId={selectedConversation?.id}
                      className="h-[600px]"
                    />
                  </div>
                  
                  {/* Feature Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Features Demonstrated</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                        <div>
                          <div className="font-medium">Conversation List Display</div>
                          <div className="text-muted-foreground">View conversations with metadata, timestamps, and status indicators</div>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                        <div>
                          <div className="font-medium">Search & Filter</div>
                          <div className="text-muted-foreground">Advanced search with real-time filtering and sorting</div>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                        <div>
                          <div className="font-medium">Bulk Operations</div>
                          <div className="text-muted-foreground">Select multiple conversations for batch actions</div>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />
                        <div>
                          <div className="font-medium">Conversation Management</div>
                          <div className="text-muted-foreground">Pin, archive, delete, and edit conversations</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Integrated Chat Demo
          <div className="space-y-6">
            <Tabs defaultValue="integrated" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="integrated" className="flex items-center space-x-2">
                  <Brain className="h-4 w-4" />
                  <span>Integrated Chat</span>
                </TabsTrigger>
                <TabsTrigger value="features" className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Features</span>
                </TabsTrigger>
                <TabsTrigger value="code" className="flex items-center space-x-2">
                  <Code className="h-4 w-4" />
                  <span>Implementation</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="integrated" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MessageSquare className="h-5 w-5" />
                      <span>Universal Chat with Persistence</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Suspense fallback={<div>Loading chat...</div>}>
                        <UniversalChatWithPersistence
                          showConversationSidebar={true}
                          showConversationHistory={true}
                          layout="sheet"
                          defaultSidebarOpen={true}
                          onConversationSelect={handleConversationSelect}
                          onStartNewConversation={handleStartNewConversation}
                          className="h-[700px]"
                        />
                      </Suspense>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="features" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Core Features</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Collapsible Sidebar</span>
                          <Badge variant="secondary">✅</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Search & Filter</span>
                          <Badge variant="secondary">✅</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Conversation List</span>
                          <Badge variant="secondary">✅</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Bulk Operations</span>
                          <Badge variant="secondary">✅</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Advanced Features</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Keyboard Shortcuts</span>
                          <Badge variant="secondary">✅</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Drag & Drop</span>
                          <Badge variant="outline">⏳</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Conversation Tags</span>
                          <Badge variant="outline">⏳</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Export/Share</span>
                          <Badge variant="outline">⏳</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">UI/UX Features</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Responsive Design</span>
                          <Badge variant="secondary">✅</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Loading States</span>
                          <Badge variant="secondary">✅</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Error Handling</span>
                          <Badge variant="secondary">✅</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Context Menus</span>
                          <Badge variant="secondary">✅</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Integration Features</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">UniversalChat Integration</span>
                          <Badge variant="secondary">✅</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Conversation Persistence</span>
                          <Badge variant="secondary">✅</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Study Buddy Hook</span>
                          <Badge variant="secondary">✅</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Database Operations</span>
                          <Badge variant="secondary">✅</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="code" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Component Architecture</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Main Components Created:</h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          <li>• <code className="bg-muted px-1 rounded">ConversationSidebar</code> - Main sidebar component</li>
                          <li>• <code className="bg-muted px-1 rounded">ConversationList</code> - Conversation display with metadata</li>
                          <li>• <code className="bg-muted px-1 rounded">ConversationSearch</code> - Advanced search with suggestions</li>
                          <li>• <code className="bg-muted px-1 rounded">ConversationFilters</code> - Filter and sort controls</li>
                          <li>• <code className="bg-muted px-1 rounded">BulkActions</code> - Batch operation management</li>
                          <li>• <code className="bg-muted px-1 rounded">UniversalChatWithPersistence</code> - Integrated chat component</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Key Features Implemented:</h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          <li>• Collapsible sidebar with smooth animations</li>
                          <li>• Real-time search with debouncing and suggestions</li>
                          <li>• Advanced filtering (date, type, status, sorting)</li>
                          <li>• Batch operations (archive, delete, pin, unpin)</li>
                          <li>• Selection mode for multi-select actions</li>
                          <li>• Context menus and keyboard shortcuts</li>
                          <li>• Responsive design for mobile and desktop</li>
                          <li>• Integration with existing persistence system</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Integration Points:</h4>
                        <ul className="text-sm space-y-1 text-muted-foreground">
                          <li>• Uses <code className="bg-muted px-1 rounded">useConversationPersistence</code> hook</li>
                          <li>• Integrates with <code className="bg-muted px-1 rounded">UniversalChat</code> components</li>
                          <li>• Works with <code className="bg-muted px-1 rounded">useStudyBuddy</code> hook</li>
                          <li>• Connects to existing database API endpoints</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>

      {/* Selected Conversation Display */}
      {selectedConversation && (
        <div className="fixed bottom-4 right-4 z-50">
          <Card className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium text-sm">{selectedConversation.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedConversation.message_count} messages • {selectedConversation.chat_type}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}