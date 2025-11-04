import { Metadata } from 'next';
import { GeneralChat } from '@/components/chat/general-chat';

export const metadata: Metadata = {
  title: 'General Chat - Ask Anything',
  description: 'Chat with AI to ask general study questions and get instant help',
};

// Protected route - redirect to login if not authenticated
export default function GeneralChatPage() {
  return <GeneralChat />;
}