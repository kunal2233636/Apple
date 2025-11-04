
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import { Plus, Pencil, Trash2, ChevronDown, Circle, CheckCircle2, LoaderCircle, History, BrainCircuit, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Label } from '@/components/ui/label';
import { AddTopicModal } from '@/components/modals/add-topic-modal';
import { Checkbox } from '@/components/ui/checkbox';


export type Subject = {
  id: number;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  category: 'JEE' | 'BOARDS' | 'OTHERS' | null;
};

export type Chapter = {
  id: number;
  subject_id: number;
  name: string;
  created_at: string;
  user_id: string;
  category: 'JEE' | 'BOARDS' | 'OTHERS' | null;
  subjects?: Subject;
};

export type Topic = {
  id: number;
  chapter_id: number;
  subject_id: number;
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
  chapter: { name: string, subject: { name: string, id: number } };
  is_remaining?: boolean;
  remaining_since_date?: string | null;
  studied_count?: number;
  is_spare_only?: boolean;
  is_half_done?: boolean;
  category: 'JEE' | 'BOARDS' | 'OTHERS' | null;
};
  
export type RevisionItem = {
  topic: Topic;
  isDueFromSpare: boolean;
};


const presetColors = [
  '#2563EB', // Blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#F59E0B', // Orange
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

export default function TopicsPage() {
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  const [currentSubjectForChapter, setCurrentSubjectForChapter] = useState<Subject | null>(null);
  const [currentChapterForTopic, setCurrentChapterForTopic] = useState<Chapter | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  
  const [isFetching, setIsFetching] = useState(true);
  
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  
  const [remainingTopics, setRemainingTopics] = useState<Topic[]>([]);


  const fetchData = useCallback(async (userId: string) => {
    setIsFetching(true);
    const [
      { data: subjectsData, error: subjectsError },
      { data: chaptersData, error: chaptersError },
      { data: topicsData, error: topicsError },
      { data: remainingTopicsData, error: remainingTopicsError }
    ] = await Promise.all([
      supabaseBrowserClient.from('subjects').select('*').eq('user_id', userId).order('category').order('name'),
      supabaseBrowserClient.from('chapters').select('*, subjects(*)').eq('user_id', userId).order('name', { ascending: true }),
      supabaseBrowserClient.from('topics').select('*, chapter:chapters(name, subject:subjects(name, id))').eq('user_id', userId).or('is_spare_only.is.null,is_spare_only.eq.false').order('created_at', { ascending: true }),
      supabaseBrowserClient.from('topics').select('*, chapter:chapters(name, subject:subjects(name, id))').eq('user_id', userId).eq('is_remaining', true).order('remaining_since_date', { ascending: true })
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

    if (remainingTopicsError) {
      toast({ variant: "destructive", title: "Error fetching remaining topics", description: remainingTopicsError.message });
    } else {
      setRemainingTopics((remainingTopicsData as Topic[]) || []);
    }

    setIsFetching(false);
  }, [toast]);

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
      fetchData(user.id);
    }
  }, [user, fetchData]);

  const onDataSaved = useCallback(async () => {
    setIsSubjectModalOpen(false);
    setEditingSubject(null);
    setIsChapterModalOpen(false);
    setEditingChapter(null);
    setCurrentSubjectForChapter(null);
    setIsTopicModalOpen(false);
    setEditingTopic(null);
    setCurrentChapterForTopic(null);
    if (user) {
      await fetchData(user.id);
    }
  }, [user, fetchData]);
  
  // Handlers for Modals
  const handleAddSubjectClick = () => { setEditingSubject(null); setIsSubjectModalOpen(true); };
  const handleEditSubjectClick = (subject: Subject) => { setEditingSubject(subject); setIsSubjectModalOpen(true); };
  
  const handleAddChapterClick = (subject: Subject) => { 
    setEditingChapter(null); 
    setCurrentSubjectForChapter(subject); 
    setIsChapterModalOpen(true); 
  };
  const handleEditChapterClick = (chapter: Chapter) => { 
    setEditingChapter(chapter); 
    setCurrentSubjectForChapter(subjects.find(s => s.id === chapter.subject_id) || null); 
    setIsChapterModalOpen(true); 
  };

  const handleAddTopicClick = (chapter: Chapter) => { 
    setEditingTopic(null); 
    setCurrentChapterForTopic(chapter); 
    setIsTopicModalOpen(true); 
  };

  const handleAddTopic = (chapter: Chapter) => handleAddTopicClick(chapter);
  const handleEditTopicClick = (topic: Topic) => { 
    setEditingTopic(topic); 
    setCurrentChapterForTopic(chapters.find(c => c.id === topic.chapter_id) || null); 
    setIsTopicModalOpen(true); 
  };

  const remainingTopicsCount = remainingTopics.length;
  
  const subjectsByCategory = useMemo(() => {
    const categorized: Record<string, Subject[]> = {
      JEE: [],
      BOARDS: [],
      OTHERS: []
    };
    subjects.forEach(subject => {
        categorized[subject.category || 'OTHERS'].push(subject);
    });
    return categorized;
  }, [subjects]);

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Card>
          <Tabs defaultValue="topics">
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Syllabus</CardTitle>
                        <CardDescription>Manage your subjects, chapters, and topics.</CardDescription>
                    </div>
                    <TabsList className="grid w-full sm:w-auto grid-cols-2 mt-4 sm:mt-0">
                        <TabsTrigger value="topics"><BrainCircuit className="h-4 w-4 mr-2" /> My Topics</TabsTrigger>
                        <TabsTrigger value="remaining">
                            <Clock className="h-4 w-4 mr-2" />
                            Remaining
                            {remainingTopicsCount > 0 && (
                                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white text-xs">
                                    {remainingTopicsCount}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>
                </div>
            </CardHeader>
            <TabsContent value="topics">
                <CardHeader className="pt-0">
                    <div className="flex justify-end">
                        <Button onClick={handleAddSubjectClick} size="sm">
                            <Plus className="mr-2 h-4 w-4" /> Add Subject
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                {isFetching ? (
                    <p>Loading topics...</p>
                ) : subjects.length > 0 ? (
                    <div className="space-y-6">
                        {(['JEE', 'BOARDS', 'OTHERS'] as const).map(category => (
                             subjectsByCategory[category].length > 0 && (
                                <div key={category}>
                                    <h2 className="text-xl font-bold mb-3 border-b pb-2">{category}</h2>
                                    <div className="space-y-4">
                                        {subjectsByCategory[category].map(subject => (
                                            <SubjectAccordion 
                                                key={subject.id} 
                                                subject={subject}
                                                chapters={chapters.filter(c => c.subject_id === subject.id)}
                                                topics={topics}
                                                onEditSubject={() => handleEditSubjectClick(subject)}
                                                onAddChapter={() => handleAddChapterClick(subject)}
                                                onEditChapter={handleEditChapterClick}
                                                onAddTopic={handleAddTopicClick}
                                                onEditTopic={handleEditTopicClick}
                                                onDataSaved={onDataSaved}
                                            />
                                        ))}
                                    </div>
                                </div>
                             )
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-muted-foreground">
                    <p>No subjects yet. Add your first subject to get started.</p>
                    </div>
                )}
                </CardContent>
            </TabsContent>
            <TabsContent value="remaining">
                <CardContent>
                    <RemainingTopicsTab topics={remainingTopics} />
                </CardContent>
            </TabsContent>
          </Tabs>
      </Card>

      <AddSubjectModal 
        isOpen={isSubjectModalOpen}
        onOpenChange={setIsSubjectModalOpen}
        user={user}
        onSubjectSaved={onDataSaved}
        editingSubject={editingSubject}
      />
      
      <AddChapterModal
        isOpen={isChapterModalOpen}
        onOpenChange={setIsChapterModalOpen}
        user={user}
        onChapterSaved={onDataSaved}
        editingChapter={editingChapter}
        currentSubject={currentSubjectForChapter}
      />

      <AddTopicModal
        isOpen={isTopicModalOpen}
        onOpenChange={setIsTopicModalOpen}
        user={user}
        onTopicSaved={onDataSaved}
        editingTopic={editingTopic}
        chapters={chapters}
        currentChapter={currentChapterForTopic}
      />
    </>
  );
}

const categoryStyles = {
    JEE: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
    BOARDS: 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700',
    OTHERS: 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600',
};

function SubjectAccordion({ subject, chapters, topics, onEditSubject, onAddChapter, onEditChapter, onAddTopic, onEditTopic, onDataSaved }: { 
  subject: Subject;
  chapters: Chapter[];
  topics: Topic[];
  onEditSubject: () => void;
  onAddChapter: () => void;
  onEditChapter: (chapter: Chapter) => void;
  onAddTopic: (chapter: Chapter) => void;
  onEditTopic: (topic: Topic) => void;
  onDataSaved: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const subjectTopics = useMemo(() => {
    const chapterIds = chapters.map(c => c.id);
    return topics.filter(t => chapterIds.includes(t.chapter_id));
  }, [chapters, topics]);

  const completedTopics = useMemo(() => subjectTopics.filter(t => t.status === 'completed').length, [subjectTopics]);
  const totalTopics = subjectTopics.length;
  const progress = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

  return (
    <>
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="rounded-lg border" style={{ borderLeft: `4px solid ${subject.color}` }}>
      <div className="flex items-center p-3">
        <CollapsibleTrigger asChild className="flex-1">
          <button className="flex items-center text-left w-full group">
            <div className='flex-1'>
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">{subject.name}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <Progress value={progress} className="h-1 w-24" />
                    <span className="text-xs font-medium text-muted-foreground">{Math.round(progress)}%</span>
                </div>
            </div>
            <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <div className="flex gap-1 ml-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onAddChapter}><Plus className="h-4 w-4 text-muted-foreground" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEditSubject}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 text-destructive/80" />
            </Button>
        </div>
      </div>
      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-2">
          {chapters.length > 0 ? (
            chapters.map(chapter => (
              <ChapterAccordion
                key={chapter.id} 
                chapter={chapter}
                topics={topics.filter(t => t.chapter_id === chapter.id)}
                onEditChapter={() => onEditChapter(chapter)}
                onAddTopic={() => onAddTopic(chapter)}
                onEditTopic={onEditTopic}
                onDataSaved={onDataSaved}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground px-4 py-2">No chapters yet. Click the <Plus className="inline h-4 w-4" /> to add one.</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
    <DeleteSubjectDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        subject={subject}
        chapters={chapters}
        onSuccess={onDataSaved}
    />
    </>
  );
}

function ChapterAccordion({ chapter, topics, onEditChapter, onAddTopic, onEditTopic, onDataSaved }: {
  chapter: Chapter;
  topics: Topic[];
  onEditChapter: () => void;
  onAddTopic: (chapter: Chapter) => void;
  onEditTopic: (topic: Topic) => void;
  onDataSaved: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const {toast} = useToast();

  const completedTopics = useMemo(() => topics.filter(t => t.status === 'completed').length, [topics]);
  const totalTopics = topics.length;
  const progress = totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0;

  const handleDeleteTopic = async (topicId: number) => {
    const { error } = await supabaseBrowserClient.from('topics').delete().eq('id', topicId);
    if (error) { toast({ variant: "destructive", title: "Uh oh! Something went wrong.", description: error.message }); }
    else { toast({ title: "Topic Deleted" }); onDataSaved(); }
  };
  
  return (
    <>
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="rounded-md border bg-muted/50 ml-4">
      <div className="flex items-center p-2.5">
        <CollapsibleTrigger asChild className="flex-1">
          <button className="flex items-center text-left w-full group">
             <div className="flex-1">
                <div className="flex items-center gap-2">
                    <p className="font-medium text-md flex-1">{chapter.name}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium text-muted-foreground">{completedTopics} of {totalTopics} topics</span>
                    <Progress value={progress} className="h-1 w-20" />
                </div>
            </div>
            <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>
        <div className="flex gap-1 ml-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onAddTopic(chapter)}><Plus className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEditChapter}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="h-4 w-4 text-destructive/80" />
          </Button>
        </div>
      </div>
      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-2">
          {topics.length > 0 ? (
            topics.map(topic => (
              <TopicCard key={topic.id} topic={topic} onEdit={() => onEditTopic(topic)} onDelete={() => handleDeleteTopic(topic.id)} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground px-4 py-2">No topics yet. Click the <Plus className="inline h-4 w-4" /> to add one.</p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
    <DeleteChapterDialog 
        isOpen={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen} 
        chapter={chapter} 
        topics={topics}
        onSuccess={onDataSaved}
    />
    </>
  );
}

function TopicCard({ topic, onEdit, onDelete }: { topic: Topic; onEdit: () => void; onDelete: () => void; }) {
  const statusIndicator = useMemo(() => {
    switch (topic.status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in_progress': return <LoaderCircle className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'pending': default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  }, [topic.status]);

  const isSpareComplete = topic.is_in_spare && topic.revision_count >= 5;

  return (
    <div className="group flex items-center bg-background rounded-md p-2 pl-4 ml-4">
      <div className="flex items-center gap-3 flex-1">
        {statusIndicator}
        <span className="text-sm font-medium">{topic.name}</span>
        {isSpareComplete ? (
          <Badge variant="outline" className="text-primary border-primary/50 bg-primary/10">
            <History className="mr-1 h-3 w-3" />
            SpaRE Complete
          </Badge>
        ) : topic.status === 'completed' ? (
             <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-900/30">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Study Completed
            </Badge>
        ) : null}
        {topic.is_remaining && topic.status !== 'completed' && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700">
                Remaining
            </Badge>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        {topic.difficulty && <Badge variant="outline">{topic.difficulty}</Badge>}
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-4 w-4 text-destructive/80" /></Button></AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete Topic?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete "{topic.name} ({topic.chapter.name})"?</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onDelete} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}


function AddSubjectModal({ isOpen, onOpenChange, user, onSubjectSaved, editingSubject }: {
  isOpen: boolean; onOpenChange: (isOpen: boolean) => void; user: User | null; onSubjectSaved: () => void; editingSubject: Subject | null;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState(presetColors[0]);
  const [category, setCategory] = useState<'JEE' | 'BOARDS' | 'OTHERS'>('OTHERS');
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!editingSubject;

  useEffect(() => {
    if (isOpen) {
      if (isEditing && editingSubject) {
        setName(editingSubject.name);
        setColor(editingSubject.color);
        setCategory(editingSubject.category || 'OTHERS');
      } else {
        setName('');
        setColor(presetColors[0]);
        setCategory('OTHERS');
      }
    }
  }, [editingSubject, isEditing, isOpen]);

  const handleSave = async () => {
    if (!user) { toast({ variant: "destructive", title: "Authentication Error" }); return; }
    const trimmedName = name.trim();
    if (!trimmedName) { toast({ variant: "destructive", title: "Validation Error", description: "Subject name cannot be empty." }); return; }
    
    setIsSaving(true);
    
    try {
        const subjectData = { user_id: user.id, name: trimmedName, color, category };
        
        let res;
        if (isEditing) {
            res = await supabaseBrowserClient
                .from('subjects')
                .update(subjectData)
                .eq('id', editingSubject.id);
        } else {
            res = await supabaseBrowserClient
                .from('subjects')
                .insert(subjectData);
        }

        if (res.error) {
            if (res.error.code === '23505') {
                toast({
                    variant: "destructive",
                    title: "Duplicate Subject",
                    description: `Subject '${trimmedName}' already exists in the ${category} category (matches are case-insensitive).`,
                });
            } else {
                throw res.error;
            }
        } else {
            toast({ title: `Subject ${isEditing ? 'Updated' : 'Added'}!` }); 
            onSubjectSaved();
        }

    } catch (error: any) {
        toast({ variant: "destructive", title: "Uh oh! Something went wrong.", description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
           <DialogDescription>{isEditing ? `Update details for "${editingSubject?.name} (${editingSubject?.category})".` : 'Create a new subject.'}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div>
            <label htmlFor="subject-name" className="text-sm font-medium">Subject Name</label>
            <Input id="subject-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Physics, Chemistry" className="mt-2" disabled={isSaving} />
          </div>
          <div>
            <Label htmlFor="category-select" className="text-sm font-medium">Category</Label>
            <Select value={category} onValueChange={(value: 'JEE' | 'BOARDS' | 'OTHERS') => setCategory(value)} disabled={isSaving}>
                <SelectTrigger id="category-select" className="mt-2">
                    <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="JEE">JEE</SelectItem>
                    <SelectItem value="BOARDS">BOARDS</SelectItem>
                    <SelectItem value="OTHERS">OTHERS</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Color</label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {presetColors.map((presetColor) => (
                <button key={presetColor} type="button" className={cn("h-10 w-10 rounded-full border-2 transition-transform transform focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", color === presetColor ? 'border-primary scale-110' : 'border-transparent')} style={{ backgroundColor: presetColor }} onClick={() => setColor(presetColor)} aria-label={`Select color ${presetColor}`} disabled={isSaving} />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Update Subject' : 'Save Subject'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddChapterModal({ isOpen, onOpenChange, user, onChapterSaved, editingChapter, currentSubject }: {
  isOpen: boolean; onOpenChange: (isOpen: boolean) => void; user: User | null; onChapterSaved: () => void; editingChapter: Chapter | null; currentSubject: Subject | null;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'JEE' | 'BOARDS' | 'OTHERS'>('OTHERS');
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!editingChapter;

  useEffect(() => {
    if (isOpen) {
      if (isEditing && editingChapter) {
        setName(editingChapter.name);
        setCategory(editingChapter.category || 'OTHERS');
      } else {
        setName('');
        setCategory(currentSubject?.category || 'OTHERS');
      }
    }
  }, [editingChapter, isEditing, isOpen, currentSubject]);

  const handleSave = async () => {
    if (!user) { toast({ variant: "destructive", title: "Authentication Error" }); return; }
    const trimmedName = name.trim();
    if (!trimmedName) { toast({ variant: "destructive", title: "Validation Error", description: "Chapter name is required." }); return; }
    if (!currentSubject?.id) { toast({ variant: "destructive", title: "Error", description: "Subject not selected" }); return; }
    
    setIsSaving(true);
    
    try {
        const chapterData = { name: trimmedName, subject_id: currentSubject.id, user_id: user.id, category };
        let res;
        if (isEditing) {
          res = await supabaseBrowserClient.from('chapters').update({ name: chapterData.name, category: chapterData.category }).eq('id', editingChapter!.id);
        } else {
          res = await supabaseBrowserClient.from('chapters').insert(chapterData);
        }
        
        if (res.error) {
           if (res.error.code === '23505') {
             toast({
                variant: "destructive",
                title: "Duplicate Chapter",
                description: `Chapter '${trimmedName}' already exists in ${currentSubject.name} (matches are case-insensitive).`,
            });
           } else {
             throw res.error;
           }
        } else {
            toast({ title: `Chapter ${isEditing ? 'Updated' : 'Added'}!` });
            onChapterSaved();
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "Uh oh! Something went wrong.", description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Chapter' : 'Add Chapter'}</DialogTitle>
          <DialogDescription>{isEditing ? `Update details for "${editingChapter?.name} (${currentSubject?.name})".` : `Add a new chapter to "${currentSubject?.name} (${currentSubject?.category})".`}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div>
            <Label>Subject</Label>
            <Input value={`${currentSubject?.name} (${currentSubject?.category})` || ''} disabled className="mt-2" />
          </div>
          <div>
            <Label htmlFor="category-select">Category</Label>
            <Select value={category} onValueChange={(value: 'JEE' | 'BOARDS' | 'OTHERS') => setCategory(value)} disabled={isSaving}>
                <SelectTrigger id="category-select" className="mt-2">
                    <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="JEE">JEE</SelectItem>
                    <SelectItem value="BOARDS">BOARDS</SelectItem>
                    <SelectItem value="OTHERS">OTHERS</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="chapter-name">Chapter Name</Label>
            <Input 
              id="chapter-name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g., Kinematics, Alkanes" 
              className="mt-2" 
              disabled={isSaving} 
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Update Chapter' : 'Save Chapter'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
function RemainingTopicsTab({ topics }: { topics: Topic[] }) {
    const router = useRouter();

    if (topics.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <p className="font-semibold text-lg">All caught up!</p>
                <p className="mt-2">No pending topics to complete. 🎉</p>
            </div>
        );
    }
  
    return (
      <div className="space-y-3">
        {topics.map((topic) => (
          <RemainingTopicCard key={topic.id} topic={topic} />
        ))}
      </div>
    );
}

function RemainingTopicCard({ topic }: { topic: Topic }) {
    const router = useRouter();
    const isOverdue = topic.remaining_since_date && new Date().getTime() - new Date(topic.remaining_since_date).getTime() > 7 * 24 * 60 * 60 * 1000;

    const cardClasses = cn(
        "p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-l-4",
        topic.is_half_done
            ? "border-amber-500 bg-amber-50/50 dark:bg-amber-900/20"
            : "border-red-500 bg-red-50/50 dark:bg-red-900/20"
    );

    return (
      <Card className={cardClasses}>
        <div className="flex-1">
            <div className="flex items-center gap-2">
                <p className="font-bold text-lg">{topic.name}</p>
                {topic.is_half_done && (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700">Half Done</Badge>
                )}
            </div>
            <p className="text-sm text-muted-foreground">
                {topic.chapter?.subject?.name || 'Uncategorized'} {'>'} {topic.chapter?.name || 'Uncategorized'}
            </p>
            {topic.remaining_since_date && (
                <p className={cn("text-sm font-medium mt-2", isOverdue ? "text-red-600" : "text-amber-700")}>
                    Pending since: {format(new Date(topic.remaining_since_date), 'PPP')} ({formatDistanceToNowStrict(new Date(topic.remaining_since_date))} ago)
                </p>
            )}
        </div>
      </Card>
    );
}


function DeleteSubjectDialog({ isOpen, onOpenChange, subject, chapters, onSuccess }: {
    isOpen: boolean; onOpenChange: (open: boolean) => void; subject: Subject; chapters: Chapter[]; onSuccess: () => void;
}) {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [cascade, setCascade] = useState(false);
    const [topicsCount, setTopicsCount] = useState(0);

    const chapterCount = chapters.length;

    useEffect(() => {
        if (isOpen && chapterCount > 0) {
            const fetchTopicsCount = async () => {
                const chapterIds = chapters.map(c => c.id);
                const { count, error } = await supabaseBrowserClient.from('topics').select('id', { count: 'exact' }).in('chapter_id', chapterIds);
                if (!error) {
                    setTopicsCount(count || 0);
                }
            };
            fetchTopicsCount();
        } else if (isOpen) {
            setTopicsCount(0);
        }
    }, [isOpen, chapters, chapterCount]);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            if (cascade) {
                const chapterIds = chapters.map(c => c.id);
                if (chapterIds.length > 0) {
                     await supabaseBrowserClient.from('topics').delete().in('chapter_id', chapterIds);
                     await supabaseBrowserClient.from('chapters').delete().in('id', chapterIds);
                }
            }
            const { error } = await supabaseBrowserClient.from('subjects').delete().eq('id', subject.id);
            if (error) throw error;
            toast({ title: `Subject "${subject.name}" and all its contents deleted.` });
            onSuccess();
        } catch (error: any) {
            if (error.code === '23503') {
                toast({ variant: 'destructive', title: 'Deletion Failed', description: `Cannot delete "${subject.name}" because it still contains chapters. Please delete them first or use cascade delete.`});
            } else {
                toast({ variant: 'destructive', title: 'Error deleting subject', description: error.message });
            }
        } finally {
            setIsDeleting(false);
            onOpenChange(false);
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{subject.name}"?</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogDescription asChild>
                    <div>
                    {chapterCount > 0 ? (
                        <div className="space-y-4">
                           <div className="block p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 mt-0.5 text-destructive" />
                                    <div>
                                        <strong className="font-semibold block">This subject contains other items:</strong>
                                        <ul className="list-disc pl-5 mt-2 text-sm">
                                            <li>{chapterCount} {chapterCount === 1 ? 'chapter' : 'chapters'}</li>
                                            <li>{topicsCount} {topicsCount === 1 ? 'topic' : 'topics'}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                             <div className="flex items-center space-x-2 mt-4 p-3 rounded-lg bg-muted/50">
                                <Checkbox id="cascade-delete-subject" checked={cascade} onCheckedChange={c => setCascade(!!c)} />
                                <Label htmlFor="cascade-delete-subject" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Yes, delete this subject and all its contents ({chapterCount} chapters, {topicsCount} topics).
                                </Label>
                            </div>
                            <span className="block text-xs text-muted-foreground">This action is irreversible.</span>
                        </div>
                    ) : (
                        "Are you sure you want to delete this subject? This action cannot be undone."
                    )}
                    </div>
                </AlertDialogDescription>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDelete} 
                        disabled={isDeleting || (chapterCount > 0 && !cascade)}
                        className={cn(buttonVariants({ variant: "destructive" }))}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

function DeleteChapterDialog({ isOpen, onOpenChange, chapter, topics, onSuccess }: {
    isOpen: boolean; onOpenChange: (open: boolean) => void; chapter: Chapter; topics: Topic[]; onSuccess: () => void;
}) {
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [cascade, setCascade] = useState(false);

    const topicsCount = topics.length;

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            if (cascade && topicsCount > 0) {
                const topicIds = topics.map(t => t.id);
                await supabaseBrowserClient.from('topics').delete().in('id', topicIds);
            }
            const { error } = await supabaseBrowserClient.from('chapters').delete().eq('id', chapter.id);
            if (error) throw error;
            toast({ title: `Chapter "${chapter.name}" and its topics deleted.` });
            onSuccess();
        } catch (error: any) {
            if (error.code === '23503') {
                toast({ variant: 'destructive', title: 'Deletion Failed', description: `Cannot delete "${chapter.name}" because it still contains topics. Please delete them first or use cascade delete.` });
            } else {
                toast({ variant: 'destructive', title: 'Error deleting chapter', description: error.message });
            }
        } finally {
            setIsDeleting(false);
            onOpenChange(false);
        }
    };
    
    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{chapter.name}"?</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogDescription asChild>
                    <div>
                    {topicsCount > 0 ? (
                        <div className="space-y-4">
                             <div className="block p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive-foreground">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 mt-0.5 text-destructive" />
                                    <div>
                                        <strong className="font-semibold block">This chapter contains {topicsCount} {topicsCount === 1 ? 'topic' : 'topics'}.</strong>
                                    </div>
                                </div>
                            </div>
                             <div className="flex items-center space-x-2 mt-4 p-3 rounded-lg bg-muted/50">
                                <Checkbox id="cascade-delete-chapter" checked={cascade} onCheckedChange={c => setCascade(!!c)} />
                                <Label htmlFor="cascade-delete-chapter" className="text-sm font-medium leading-none">
                                    Yes, delete this chapter and all {topicsCount} of its topics.
                                </Label>
                            </div>
                        </div>
                    ) : (
                        "Are you sure you want to delete this chapter? This action cannot be undone."
                    )}
                    </div>
                </AlertDialogDescription>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDelete} 
                        disabled={isDeleting || (topicsCount > 0 && !cascade)}
                        className={cn(buttonVariants({ variant: "destructive" }))}
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

    