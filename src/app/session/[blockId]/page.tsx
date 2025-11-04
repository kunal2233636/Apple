
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabaseBrowserClient, getCurrentUser } from '@/lib/supabase';
import type { Block, PomodoroTemplate } from '@/app/(app)/schedule/page';
import type { Subject, Chapter, Topic } from '@/app/(app)/topics/page';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Book, Zap, Brain, SkipForward, Coffee, PartyPopper, Square, Home, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@supabase/supabase-js';


type Session = { type: 'study' | 'break'; duration: number };

export type SessionBlock = Block & {
  subjects: Subject[];
  chapters: Chapter[];
  pomodoro_template: PomodoroTemplate | null;
};

// Session insert type matching database schema
type SessionInsert = {
  block_id: string;
  user_id: string;
  started_at?: string;
  ended_at?: string | null;
  status?: 'active' | 'completed' | 'paused';
  duration_minutes?: number | null;
  session_type?: 'study' | 'break';
};

type SessionPhase = 'active' | 'break' | 'completed';

const blockTypeDetails: {
  [key: string]: { icon: React.ElementType; className: string; timerColor: string };
} = {
  Study: { icon: Book, className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800', timerColor: 'text-blue-500' },
  Question: { icon: Zap, className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800', timerColor: 'text-green-500' },
  Revision: { icon: Brain, className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800', timerColor: 'text-orange-500' },
};

function isValidUUID(uuid: string | null | undefined): uuid is string {
    if (!uuid) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

const formatBreakBank = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

function SessionPageContent() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const blockId = params.blockId as string;

  const [block, setBlock] = useState<SessionBlock | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [blockExists, setBlockExists] = useState<boolean>(true);
  const [isValidatingBlock, setIsValidatingBlock] = useState(false);

  // Timer State
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('active');
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [totalStudyTime, setTotalStudyTime] = useState(0);
  
  const [completedSessionsCount, setCompletedSessionsCount] = useState(0);
  const [breakBank, setBreakBank] = useState(0); // Store total seconds
  const [canEndEarly, setCanEndEarly] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);


  const handleBlockCompletion = useCallback(async () => {
    setIsRunning(false);
    setSessionPhase('completed');
    
    if (user && block) {
      setIsCompleting(true);
      try {
        const { data, error } = await (supabaseBrowserClient.from('sessions') as any).insert({
          user_id: user.id,
          block_id: block.id,
          status: 'completed',
          duration_minutes: Math.round(totalStudyTime / 60),
          session_type: 'study'
        }).select().single();

        if (error) {
          throw error;
        }
        
        toast({ title: "Session Completed!", description: "Let's review what you covered." });

      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error saving session', description: error.message });
      } finally {
        setIsCompleting(false);
        // Redirect to feedback page after a short delay
        setTimeout(() => {
            router.push(`/feedback/${blockId}`);
        }, 1500);
      }
    } else {
        // Redirect even if something is wrong
        setTimeout(() => {
            router.push(`/feedback/${blockId}`);
        }, 1500);
    }
  }, [user, block, toast, totalStudyTime, router, blockId]);


  const currentSession = useMemo(() => sessions[currentSessionIndex], [sessions, currentSessionIndex]);

  const handleNextSession = useCallback(() => {
    if (!block) return;
    
    const nextIndex = currentSessionIndex + 1;
    
    if (nextIndex >= sessions.length) {
      handleBlockCompletion();
      return;
    }
    
    const nextSession = sessions[nextIndex];
    setCurrentSessionIndex(nextIndex);
    setTimeRemaining(nextSession.duration * 60);
    setSessionPhase(nextSession.type === 'study' ? 'active' : 'break');

    toast({ title: "Phase Complete!", description: `Starting next phase: ${nextSession.type}`, duration: 2000 });
    
    setTimeout(() => setIsRunning(true), 2000);
  }, [block, sessions, currentSessionIndex, toast, handleBlockCompletion]);

  const handleSkipBreak = useCallback(() => {
    const remainingSeconds = timeRemaining;
    
    setBreakBank(prev => {
        const newBank = prev + remainingSeconds;
        console.log(`[Break Bank] Updated: ${formatBreakBank(newBank)} (added ${formatBreakBank(remainingSeconds)})`);
        return newBank;
    });
    
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    
    toast({
      title: "Break Skipped! ⏭️",
      description: `Added ${mins}m ${secs}s to your Break Bank`,
    });
    
    handleNextSession();
  }, [timeRemaining, toast, handleNextSession]);

  const transitionToBreak = useCallback(() => {
    const lastStudySession = currentSession;
    if (!lastStudySession || lastStudySession.type !== 'study') return;
    
    setSessionPhase('break');
    handleNextSession();
  }, [currentSession, handleNextSession]);

  const handleEndBlockEarly = useCallback(async () => {
    if (timeRemaining > breakBank) {
      toast({
        title: "Cannot End Early",
        description: "Not enough Break Bank credit available",
        variant: "destructive"
      });
      return;
    }
    console.log(`[Early End] Triggered. Using ${formatBreakBank(timeRemaining)} from bank of ${formatBreakBank(breakBank)}.`);
    await handleBlockCompletion();
  }, [timeRemaining, breakBank, handleBlockCompletion, toast]);

  // Function to validate block exists
  const validateBlockExists = useCallback(async () => {
    if (!user || !blockId || isValidatingBlock) return;
    
    setIsValidatingBlock(true);
    try {
      const { data: blockData, error } = await supabaseBrowserClient
        .from('blocks')
        .select('id')
        .eq('id', blockId)
        .maybeSingle();

      if (error) {
        console.warn('Error validating block:', error);
        return;
      }

      if (!blockData) {
        console.log('Block no longer exists, stopping session');
        setBlockExists(false);
        setIsRunning(false);
        toast({
          variant: 'destructive',
          title: 'Block Deleted',
          description: 'The study block has been deleted. Redirecting to dashboard...'
        });
        
        // Redirect after showing the error message
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
        return;
      }

      setBlockExists(true);
    } catch (error) {
      console.warn('Block validation failed:', error);
    } finally {
      setIsValidatingBlock(false);
    }
  }, [user, blockId, isValidatingBlock, router, toast]);


  // Fetch block data
  useEffect(() => {
    const checkUserAndFetchData = async () => {
      setIsLoading(true);

      if (!isValidUUID(blockId)) {
          toast({ variant: 'destructive', title: 'Error', description: 'No valid block ID provided.' });
          router.push('/dashboard');
          return;
      }
      
      const currentUser = await getCurrentUser();
      if (!currentUser) {
          router.push('/auth');
          return;
      }
      setUser(currentUser);

      try {
          const { data: blockData, error: blockError } = await (supabaseBrowserClient as any)
              .from('blocks')
              .select('*')
              .eq('id', blockId)
              .maybeSingle();

          if (blockError) {
              console.error('Error fetching block:', JSON.stringify(blockError, null, 2));
              throw new Error(blockError.message || 'Could not fetch block data.');
          }
          if (!blockData) {
              toast({ variant: 'destructive', title: 'Block Not Found', description: 'The requested study block could not be found.' });
              router.push('/dashboard');
              return;
          }
          if ((blockData as any).user_id !== currentUser.id) {
              throw new Error('You are not authorized to view this session.');
          }
          
          const { data: existingSession } = await supabaseBrowserClient
            .from('sessions')
            .select('id')
            .eq('block_id', blockId)
            .eq('user_id', currentUser.id)
            .maybeSingle();

          if (existingSession) {
            toast({ title: 'Session Already Completed', description: 'This study session has already been completed.' });
            router.push('/dashboard');
            return;
          }

          let subjects: Subject[] = [];
          if (blockData.subjects && blockData.subjects.length > 0 && blockData.subjects.every((id: any) => id !== null)) {
              const { data: subjectsData, error: subjectsError } = await supabaseBrowserClient
                  .from('subjects')
                  .select('*')
                  .in('id', blockData.subjects.filter((id: any) => id !== null));
              if (subjectsError) {
                console.warn('Could not fetch subjects:', subjectsError.message);
                subjects = [];
              } else {
                subjects = subjectsData || [];
              }
          }

          let chapters: Chapter[] = [];
          if (blockData.chapters && blockData.chapters.length > 0 && blockData.chapters.every((id: any) => id !== null)) {
              const { data: chaptersData, error: chaptersError } = await supabaseBrowserClient
                  .from('chapters')
                  .select('*')
                  .in('id', blockData.chapters.filter((id: any) => id !== null));
              if (chaptersError) {
                console.warn('Could not fetch chapters:', chaptersError.message);
                chapters = [];
              } else {
                chapters = chaptersData || [];
              }
          }

          let pomodoroTemplate: PomodoroTemplate | null = null;
          if (isValidUUID(blockData.template_id)) {
              const { data: templateData, error: templateError } = await supabaseBrowserClient
                  .from('pomodoro_templates')
                  .select('*')
                  .eq('id', blockData.template_id)
                  .maybeSingle();
              if (templateError) {
                console.warn('Could not fetch pomodoro template:', templateError.message);
              } else {
                pomodoroTemplate = templateData as PomodoroTemplate;
              }
          }
          
          const formattedData: SessionBlock = {
              ...(blockData as Block),
              subjects,
              chapters,
              pomodoro_template: pomodoroTemplate,
          };

          setBlock(formattedData);
          setBlockExists(true);
      
          if (formattedData.type === 'Study' && pomodoroTemplate?.sessions_json) {
              const templateSessions = pomodoroTemplate.sessions_json;

              const orderedSessions: Session[] = [];
              if (templateSessions.length > 0) {
                  // Ensure the first session is always a study session
                  const firstSessionIndex = templateSessions.findIndex(s => s.type === 'study');
                  
                  if (firstSessionIndex !== -1) {
                      // Start with the first study session and alternate
                      const studySessions = templateSessions.filter(s => s.type === 'study');
                      const breakSessions = templateSessions.filter(s => s.type === 'break');

                      let studyIndex = 0;
                      let breakIndex = 0;
                      
                      orderedSessions.push(studySessions[studyIndex++]);

                      while (studyIndex < studySessions.length) {
                          if (breakIndex < breakSessions.length) {
                              orderedSessions.push(breakSessions[breakIndex++]);
                          }
                          orderedSessions.push(studySessions[studyIndex++]);
                      }

                  } else {
                      // Fallback: if no study sessions, use total duration as one study block
                      const totalDuration = templateSessions.reduce((acc, s) => acc + s.duration, 0);
                      orderedSessions.push({ type: 'study', duration: totalDuration > 0 ? totalDuration : formattedData.duration });
                  }
              }

              if (orderedSessions.length === 0) {
                 orderedSessions.push({ type: 'study', duration: formattedData.duration });
              }

              setSessions(orderedSessions);
              setTimeRemaining(orderedSessions[0].duration * 60);

          } else {
              const singleSession = [{ type: 'study' as const, duration: formattedData.duration }];
              setSessions(singleSession);
              setTimeRemaining(formattedData.duration * 60);
          }
          
          // Start the timer only if block still exists
          setTimeout(() => {
            validateBlockExists().then(() => {
              if (blockExists) {
                setIsRunning(true);
              }
            });
          }, 1500);

      } catch (err: any) {
          console.error('Detailed error in session page:', err);
          toast({ variant: 'destructive', title: 'Error Loading Session', description: err.message || 'An unexpected error occurred.' });
          router.push('/dashboard');
      } finally {
          setIsLoading(false);
      }
    };

    checkUserAndFetchData();
  }, [blockId, router, toast]);

  // Check if user can end block early
  useEffect(() => {
    if (!currentSession) return;
    const isLastSession = currentSessionIndex === sessions.length - 1;
    const isStudySession = currentSession.type === 'study';
    
    const canEnd = isLastSession && isStudySession && breakBank > 0 && timeRemaining <= breakBank;

    if (canEnd !== canEndEarly) {
        console.log(`[Early End] Eligibility changed to: ${canEnd}`);
        setCanEndEarly(canEnd);
    }
  }, [timeRemaining, breakBank, currentSessionIndex, sessions, currentSession, canEndEarly]);

  // Periodic block validation effect
  useEffect(() => {
    if (!user || !blockId || !blockExists) return;

    const interval = setInterval(() => {
      validateBlockExists();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [user, blockId, blockExists, validateBlockExists]);

  // Countdown logic with block existence check
  useEffect(() => {
    if (!isRunning || !['active', 'break'].includes(sessionPhase) || !blockExists) return;

    if (timeRemaining <= 0) {
      setIsRunning(false);
      if (sessionPhase === 'active') {
        setCompletedSessionsCount(prev => prev + 1);
        transitionToBreak();
      } else { // break ended
        toast({ title: 'Break over!', description: 'Next session starting soon...' });
        setTimeout(() => handleNextSession(), 2000);
      }
      return;
    }
  
    const interval = setInterval(() => {
      setTimeRemaining(prev => prev - 1);
      if (sessionPhase === 'active') {
        setTotalStudyTime(prev => prev + 1);
      }
    }, 1000);
  
    return () => clearInterval(interval);
  }, [isRunning, timeRemaining, sessionPhase, handleNextSession, transitionToBreak, toast, blockExists]);


  const currentPhaseText = useMemo(() => {
    if (!block || !currentSession) return 'Session';
    if (block.type !== 'Study' || sessions.length <= 1) return 'Continuous Session';
    
    if (currentSession.type === 'break') return 'Break Time';

    const studySessions = sessions.filter(s => s.type === 'study');
    const studySessionCount = sessions.slice(0, currentSessionIndex + 1).filter(s => s.type === 'study').length;

    return `Study Session ${studySessionCount} of ${studySessions.length}`;
  }, [block, sessions, currentSession, currentSessionIndex]);
  
  const timerDisplay = useMemo(() => {
    const totalSeconds = timeRemaining;
    if (totalSeconds >= 3600) {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
  }, [timeRemaining]);
  
  const sessionProgress = useMemo(() => {
      if (!currentSession) return 0;
      
      const sessionDuration = currentSession.duration * 60;
      if (!sessionDuration || sessionDuration === 0) return 100;
      
      const timeElapsed = sessionDuration - timeRemaining;

      return (timeElapsed / sessionDuration) * 100;
  }, [timeRemaining, currentSession]);

  const timerColorClass = useMemo(() => {
    if (sessionPhase === 'break') return 'text-green-500';
    return blockTypeDetails[block?.type as string]?.timerColor || 'text-primary';
  }, [block, sessionPhase]);

  const progressRingColorClass = useMemo(() => {
    if (sessionPhase === 'break') return '[&>div]:bg-green-500';
    return '[&>div]:bg-primary';
  }, [sessionPhase]);


  if (isLoading || !block || !currentSession || !user) {
    return (
      <div className="flex flex-col h-screen w-full bg-background p-4 sm:p-6 md:p-8">
        <Skeleton className="h-8 w-1/4 mb-4" />
        <Skeleton className="h-4 w-1/2 mb-8" />
        <div className="flex-1 flex flex-col items-center justify-center text-center">
            <Skeleton className="h-72 w-72 md:h-96 md:w-96 rounded-full" />
            <Skeleton className="h-6 w-48 mt-4" />
            <Skeleton className="h-4 w-32 mt-2" />
        </div>
        <div className="flex justify-center gap-4 mt-8">
            <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
      </div>
    );
  }

  if (sessionPhase === 'completed') {
    return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
            <PartyPopper className="h-16 w-16 text-green-500" />
            <h2 className="text-2xl font-bold">Session Complete!</h2>
            <p className="text-muted-foreground">Redirecting to feedback form...</p>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }
  
  if (sessionPhase === 'break') {
    return (
      <div className={cn("relative flex flex-col h-screen w-full p-4 sm:p-6 md:p-8", "bg-green-50 dark:bg-green-900/20")}>
        <header className="flex justify-between items-center w-full">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={cn("font-semibold bg-white", "text-green-600")}>
                  <Coffee className="h-4 w-4 mr-2" />
                  Break Time
              </Badge>
            </div>
          </header>
        
          {/* Break Bank Balance Display */}
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-secondary/50 backdrop-blur-sm px-3 py-2 rounded-full">
            <Coffee className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              Bank: {formatBreakBank(breakBank)}
            </span>
          </div>

          <main className="flex-1 flex flex-col items-center justify-center text-center">
             <div className="relative flex items-center justify-center w-72 h-72 md:w-80 md:h-80">
                <Progress value={sessionProgress} className={cn("absolute h-full w-full rounded-full bg-black/5", "[&>div]:bg-green-500")} />
                <div className="absolute rounded-full w-[90%] h-[90%] bg-background/80 backdrop-blur-xl"></div>
                <div className={cn("font-mono font-bold text-7xl md:text-8xl leading-none z-10", "text-green-500")}>
                    {timerDisplay}
                </div>
            </div>
            <p className={cn("mt-6 text-xl md:text-2xl font-semibold tracking-tight", "text-green-800 dark:text-green-200")}>Time to recharge!</p>
            {currentSession.type === 'break' && (
              <div className="mt-8 flex flex-col gap-4 w-full max-w-md">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleSkipBreak}
                  className="w-full"
                >
                  <SkipForward className="mr-2 h-5 w-5" />
                  Skip Break & Add to Bank
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  This break will be saved for later use
                </p>
              </div>
            )}
          </main>

          <footer className="w-full h-16">
            {/* Footer content if any */}
          </footer>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-screen w-full bg-background p-4 sm:p-6 md:p-8">
        <header className="flex justify-between items-center w-full">
            <div className='flex items-center gap-3'>
                <p className="font-semibold text-lg">{currentPhaseText}</p>
            </div>
             <div className="flex items-center gap-4">
                {block.subjects.length > 0 && (
                    <div className="hidden sm:flex flex-wrap items-center gap-2">
                        <p className='text-sm text-muted-foreground'>Studying:</p>
                        {block.subjects.filter((s): s is Subject => typeof s === 'object' && s !== null && 'id' in s && 'name' in s).map(s => (
                            <Badge key={s.id} variant="secondary" style={{ backgroundColor: `${s.color || '#666'}20`, color: s.color || '#666', borderColor: `${s.color || '#666'}40` }}>{s.name}</Badge>
                        ))}
                    </div>
                )}
            </div>
        </header>

        {/* Break Bank Balance Display */}
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-secondary/50 backdrop-blur-sm px-3 py-2 rounded-full">
            <Coffee className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              Bank: {formatBreakBank(breakBank)}
            </span>
        </div>
      
      <main className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="relative flex items-center justify-center w-72 h-72 md:w-80 md:h-80">
            <Progress value={sessionProgress} className={cn("absolute h-full w-full rounded-full bg-black/5", progressRingColorClass)} />
            <div className="absolute rounded-full w-[90%] h-[90%] bg-background/80 backdrop-blur-xl"></div>
            <div className={cn("font-mono font-bold text-7xl md:text-8xl leading-none z-10", timerColorClass)}>
                {timerDisplay}
            </div>
        </div>

        <p className="mt-6 text-xl md:text-2xl font-semibold tracking-tight">
            {currentSession.type === 'break' ? 'Taking a Break' : `Studying ${block.subjects.filter((s): s is Subject => typeof s === 'object' && s !== null && 'name' in s).map(s => s.name).join(', ')}`}
        </p>
        <p className="text-muted-foreground">
            {block.chapters.filter((c): c is Chapter => typeof c === 'object' && c !== null && 'name' in c).map(c => c.name).join(', ')}
        </p>

        {currentSessionIndex === sessions.length - 1 && currentSession.type === 'study' && (
          <Badge variant="secondary" className="mt-2">
            Last Session
            {breakBank > 0 && timeRemaining <= breakBank && (
              <span className="ml-2 text-green-600">• Early Exit Available</span>
            )}
          </Badge>
        )}

      </main>

      <footer className="w-full flex items-center justify-center p-4">
        {canEndEarly && (
          <div className="flex flex-col gap-3 w-full max-w-md">
            <Button
              variant="destructive"
              size="lg"
              onClick={handleEndBlockEarly}
              disabled={isCompleting}
              className="w-full"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing...
                </>
              ) : (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  End Block Early
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Will use {formatBreakBank(timeRemaining)} from your Break Bank
            </p>
            <p className="text-xs text-center text-muted-foreground font-semibold">
              Remaining after: {formatBreakBank(breakBank - timeRemaining)}
            </p>
          </div>
        )}
      </footer>
    </div>
  );
}


export default function SessionPage() {
    return (
        <React.Suspense fallback={
            <div className="flex flex-col h-screen w-full bg-background p-4 sm:p-6 md:p-8">
                <Skeleton className="h-8 w-1/4 mb-4" />
                <Skeleton className="h-4 w-1/2 mb-8" />
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <Skeleton className="h-72 w-72 md:h-96 md:w-96 rounded-full" />
                    <Skeleton className="h-6 w-48 mt-4" />
                    <Skeleton className="h-4 w-32 mt-2" />
                </div>
                <div className="flex justify-center gap-4 mt-8">
                    <Skeleton className="h-10 w-40 rounded-lg" />
                </div>
            </div>
        }>
            <SessionPageContent />
        </React.Suspense>
    )
}
