
'use client';

import AppSidebarContent from '@/components/layout/app-sidebar-content';
import BottomNav from '@/components/layout/bottom-nav';
import MobileHeader from '@/components/layout/mobile-header';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Types for API test results
type TestResult = {
  provider: string;
  model?: string;
  success: boolean;
  responseTime: number;
  error?: string;
  details?: string;
};

// Mock API test function for client-side startup testing
const testAPIProviders = async (): Promise<TestResult[]> => {
  // Simulate API test with some failures to show the warning
  const mockResults: TestResult[] = [
    {
      provider: 'Groq',
      model: 'Llama 3.3 70B',
      success: true,
      responseTime: 258,
      details: 'Main high-quality model'
    },
    {
      provider: 'Groq',
      model: 'Llama 3.1 8B Instant',
      success: true,
      responseTime: 197,
      details: 'Fastest, cheapest model for general queries'
    },
    {
      provider: 'Groq',
      model: 'Qwen-3 32B',
      success: false,
      responseTime: 128,
      error: 'HTTP 400: Bad Request'
    },
    {
      provider: 'Gemini',
      model: 'Gemini 2.0 Flash Lite',
      success: true,
      responseTime: 906,
      details: 'Time-sensitive queries with web search'
    },
    {
      provider: 'Cerebras',
      model: 'Cerebras Llama-3.3-70B',
      success: true,
      responseTime: 479,
      details: 'Ultra-fast Tier 3 fallback'
    },
    {
      provider: 'Cohere',
      model: 'Cohere Embeddings',
      success: false,
      responseTime: 216,
      error: 'HTTP 400: Bad Request'
    },
    {
      provider: 'OpenRouter',
      model: 'OpenRouter GPT-3.5 Turbo',
      success: false,
      responseTime: 709,
      error: 'HTTP 401: Unauthorized'
    }
  ];
  
  // Add realistic delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return mockResults;
};


function AppContent({ children }: { children: React.ReactNode }) {
    
    return (
        <div className={cn(
            "flex w-full flex-col"
        )}>
            <MobileHeader />
            <SidebarInset>
            {/* Padding for content area, considering mobile header and nav */}
            <div className={cn(
                "p-4 pb-24 pt-20 md:p-6 md:pb-6 md:pt-6"
            )}>
                {children}
            </div>
            </SidebarInset>
        </div>
    )
}

function APIProviderWarning({ onDismiss }: { onDismiss: () => void }) {
  const [isVisible, setIsVisible] = useState(true);
  
  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <Alert variant="destructive" className="mx-4 mt-4 md:mx-6 md:mt-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong>Warning:</strong> Some API providers failed connection tests. AI features may be limited.
          <span className="block text-xs mt-1">
            Check <a href="/settings" className="underline hover:no-underline">Settings &gt; API Providers</a> for details.
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="h-6 w-6 p-0 hover:bg-red-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showAPIWarning, setShowAPIWarning] = useState(true);
  const [apiTested, setAPITested] = useState(false);

  // Do not show the main app layout on the session page
  if (pathname.startsWith('/session/')) {
    return <>{children}</>;
  }

  // Run API tests on app startup (only once)
  useEffect(() => {
    const runStartupTests = async () => {
      if (apiTested) return;
      
      try {
        const results = await testAPIProviders();
        const hasFailures = results.some(r => !r.success);
        
        // Show warning if there are any failures, but don't block the app
        if (hasFailures) {
          setShowAPIWarning(true);
        } else {
          setShowAPIWarning(false);
        }
      } catch (error) {
        console.warn('API startup test failed:', error);
        // Show warning on test error
        setShowAPIWarning(true);
      } finally {
        setAPITested(true);
      }
    };

    // Delay startup tests slightly to not block initial rendering
    const timer = setTimeout(runStartupTests, 500);
    return () => clearTimeout(timer);
  }, [apiTested]);

  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen">
        <Sidebar>
          <AppSidebarContent />
        </Sidebar>
        <AppContent>
          {showAPIWarning && (
            <APIProviderWarning onDismiss={() => setShowAPIWarning(false)} />
          )}
          {children}
        </AppContent>
      </div>
      <BottomNav />
    </SidebarProvider>
  );
}
