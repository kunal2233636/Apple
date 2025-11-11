'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, Flame, History, Lightbulb, Plus, Trash2, BarChart2, Trophy, Play, BrainCircuit, Sparkles } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import { AddBlockModal } from '@/components/modals/add-block-modal';
import type { Subject, Chapter } from '../topics/page';
import type { PomodoroTemplate, Block } from '../schedule/page';
import { format, startOfToday } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { GamificationCard } from '@/components/gamification/GamificationCard';
import { calculateAndApplyTimeAdjustment, formatDelay, formatPenalty } from '@/lib/gamification/time-adjustment-service';
import { AISuggestionsDashboard } from '@/components/ai/AISuggestionsDashboard';
import AIFeaturesDashboard from '@/components/ai/AIFeaturesDashboard';
import MLStudyInsights from '@/components/ai/MLStudyInsights';
import { SimpleAnalyticsDashboard } from '@/components/ai/EnhancedAnalytics';

interface TimeAdjustmentNotification {
  show: boolean;
  delayFormatted: string;
  penaltyFormatted: string;
  adjusted: boolean;
}

// Mock data for revision queue
const mockRevisionQueue = [
    { topic: { id: 101, name: 'Projectile Motion' } },
    { topic: { id: 102, name: 'SN1 vs SN2 Reactions' } },
    { topic: { id: 105, name: 'Limits and Continuity' } },
];

