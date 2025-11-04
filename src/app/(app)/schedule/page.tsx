

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import { Book, Brain, Plus, Zap, Pencil, Trash2, Calendar as CalendarIcon, Clock, Play, Lock, AlertTriangle } from 'lucide-react';
import { format, parse, isToday, startOfToday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import type { Chapter } from '../topics/page';
import { Calendar } from '@/components/ui/calendar';
import { cva } from 'class-variance-authority';
import React from 'react';
import { AddBlockModal } from '@/components/modals/add-block-modal';


type BlockType = 'Study' | 'Question' | 'Revision';

export type PomodoroTemplate = {
  id: string;
  user_id: string | null;
  name: string;
  sessions_json: { type: 'study' | 'break'; duration: number }[];
  is_default: boolean;
  created_at: string;
};


export type Block = {
  id: string;
  user_id: string;
  date: string;
  type: BlockType;
  start_time: string;
  duration: number;
  subject?: string;
  subjects?: string[]; 
  chapters?: string[]; 
  topics?: string[];
  template_id?: string | null;
  category?: 'JEE' | 'BOARDS' | 'OTHERS';
};

export type Subject = {
  id: number;
  user_id: string;
  name: string;
  color: string;
  category: 'JEE' | 'BOARDS' | 'OTHERS' | null;
  created_at: string;
}

const blockTypeDetails: {
  [key in BlockType]: { icon: React.ElementType; className: string };
} = {
  Study: {
    icon: Book,
    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800',
  },
  Question: {
    icon: Zap,
    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800',
  },
  Revision: {
    icon: Brain,
    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800',
  },
};


export default function SchedulePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [pomodoroTemplates, setPomodoroTemplates] = useState<PomodoroTemplate[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  
  const [activeBlockForToday, setActiveBlockForToday] = useState<Block | null>(null);
  const [completedTodayIds, setCompletedTodayIds] = useState<string[]>([]);
  const [conflictingBlocks, setConflictingBlocks] = useState<Block[]>([]);

  const isBlockLimitReached = !!activeBlockForToday || conflictingBlocks.length > 0;

  const fetchScheduleData = useCallback(async (userId: string, date: Date) => {
    setIsFetching(true);
    const dateString = format(date, 'yyyy-MM-dd');

    if (!userId) {
      toast({ variant: "destructive", title: "Authentication Error", description: "Could not verify user." });
      setIsFetching(false);
      return;
    }

    const [{ data: blocksData, error: blocksError }, { data: subjectsData, error: subjectsError }, { data: chaptersData, error: chaptersError }, { data: templatesData, error: templatesError }] = await Promise.all([
      supabaseBrowserClient.from('blocks').select('*').eq('user_id', userId).eq('date', dateString).order('start_time', { ascending: true }),
      supabaseBrowserClient.from('subjects').select('*').eq('user_id', userId),
      supabaseBrowserClient.from('chapters').select('*, subject_id(id, name)').eq('user_id', userId),
      supabaseBrowserClient.from('pomodoro_templates').select('*').or(`is_default.eq.true,user_id.eq.${userId}`),
    ]);

    if (blocksError) {
      console.error('Error fetching blocks:', blocksError);
      toast({ variant: "destructive", title: "Error fetching blocks", description: blocksError.message });
    } else {
      setBlocks(blocksData || []);
    }

    if (subjectsError) {
      console.error('Error fetching subjects:', subjectsError);
      toast({ variant: "destructive", title: "Error fetching subjects", description: subjectsError.message });
    } else {
      setSubjects(subjectsData || []);
    }
    
    if (chaptersError) {
        console.error('Error fetching chapters:', JSON.stringify(chaptersError, null, 2));
        const errorMessage = chaptersError?.message || 'Failed to fetch chapters';
        toast({ variant: "destructive", title: "Error fetching chapters", description: errorMessage });
    } else {
        setChapters(chaptersData || []);
    }
    
    if (templatesError) {
        console.error('Error fetching templates:', templatesError);
        toast({ variant: "destructive", title: "Error fetching templates", description: templatesError.message });
    } else {
        setPomodoroTemplates(templatesData || []);
    }

    setIsFetching(false);
  }, [toast]);
  
  const fetchActiveBlockStatus = useCallback(async (userId: string) => {
    const todayString = format(startOfToday(), 'yyyy-MM-dd');
    const { data: todayBlocks, error: blocksError } = await supabaseBrowserClient
        .from('blocks').select('*').eq('user_id', userId).eq('date', todayString);

    if (blocksError) {
        console.error("Error fetching today's blocks status:", blocksError);
        return;
    }

    if (!todayBlocks || todayBlocks.length === 0) {
        setActiveBlockForToday(null);
        setCompletedTodayIds([]);
        setConflictingBlocks([]);
        return;
    }

    const todayBlockIds = todayBlocks.map(b => b.id);
    const { data: sessions, error: sessionsError } = await supabaseBrowserClient
        .from('sessions').select('block_id').in('block_id', todayBlockIds);

    if (sessionsError) {
        console.error("Error fetching today's sessions:", sessionsError);
        return;
    }

    const completedIds = new Set(sessions.map(s => s.block_id));
    setCompletedTodayIds(Array.from(completedIds));

    const activeBlocks = todayBlocks.filter(block => !completedIds.has(block.id));

    if (activeBlocks.length > 1) {
        setConflictingBlocks(activeBlocks);
        setActiveBlockForToday(null);
    } else if (activeBlocks.length === 1) {
        setActiveBlockForToday(activeBlocks[0]);
        setConflictingBlocks([]);
    } else {
        setActiveBlockForToday(null);
        setConflictingBlocks([]);
    }
}, []);


  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/auth');
      } else {
        setUser(currentUser);
      }
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    if (user) {
      fetchScheduleData(user.id, selectedDate);
      if (isToday(selectedDate)) {
        fetchActiveBlockStatus(user.id);
      } else {
        setActiveBlockForToday(null);
        setCompletedTodayIds([]);
        setConflictingBlocks([]);
      }
    }
  }, [user, selectedDate, fetchScheduleData, fetchActiveBlockStatus]);
  
  const handleEditClick = useCallback((block: Block) => {
    setEditingBlock(block);
    setIsModalOpen(true);
  }, []);

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
      // Do not proceed with block deletion if feedback cleanup fails
      return;
    }

    const { error } = await supabaseBrowserClient.from('blocks').delete().eq('id', blockId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message,
      });
    } else {
      toast({
        title: "Block deleted successfully",
      });
      fetchScheduleData(user.id, selectedDate);
      if (isToday(selectedDate)) {
        fetchActiveBlockStatus(user.id);
      }
    }
  }, [user, selectedDate, toast, fetchScheduleData, fetchActiveBlockStatus]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setEditingBlock(null);
  }, []);
  
  const handleBlockSaved = useCallback(() => {
    if (user) {
      fetchScheduleData(user.id, selectedDate);
      if (isToday(selectedDate)) {
        fetchActiveBlockStatus(user.id);
      }
    }
    handleModalClose();
  }, [user, selectedDate, fetchScheduleData, handleModalClose, fetchActiveBlockStatus]);
  
  const handleCreateNewClick = () => {
    if (isBlockLimitReached && isToday(selectedDate)) {
        toast({
            variant: "destructive",
            title: "Active Block Exists",
            description: "You already have an active study block for today. Please complete or delete it first.",
        });
    } else {
        setEditingBlock(null);
        setIsModalOpen(true);
    }
  }

  const handleKeepBlock = async (blockToKeep: Block) => {
    if (!user) return;

    const blockIdsToDelete = conflictingBlocks
        .filter(b => b.id !== blockToKeep.id)
        .map(b => b.id);
    
    if (blockIdsToDelete.length === 0) return;

    const { error } = await supabaseBrowserClient
        .from('blocks')
        .delete()
        .in('id', blockIdsToDelete);
    
    if (error) {
        toast({ variant: 'destructive', title: "Cleanup Failed", description: error.message });
    } else {
        toast({ title: 'Cleanup Successful!', description: `Kept block and removed others.`});
        fetchScheduleData(user.id, selectedDate);
        fetchActiveBlockStatus(user.id);
    }
  };


  if (!user) {
    return <div>Loading...</div>; // Or a spinner component
  }

  return (
    <>
      <div className="flex flex-col h-full space-y-6">
        <Card className="flex-shrink-0">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                  <CardTitle>Schedule</CardTitle>
                  <CardDescription>
                      Plan and view your study blocks.
                  </CardDescription>
              </div>
              <Popover>
                  <PopoverTrigger asChild>
                  <Button
                      variant={"outline"}
                      className={cn(
                      "w-full sm:w-[280px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                      )}
                  >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                  <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      initialFocus
                  />
                  </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
        </Card>

        {isToday(selectedDate) && conflictingBlocks.length > 0 && (
            <Card className="border-red-500 bg-red-50/50 dark:bg-red-900/30">
                <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-red-700 dark:text-red-300'>
                        <AlertTriangle className="h-5 w-5" />
                        Multiple Active Blocks Found
                    </CardTitle>
                    <CardDescription>
                        You have more than one incomplete block for today. Please select which one you want to keep. The others will be deleted.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {conflictingBlocks.map(block => (
                         <Card key={block.id} className="flex items-center p-4">
                            <div className="flex-1">
                                <p className="font-semibold">{block.subject || 'Task'}</p>
                                <p className="text-sm text-muted-foreground">{block.start_time} &middot; {block.duration} min</p>
                            </div>
                            <Button onClick={() => handleKeepBlock(block)}>Keep this one</Button>
                         </Card>
                    ))}
                </CardContent>
            </Card>
        )}
        
        {isToday(selectedDate) && activeBlockForToday && (
            <Card className="border-amber-500 bg-amber-50/50 dark:bg-amber-900/30">
                <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-amber-700 dark:text-amber-300'>
                        <AlertTriangle className="h-5 w-5" />
                        Active Block for Today
                    </CardTitle>
                    <CardDescription>
                        You have reached the limit of one active block per day. Complete or delete the current block to add a new one for today.
                    </CardDescription>
                </CardHeader>
                {activeBlockForToday && (
                    <CardContent>
                        <BlockCard
                            block={activeBlockForToday}
                            subjects={subjects}
                            chapters={chapters}
                            onEdit={handleEditClick}
                            onDelete={handleDelete}
                            onStart={() => router.push(`/session/${activeBlockForToday.id}`)}
                        />
                    </CardContent>
                )}
            </Card>
        )}
        
        <div className="flex-grow">
          {isFetching ? (
            <p>Loading blocks...</p>
          ) : (
            <>
              {/* Desktop Timeline View */}
              <div className="hidden md:flex h-full">
                <div className="relative grid grid-cols-[auto,1fr] w-full">
                  <TimeGrid />
                  <div className="relative col-start-2">
                    {blocks.map(block => (
                      <BlockCard
                        key={block.id}
                        block={block}
                        subjects={subjects}
                        chapters={chapters}
                        onEdit={handleEditClick}
                        onDelete={handleDelete}
                        onStart={() => router.push(`/session/${block.id}`)}
                        isTimeline
                        isCompleted={completedTodayIds.includes(block.id)}
                      />
                    ))}
                    {isToday(selectedDate) && <CurrentTimeIndicator />}
                  </div>
                </div>
              </div>

              {/* Mobile List View */}
              <div className="md:hidden">
                {blocks.length > 0 ? (
                  <div className="space-y-4">
                    {blocks.map(block => (
                      <BlockCard
                        key={block.id}
                        block={block}
                        subjects={subjects}
                        chapters={chapters}
                        onEdit={handleEditClick}
                        onDelete={handleDelete}
                        onStart={() => router.push(`/session/${block.id}`)}
                        isCompleted={completedTodayIds.includes(block.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No blocks scheduled for this day.</p>
                     <Button variant="link" onClick={handleCreateNewClick} className="px-0">
                      Tap to add one.
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
       {!(isToday(selectedDate) && isBlockLimitReached) && (
            <Button
                className="fixed bottom-20 right-4 z-20 h-14 w-14 rounded-full shadow-lg md:bottom-8 md:right-8"
                aria-label="Add Block"
                onClick={handleCreateNewClick}
            >
                <Plus className="h-8 w-8" />
            </Button>
       )}

      <AddBlockModal 
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedDate={selectedDate}
        user={user}
        onBlockSaved={handleBlockSaved}
        editingBlock={editingBlock}
        subjects={subjects}
        chapters={chapters}
        pomodoroTemplates={pomodoroTemplates}
        activeBlockExistsForDate={isToday(selectedDate) && isBlockLimitReached}
      />
    </>
  );
}


const timeSlots = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM

const TimeGrid = React.memo(function TimeGrid() {
  return (
    <div className="col-start-1 col-end-2 pr-4 text-right">
      {timeSlots.map(hour => (
        <div key={hour} className="relative h-20">
          <div className="absolute -top-3 right-0">
            <span className="text-sm text-muted-foreground">
              {format(new Date(0, 0, 0, hour), 'h a')}
            </span>
          </div>
          <div className="h-full border-t border-muted" />
        </div>
      ))}
    </div>
  );
});

const CurrentTimeIndicator = () => {
    const [top, setTop] = useState(0);

    useEffect(() => {
        const updatePosition = () => {
            const now = new Date();
            const hours = now.getHours();
            const minutes = now.getMinutes();
            // Calculate position only if within schedule range (6 AM to midnight)
            if (hours >= 6) {
                const minutesSince6AM = (hours - 6) * 60 + minutes;
                const newTop = (minutesSince6AM / 60) * 80; // 80px is the height of one hour slot (h-20)
                setTop(newTop);
            }
        };

        updatePosition();
        const interval = setInterval(updatePosition, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    if (top === 0) return null;

    return (
        <div className="absolute w-full" style={{ top: `${top}px` }}>
            <div className="relative h-px bg-red-500">
                <div className="absolute -left-2 -top-1.5 h-3 w-3 rounded-full bg-red-500" />
            </div>
        </div>
    );
};


const BlockCard = React.memo(function BlockCard({ 
  block,
  subjects,
  chapters,
  onEdit, 
  onDelete,
  onStart,
  isTimeline = false,
  isCompleted = false,
}: { 
  block: Block, 
  subjects: Subject[],
  chapters: Chapter[],
  onEdit: (block: Block) => void, 
  onDelete: (id: string) => void,
  onStart: () => void,
  isTimeline?: boolean,
  isCompleted?: boolean,
}) {
  const blockStyles = useMemo(() => {
    let top = 0, height = 0;
    if (isTimeline) {
      const [hour, minute] = block.start_time.split(':').map(Number);
      const minutesSince6AM = (hour - 6) * 60 + minute;
      top = (minutesSince6AM / 60) * 80; // 80px is h-20
      height = (block.duration / 60) * 80;
    }
    
    switch (block.type) {
        case 'Study': return { className: 'bg-blue-100 text-blue-800 border-blue-500 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700', color: 'border-blue-500', top, height };
        case 'Question': return { className: 'bg-green-100 text-green-800 border-green-500 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700', color: 'border-green-500', top, height };
        case 'Revision': return { className: 'bg-orange-100 text-orange-800 border-orange-500 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700', color: 'border-orange-500', top, height };
        default: return { className: '', color: 'border-border', top, height };
    }
  }, [block.start_time, block.duration, block.type, isTimeline]);

  const blockSubjects = useMemo(() => {
    if (!block.subjects || block.subjects.length === 0) return [];
    return subjects.filter(s => block.subjects?.includes(String(s.id)));
  }, [subjects, block.subjects]);

  const blockChapters = useMemo(() => {
    if (!block.chapters || block.chapters.length === 0) return [];
    return chapters.filter(c => block.chapters?.includes(String(c.id)));
  }, [chapters, block.chapters]);

  const formattedTime = useMemo(() => {
      try {
        return format(parse(block.start_time, 'HH:mm', new Date()), 'p');
      } catch (e) {
        return block.start_time;
      }
  }, [block.start_time]);

  const handleEdit = useCallback(() => onEdit(block), [block, onEdit]);
  const handleDelete = useCallback(() => onDelete(block.id), [block.id, onDelete]);

  if (isTimeline) {
    return (
      <div 
        className={cn("absolute w-[calc(100%-1rem)] ml-4 p-3 rounded-lg flex flex-col group", blockStyles.className, isCompleted && "opacity-50")}
        style={{ top: `${blockStyles.top}px`, height: `${blockStyles.height}px` }}
      >
        <div className="flex-1 space-y-1 overflow-hidden">
          <p className="font-semibold truncate">{block.type}: {block.subject || 'Task'}</p>
          <p className="text-xs">{formattedTime} &middot; {block.duration} min</p>
          {blockChapters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {blockChapters.map(chapter => (
                  <span key={chapter.id} className="truncate">{chapter.name}</span>
              ))}
            </div>
          )}
        </div>
        {!isCompleted && (
            <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="sm" variant="ghost" onClick={onStart} className="h-6 px-2"><Play className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={handleEdit} className="h-6 px-2"><Pencil className="h-3 w-3" /></Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-6 px-2"><Trash2 className="h-3 w-3 text-destructive/80" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete Block?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("flex items-center p-4 transition-shadow hover:shadow-md border-l-4 group", blockStyles.color, isCompleted && "bg-muted/50 border-dashed")}>
        <div className="flex-1 space-y-2">
            <Badge variant="outline" className={cn("font-semibold", blockStyles.className, isCompleted && "opacity-60")}>{block.type}</Badge>
            <div className={cn("flex items-baseline gap-4", isCompleted && "text-muted-foreground line-through")}>
                <p className="font-bold text-2xl">{formattedTime}</p>
                <p className="text-sm">{block.duration} min</p>
            </div>
             {blockSubjects.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {blockSubjects.map(subject => (
                        <Badge key={subject.id} variant="secondary" style={{ backgroundColor: `${subject.color}20`, color: subject.color, borderColor: `${subject.color}40` }}>
                            {subject.name}
                        </Badge>
                    ))}
                </div>
             )}
             {blockChapters.length > 0 && (
                <div className="flex flex-wrap items-center gap-1">
                    {blockChapters.map(chapter => (
                        <span key={chapter.id} className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{chapter.name}</span>
                    ))}
                </div>
             )}
        </div>
        {!isCompleted && (
            <div className="flex items-center gap-2">
                <Button onClick={onStart}><Play className="mr-2 h-4 w-4" /> Start</Button>
                <Button variant="ghost" size="icon" onClick={handleEdit}>
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive/80" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Delete Block?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this block? This action cannot be undone.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )}
    </Card>
  );
});



const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

    