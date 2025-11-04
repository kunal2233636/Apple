
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { supabaseBrowserClient } from '@/lib/supabase';
import { Book, Brain, Zap, Clock, Lock, Plus, History, List, Trash2, Box, AlertTriangle, Info, Moon } from 'lucide-react';
import { format, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';
import { MultiSelect } from '@/components/ui/multi-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Block, PomodoroTemplate } from '@/app/(app)/schedule/page';
import type { Subject, Chapter as OriginalChapter, Topic } from '@/app/(app)/topics/page';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { AddTemplateModal } from './add-template-modal';
import { Separator } from '../ui/separator';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRouter } from 'next/navigation';
import { Alert, AlertTitle } from '../ui/alert';
import { logBlockCreated } from '@/lib/ai/activity-logger';

type Chapter = OriginalChapter & {
  is_board_certified?: boolean;
  is_available_for_study?: boolean;
  is_available_for_revision?: boolean;
}

type BlockType = 'Study' | 'Question' | 'Revision';
type Category = 'JEE' | 'BOARDS' | 'OTHERS';

type TopicOption = {
  label: string;
  value: string;
  badge?: 'Rem' | 'Queue' | 'My' | 'SpaRE';
};

type TopicSourceMode = 'my-topics' | 'zero-setup';

export function AddBlockModal({
  isOpen,
  onOpenChange,
  selectedDate,
  user,
  onBlockSaved,
  editingBlock,
  subjects,
  chapters,
  pomodoroTemplates,
  activeBlockExistsForDate,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  selectedDate: Date;
  user: User | null;
  onBlockSaved: () => void;
  editingBlock?: Block | null;
  subjects: Subject[];
  chapters: Chapter[];
  pomodoroTemplates: PomodoroTemplate[];
  activeBlockExistsForDate?: boolean;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [blockType, setBlockType] = useState<BlockType>('Study');
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  
  const [topicOptions, setTopicOptions] = useState<TopicOption[]>([]);
  
  const [templateId, setTemplateId] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [allTemplates, setAllTemplates] = useState<PomodoroTemplate[]>(pomodoroTemplates);
  const [topicSourceMode, setTopicSourceMode] = useState<TopicSourceMode>('my-topics');
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isConfirmingCategoryChange, setIsConfirmingCategoryChange] = useState<Category | null>(null);
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<{
    subjects?: string;
    chapters?: string;
    topics?: string;
  }>({});

  // State for manual topic selection in Revision blocks
  const [manualSubject, setManualSubject] = useState<string>('');
  const [manualChapter, setManualChapter] = useState<string>('');
  const [manualTopic, setManualTopic] = useState<string>('');
  const [manualChapters, setManualChapters] = useState<Chapter[]>([]);
  const [manualTopics, setManualTopics] = useState<Topic[]>([]);
  const [manuallyAddedTopics, setManuallyAddedTopics] = useState<Topic[]>([]);
  
  const [pendingBoardsCount, setPendingBoardsCount] = useState(0);
  const [pendingBoardsChapters, setPendingBoardsChapters] = useState<Chapter[]>([]);
  const [isPendingAlertOpen, setIsPendingAlertOpen] = useState(false);

  const [isEveningMode, setIsEveningMode] = useState(false);
  
  useEffect(() => {
    setAllTemplates(pomodoroTemplates);
  }, [pomodoroTemplates]);

  // Validation logic
  const validateForm = useCallback(() => {
    const errors: { subjects?: string; chapters?: string; topics?: string } = {};
    
    // Skip validation for zero-setup mode
    if (topicSourceMode === 'zero-setup') {
      setValidationErrors({});
      return true;
    }
    
    // For regular setup modes, validate requirements
    if (blockType === 'Study' || blockType === 'Question') {
      if (selectedSubjects.length === 0) {
        errors.subjects = 'At least one subject is required';
      }
      if (selectedChapters.length === 0) {
        errors.chapters = 'At least one chapter is required';
      }
      if (selectedTopics.length === 0) {
        errors.topics = 'At least one topic is required';
      }
    } else if (blockType === 'Revision') {
      // For revision blocks, check if any topics are selected (either from SpaRE or manually added)
      const hasSelectedTopics = selectedTopics.length > 0 || manuallyAddedTopics.length > 0;
      if (!hasSelectedTopics) {
        errors.topics = 'At least one topic is required for revision blocks';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [blockType, topicSourceMode, selectedSubjects, selectedChapters, selectedTopics, manuallyAddedTopics]);

  useEffect(() => {
    validateForm();
  }, [validateForm]);

  const isEditing = !!editingBlock;
  
  const selectedTemplate = useMemo(() => {
    return allTemplates.find(t => t.id === templateId);
  }, [templateId, allTemplates]);

  const isDurationFromTemplate = useMemo(() => blockType === 'Study' && !!selectedTemplate, [blockType, selectedTemplate]);
  
  // Effect to check for pending BOARDS questions
  useEffect(() => {
    if (isOpen && user) {
        const fetchPendingStatus = async () => {
            const { data, error, count } = await supabaseBrowserClient
                .from('chapters')
                .select('id, name', { count: 'exact' })
                .eq('user_id', user.id)
                .eq('category', 'BOARDS')
                .eq('has_pending_questions', true);
            
            if (error) {
                console.error("Error fetching pending boards chapters:", error);
            } else {
                setPendingBoardsCount(count || 0);
                setPendingBoardsChapters(data as Chapter[] || []);
            }
        };
        fetchPendingStatus();
    }
  }, [isOpen, user]);

  // Effect to handle initialization and editing state
  useEffect(() => {
    if (isOpen) {
        // Check for evening mode first
        const eveningRevisionTimeStr = user?.user_metadata?.evening_revision_time || '20:00';
        const [hours, minutes] = eveningRevisionTimeStr.split(':').map(Number);
        const now = new Date();
        const revisionStartTime = new Date();
        revisionStartTime.setHours(hours, minutes, 0, 0);

        const isEvening = isToday(selectedDate) && now >= revisionStartTime;
        setIsEveningMode(isEvening);

        if (isEditing && editingBlock) {
            setBlockType(editingBlock.type);
            setSelectedCategory(editingBlock.category || null);
            setStartTime(editingBlock.start_time);
            setDuration(editingBlock.duration);
            setSelectedSubjects(editingBlock.subjects || []);
            setSelectedChapters(editingBlock.chapters || []);
            setSelectedTopics(editingBlock.topics || []);
            setTemplateId(editingBlock.template_id || undefined);
            setManuallyAddedTopics([]);
            setTopicSourceMode('my-topics');
        } else {
            // Reset to default for new block
            setStartTime(format(now, 'HH:mm'));
            setDuration(60);
            setSelectedSubjects([]);
            setSelectedChapters([]);
            setSelectedTopics([]);
            const classicTemplate = allTemplates.find(t => t.name === 'Classic');
            setTemplateId(classicTemplate?.id);
            setManuallyAddedTopics([]);
            setTopicSourceMode('my-topics');

            if (isEvening) {
                setSelectedCategory('JEE');
                setBlockType('Revision');
            } else {
                setSelectedCategory(null);
                setBlockType('Study');
            }
        }
    }
  }, [editingBlock, isEditing, isOpen, allTemplates, user, selectedDate]);


  // Effect to update duration from template
  useEffect(() => {
    if (blockType === 'Study' && selectedTemplate) {
        const totalDuration = selectedTemplate.sessions_json.reduce((acc, s) => acc + s.duration, 0);
        setDuration(totalDuration);
    }
  }, [selectedTemplate, blockType]);
  
  // Effect to fetch chapters for subject selection
  useEffect(() => {
    if (blockType === 'Revision') {
        if (!manualSubject) {
            setManualChapters([]);
            setManualChapter('');
            return;
        }
        // Filter chapters by both subject and selected category
        const relevantChapters = chapters.filter(c =>
            String(c.subject_id) === manualSubject &&
            (!selectedCategory || c.category === selectedCategory)
        );
        setManualChapters(relevantChapters);
    }
  }, [manualSubject, chapters, blockType, selectedCategory]);

  // Effect to fetch topics for chapter selection
  useEffect(() => {
    if (blockType === 'Revision') {
        if (!manualChapter) {
            setManualTopics([]);
            setManualTopic('');
            return;
        }
        const fetchTopicsForChapter = async () => {
            const { data, error } = await supabaseBrowserClient.from('topics').select('*').eq('chapter_id', manualChapter);
            if (error) {
                toast({ variant: 'destructive', title: 'Error fetching topics' });
            } else {
                setManualTopics(data as Topic[] || []);
            }
        };
        fetchTopicsForChapter();
    }
  }, [manualChapter, blockType, toast]);
  

  // Effect to fetch topics based on block type, selections, etc.
  useEffect(() => {
    if (!user || !isOpen || topicSourceMode === 'zero-setup' || !selectedCategory) {
        setTopicOptions([]);
        return;
    };
    const todayString = format(new Date(), 'yyyy-MM-dd');

    const fetchTopics = async () => {
        let fetchedOptions: TopicOption[] = [];

        if ((blockType === 'Study' || blockType === 'Question')) {
            
            let query = supabaseBrowserClient
                .from('topics')
                .select('id, name, is_remaining, category')
                .in('chapter_id', selectedChapters)
                .eq('user_id', user.id)
                .or('is_spare_only.is.null,is_spare_only.eq.false');

            if (blockType === 'Study') {
                query = query.neq('status', 'completed');
            }

            const { data: chapterTopics, error: topicsError } = await (
                selectedChapters.length > 0 ? query : Promise.resolve({ data: [], error: null })
            );

            if (topicsError) {
                toast({ variant: 'destructive', title: 'Error fetching topics', description: topicsError.message });
            } else if (topicSourceMode === 'my-topics' && chapterTopics) {
                const sortedTopics = chapterTopics.sort((a, b) => {
                    if (a.is_remaining && !b.is_remaining) return -1;
                    if (!a.is_remaining && b.is_remaining) return 1;
                    return 0; 
                });

                const myTopicOptions = sortedTopics.map(t => ({
                    label: t.name, 
                    value: String(t.id), 
                    badge: t.is_remaining ? 'Rem' as const : undefined
                }));
                fetchedOptions.push(...myTopicOptions);
            }
        } else if (blockType === 'Revision') {
            const { data, error } = await supabaseBrowserClient
                .from('topics')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_in_spare', true)
                .lte('next_revision_date', todayString)
                .lt('revision_count', 5)
                .eq('category', selectedCategory);
            
            if (error) {
                toast({ variant: 'destructive', title: 'Error fetching SpaRE topics', description: error.message });
            } else {
                fetchedOptions = (data as Topic[] || []).map(t => ({
                    label: t.name, value: String(t.id), badge: 'SpaRE' as const
                }));
            }
        }

        const uniqueOptions = Array.from(new Map(fetchedOptions.map(item => [item.value, item])).values());
        setTopicOptions(uniqueOptions);

        const optionValues = new Set(uniqueOptions.map(o => o.value));
        setSelectedTopics(prev => prev.filter(t => optionValues.has(t)));
    };

    fetchTopics();
  }, [blockType, selectedChapters, user, toast, isOpen, topicSourceMode, selectedCategory]);


  const handleAddManualTopic = () => {
    if (!manualTopic) return;
    const topicToAdd = manualTopics.find(t => String(t.id) === manualTopic);
    if (topicToAdd && !manuallyAddedTopics.some(t => t.id === topicToAdd.id)) {
      setManuallyAddedTopics(prev => [...prev, topicToAdd]);
    }
    setManualTopic('');
  };
  
  const handleRemoveManualTopic = (topicId: number) => {
    setManuallyAddedTopics(prev => prev.filter(t => t.id !== topicId));
  };


  const subjectOptions = useMemo(() => {
    if (!selectedCategory) return [];
    return subjects
      .filter(s => (s.category || 'OTHERS') === selectedCategory)
      .map(s => ({ label: `${s.name} (${s.category})`, value: String(s.id) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [subjects, selectedCategory]);

  const chapterOptions = useMemo(() => {
    if (!selectedCategory) return [];

    let availableChapters = chapters.filter(c => {
        const matchesCategory = (c.category || 'OTHERS') === selectedCategory;
        const matchesSubject = selectedSubjects.length > 0 ? selectedSubjects.includes(String(c.subject_id)) : true;
        return matchesCategory && matchesSubject;
    });

    if (blockType === 'Study' || blockType === 'Question') {
        availableChapters = availableChapters.filter(c => !(c as Chapter).is_board_certified);
    } else if (blockType === 'Revision') {
        availableChapters = availableChapters.filter(c => (c as Chapter).is_board_certified);
    }
    
    const subjectMap = new Map(subjects.map(s => [s.id, s.name]));

    return availableChapters.map(c => ({ 
        label: `${c.name} (${subjectMap.get(c.subject_id) || 'Unknown Subject'})`, 
        value: String(c.id) 
    })).sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedSubjects, chapters, selectedCategory, blockType, subjects]);


  const handleSave = useCallback(async () => {
    if (!user || !selectedCategory) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a category and ensure you are logged in.' });
      return;
    }
    
    // Validate form before saving
    if (!validateForm()) {
      toast({
        variant: 'destructive',
        title: 'Validation Failed',
        description: 'Please ensure all required fields are filled correctly.'
      });
      return;
    }
    
    if (activeBlockExistsForDate && !isEditing) {
        toast({
            variant: "destructive",
            title: "Active Block Exists",
            description: "You can only have one active block per day. Please complete or delete the existing block for today.",
        });
        return;
    }
  
    setIsSaving(true);
  
    let finalSubjects: string[] = selectedSubjects;
    let finalChapters: string[] = selectedChapters;
    let finalTopics: string[] = selectedTopics;
    let singleSubjectName = '';
  
    if (blockType === 'Revision') {
      const manualTopicIds = manuallyAddedTopics.map(t => String(t.id));
      finalTopics = [...new Set([...selectedTopics, ...manualTopicIds])];
    } else if (topicSourceMode === 'zero-setup') {
      finalSubjects = [];
      finalChapters = [];
      finalTopics = [];
    }
  
    if (finalTopics.length > 0) {
      const { data: topicDetails, error: topicDetailsError } = await supabaseBrowserClient
        .from('topics')
        .select('chapter_id, subject_id')
        .in('id', finalTopics);
  
      if (topicDetailsError) {
        toast({ variant: 'destructive', title: 'Error fetching topic details', description: topicDetailsError.message });
        setIsSaving(false);
        return;
      }
  
      finalSubjects = [...new Set(topicDetails.map(t => String(t.subject_id)))];
      finalChapters = [...new Set(topicDetails.map(t => String(t.chapter_id)))];
    }
    
    if (finalSubjects.length === 1) {
        const foundSubject = subjects.find(s => String(s.id) === finalSubjects[0]);
        singleSubjectName = foundSubject?.name || '';
    } else if (finalSubjects.length > 1) {
        singleSubjectName = `${finalSubjects.length} subjects`;
    }
  
    const blockData: Omit<Block, 'id'> & { id?: string } = {
      user_id: user.id,
      date: format(selectedDate, 'yyyy-MM-dd'),
      type: blockType,
      category: selectedCategory,
      start_time: startTime,
      duration: duration,
      subject: singleSubjectName,
      subjects: finalSubjects,
      chapters: finalChapters,
      topics: finalTopics,
      template_id: blockType === 'Study' ? templateId : null,
    };
  
    let error;
    let savedBlock: Block | null = null;

    if (isEditing && editingBlock) {
      const { data, error: updateError } = await supabaseBrowserClient
        .from('blocks')
        .update(blockData)
        .eq('id', editingBlock.id)
        .select()
        .single();
      error = updateError;
      if (data) savedBlock = data;
    } else {
      const { data, error: insertError } = await supabaseBrowserClient.from('blocks').insert(blockData).select().single();
      error = insertError;
      if (data) savedBlock = data;
    }
    
    if (!error && !isEditing && savedBlock) {
        try {
            await logBlockCreated(user.id, savedBlock);
        } catch (logError) {
            console.error("Failed to log block creation:", logError);
        }
    }
    
    if (!error && (blockType === 'Study' || blockType === 'Question') && finalTopics.length > 0) {
        const { error: topicUpdateError } = await supabaseBrowserClient
            .from('topics')
            .update({
                is_remaining: true,
                remaining_since_date: new Date().toISOString(),
            })
            .in('id', finalTopics);
        
        if (topicUpdateError) {
            console.error("Error marking topics as remaining:", topicUpdateError.message);
            toast({
                variant: 'destructive',
                title: 'Could not update topics',
                description: 'The block was saved, but failed to mark topics as "Remaining".'
            });
        } else {
            toast({ title: 'Topics marked as Remaining' });
        }
    }
  
    setIsSaving(false);
  
    if (error) {
      console.error("Save block error:", error?.message || error);
      toast({ 
          variant: 'destructive', 
          title: 'Uh oh! Something went wrong.', 
          description: error.message || "An unknown error occurred while saving the block." 
      });
    } else {
      toast({ title: `Block ${isEditing ? 'updated' : 'added'} successfully` });
      onBlockSaved();
    }
  }, [
    user, blockType, startTime, duration, toast, isEditing, editingBlock, selectedDate, 
    selectedSubjects, selectedChapters, selectedTopics, manuallyAddedTopics, templateId, onBlockSaved, topicSourceMode, selectedCategory, activeBlockExistsForDate, subjects
  ]);
  
  const blockTypeOptions: { name: BlockType; icon: React.ElementType; color: string; hoverColor: string }[] = [
    { name: 'Study', icon: Book, color: '#3B82F6', hoverColor: 'hover:bg-blue-700' },
    { name: 'Question', icon: Zap, color: '#10B981', hoverColor: 'hover:bg-green-700' },
    { name: 'Revision', icon: Brain, color: '#F59E0B', hoverColor: 'hover:bg-orange-600' },
  ];

  const templateTotalDuration = useMemo(() => {
    if (!isDurationFromTemplate || !selectedTemplate) return null;
    return selectedTemplate.sessions_json.reduce((acc, s) => acc + s.duration, 0);
  }, [isDurationFromTemplate, selectedTemplate]);

  const handleTemplateSelection = (value: string) => {
    if (value === 'create-new') {
        setIsTemplateModalOpen(true);
    } else {
        setTemplateId(value);
    }
  };

  const handleTemplateSaved = (newTemplate?: PomodoroTemplate) => {
      setIsTemplateModalOpen(false);
      if (newTemplate) {
          setAllTemplates(prev => [...prev, newTemplate]);
          setTemplateId(newTemplate.id);
      }
  };

  const handleTopicSourceChange = (mode: TopicSourceMode) => {
    setTopicSourceMode(mode);
    setSelectedSubjects([]);
    setSelectedChapters([]);
    setSelectedTopics([]);
  }

  const handleCategoryChange = (newCategory: Category) => {
    if (isEveningMode) return;
    if (selectedCategory !== newCategory && (selectedChapters.length > 0 || selectedSubjects.length > 0 || selectedTopics.length > 0)) {
      setIsConfirmingCategoryChange(newCategory);
    } else {
      setSelectedCategory(newCategory);
    }
  };

  const confirmCategoryChange = () => {
    if (isConfirmingCategoryChange) {
      setSelectedCategory(isConfirmingCategoryChange);
      setSelectedSubjects([]);
      setSelectedChapters([]);
      setSelectedTopics([]);
      setManuallyAddedTopics([]);
      setIsConfirmingCategoryChange(null);
    }
  };
  
  const cancelCategoryChange = () => {
    setIsConfirmingCategoryChange(null);
  };
  
  const handleBoardsLockClick = () => {
    if (pendingBoardsCount > 0) {
        setIsPendingAlertOpen(true);
    }
  };


  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? 'Edit Block' : 'Add New Block'}</DialogTitle>
           {selectedCategory && (
            <Badge 
              variant="outline" 
              className={cn(
                "w-fit",
                selectedCategory === 'JEE' && "border-blue-500 bg-blue-100 text-blue-800",
                selectedCategory === 'BOARDS' && "border-green-500 bg-green-100 text-green-800",
                selectedCategory === 'OTHERS' && "border-gray-500 bg-gray-100 text-gray-800"
              )}
            >
              For: {selectedCategory}
            </Badge>
          )}
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-6 -mr-6">
          <div className="grid gap-6 py-4">

            {isEveningMode && (
                <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700">
                    <Moon className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 dark:text-blue-300">Evening Revision Mode Active</AlertTitle>
                    <DialogDescription className="text-blue-700 dark:text-blue-400">
                        Only JEE Revision blocks can be created for today.
                    </DialogDescription>
                </Alert>
            )}

            <div>
                <label className="text-sm font-medium">Select Study Category*</label>
                <RadioGroup 
                    value={selectedCategory || undefined}
                    onValueChange={(val) => handleCategoryChange(val as Category)}
                    className="grid grid-cols-3 gap-2 mt-2"
                >
                    {(['JEE', 'BOARDS', 'OTHERS'] as Category[]).map((cat) => {
                        const isBoardsLocked = cat === 'BOARDS' && pendingBoardsCount > 0;
                        const isDisabled = isEveningMode && cat !== 'JEE';
                        return (
                        <div key={cat} onClick={isBoardsLocked ? handleBoardsLockClick : undefined} className={cn((isBoardsLocked || isDisabled) && "cursor-not-allowed")}>
                            <Label htmlFor={`cat-${cat}`} className={cn(
                                "flex items-center justify-center gap-2 rounded-md border-2 p-3 text-sm font-semibold transition-colors", 
                                selectedCategory === cat ? 'border-primary' : 'border-muted hover:border-muted-foreground',
                                (isBoardsLocked || isDisabled) ? "opacity-50 bg-muted" : "cursor-pointer"
                            )}>
                                <RadioGroupItem value={cat} id={`cat-${cat}`} className="sr-only" disabled={isBoardsLocked || isDisabled} />
                                {isBoardsLocked && <Lock className="h-4 w-4" />}
                                {cat}
                                {isBoardsLocked && <Badge variant="destructive" className="h-5 w-5 p-0 justify-center">{pendingBoardsCount}</Badge>}
                            </Label>
                        </div>
                    )})}
                </RadioGroup>
            </div>
            
            <div className={cn(!selectedCategory && 'opacity-50 pointer-events-none')}>
              <label className="text-sm font-medium">Block Type</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {blockTypeOptions.map((option) => {
                  const isDisabled = isEveningMode && option.name !== 'Revision';
                  return (
                  <Button
                    key={option.name}
                    variant="outline"
                    className={cn(
                      "flex flex-col h-20 text-sm gap-1",
                      blockType === option.name ? 'text-white' : 'bg-transparent',
                      isDisabled && 'opacity-50 cursor-not-allowed bg-muted'
                    )}
                    style={blockType === option.name && !isDisabled ? { backgroundColor: option.color } : {}}
                    onClick={() => !isDisabled && setBlockType(option.name)}
                    disabled={isDisabled}
                  >
                    {isDisabled && <Lock className="absolute h-4 w-4" />}
                    <option.icon className="h-5 w-5" />
                    {option.name}
                  </Button>
                )})}
              </div>
            </div>

            <Separator />
            
            <div className={cn("space-y-4", !selectedCategory && 'opacity-50 pointer-events-none')}>
              <Label>Topics</Label>
              {!selectedCategory && (
                  <div className="text-center text-sm text-muted-foreground p-4 bg-muted/50 rounded-md">
                      Please select a category to see available topics.
                  </div>
              )}
               {selectedCategory && (blockType === 'Study' || blockType === 'Question') ? (
                <Tabs value={topicSourceMode} onValueChange={(value) => handleTopicSourceChange(value as TopicSourceMode)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="my-topics">My Topics</TabsTrigger>
                        {blockType === 'Study' && <TabsTrigger value="zero-setup">Zero Setup</TabsTrigger>}
                    </TabsList>
                    <TabsContent value="my-topics" className="space-y-4 pt-2">
                        <div>
                            <label className="text-sm font-medium flex items-center gap-2">
                                Subjects {validationErrors.subjects && <AlertTriangle className="h-4 w-4 text-destructive" />}
                            </label>
                            <MultiSelect
                                options={subjectOptions}
                                onValueChange={setSelectedSubjects}
                                defaultValue={selectedSubjects}
                                placeholder="Select subjects..."
                                className={cn(
                                    "mt-2",
                                    validationErrors.subjects && "border-destructive focus-visible:ring-destructive"
                                )}
                                disabled={isSaving}
                            />
                            {validationErrors.subjects && (
                                <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {validationErrors.subjects}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium flex items-center gap-2">
                                Chapters {validationErrors.chapters && <AlertTriangle className="h-4 w-4 text-destructive" />}
                            </label>
                            <MultiSelect
                                options={chapterOptions}
                                onValueChange={setSelectedChapters}
                                defaultValue={selectedChapters}
                                placeholder={selectedSubjects.length === 0 ? "Select subjects to see chapters" : "Select chapters..."}
                                className={cn(
                                    "mt-2",
                                    validationErrors.chapters && "border-destructive focus-visible:ring-destructive"
                                )}
                                disabled={isSaving || selectedSubjects.length === 0}
                            />
                            {validationErrors.chapters && (
                                <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {validationErrors.chapters}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-sm font-medium flex items-center gap-2">
                                Topics {validationErrors.topics && <AlertTriangle className="h-4 w-4 text-destructive" />}
                            </label>
                            <MultiSelect
                                options={topicOptions}
                                onValueChange={setSelectedTopics}
                                defaultValue={selectedTopics}
                                placeholder={selectedChapters.length === 0 ? "Select chapters to see topics" : "Select topics..."}
                                className={cn(
                                    "mt-2",
                                    validationErrors.topics && "border-destructive focus-visible:ring-destructive"
                                )}
                                disabled={isSaving || selectedChapters.length === 0}
                            />
                            {validationErrors.topics && (
                                <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {validationErrors.topics}
                                </p>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="zero-setup">
                         <Card className="p-4 mt-4 bg-muted/50 text-center">
                            <p className="text-sm text-muted-foreground">Quick study session without topic tracking.</p>
                        </Card>
                    </TabsContent>
                </Tabs>
              ) : selectedCategory && ( // Revision Block
                <>
                  <div>
                    <Label className="flex items-center gap-2">
                      Topics from SpaRE {validationErrors.topics && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    </Label>
                     <MultiSelect
                        options={topicOptions}
                        onValueChange={setSelectedTopics}
                        defaultValue={selectedTopics}
                        placeholder={'Select from due SpaRE topics...'}
                        className={cn(
                          "mt-2",
                          validationErrors.topics && "border-destructive focus-visible:ring-destructive"
                        )}
                        disabled={isSaving}
                     />
                     {validationErrors.topics && selectedTopics.length === 0 && manuallyAddedTopics.length === 0 && (
                       <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                         <AlertTriangle className="h-3 w-3" />
                         {validationErrors.topics}
                       </p>
                     )}
                  </div>
                  <Separator />
                  <div>
                    <Label>Add Manually</Label>
                    <div className="space-y-2 mt-2 p-4 border rounded-md bg-muted/50">
                        <Select value={manualSubject} onValueChange={setManualSubject} disabled={isSaving}>
                             <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                             <SelectContent>{subjectOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={manualChapter} onValueChange={setManualChapter} disabled={isSaving || !manualSubject}>
                             <SelectTrigger><SelectValue placeholder="Select Chapter" /></SelectTrigger>
                             <SelectContent>{manualChapters.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={manualTopic} onValueChange={setManualTopic} disabled={isSaving || !manualChapter}>
                             <SelectTrigger><SelectValue placeholder="Select Topic" /></SelectTrigger>
                             <SelectContent>{manualTopics.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button onClick={handleAddManualTopic} size="sm" className="w-full" disabled={!manualTopic}><Plus className="mr-2 h-4 w-4"/>Add Topic to Block</Button>
                    </div>
                  </div>
                  {manuallyAddedTopics.length > 0 && (
                     <div className="space-y-2">
                        <Label>Manually Added Topics</Label>
                        <div className="space-y-2">
                          {manuallyAddedTopics.map(topic => (
                             <div key={topic.id} className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded-md">
                               <span>{topic.name}</span>
                               <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveManualTopic(topic.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                             </div>
                          ))}
                        </div>
                     </div>
                  )}
                </>
              )}
            </div>
            
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label htmlFor="start-time" className="text-sm font-medium">Start Time</label>
                <Input
                  id="start-time"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-2"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input
                  value={format(selectedDate, 'PPP')}
                  readOnly
                  className="mt-2 bg-muted"
                />
              </div>
            </div>

            {blockType === 'Study' && (
              <div className="space-y-2">
                <label htmlFor="template-select" className="text-sm font-medium">Pomodoro Template</label>
                <Select value={templateId} onValueChange={handleTemplateSelection} disabled={isSaving}>
                  <SelectTrigger id="template-select">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {allTemplates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} ({template.sessions_json.length} sessions)
                      </SelectItem>
                    ))}
                    <Separator className="my-1" />
                    <SelectItem value="create-new" className="text-primary focus:text-primary">
                        <div className="flex items-center gap-2">
                           <Plus className="h-4 w-4" />
                           Create New Template
                        </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <Card className="p-3 bg-muted/50">
                    <div className="flex flex-wrap gap-2 items-center">
                      {selectedTemplate.sessions_json.map((session, index) => (
                        <Badge key={index} variant={session.type === 'study' ? 'default' : 'secondary'} className={cn(session.type === 'study' ? 'bg-blue-500/80' : 'bg-green-500/80', "text-white")}>
                          <Clock className="h-3 w-3 mr-1" /> {session.duration}m
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      Total time: {templateTotalDuration} min
                    </p>
                  </Card>
                )}
              </div>
            )}
            
            <div>
              <label htmlFor="duration" className="text-sm font-medium flex items-center gap-2">
                Duration: {duration} min
                {isDurationFromTemplate && <Lock className="h-3 w-3 text-muted-foreground" />}
              </label>
               {isDurationFromTemplate && (
                  <p className="text-xs text-muted-foreground mt-1">Duration is set by the selected Pomodoro template.</p>
              )}
              <Slider
                id="duration"
                min={10}
                max={180}
                step={5}
                value={[duration]}
                onValueChange={(value) => setDuration(value[0])}
                className="mt-3"
                disabled={isSaving || isDurationFromTemplate}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !selectedCategory || Object.keys(validationErrors).length > 0}
            className={cn(
              Object.keys(validationErrors).length > 0 && "border-destructive text-destructive"
            )}
          >
            {isSaving ? 'Saving...' : isEditing ? 'Update Block' : 'Save Block'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!isConfirmingCategoryChange} onOpenChange={() => setIsConfirmingCategoryChange(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Change Category?</AlertDialogTitle>
                <AlertDialogDescription>
                    Changing the category will clear your current selections for subjects, chapters, and topics. Are you sure you want to continue?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={cancelCategoryChange}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmCategoryChange}>Yes, Change Category</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    
     <AlertDialog open={isPendingAlertOpen} onOpenChange={setIsPendingAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive" /> BOARDS Category Locked</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div>
                    You have pending questions for the following chapters. Complete their certification to unlock this category.
                    <ul className="list-disc pl-5 mt-4 space-y-1 font-medium text-foreground">
                       {pendingBoardsChapters.map(c => <li key={c.id}>{c.name}</li>)}
                    </ul>
                  </div>
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                    setIsPendingAlertOpen(false);
                    onOpenChange(false);
                    router.push(`/boards?highlight=${pendingBoardsChapters[0]?.id || ''}`);
                }}>
                    Go to Boards Page
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>


    {user && (
        <AddTemplateModal
            isOpen={isTemplateModalOpen}
            onOpenChange={setIsTemplateModalOpen}
            user={user}
            onTemplateSaved={handleTemplateSaved}
            editingTemplate={null}
        />
    )}
    </>
  );
}

    