const typeColors: { [key: string]: string } = {
  Study: 'bg-primary/20 text-primary-foreground border-primary/30',
  Question: 'bg-accent/20 text-accent-foreground border-accent/30',
  Revision: 'bg-warning/20 text-yellow-800 dark:text-yellow-200 border-warning/30',
};
const typeHoverColors: { [key: string]: string } = {
  Study: 'hover:bg-primary/30',
  Question: 'hover:bg-accent/30',
  Revision: 'hover:bg-warning/30',
};

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timeAdjustmentNotification, setTimeAdjustmentNotification] = useState<TimeAdjustmentNotification>({
    show: false,
    delayFormatted: '',
    penaltyFormatted: '',
    adjusted: false
  });

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [pomodoroTemplates, setPomodoroTemplates] = useState<PomodoroTemplate[]>([]);

  const [todaySchedule, setTodaySchedule] = useState<Block[]>([]);
  const [completedSessions, setCompletedSessions] = useState<string[]>([]);

  const fetchDashboardData = useCallback(async (userId: string) => {
    setLoading(true);
    const today = format(startOfToday(), 'yyyy-MM-dd');

    // Fetch today's blocks and completed sessions in parallel
    const [
        { data: todayData, error: todayError },
        { data: sessionsData, error: sessionsError },
    ] = await Promise.all([
        supabaseBrowserClient.from('blocks').select('*').eq('user_id', userId).eq('date', today).order('start_time'),
        supabaseBrowserClient.from('sessions').select('block_id').eq('user_id', userId),
    ]);
    
    if (todayError) {
      toast({ variant: 'destructive', title: 'Error fetching today\'s schedule', description: todayError.message });
    } else {
        const todayBlocks = todayData || [];
        setTodaySchedule(todayBlocks);
        
        const completedIds = new Set((sessionsData || []).map((s: any) => s.block_id));
        setCompletedSessions(Array.from(completedIds));
    }
    
    if (sessionsError) {
      toast({ variant: 'destructive', title: 'Error fetching session data', description: sessionsError.message });
    }

    setLoading(false);
  }, [toast]);

  const fetchModalData = useCallback(async (userId: string) => {
    if (!userId) return;
    const [
      { data: subjectsData, error: subjectsError },
      { data: chaptersData, error: chaptersError },
      { data: templatesData, error: templatesError }
    ] = await Promise.all([
      supabaseBrowserClient.from('subjects').select('*').eq('user_id', userId),
      supabaseBrowserClient.from('chapters').select('*').eq('user_id', userId),
      supabaseBrowserClient.from('pomodoro_templates').select('*').or(`is_default.eq.true,user_id.eq.${userId}`),
    ]);

    if (subjectsError) {
      toast({ variant: "destructive", title: "Error fetching subjects", description: subjectsError.message });
    } else {
      setSubjects(subjectsData || []);
    }
    
    if (chaptersError) {
      toast({ variant: 'destructive', title: 'Error fetching chapters', description: chaptersError.message });
    } else {
      setChapters(chaptersData || []);
    }

    if (templatesError) {
      toast({ variant: "destructive", title: "Error fetching templates", description: templatesError.message });
    } else {
      setPomodoroTemplates(templatesData || []);
    }
  }, [toast]);

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/auth');
      } else {
        setUser(currentUser);
        fetchDashboardData(currentUser.id);
        fetchModalData(currentUser.id);
      }
    };
    checkUser();
  }, [router, fetchModalData, fetchDashboardData]);
  
  const handleBlockSaved = useCallback(() => {
    setIsModalOpen(false);
    toast({ title: "Block added successfully!", description: "You can view it on your schedule." });
    if (user) {
        fetchDashboardData(user.id);
    }
  }, [user, fetchDashboardData, toast]);

  const hasItemsInRevisionQueue = useMemo(() => mockRevisionQueue.length > 0, []);

  const onBlockStart = async (blockId: string) => {
    const block = todaySchedule.find(b => b.id === blockId);
    if (!block || !user) return;

    try {
      // Apply time adjustment with penalty if late
      const adjustmentResult = await calculateAndApplyTimeAdjustment(
        user.id,
        blockId,
        block.start_time
      );

      // Show notification for time adjustment
      if (adjustmentResult.adjusted && adjustmentResult.delaySeconds > 0) {
        setTimeAdjustmentNotification({
          show: true,
          delayFormatted: formatDelay(adjustmentResult.delaySeconds),
          penaltyFormatted: formatPenalty(adjustmentResult.penaltyPoints || 0),
          adjusted: adjustmentResult.adjusted
        });

        // Auto-hide notification after 5 seconds
        setTimeout(() => {
          setTimeAdjustmentNotification({ show: false, delayFormatted: '', penaltyFormatted: '', adjusted: false });
        }, 5000);
      }

      // Navigate to session
      router.push(`/session/${blockId}`);
    } catch (error) {
      console.error('Error starting block:', error);
      toast({ variant: 'destructive', title: 'Error starting block', description: 'Please try again.' });
    }
  };

  const handleDelete = useCallback(async (blockId: string) => {
    if (!user) return;

    // First delete associated feedback to avoid foreign key constraint errors
    const { error: feedbackError } = await supabaseBrowserClient
      .from('feedback')
      .delete()
      .eq('block_id', blockId);

    if (feedbackError) {
      toast({
        variant: "destructive",
        title: "Cleanup Failed",
        description: `Could not delete associated feedback: ${feedbackError.message}`,
      });
      return;
    }
    
    // Then delete the block itself
    const { error: blockError } = await supabaseBrowserClient
      .from('blocks')
      .delete()
      .eq('id', blockId);

    if (blockError) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: blockError.message,
      });
    } else {
      toast({
        title: "Block deleted successfully",
      });
      fetchDashboardData(user.id);
    }
  }, [user, toast, fetchDashboardData]);

  if (loading || !user) {
    return <div>Loading...</div>;
  }

  return (
    <>
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <CardTitle>Welcome back, {user?.email?.split('@')[0] || 'Student'}!</CardTitle>
                <CardDescription>Here's your overview for today. Stay focused and keep learning.</CardDescription>
            </CardHeader>
        </Card>

        {/* AI Suggestions Dashboard - Highly visible section */}
        <AISuggestionsDashboard
            userId={user?.id}
            showHeader={true}
            compact={false}
        />

        {/* Additional AI Components */}
        <div className="grid gap-6 lg:grid-cols-2">
            <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => router.push('/study-buddy')}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <BrainCircuit className="h-5 w-5 text-primary" />
                        Study Buddy
                    </CardTitle>
                    <CardDescription>AI-powered study assistant with memory and personalization.</CardDescription>
                </CardHeader>
            </Card>
            <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => router.push('/suggestions')}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI Features
                    </CardTitle>
                    <CardDescription>Manage and monitor all AI-powered study features.</CardDescription>
                </CardHeader>
            </Card>
        </div>

        {/* Study Insights Dashboard */}
        <MLStudyInsights runSignal={0} />

        {/* Analytics Dashboard */}
        <EnhancedAnalyticsDashboard />

        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
                <GamificationCard />
                 <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => router.push('/daily-summary')}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <BarChart2 className="h-5 w-5 text-primary" />
                            Daily Summary
                        </CardTitle>
                        <CardDescription>View a detailed breakdown of your activity for today.</CardDescription>
                    </CardHeader>
                </Card>
                 <Card className="cursor-pointer hover:border-primary/50 transition-all" onClick={() => router.push('/achievements')}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Trophy className="h-5 w-5 text-primary" />
                            Achievements
                        </CardTitle>
                        <CardDescription>View your unlocked achievements and progress towards the next ones.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-medium">Study Hours Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">3.5h</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-medium">Blocks Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-4xl font-bold">{completedSessions.length}/{todaySchedule.length}</p>
                    </CardContent>
                </Card>
            </div>
        </div>

        {todaySchedule.length > 0 && (
            <Card>
                <CardHeader>
                    <CardTitle>Today's Plan</CardTitle>
                    <CardDescription>Here are the blocks you have scheduled for today.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {todaySchedule.map(block => (
                        <div 
                            key={block.id} 
                            className={cn(
                                "flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-lg border p-4 transition-colors group", 
                                !completedSessions.includes(block.id) && "cursor-pointer",
                                typeHoverColors[block.type],
                                completedSessions.includes(block.id) ? "bg-muted/50 border-dashed" : "bg-card"
                            )} 
                            onClick={() => !completedSessions.includes(block.id) && onBlockStart(block.id)}
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0 mt-1 sm:mt-0">
                                {completedSessions.includes(block.id) ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Clock className="h-5 w-5 text-primary" />}
                            </div>
                            <div className="flex-1">
                                <div className='flex items-center gap-2 flex-wrap'>
                                    <p className={cn("font-semibold", completedSessions.includes(block.id) && "line-through text-muted-foreground")}>{block.subject || 'Task'}</p>
                                    <Badge className={cn(typeColors[block.type], completedSessions.includes(block.id) && "opacity-60")}>{block.type}</Badge>
                                </div>
                                <p className={cn("text-sm mt-1", completedSessions.includes(block.id) ? "text-muted-foreground" : "text-foreground/80")}>
                                    {block.start_time}
                                </p>
                            </div>
                            {!completedSessions.includes(block.id) ? (
                                <div className="flex items-center gap-1 self-center sm:self-auto">
                                    <Button 
                                        size="sm" 
                                        onClick={(e) => { e.stopPropagation(); onBlockStart(block.id); }} 
                                        className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-medium px-6 py-2 rounded-lg transition-all duration-200"
                                    >
                                        <Play className="h-4 w-4 mr-2" />
                                        Start Block
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                <Trash2 className="h-4 w-4 text-destructive/80" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete This Block?</AlertDialogTitle>
                                                <AlertDialogDescription>This action will permanently remove this scheduled block. This cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(block.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            ) : null}
                        </div>
                    ))}
                </CardContent>
            </Card>
        )}
      
      {hasItemsInRevisionQueue && <EveningRevisionCard />}
      
      {!hasItemsInRevisionQueue && <RevisionRecommendationsCard />}
      
    </div>

    {/* Time Adjustment Notification */}
    {timeAdjustmentNotification.show && (
        <div className="fixed top-4 right-4 z-50 bg-orange-100 dark:bg-orange-900 border border-orange-300 dark:border-orange-700 rounded-lg p-4 shadow-lg max-w-sm">
            <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div>
                    <p className="font-medium text-orange-800 dark:text-orange-200">Started Late</p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                        {timeAdjustmentNotification.delayFormatted} late. {timeAdjustmentNotification.penaltyFormatted} deducted.
                    </p>
                </div>
            </div>
        </div>
    )}

    <Button 
        className="fixed bottom-20 right-4 z-20 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8" 
        aria-label="Add Block"
        onClick={() => setIsModalOpen(true)}
      >
        <Plus className="h-8 w-8" />
      </Button>

      <AddBlockModal 
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedDate={new Date()}
        user={user}
        onBlockSaved={handleBlockSaved}
        subjects={subjects}
        chapters={chapters}
        pomodoroTemplates={pomodoroTemplates}
        activeBlockExistsForDate={todaySchedule.length > 0}
      />
    </>
  );
}

