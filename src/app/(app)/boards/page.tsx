
'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import { Plus, CheckCircle2, GraduationCap, BookOpen, Target, TrendingUp, ListChecks, Loader2, PieChart, BarChart, AlertTriangle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO, subDays } from 'date-fns';
import type { Subject as OriginalSubject, Chapter as OriginalChapter, Topic as OriginalTopic } from '../topics/page';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { QuestionAssessmentModal } from '@/components/modals/question-assessment-modal';
import NotesList from '@/components/boards/NotesList';
import { NoteModal } from '@/components/boards/NoteModal';


// Re-defining types here to avoid complex imports, can be centralized later
export type Subject = OriginalSubject;

export type Chapter = OriginalChapter & {
  is_board_certified?: boolean;
  certification_date?: string | null;
  has_pending_questions?: boolean;
  is_available_for_study?: boolean;
  is_available_for_revision?: boolean;
};

export type Topic = OriginalTopic;

type Session = {
  date: string;
  study_minutes: number;
  subject_name: string;
};

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B'];

  
export default function BoardsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [isFetching, setIsFetching] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();
    const { toast } = useToast();
    
    // State for Note Modal
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    // State to trigger refetch in NotesList
    const [notesVersion, setNotesVersion] = useState(0);

    const fetchData = useCallback(async (userId: string) => {
        setIsFetching(true);
        const [
            { data: subjectsData, error: subjectsError },
            { data: chaptersData, error: chaptersError },
            { data: topicsData, error: topicsError },
        ] = await Promise.all([
            supabaseBrowserClient.from('subjects').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
            supabaseBrowserClient.from('chapters').select('*, subjects(id, name, color)').eq('user_id', userId).order('name', { ascending: true }),
            supabaseBrowserClient.from('topics').select('*, chapter:chapters(name, subject:subjects(name, id))').eq('user_id', userId).order('created_at', { ascending: true }),
        ]);

        if (subjectsError) {
            toast({ variant: "destructive", title: "Error fetching subjects", description: subjectsError.message });
        } else {
            setSubjects(subjectsData || []);
        }

        if (chaptersError) {
            toast({ variant: "destructive", title: "Error fetching chapters", description: chaptersError.message });
        } else {
            setChapters((chaptersData as Chapter[]) || []);
        }

        if (topicsError) {
            toast({ variant: "destructive", title: "Error fetching topics", description: topicsError.message });
        } else {
            setTopics((topicsData as Topic[]) || []);
        }

        setIsFetching(false);
    }, [toast]);
    
    const onDataSaved = useCallback(() => {
        if(user) fetchData(user.id);
        setNotesVersion(v => v + 1); // Trigger notes refetch
    }, [user, fetchData]);
    
    const handleOpenNoteModal = (noteId: string | null = null) => {
        setEditingNoteId(noteId);
        setIsNoteModalOpen(true);
    };

    useEffect(() => {
        const checkUser = async () => {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                router.push('/auth');
            } else {
                setUser(currentUser);
                fetchData(currentUser.id);
            }
        };
        checkUser();
    }, [router, fetchData]);

    return (
        <>
        <div className="space-y-6">
            <Card>
                <Tabs defaultValue="overview">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <GraduationCap className="h-6 w-6 text-primary" />
                                Boards
                            </CardTitle>
                            <CardDescription>Focus on your board exam syllabus, track progress, and manage your notes.</CardDescription>
                        </div>
                        <TabsList className="grid w-full sm:w-auto grid-cols-2 mt-4 sm:mt-0">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="notes"><FileText className="mr-2 h-4 w-4" /> Notes</TabsTrigger>
                        </TabsList>
                    </div>
                </CardHeader>
                <TabsContent value="notes">
                     <CardContent>
                        {isFetching ? (
                            <p>Loading...</p>
                        ) : user ? (
                           <NotesList 
                                key={notesVersion} // Force re-render on save
                                user={user}
                                subjects={subjects} 
                                chapters={chapters} 
                                onEditNote={handleOpenNoteModal} 
                                onNoteDeleted={onDataSaved}
                           />
                        ) : null}
                    </CardContent>
                </TabsContent>
                <TabsContent value="overview">
                    <Suspense fallback={<CardContent><p>Loading overview...</p></CardContent>}>
                        <BoardsOverview subjects={subjects} chapters={chapters} topics={topics} isLoading={isFetching} user={user} onChapterUpdate={onDataSaved} />
                    </Suspense>
                </TabsContent>
                </Tabs>
            </Card>
        </div>
        {user && (
            <NoteModal
                isOpen={isNoteModalOpen}
                onClose={() => setIsNoteModalOpen(false)}
                noteId={editingNoteId}
                onSuccess={onDataSaved}
                user={user}
                subjects={subjects}
                chapters={chapters}
            />
        )}
        </>
    );
}

