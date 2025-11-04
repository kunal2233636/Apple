

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import { format, parseISO, addDays, startOfToday, differenceInDays } from 'date-fns';
import { Clock, TrendingUp, Calendar, CheckCircle2, PartyPopper, Plus, History, BrainCircuit, Loader2, RotateCcw, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';
import type { Chapter, Subject } from '../topics/page';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Profile, SpareIntervals } from '../settings/page';
import { AddSpareTopicModal } from '@/components/modals/add-spare-topic-modal';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { logTopicRevised } from '@/lib/ai/activity-logger';


type TopicMetadata = {
  subject_name?: string;
  chapter_name?: string;
  is_standalone?: boolean;
}

type Topic = {
    id: number;
    chapter_id: number | null;
    subject_id: number | null;
    user_id: string;
    name: string;
    difficulty: 'Easy' | 'Medium' | 'Hard' | null;
    status: 'pending' | 'in_progress' | 'completed';
    created_at: string;
    last_revised_date: string | null;
    next_revision_date: string | null;
    revision_count: number;
    is_in_spare: boolean;
    spare_interval_days: number;
    spare_started_date: string | null;
    is_remaining?: boolean;
    remaining_since_date?: string | null;
    studied_count?: number;
    is_spare_only?: boolean;
    metadata: TopicMetadata | null;
    chapters: {
        name: string;
        subjects: {
            name: string;
            color: string;
        } | null;
    } | null;
};


const defaultIntervals: { [key: number]: number } = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

type TopicCategory = 'today' | 'missed' | 'ongoing' | 'upcoming' | 'completed';

const subjectOrder: { [key: string]: number } = {
  'Physics': 1,
  'Chemistry': 2,
  'Maths': 3,
};

const getSubjectName = (topic: Topic): string => {
    return topic.is_spare_only && topic.metadata?.subject_name 
        ? topic.metadata.subject_name
        : topic.chapters?.subjects?.name || 'Uncategorized';
};

const customTopicSort = (a: Topic, b: Topic) => {
    const subjectA = getSubjectName(a);
    const subjectB = getSubjectName(b);

    const orderA = subjectOrder[subjectA] || 4;
    const orderB = subjectOrder[subjectB] || 4;

    if (orderA !== orderB) {
        return orderA - orderB;
    }
    
    // If same subject category (e.g. both are "Other"), sort alphabetically
    if (orderA === 4) {
      if (subjectA < subjectB) return -1;
      if (subjectA > subjectB) return 1;
    }

    // Secondary sort by creation date (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
};

