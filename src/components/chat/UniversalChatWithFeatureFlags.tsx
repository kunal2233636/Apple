// UniversalChatWithFeatureFlags - Feature-Flagged Component
// ==========================================================
// Uses feature flag system for progressive feature rollout and A/B testing

'use client';



import React from 'react';

import { useStudyBuddy } from '@/hooks/use-study-buddy';

import { StudyBuddyChat } from '@/components/study-buddy/study-buddy-chat';

import { cn } from '@/lib/utils';

import type { StudyContext } from '@/types/study-buddy';



interface UniversalChatWithFeatureFlagsProps {

  className?: string;

  initialStudyContext?: Partial<StudyContext>;

  userId?: string;

  userType?: 'new' | 'returning' | 'premium' | 'admin';

  deviceType?: 'mobile' | 'desktop' | 'tablet';

  studyLevel?: 'beginner' | 'intermediate' | 'advanced';

  theme?: 'light' | 'dark' | 'auto';

}



export function UniversalChatWithFeatureFlags({

  className = '',

  initialStudyContext,

  userId,

}: UniversalChatWithFeatureFlagsProps) {

  const {

    messages,

    isLoading,

    preferences,

    studyContext,

    handleSendMessage,

    savePreferences,

  } = useStudyBuddy();



  return (

    <div className={cn('space-y-4', className)}>

      <div className="min-h-[600px]">

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

  );

}



export default UniversalChatWithFeatureFlags;