function EveningRevisionCard() {
    const router = useRouter();
    const revisionCount = useMemo(() => mockRevisionQueue.length, []);

    if (revisionCount === 0) return null;

    return (
        <Card className="bg-gradient-to-br from-blue-50 via-purple-50 to-blue-100 dark:from-blue-900/50 dark:via-purple-900/50 dark:to-blue-900/60 border-primary/20">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>Evening Revision</CardTitle>
                    <Badge className="bg-background">
                        <History className="mr-2 h-4 w-4 text-primary"/>
                        {revisionCount} Topics
                    </Badge>
                </div>
                <CardDescription>Time to reinforce what you've learned. Let's tackle your revision queue.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button className="w-full" onClick={() => router.push('/revision')}>
                    <Flame className="mr-2 h-4 w-4" /> Start Quick Revision
                </Button>
            </CardContent>
        </Card>
    )
}

function RevisionRecommendationsCard() {
    const router = useRouter();
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-6 w-6 text-yellow-400" />
                    <span>Time to Revise?</span>
                </CardTitle>
                <CardDescription>Review your topics regularly for better retention.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button className="w-full" onClick={() => router.push('/revision')}>
                    <History className="mr-2 h-4 w-4" /> Go to Revision
                </Button>
            </CardContent>
        </Card>
    );
}