export default function RevisionPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<Profile | null>(null);

    const [todayTopics, setTodayTopics] = useState<Topic[]>([]);
    const [missedTopics, setMissedTopics] = useState<Topic[]>([]);
    const [ongoingTopics, setOngoingTopics] = useState<Topic[]>([]);
    const [upcomingTopics, setUpcomingTopics] = useState<Topic[]>([]);
    const [completedTopics, setCompletedTopics] = useState<Topic[]>([]);
    
    const [isSpareOnlyModalOpen, setIsSpareOnlyModalOpen] = useState(false);
    const [isAddToSpareModalOpen, setIsAddToSpareModalOpen] = useState(false);
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]);

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedTopicForHistory, setSelectedTopicForHistory] = useState<Topic | null>(null);


    const spareIntervals = useMemo(() => profile?.spare_intervals || defaultIntervals, [profile]);

    const handleTopicCardClick = (topic: Topic) => {
        setSelectedTopicForHistory(topic);
        setIsHistoryModalOpen(true);
    };

    const fetchAllData = useCallback(async (userId: string) => {
        setIsLoading(true);

        const [subjectsRes, profileRes] = await Promise.all([
            supabaseBrowserClient.from('subjects').select('*').eq('user_id', userId),
            supabaseBrowserClient.from('profiles').select('*').eq('id', userId).single()
        ]);
        
        if (subjectsRes.error) {
            toast({ variant: 'destructive', title: 'Error fetching subjects', description: subjectsRes.error.message });
        } else {
            setAllSubjects(subjectsRes.data || []);
        }

        if (profileRes.error && profileRes.error.code !== 'PGRST116') { // Ignore no profile found error
            toast({ variant: 'destructive', title: 'Error fetching profile', description: profileRes.error.message });
        } else {
            setProfile(profileRes.data);
        }

        const todayString = format(startOfToday(), 'yyyy-MM-dd');

        const [todayRes, missedRes, ongoingRes, upcomingRes, completedRes] = await Promise.all([
            // Today
            supabaseBrowserClient.from('topics')
                .select('*, chapters(name, subjects(name, color))')
                .eq('user_id', userId).eq('is_in_spare', true).lt('revision_count', 5)
                .eq('next_revision_date', todayString),
            // Missed
             supabaseBrowserClient.from('topics')
                .select('*, chapters(name, subjects(name, color))')
                .eq('user_id', userId).eq('is_in_spare', true).lt('revision_count', 5)
                .lt('next_revision_date', todayString),
            // Ongoing
            supabaseBrowserClient.from('topics')
                .select('*, chapters(name, subjects(name, color))')
                .eq('user_id', userId).eq('is_in_spare', true)
                .gt('revision_count', 0).lt('revision_count', 5)
                .gt('next_revision_date', todayString),
            // Upcoming
            supabaseBrowserClient.from('topics')
                .select('*, chapters(name, subjects(name, color))')
                .eq('user_id', userId).eq('is_in_spare', true).eq('revision_count', 0),
            // Completed
            supabaseBrowserClient.from('topics')
                .select('*, chapters(name, subjects(name, color))')
                .eq('user_id', userId).eq('is_in_spare', true).gte('revision_count', 5),
        ]);
        
        if (todayRes.error) toast({ variant: 'destructive', title: 'Error fetching today\'s topics', description: todayRes.error.message });
        else setTodayTopics((todayRes.data as Topic[] || []).sort(customTopicSort));
        
        if (missedRes.error) toast({ variant: 'destructive', title: 'Error fetching missed topics', description: missedRes.error.message });
        else setMissedTopics((missedRes.data as Topic[] || []).sort(customTopicSort));

        if (ongoingRes.error) toast({ variant: 'destructive', title: 'Error fetching ongoing topics', description: ongoingRes.error.message });
        else setOngoingTopics((ongoingRes.data as Topic[] || []).sort(customTopicSort));

        if (upcomingRes.error) toast({ variant: 'destructive', title: 'Error fetching upcoming topics', description: upcomingRes.error.message });
        else setUpcomingTopics((upcomingRes.data as Topic[] || []).sort(customTopicSort));

        if (completedRes.error) toast({ variant: 'destructive', title: 'Error fetching completed topics', description: completedRes.error.message });
        else setCompletedTopics((completedRes.data as Topic[] || []).sort(customTopicSort));

        setIsLoading(false);
    }, [toast]);

    useEffect(() => {
        const checkUser = async () => {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                router.push('/auth');
            } else {
                setUser(currentUser);
                fetchAllData(currentUser.id);
            }
        };
        checkUser();
    }, [router, fetchAllData]);
    
    const onDataSaved = () => {
        setIsSpareOnlyModalOpen(false);
        setIsAddToSpareModalOpen(false);
        if (user) fetchAllData(user.id);
    }

    const tabItems = useMemo(() => [
        { value: 'today', label: 'Today', icon: Clock, count: todayTopics.length, data: todayTopics, badgeClass: 'bg-blue-500 hover:bg-blue-600' },
        { value: 'missed', label: 'Missed', icon: AlertTriangle, count: missedTopics.length, data: missedTopics, badgeClass: 'bg-red-500 hover:bg-red-600' },
        { value: 'ongoing', label: 'Ongoing', icon: TrendingUp, count: ongoingTopics.length, data: ongoingTopics, badgeClass: 'bg-gray-400' },
        { value: 'upcoming', label: 'Upcoming', icon: Calendar, count: upcomingTopics.length, data: upcomingTopics, badgeClass: 'bg-gray-400' },
        { value: 'completed', label: 'Completed', icon: CheckCircle2, count: completedTopics.length, data: completedTopics, badgeClass: 'bg-green-500' },
    ], [todayTopics, missedTopics, ongoingTopics, upcomingTopics, completedTopics]);
    
    if (!user) {
        return <div className="flex h-full items-center justify-center"><Skeleton className="h-64 w-full max-w-lg" /></div>;
    }

    return (
        <>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-6 w-6 text-primary" />
                                SpaRE: Spaced Repetition Engine
                            </CardTitle>
                            <CardDescription className="mt-2">
                                Systematically review topics to move them from short-term to long-term memory.
                            </CardDescription>
                        </div>
                        <Button onClick={() => setIsAddToSpareModalOpen(true)} className="mt-4 sm:mt-0 sm:ml-4" variant="outline">
                            <Plus className="mr-2 h-4 w-4" /> Add New Topic
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            <Tabs defaultValue="today" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
                    {tabItems.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value} className="relative py-2">
                            <tab.icon className="h-4 w-4 mr-2 shrink-0" />
                            {tab.label}
                            {tab.count > 0 && (
                                <Badge className={cn("absolute -top-2 -right-2 h-5 w-5 justify-center p-0", tab.badgeClass)}>{tab.count}</Badge>
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {tabItems.map(tab => (
                    <TabsContent key={tab.value} value={tab.value} className="mt-4">
                        {isLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-48 w-full" />
                                <Skeleton className="h-48 w-full" />
                            </div>
                        ) : tab.data.length > 0 ? (
                            <div className="space-y-4">
                                {(tab.value === 'today' || tab.value === 'missed') && (
                                    <Button size="lg" className="w-full" onClick={() => router.push('/revision-session')}>
                                        <History className="mr-2 h-5 w-5" /> Start Revision Session
                                    </Button>
                                )}
                                {tab.data.map(topic => (
                                    <TopicCard 
                                        key={topic.id} 
                                        topic={topic} 
                                        category={tab.value as TopicCategory}
                                        spareIntervals={spareIntervals}
                                        onRevisionComplete={onDataSaved}
                                        onClick={() => handleTopicCardClick(topic)}
                                    />
                                ))}
                            </div>
                        ) : (
                           <EmptyState category={tab.value as TopicCategory} onAddTopicClick={() => setIsAddToSpareModalOpen(true)} />
                        )}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
        <Button 
            className="fixed bottom-20 right-4 z-20 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8" 
            aria-label="Add Quick Topic for Revision"
            onClick={() => setIsSpareOnlyModalOpen(true)}
        >
            <Plus className="h-8 w-8" />
        </Button>
        
        {user && <AddTopicToSpareModal
            isOpen={isAddToSpareModalOpen}
            onOpenChange={setIsAddToSpareModalOpen}
            onTopicAdded={onDataSaved}
            user={user}
        />}

        {user && <AddSpareTopicModal
            isOpen={isSpareOnlyModalOpen}
            onOpenChange={setIsSpareOnlyModalOpen}
            onTopicSaved={onDataSaved}
            user={user}
            subjects={allSubjects}
        />}
        
        {selectedTopicForHistory && (
             <RevisionHistoryModal
                isOpen={isHistoryModalOpen}
                onOpenChange={setIsHistoryModalOpen}
                topic={selectedTopicForHistory}
                spareIntervals={spareIntervals}
            />
        )}

        </>
    );
}

function TopicCard({ topic, category, spareIntervals, onRevisionComplete, onClick }: { 
    topic: Topic, 
    category: TopicCategory,
    spareIntervals: SpareIntervals,
    onRevisionComplete: () => void,
    onClick: () => void
}) {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState(false);
    const revisionProgress = useMemo(() => (topic.revision_count / 5) * 100, [topic.revision_count]);
    
    const subjectName = getSubjectName(topic);
    const chapterName = topic.is_spare_only && topic.metadata?.chapter_name ? topic.metadata.chapter_name : topic.chapters?.name;
    const subjectColor = topic.is_spare_only ? '#64748b' : topic.chapters?.subjects?.color || '#64748b';

    const overdueDays = useMemo(() => {
        if (category === 'missed' && topic.next_revision_date) {
            return differenceInDays(startOfToday(), parseISO(topic.next_revision_date));
        }
        return 0;
    }, [category, topic.next_revision_date]);


    const difficultyBadge = useMemo(() => {
        if (!topic.difficulty) return null;
        const baseClass = "absolute top-3 right-3 text-xs";
        switch (topic.difficulty) {
            case 'Easy': return <Badge className={cn(baseClass, "bg-green-500/10 text-green-700 border-green-500/20")}>Easy</Badge>;
            case 'Medium': return <Badge className={cn(baseClass, "bg-yellow-500/10 text-yellow-700 border-yellow-500/20")}>Medium</Badge>;
            case 'Hard': return <Badge className={cn(baseClass, "bg-red-500/10 text-red-700 border-red-500/20")}>Hard</Badge>;
            default: return null;
        }
    }, [topic.difficulty]);
    
    const onMarkAsRevised = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsProcessing(true);

        const newRevisionCount = topic.revision_count + 1;
        const intervalKey = Math.min(newRevisionCount, 5);
        const intervalDays = spareIntervals[intervalKey as keyof SpareIntervals];
        
        if (typeof intervalDays !== 'number') {
            toast({ variant: 'destructive', title: 'Error', description: 'Invalid revision interval configuration.' });
            setIsProcessing(false);
            return;
        }
        
        const lastRevised = new Date();
        const nextRevisionDate = addDays(lastRevised, intervalDays);

        const { error } = await supabaseBrowserClient
            .from('topics')
            .update({
                revision_count: newRevisionCount,
                last_revised_date: lastRevised.toISOString(),
                next_revision_date: nextRevisionDate.toISOString(),
                spare_interval_days: intervalDays,
            })
            .eq('id', topic.id);

        setIsProcessing(false);

        if (error) {
            toast({ variant: 'destructive', title: 'Error updating topic', description: error.message });
        } else {
            if (newRevisionCount >= 5) {
                 toast({ title: "Topic Mastered! 🎯", description: `Congratulations on completing all revisions for "${topic.name}".`});
            } else {
                 toast({ title: 'Revision Completed!', description: `Next revision for "${topic.name}" is on ${format(nextRevisionDate, 'PPP')}.` });
            }

            try {
                const user = await getCurrentUser();
                if(user) {
                    await logTopicRevised(user.id, topic, { revision_count: newRevisionCount, confidence: 'high' });
                }
            } catch (logError) {
                console.error("Error logging topic revision:", logError);
            }

            onRevisionComplete();
        }
    };

    const onUndoRevision = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (topic.revision_count === 0) return;

        setIsProcessing(true);

        const newRevisionCount = topic.revision_count - 1;
        
        // This logic is simplified: it just moves the topic back to 'Today'
        const today = new Date().toISOString();

        const { error } = await supabaseBrowserClient
            .from('topics')
            .update({
                revision_count: newRevisionCount,
                // We are setting next_revision_date to today to bring it back to the "Today" queue.
                // A more complex implementation would require storing revision history.
                next_revision_date: today,
                // We can't accurately revert last_revised_date without a history table.
                // We'll leave it as is, or set it to null if it's the first revision being undone.
                last_revised_date: newRevisionCount === 0 ? null : topic.last_revised_date,
            })
            .eq('id', topic.id);

        setIsProcessing(false);

        if (error) {
            toast({ variant: 'destructive', title: 'Error Undoing Revision', description: error.message });
        } else {
            toast({ title: 'Revision Undone', description: `"${topic.name}" is back in your queue for today.` });
            onRevisionComplete();
        }
    };

    const handleReschedule = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsProcessing(true);

        const today = new Date().toISOString().split('T')[0];

        const { error } = await supabaseBrowserClient
            .from('topics')
            .update({
                next_revision_date: today,
            })
            .eq('id', topic.id);
        
        setIsProcessing(false);

        if (error) {
            toast({ variant: 'destructive', title: 'Failed to reschedule', description: error.message });
        } else {
            toast({ title: 'Topic Rescheduled!', description: `"${topic.name}" has been moved to your "Today" queue for revision.` });
            onRevisionComplete();
        }
    };


    return (
        <Card className="overflow-hidden cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}>
            <CardContent className="p-4 relative">
                {difficultyBadge}
                {category === 'missed' && overdueDays > 0 && (
                    <Badge variant="destructive" className="absolute top-3 left-3 text-xs">
                        Overdue {overdueDays} {overdueDays === 1 ? 'day' : 'days'}
                    </Badge>
                )}
                <div className="flex items-start gap-4">
                     <div className="w-1.5 h-auto self-stretch rounded-full" style={{ backgroundColor: subjectColor }} />
                     <div className="flex-1 space-y-3">
                        <div className="pt-8 sm:pt-0">
                            <p className="font-semibold text-lg pr-16">{topic.name}</p>
                            <p className="text-sm text-muted-foreground">{subjectName || 'Subject'} &gt; {chapterName || 'Chapter'}</p>
                        </div>
                        
                        <div>
                            <label className="text-xs font-medium text-muted-foreground">Revision Progress</label>
                            <div className="flex items-center gap-2 mt-1">
                                <Progress value={revisionProgress} className="h-2" />
                                <span className="text-sm font-semibold">{topic.revision_count}/5</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                             <div className="flex items-center gap-2 text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <div>
                                    <p className="text-xs">Last Revised</p>
                                    <p className="font-medium text-foreground">
                                        {topic.last_revised_date ? format(parseISO(topic.last_revised_date), 'MMM dd') : 'N/A'}
                                    </p>
                                </div>
                             </div>
                             <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className={cn("h-4 w-4", category === 'missed' ? "text-red-500" : "text-primary")} />
                                <div>
                                    <p className="text-xs">Next Due</p>
                                    <p className={cn("font-medium", category === 'missed' ? "text-red-600 dark:text-red-400" : "text-foreground")}>
                                        {topic.next_revision_date ? format(parseISO(topic.next_revision_date), 'MMM dd') : 'N/A'}
                                    </p>
                                </div>
                             </div>
                        </div>

                        {category === 'today' ? (
                             <Button className="w-full mt-2" onClick={onMarkAsRevised} disabled={isProcessing}>
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Revising...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Revised
                                    </>
                                )}
                            </Button>
                        ) : category === 'missed' ? (
                            <div className="flex gap-2 mt-2">
                                <Button className="w-full" onClick={onMarkAsRevised} disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Mark as Revised
                                </Button>
                                <Button variant="outline" className="w-full border-orange-500 text-orange-600 hover:bg-orange-50 hover:text-orange-700" onClick={handleReschedule} disabled={isProcessing}>
                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />} Reschedule
                                </Button>
                            </div>
                        ) : category !== 'upcoming' && topic.revision_count > 0 ? (
                             <Button variant="outline" className="w-full mt-2 border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700" onClick={onUndoRevision} disabled={isProcessing}>
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Undoing...
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw className="mr-2 h-4 w-4" /> Undo Revision
                                    </>
                                )}
                            </Button>
                        ) : null}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function EmptyState({ category, onAddTopicClick }: { category: TopicCategory, onAddTopicClick: () => void }) {
    const router = useRouter();
    const messages = {
        today: {
            title: "All Clear for Today!",
            description: "You've finished all your scheduled revisions for today. Great job!",
            buttonText: "Go to Dashboard",
            onClick: () => router.push('/dashboard')
        },
        missed: {
            title: "No Overdue Revisions",
            description: "You're all caught up on your past revisions. Keep up the great work!",
            buttonText: "See Today's Revisions",
            onClick: () => {} // This should be handled by the Tabs component value change
        },
        ongoing: {
            title: "No Ongoing Revisions",
            description: "Topics you are actively revising through SpaRE will appear here.",
            buttonText: "See Today's Revision",
            onClick: () => {} // Should switch to "today" tab, handled by Tabs component state
        },
        upcoming: {
            title: "Nothing is Queued Up",
            description: "Add a topic you've already studied or create a new one for revision.",
            buttonText: "Add New Topic",
            onClick: onAddTopicClick
        },
        completed: {
            title: "No Mastered Topics Yet",
            description: "Keep up with your revisions to master topics and see them here!",
            buttonText: "Keep Revising",
            onClick: () => {} // Or maybe switch to 'today' tab
        },
    };
    const { title, description, buttonText, onClick } = messages[category];

    return (
        <div className="flex flex-col items-center justify-center text-center p-4 rounded-lg bg-muted/50 min-h-[20rem]">
            <Card className="w-full max-w-lg shadow-none border-none bg-transparent">
                <CardHeader>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-background">
                        <PartyPopper className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="mt-4 text-2xl">{title}</CardTitle>
                    <CardDescription className="text-md max-w-sm mx-auto">
                        {description}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={onClick}>
                       {buttonText}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

function AddTopicToSpareModal({ isOpen, onOpenChange, onTopicAdded, user }: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onTopicAdded: () => void;
    user: User;
}) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [subject, setSubject] = useState('');
    const [customSubject, setCustomSubject] = useState('');
    const [chapter, setChapter] = useState('');
    const [topicName, setTopicName] = useState('');
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | undefined>(undefined);

    const isFormValid = useMemo(() => {
        const isSubjectValid = subject === 'Other' ? customSubject.trim() !== '' : subject.trim() !== '';
        return isSubjectValid && chapter.trim() !== '' && topicName.trim() !== '';
    }, [subject, customSubject, chapter, topicName]);

    const handleSave = async () => {
        if (!user || !isFormValid) return;

        setIsSaving(true);
        const today = new Date().toISOString();
        const finalSubjectName = subject === 'Other' ? customSubject : subject;

        const metadata = {
            subject_name: finalSubjectName,
            chapter_name: chapter,
            is_standalone: true
        };

        const { error } = await supabaseBrowserClient
            .from('topics')
            .insert({
                user_id: user.id,
                name: topicName,
                difficulty: difficulty || null,
                is_in_spare: true,
                is_spare_only: true,
                revision_count: 0,
                next_revision_date: today,
                spare_started_date: today,
                spare_interval_days: 1,
                metadata: metadata,
                subject_id: null,
                chapter_id: null,
            });

        setIsSaving(false);
        if (error) {
            toast({ variant: 'destructive', title: 'Error adding topic', description: error.message });
        } else {
            toast({ title: 'Added to SpaRE successfully.' });
            onTopicAdded();
            onOpenChange(false);
        }
    };
    
    useEffect(() => {
        if (!isOpen) {
            setSubject('');
            setCustomSubject('');
            setChapter('');
            setTopicName('');
            setDifficulty(undefined);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Topic for Revision</DialogTitle>
                    <DialogDescription>
                       Create a new topic that will only exist within your SpaRE schedule.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <Label htmlFor="subject-select">Subject</Label>
                        <Select value={subject} onValueChange={setSubject} disabled={isSaving}>
                            <SelectTrigger id="subject-select" className="mt-2">
                                <SelectValue placeholder="Select subject" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Physics">Physics</SelectItem>
                                <SelectItem value="Chemistry">Chemistry</SelectItem>
                                <SelectItem value="Maths">Maths</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {subject === 'Other' && (
                        <div>
                            <Label htmlFor="custom-subject-name">Subject Name</Label>
                            <Input
                                id="custom-subject-name"
                                value={customSubject}
                                onChange={(e) => setCustomSubject(e.target.value)}
                                placeholder="e.g., Biology, English"
                                className="mt-2"
                                disabled={isSaving}
                            />
                        </div>
                    )}

                    <div>
                        <Label htmlFor="chapter-name">Chapter Name</Label>
                        <Input
                            id="chapter-name"
                            value={chapter}
                            onChange={(e) => setChapter(e.target.value)}
                            placeholder="e.g., Kinematics, Thermodynamics"
                            className="mt-2"
                            disabled={isSaving}
                        />
                    </div>
                    
                    <div>
                        <Label htmlFor="topic-name">Topic Name</Label>
                        <Input
                            id="topic-name"
                            value={topicName}
                            onChange={(e) => setTopicName(e.target.value)}
                            placeholder="e.g., Projectile Motion"
                            className="mt-2"
                            disabled={isSaving}
                        />
                    </div>

                    <div>
                        <Label htmlFor="difficulty-select">Difficulty (Optional)</Label>
                        <Select value={difficulty} onValueChange={(v: 'Easy' | 'Medium' | 'Hard') => setDifficulty(v)} disabled={isSaving}>
                            <SelectTrigger id="difficulty-select" className="mt-2">
                                <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Easy">Easy</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Hard">Hard</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <p className="text-xs text-muted-foreground pt-2">
                        Note: This topic is created specifically for revision and will only appear in SpaRE, not in the main Topics section.
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={!isFormValid || isSaving}>
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : 'Add Topic'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RevisionHistoryModal({ isOpen, onOpenChange, topic, spareIntervals }: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    topic: Topic;
    spareIntervals: SpareIntervals;
}) {
    const [pastRevisions, setPastRevisions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const upcomingRevisions = useMemo(() => {
        if (!topic.spare_started_date) return [];
        
        const startDate = parseISO(topic.spare_started_date);
        const schedule = [];
        
        for (let i = 1; i <= 5; i++) {
            const interval = spareIntervals[i as keyof SpareIntervals];
            if (interval !== undefined) {
                const revisionDate = addDays(startDate, interval);
                schedule.push({
                    date: revisionDate,
                    isCompleted: topic.revision_count >= i,
                });
            }
        }
        return schedule;
    }, [topic, spareIntervals]);

    useEffect(() => {
        if (isOpen) {
            const fetchHistory = async () => {
                setIsLoading(true);
                // This is a placeholder. In a real app, you would have a `revision_history` table.
                // For now, we simulate history based on current data.
                const simulatedHistory: string[] = [];
                if (topic.last_revised_date) {
                    // Let's create some dummy past dates for demonstration
                    let currentDate = parseISO(topic.last_revised_date);
                    for (let i = 0; i < topic.revision_count; i++) {
                        simulatedHistory.unshift(format(currentDate, 'PPP'));
                        // This is not accurate, just for display
                        currentDate = addDays(currentDate, -((spareIntervals[(topic.revision_count - i) as keyof SpareIntervals] || 7)));
                    }
                }
                 setPastRevisions(simulatedHistory);
                setIsLoading(false);
            };
            fetchHistory();
        }
    }, [isOpen, topic, spareIntervals]);


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{topic.name}</DialogTitle>
                    <DialogDescription>Revision History & Schedule</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Revision History</h3>
                        {isLoading ? (
                            <Skeleton className="h-20" />
                        ) : pastRevisions.length > 0 ? (
                            <ul className="space-y-2">
                                {pastRevisions.map((date, index) => (
                                    <li key={index} className="flex items-center gap-3 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                        <span>Revised on {date}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">No past revisions recorded yet.</p>
                        )}
                    </div>
                    <Separator />
                    <div>
                        <h3 className="font-semibold text-lg mb-3">Upcoming Schedule</h3>
                        {upcomingRevisions.length > 0 ? (
                            <ol className="space-y-4">
                                {upcomingRevisions.map((rev, index) => (
                                    <li key={index} className="flex items-start gap-4">
                                        <div className={cn("flex h-6 w-6 items-center justify-center rounded-full font-bold",
                                            rev.isCompleted ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                                        )}>
                                            {rev.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className={cn("font-medium", rev.isCompleted && "text-muted-foreground line-through")}>
                                                Revision {index + 1}
                                            </p>
                                            <p className={cn("text-sm", rev.isCompleted ? "text-muted-foreground" : "text-foreground")}>
                                                {format(rev.date, 'PPP')}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                           <p className="text-sm text-muted-foreground">This topic has not been started in SpaRE yet.</p>
                        )}
                    </div>
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

    

    

