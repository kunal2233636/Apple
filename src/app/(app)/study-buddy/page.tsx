'use client';

import { Suspense } from 'react';
import { Settings, Plus, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import ProviderSelector from '@/components/chat/ProviderSelector';
import StudyContextPanel from '@/components/chat/StudyContextPanel';
import StudentProfileCard from '@/components/study-buddy/StudentProfileCard';
import StudyBuddyChat from '@/components/study-buddy/study-buddy-chat';
import { useStudyBuddy } from '@/hooks/use-study-buddy';

function StudyBuddyPage() {
  const {
    messages,
    isLoading,
    sessionId,
    userId,
    conversationId,
    preferences,
    studyContext,
    isSettingsOpen,
    isContextOpen,
    profileData,
    handleSendMessage,
    startNewChat,
    clearChat,
    savePreferences,
    saveStudyContext,
    toggleSettings,
    toggleContext,
    exportChat,
    messagesEndRef,
    fileInputRef,
  } = useStudyBuddy();

  return (
    <div className="flex h-full bg-gradient-to-br from-blue-50/50 to-purple-50/30">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Enhanced Header */}
        <div className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
          <div className="flex h-16 items-center px-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  My AI Coach
                </h1>
                <p className="text-xs text-muted-foreground">Personalized study help with your data</p>
              </div>
            </div>
            
            <div className="flex-1" />
            
            {/* Student Profile Card */}
            {userId && (
              <div className="hidden lg:block">
                <StudentProfileCard userId={userId} className="w-80" />
              </div>
            )}
            
            {/* New Chat Button */}
            <Button 
              onClick={startNewChat}
              variant="outline" 
              size="sm"
              className="hidden md:flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
            
            <div className="flex items-center gap-2">
              {/* Settings Button */}
              <Sheet open={isSettingsOpen} onOpenChange={toggleSettings}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Study Buddy Settings</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <ProviderSelector
                      value={preferences.provider}
                      onValueChange={(provider) => savePreferences({ provider })}
                      selectedModel={preferences.model}
                      onModelChange={(model) => savePreferences({ model })}
                    />
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Stream Responses</label>
                        <input
                          type="checkbox"
                          checked={preferences.streamResponses}
                          onChange={(e) => savePreferences({ streamResponses: e.target.checked })}
                          className="rounded"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Creativity Level</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={preferences.temperature}
                          onChange={(e) => savePreferences({ temperature: parseFloat(e.target.value) })}
                          className="w-full"
                        />
                        <div className="text-xs text-muted-foreground">{preferences.temperature}</div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Response Length</label>
                        <input
                          type="number"
                          min="100"
                          max="4096"
                          value={preferences.maxTokens}
                          onChange={(e) => savePreferences({ maxTokens: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Study Context Button */}
              <Sheet open={isContextOpen} onOpenChange={toggleContext}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Study Context</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <StudyContextPanel
                      value={studyContext}
                      onChange={saveStudyContext}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              {/* Action Buttons */}
              <Button variant="ghost" size="sm" onClick={exportChat}>
                Export
              </Button>
              <Button variant="ghost" size="sm" onClick={clearChat}>
                Clear
              </Button>
            </div>
          </div>
          
          {/* Mobile Student Profile Card */}
          {userId && (
            <div className="lg:hidden px-4 pb-3">
              <StudentProfileCard userId={userId} />
            </div>
          )}
        </div>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <StudyBuddyChat
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            preferences={preferences}
            onUpdatePreferences={savePreferences}
            studyContext={studyContext}
          />
        </div>
      </div>
    </div>
  );
}

export default function StudyBuddyPageWithSuspense() {
  return (
    <Suspense fallback={
      <div className="flex h-full bg-gradient-to-br from-blue-50/50 to-purple-50/30">
        <div className="flex-1 flex flex-col">
          <div className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
            <div className="flex h-16 items-center px-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    My AI Coach
                  </h1>
                  <p className="text-xs text-muted-foreground">Personalized study help with your data</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading Study Buddy...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <StudyBuddyPage />
    </Suspense>
  );
}