function BoardsOverview({ subjects, chapters, topics, isLoading, user, onChapterUpdate }: {
  subjects: Subject[];
  chapters: Chapter[];
  topics: Topic[];
  isLoading: boolean;
  user: User | null;
  onChapterUpdate: () => void;
}) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isConfirming, setIsConfirming] = useState<Chapter | null>(null);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [chapterForAssessment, setChapterForAssessment] = useState<Chapter | null>(null);
  
  const highlightedChapterId = searchParams.get('highlight');

  const stats = useMemo(() => {
    const totalChapters = chapters.length;
    const completedChapters = chapters.filter(c => c.is_board_certified).length;
    const remainingChapters = totalChapters - completedChapters;
    const overallCompletion = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;
    return { totalChapters, completedChapters, remainingChapters, overallCompletion };
  }, [chapters]);

  const chaptersBySubject = useMemo(() => {
    return subjects.map(subject => ({
      ...subject,
      chapters: chapters.filter(c => c.subject_id === subject.id).sort((a,b) => a.name.localeCompare(b.name))
    })).filter(s => s.chapters.length > 0);
  }, [subjects, chapters]);

  const handleStartAssessment = (chapter: Chapter) => {
    setChapterForAssessment(chapter);
    setIsAssessmentModalOpen(true);
  };
  
  const onCertificationSuccess = async (chapterId: number) => {
    setIsAssessmentModalOpen(false);

    const { error } = await supabaseBrowserClient
      .from('chapters')
      .update({
        is_board_certified: true,
        certification_date: new Date().toISOString(),
        is_available_for_study: false,
        is_available_for_revision: true,
        has_pending_questions: false,
      })
      .eq('id', chapterId);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Error updating chapter', description: error.message });
    } else {
      toast({ title: 'Chapter Certified!', description: `Congratulations! You've mastered this chapter.` });
      onChapterUpdate();
    }
  };

  const onAssessmentFailed = useCallback(async (chapterId: number) => {
    setIsAssessmentModalOpen(false);
    const { error } = await supabaseBrowserClient
      .from('chapters')
      .update({ has_pending_questions: true })
      .eq('id', chapterId);
    if (error) {
        toast({ variant: 'destructive', title: 'Error updating chapter status', description: error.message });
    } else {
        toast({ title: 'Practice Recommended', description: 'This chapter is marked as having pending questions. Review and try again!' });
        onChapterUpdate();
    }
  }, [toast, onChapterUpdate]);


  if (isLoading) {
    return <CardContent><p>Loading overview...</p></CardContent>;
  }

  if (chapters.length === 0) {
    return (
      <CardContent>
        <div className="text-center py-16 text-muted-foreground">
          <p>No BOARDS chapters yet.</p>
          <p className="mt-1 text-sm">Add chapters with the 'BOARDS' category in the Syllabus page to track your progress here.</p>
        </div>
      </CardContent>
    );
  }

  return (
    <>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><ListChecks className="h-4 w-4 text-muted-foreground" /> Total Chapters</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats.totalChapters}</p></CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Completed</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats.completedChapters}</p></CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground" /> Remaining</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats.remainingChapters}</p></CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1 bg-green-50 dark:bg-green-900/30">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2 text-green-700 dark:text-green-300"><TrendingUp className="h-4 w-4" /> Completion</CardTitle></CardHeader>
            <CardContent className="space-y-1">
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.overallCompletion.toFixed(1)}%</p>
                <Progress value={stats.overallCompletion} className="h-2 [&>div]:bg-green-500" />
            </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Chapter Progress</h3>
        <div className="space-y-4">
            {chaptersBySubject.map(subject => (
                <div key={subject.id}>
                    <h4 className="font-semibold text-lg flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.color }} />
                        {subject.name}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {subject.chapters.map(chapter => (
                            <Card key={chapter.id} className={cn("p-4 flex items-center gap-4 transition-all", chapter.is_board_certified && "bg-muted/60 opacity-80", String(chapter.id) === highlightedChapterId && "ring-2 ring-primary shadow-lg")}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className={cn("font-semibold", chapter.is_board_certified && "line-through")}>{chapter.name}</p>
                                        {chapter.has_pending_questions && <Badge variant="destructive" className="animate-pulse">Pending</Badge>}
                                    </div>
                                    {chapter.is_board_certified && chapter.certification_date && (
                                        <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-1">
                                            Completed {format(parseISO(chapter.certification_date), 'MMM dd')}
                                        </p>
                                    )}
                                </div>
                                {chapter.is_board_certified ? (
                                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                                ) : (
                                    <Button size="sm" onClick={() => setIsConfirming(chapter)}>
                                        {chapter.has_pending_questions ? 'Retry' : 'Certify'}
                                    </Button>
                                )}
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t">
        <h3 className="text-xl font-semibold mb-4">Your BOARDS Study Progress</h3>
        <div className="text-center py-8 bg-muted/50 rounded-lg">
            <p className="text-muted-foreground">Analytics coming soon.</p>
            <p className="text-sm text-muted-foreground mt-1">Complete some BOARDS study sessions to see your progress here.</p>
        </div>
      </div>

    </CardContent>
    <AlertDialog open={!!isConfirming} onOpenChange={() => setIsConfirming(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Ready to Certify "{isConfirming?.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                    To certify this chapter, you must pass a short assessment with CBSE Board Exam style questions.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setIsConfirming(null)}>Not Yet</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    if (isConfirming) {
                        handleStartAssessment(isConfirming);
                        setIsConfirming(null);
                    }
                }}>Yes, Start Assessment</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    {chapterForAssessment && user && (
        <QuestionAssessmentModal
            isOpen={isAssessmentModalOpen}
            onClose={() => {
                setIsAssessmentModalOpen(false);
                if (chapterForAssessment) {
                    onAssessmentFailed(chapterForAssessment.id);
                }
            }}
            chapterId={chapterForAssessment.id}
            chapterName={chapterForAssessment.name}
            subjectName={(subjects.find(s => s.id === chapterForAssessment.subject_id))?.name || ''}
            onCertificationSuccess={onCertificationSuccess}
            onAssessmentFailed={onAssessmentFailed}
        />
    )}
    </>
  );
}
