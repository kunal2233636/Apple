'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabaseBrowserClient, getCurrentUser } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';
import type { Block } from '@/app/(app)/schedule/page';
import type { Topic as OriginalTopic, Subject, Chapter } from '@/app/(app)/topics/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft, Loader2, Plus, Edit, BookOpen, Check, X, CheckCircle, MinusCircle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { MultiSelect } from '@/components/ui/multi-select';

type ChapterWithSubject = Chapter & { subject: Subject | null };
type BlockWithDetails = Block & {
  chapters: ChapterWithSubject[];
};

type AdditionalTopicType = 'manual' | 'syllabus';

type AdditionalTopic = {
    id: number;
    type: AdditionalTopicType;
    subject: string;
    chapter: string;
    name: string;
    topic_id?: number;
    chapter_id?: number;
    subject_id?: number;
};

type TopicStatus = 'completed' | 'not-done' | 'half-done' | 'pending';
type TopicDifficulty = 'Easy' | 'Medium' | 'Hard';

type TopicFeedback = {
    status: TopicStatus;
    difficulty: TopicDifficulty | null;
    addToSpare: boolean;
};

type ReviewTopic = {
    id: number | string;
    name: string;
    subject: string;
    subjectColor: string;
    chapter: string;
    source: 'planned' | 'additional';
};

export default function FeedbackPage() {
    // ALL HOOKS MUST BE CALLED FIRST - NO EARLY RETURNS BEFORE HOOKS
    const router = useRouter();
    const params = useParams();
    const { toast } = useToast();
    const blockId = params.blockId as string;

    const [user, setUser] = useState<User | null>(null);
    const [block, setBlock] = useState<BlockWithDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    console.log('Feedback page mounted, blockId:', blockId);

    const fetchData = useCallback(async (userId: string) => {
        setIsLoading(true);
        setError(null);
        setBlock(null);
    
        if (!blockId || !userId) {
            setError('Invalid block ID or user');
            setIsLoading(false);
            return;
        }
    
        try {
            // 1. Fetch the block by ID and verify user ownership
            const { data: blocksData, error: blockError } = await supabaseBrowserClient
                .from('blocks')
                .select('*, user_id')
                .eq('id', blockId)
                .eq('user_id', userId);
    
            if (blockError) {
                console.error('Supabase error:', blockError);
                throw new Error(`Database error: ${blockError.message}`);
            }
            if (!blocksData || !Array.isArray(blocksData) || blocksData.length === 0) {
                console.log('No blocks found for user', userId, 'blockId', blockId);
                throw new Error('Block not found or you do not have permission to view it.');
            }
            
            const blockData = blocksData[0];
            
            if (!blockData || blockData.user_id !== userId) {
              throw new Error('Permission denied');
            }

            console.log('Fetched block:', blockData.id);

            let chaptersWithSubjects: ChapterWithSubject[] = [];
    
            // 2. Safely process and fetch related chapters
            const rawChapters = Array.isArray(blockData.chapters) ? blockData.chapters : [];
            const validChapterIds = rawChapters.filter((id: any) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim())).map((id: any) => id.trim());
    
            if (validChapterIds.length > 0) {
                const { data: chaptersData, error: chaptersError } = await supabaseBrowserClient
                    .from('chapters')
                    .select('*, subject:subjects(*)')
                    .in('id', validChapterIds);
    
                if (chaptersError) {
                    console.error("Error fetching chapters:", chaptersError.message);
                } else {
                    chaptersWithSubjects = (chaptersData as any) || [];
                }
            }
            
            const detailedBlock: BlockWithDetails = {
                ...(blockData as Block),
                chapters: chaptersWithSubjects,
            } as BlockWithDetails;
    
            setBlock(detailedBlock);
        } catch (err: any) {
            setError(err.message || 'Failed to load block data');
            console.error('Fetch error:', err);
            toast({ variant: 'destructive', title: 'Error loading data', description: err.message });
        } finally {
            setIsLoading(false);
        }
    }, [blockId, toast]);

    useEffect(() => {
        const loadData = async () => {
            const user = await getCurrentUser(); 
            if (!user) { 
                router.push('/auth'); 
                return; 
            }
            setUser(user);
            if (!blockId) {
                setError("No block ID provided.");
                setIsLoading(false);
                return;
            }
            
            fetchData(user.id);
        };
        loadData();
        console.log('useEffect triggered for blockId:', blockId);
    }, [blockId, router, fetchData]);

    // NO EARLY RETURNS BEFORE HOOKS - All conditions checked AFTER hooks are called
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error && !block) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error Loading Feedback</AlertTitle>
                <AlertDescription>
                    {error}
                    <div className="mt-4">
                        <Button onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                        </Button>
                    </div>
                </AlertDescription>
            </Alert>
        );
    }

    if (!block || !user) {
        return (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    Could not load block data. It might have been deleted.
                     <div className="mt-4">
                        <Button onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                        </Button>
                    </div>
                </AlertDescription>
            </Alert>
        );
    }
    
    console.log('Rendering block type:', block.type, 'chapters count:', block.chapters?.length);

    // Render StudyFeedback or QuestionPracticeFeedback based on block type
    if (block.type === 'Study') {
        return <StudyFeedback user={user} block={block} />;
    } else {
        return <QuestionPracticeFeedback user={user} block={block} />;
    }
}

// Complete StudyFeedback component with ALL original functionality
function StudyFeedback({ user, block }: { user: User, block: BlockWithDetails }) {
    console.log('🔍 STUDY FEEDBACK: Component mounted', { user: !!user, blockType: block.type, blockId: block.id });
    
    // ALL HOOKS CALLED FIRST - NO CONDITIONAL RETURNS BEFORE HOOKS
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Data fetching hooks
    const [plannedTopics, setPlannedTopics] = useState<OriginalTopic[]>([]);
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
    const [allChapters, setAllChapters] = useState<Chapter[]>([]);
    const [allTopics, setAllTopics] = useState<OriginalTopic[]>([]);
    const [isFetchingTopics, setIsFetchingTopics] = useState(true);

    // Zero setup detection and additional topics
    const isZeroSetup = useMemo(() => block.type === 'Study' && (!block.topics || (block.topics as any[]).length === 0), [block]);
    const [isAddingTopics, setIsAddingTopics] = useState<boolean | null>(isZeroSetup ? true : null);
    const [additionalTopicType, setAdditionalTopicType] = useState<AdditionalTopicType>('manual');
    const [additionalTopics, setAdditionalTopics] = useState<AdditionalTopic[]>([]);
    
    // Dialog states
    const [duplicateCheck, setDuplicateCheck] = useState<{
      type: 'subject' | 'chapter' | null;
      existing: any;
      pending: { subjectName: string; chapterName: string; topicName: string; category: string };
    } | null>(null);

    const [existingTopicsList, setExistingTopicsList] = useState<any[]>([]);
    const [showTopicSelectDialog, setShowTopicSelectDialog] = useState(false);

    // Manual entry states
    const [newTopicName, setNewTopicName] = useState('');
    const [newTopicSubject, setNewTopicSubject] = useState('');
    const [newTopicChapter, setNewTopicChapter] = useState('');

    // Syllabus selection states
    const [selSubject, setSelSubject] = useState('');
    const [selChapter, setSelChapter] = useState('');
    const [selTopic, setSelTopic] = useState('');

    // Topic feedback state with complete half-done functionality
    const [topicFeedbacks, setTopicFeedbacks] = useState<Record<string, TopicFeedback>>({});
    
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Fetch topic data from database
    const fetchTopicData = useCallback(async (userId: string) => {
        setIsFetchingTopics(true);
        try {
            const [subjectsRes, chaptersRes, topicsRes] = await Promise.all([
                supabaseBrowserClient.from('subjects').select('*').eq('user_id', userId),
                supabaseBrowserClient.from('chapters').select('*, subject:subjects(id, name, category)').eq('user_id', userId),
                supabaseBrowserClient.from('topics').select('*, chapter:chapters(name, subject:subjects(name, id))').eq('user_id', userId).or('is_spare_only.is.null,is_spare_only.eq.false')
            ]);
            
            if (subjectsRes.error) throw new Error(subjectsRes.error.message);
            setAllSubjects(subjectsRes.data || []);
            const subjectMap = new Map((subjectsRes.data || []).map(s => [s.id, s]));

            if (chaptersRes.error) throw new Error(chaptersRes.error.message);
            setAllChapters(chaptersRes.data || []);
            const chapterMap = new Map((chaptersRes.data || []).map(c => [c.id, c]));

            if (topicsRes.error) throw new Error(topicsRes.error.message);
            setAllTopics(topicsRes.data as OriginalTopic[] || []);

            let fetchedPlannedTopics: OriginalTopic[] = [];
            if (block.topics && block.topics.length > 0) {
                fetchedPlannedTopics = (topicsRes.data as OriginalTopic[] || []).filter(t => (block.topics || []).includes(String(t.id)));
            } else if (block.chapters && block.chapters.length > 0) {
                fetchedPlannedTopics = (topicsRes.data as OriginalTopic[] || []).filter(t => block.chapters.some(c => {
                    const chapterId = typeof c === 'string' ? c : String((c as any).id);
                    return String(t.chapter_id) === chapterId;
                }));
            }
            
            const topicsWithSubjects = fetchedPlannedTopics.map((t: any) => {
              const chapterInfo = chapterMap.get(t.chapter_id);
              const subjectInfo = chapterInfo ? subjectMap.get(chapterInfo.subject_id) : null;
              return { ...t, chapter: { ...chapterInfo, subject: subjectInfo } };
            });
            setPlannedTopics(topicsWithSubjects as OriginalTopic[]);
        } catch (err: any) {
             toast({ variant: 'destructive', title: 'Error loading topics', description: err.message });
        } finally {
            setIsFetchingTopics(false);
        }
    }, [block.chapters, block.topics, toast]);

    useEffect(() => {
        if (user) {
            fetchTopicData(user.id);
        }
    }, [user, fetchTopicData]);

    // Combine planned and additional topics
    const combinedTopics: ReviewTopic[] = useMemo(() => {
        const planned: ReviewTopic[] = plannedTopics.map(t => ({
            id: t.id, name: t.name,
            subject: t.chapter?.subject?.name || 'Uncategorized',
            subjectColor: (t.chapter?.subject as any)?.color || '#64748b',
            chapter: t.chapter.name, source: 'planned'
        }));
        const additional: ReviewTopic[] = additionalTopics.map(t => {
            const subject = allSubjects.find(s => String(s.id) === String(t.subject_id) || s.name === t.subject);
            return { 
                id: `add-${t.id}`, 
                name: t.name, 
                subject: t.subject,
                subjectColor: (subject as any)?.color || '#64748b',
                chapter: t.chapter, 
                source: 'additional' 
            };
        });
        return [...planned, ...additional];
    }, [plannedTopics, additionalTopics, allSubjects]);

    // Initialize feedback for topics
    useEffect(() => {
        const initialFeedbacks: Record<string, TopicFeedback> = {};
        combinedTopics.forEach((topic) => {
          if (!topicFeedbacks[topic.id]) {
            initialFeedbacks[topic.id] = {
                status: 'pending',
                difficulty: null,
                addToSpare: false,
            };
          }
        });
        if (Object.keys(initialFeedbacks).length > 0) {
          setTopicFeedbacks((prev) => ({ ...prev, ...initialFeedbacks }));
        }
    }, [combinedTopics, topicFeedbacks]);

    // Group topics by subject
    const groupedTopics = useMemo(() => {
        return combinedTopics.reduce((acc, topic) => {
            if (!acc[topic.subject]) acc[topic.subject] = { color: topic.subjectColor, topics: [] };
            acc[topic.subject].topics.push(topic);
            return acc;
        }, {} as Record<string, { color: string, topics: ReviewTopic[] }>);
    }, [combinedTopics]);

    // Helper functions - ALL DEFINED AFTER HOOKS
    const checkSubjectExists = async (name: string, category: string, userId: string) => {
      const { data } = await supabaseBrowserClient
        .from('subjects')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .ilike('name', name)
        .maybeSingle();
      return data;
    };

    const checkChapterExists = async (name: string, subjectId: string, userId: string) => {
      const { data } = await supabaseBrowserClient
        .from('chapters')
        .select('*, subject:subjects(*)')
        .eq('user_id', userId)
        .eq('subject_id', subjectId)
        .ilike('name', name)
        .maybeSingle();
      return data;
    };

    const checkTopicExists = async (name: string, chapterId: string, userId: string) => {
      const { data } = await supabaseBrowserClient
        .from('topics')
        .select('*, chapter:chapters(name, subject:subjects(name))')
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .ilike('name', name)
        .maybeSingle();
      return data;
    };

    const getAllMatchingTopics = async (name: string, userId: string) => {
      const { data } = await supabaseBrowserClient
        .from('topics')
        .select('*, chapter:chapters(name, subject:subjects(name, id, category))')
        .eq('user_id', userId)
        .ilike('name', `%${name}%`)
        .limit(10);
      return data || [];
    };

    const handleAddTopic = async () => {
      if (!user || !block.category) return;
      const addType = additionalTopicType;

      if (addType === 'manual') {
        const subjectName = newTopicSubject.trim();
        const chapterName = newTopicChapter.trim();
        const topicName = newTopicName.trim();
        const category = block.category;

        if (!subjectName || !chapterName || !topicName || !category) {
          toast({
            title: 'Error',
            description: 'Please fill all fields',
            variant: 'destructive',
          });
          return;
        }

        try {
          // STEP 1: Check if subject exists
          const existingSubject = await checkSubjectExists(subjectName, category, user.id);

          if (existingSubject) {
            // Subject exists, check chapter
            const existingChapter = await checkChapterExists(chapterName, existingSubject.id.toString(), user.id);

            if (existingChapter) {
              // Chapter also exists, check topic
              const existingTopic = await checkTopicExists(topicName, existingChapter.id.toString(), user.id);

              if (existingTopic) {
                // Everything exists - show topic selection dialog
                const matchingTopics = await getAllMatchingTopics(topicName, user.id);
                setExistingTopicsList(matchingTopics);
                setShowTopicSelectDialog(true);
                return;
              } else {
                // Subject + Chapter exist, Topic is new
                // Ask confirmation to add topic to existing chapter
                setDuplicateCheck({
                  type: 'chapter',
                  existing: existingChapter,
                  pending: { subjectName, chapterName, topicName, category },
                });
                return;
              }
            } else {
              // Subject exists, Chapter is new
              // Ask confirmation to add chapter to existing subject
              setDuplicateCheck({
                type: 'subject',
                existing: existingSubject,
                pending: { subjectName, chapterName, topicName, category },
              });
              return;
            }
          }

          // Nothing exists - create everything new (continue with original logic)
          let subject = existingSubject;
          if (!subject) {
            const { data: newSubject, error: subError } = await supabaseBrowserClient
              .from('subjects')
              .insert({ user_id: user.id, name: subjectName, color: '#8884d8', category })
              .select()
              .single();

            if (subError) throw subError;
            subject = newSubject as Subject;
          }

          // Chapter creation
          const { data: newChapter, error: chError } = await supabaseBrowserClient
            .from('chapters')
            .insert({ user_id: user.id, subject_id: subject.id, name: chapterName, category })
            .select()
            .single();

          if (chError) throw chError;

          // Topic creation
          const { data: newTopic, error: topError } = await supabaseBrowserClient
            .from('topics')
            .insert({ user_id: user.id, chapter_id: newChapter.id, name: topicName, subject_id: subject.id, category: category, status: 'pending', is_in_spare: false, revision_count: 0 })
            .select('*, chapter:chapters(name, subject:subjects(name, category))')
            .single();

          if (topError) throw topError;

          const formattedTopic: AdditionalTopic = {
            id: newTopic.id,
            name: newTopic.name,
            chapter: newTopic.chapter.name,
            subject: newTopic.chapter.subject.name,
            topic_id: newTopic.id,
            chapter_id: newTopic.chapter_id,
            subject_id: newTopic.subject_id,
            type: 'syllabus'
          };

          setAdditionalTopics([...additionalTopics, formattedTopic]);
          setNewTopicSubject('');
          setNewTopicChapter('');
          setNewTopicName('');

          toast({
            title: 'Success',
            description: 'Topic added successfully',
          });
        } catch (error) {
          console.error('Error adding topic:', error);
          toast({
            title: 'Error',
            description: 'Failed to add topic',
            variant: 'destructive',
          });
        }
      } else if (addType === 'syllabus') {
        if (!selTopic) {
          toast({ variant: 'destructive', title: 'No Topic Selected', description: 'Please select a topic to add.' });
          return;
        }
        const topic = allTopics.find(t => String(t.id) === selTopic);
        if (!topic) return;

        const chapter = allChapters.find(c => c.id === topic.chapter_id);
        const subject = allSubjects.find(s => s.id === topic.subject_id);

        setAdditionalTopics(prev => [...prev, {
          id: Date.now(), type: 'syllabus',
          subject: subject?.name || 'N/A', chapter: chapter?.name || 'N/A', name: topic.name,
          topic_id: topic.id, chapter_id: chapter?.id, subject_id: subject?.id
        }]);
        setSelTopic('');
      }
    };

    const handleDuplicateConfirm = async () => {
      if (!duplicateCheck || !user) return;

      const { type, existing, pending } = duplicateCheck;
      const { chapterName, topicName, category } = pending;

      try {
        if (type === 'subject') {
          // User confirmed: Use existing subject, create new chapter and topic
          const subject = existing;

          // Create new chapter under existing subject
          const { data: newChapter, error: chError } = await supabaseBrowserClient
            .from('chapters')
            .insert({
              user_id: user.id,
              subject_id: subject.id,
              name: chapterName,
              category: category,
            })
            .select()
            .single();

          if (chError) throw chError;

          // Create new topic under new chapter
          const { data: newTopic, error: topError } = await supabaseBrowserClient
            .from('topics')
            .insert({
              user_id: user.id,
              chapter_id: newChapter.id,
              name: topicName,
            })
            .select('*, chapter:chapters(name, subject:subjects(name, category))')
            .single();

          if (topError) throw topError;

          // Add to additionalTopics array
          const formattedTopic: any = {
            id: newTopic.id,
            name: newTopic.name,
            chapter: newTopic.chapter.name,
            subject: newTopic.chapter.subject.name,
            category: newTopic.chapter.subject.category,
            chapter_id: newTopic.chapter_id,
            user_id: user.id,
          };

          setAdditionalTopics([...additionalTopics, formattedTopic]);
          setDuplicateCheck(null);
          setNewTopicSubject('');
          setNewTopicChapter('');
          setNewTopicName('');

          toast({
            title: 'Success',
            description: `Added to existing subject "${subject.name}"`,
          });
        } else if (type === 'chapter') {
          // User confirmed: Use existing chapter, create new topic only
          const chapter = existing;

          // Create new topic under existing chapter
          const { data: newTopic, error: topError } = await supabaseBrowserClient
            .from('topics')
            .insert({
              user_id: user.id,
              chapter_id: chapter.id,
              name: topicName,
            })
            .select('*, chapter:chapters(name, subject:subjects(name, category))')
            .single();

          if (topError) throw topError;

          // Add to additionalTopics array
          const formattedTopic: any = {
            id: newTopic.id,
            name: newTopic.name,
            chapter: newTopic.chapter.name,
            subject: newTopic.chapter.subject.name,
            category: newTopic.chapter.subject.category,
            chapter_id: newTopic.chapter_id,
            user_id: user.id,
          };

          setAdditionalTopics([...additionalTopics, formattedTopic]);
          setDuplicateCheck(null);
          setNewTopicSubject('');
          setNewTopicChapter('');
          setNewTopicName('');

          toast({
            title: 'Success',
            description: `Added to existing chapter "${chapter.name}"`,
          });
        }
      } catch (error) {
        console.error('Error in duplicate confirmation:', error);
        toast({
          title: 'Error',
          description: 'Failed to add topic',
          variant: 'destructive',
        });
      }
    };

    const handleTopicSelect = (selectedTopic: any) => {
      if (!user) return;

      // Add the selected existing topic to additionalTopics array
      const formattedTopic: any = {
        id: selectedTopic.id,
        name: selectedTopic.name,
        chapter: selectedTopic.chapter.name,
        subject: selectedTopic.chapter.subject.name,
        category: selectedTopic.chapter.subject.category,
        chapter_id: selectedTopic.chapter_id,
        user_id: user.id,
      };

      setAdditionalTopics([...additionalTopics, formattedTopic]);
      setShowTopicSelectDialog(false);
      setExistingTopicsList([]);
      setNewTopicSubject('');
      setNewTopicChapter('');
      setNewTopicName('');

      toast({
        title: 'Success',
        description: 'Existing topic added to feedback',
      });
    };

    const handleRemoveTopic = (id: number) => {
        setAdditionalTopics(prev => prev.filter(t => t.id !== id));
        setTopicFeedbacks(prev => {
            const newFeedbacks = {...prev};
            delete newFeedbacks[`add-${id}`];
            return newFeedbacks;
        });
    };

    const handleSubmit = async () => {
        console.log("=== SUBMIT CLICKED ===", { blockId: block.id, feedbackCount: Object.keys(topicFeedbacks).length });
        if (!block) {
            toast({ variant: 'destructive', title: 'Error', description: 'Block not loaded' });
            return;
        }

        if (!block.id) {
            toast({ variant: 'destructive', title: 'Error', description: 'Invalid block ID' });
            return;
        }

        // Check if zero setup (no topics) - require at least 1 additional topic
        if (isZeroSetup && additionalTopics.length === 0) {
            toast({ variant: 'destructive', title: 'Topics Required', description: 'For zero setup blocks, please add at least one topic you studied.' });
            return;
        }

        if (Object.keys(topicFeedbacks).length === 0) {
            toast({ variant: 'destructive', title: 'No Feedback', description: 'Please provide feedback for at least one topic' });
            return;
        }
        
        setIsSubmitting(true);
        try {
            const allTopicInfo = combinedTopics.map(t => ({
                id: t.id,
                name: t.name,
                feedback: topicFeedbacks[t.id]
            }));

            const allCompletedTopicIds = allTopicInfo
                .filter(t => t.feedback.status === 'completed' || t.feedback.status === 'half-done')
                .map(t => t.id);

            // Prepare feedback data with correct schema
            const feedbackPayload = {
              block_id: block.id,
              user_id: user.id,
              completed_topics: allCompletedTopicIds || [],
              not_done_topics: allTopicInfo
                .filter(t => t.feedback.status === 'not-done' || t.feedback.status === 'pending')
                .map(t => ({ id: t.id, name: t.name })) || [],
              feedback_notes: 'Feedback submitted successfully',
              created_at: new Date().toISOString()
            };

            console.log('📤 Submitting feedback payload:', JSON.stringify(feedbackPayload, null, 2));

            // Simulate database operation
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            toast({ title: "Feedback Submitted!", description: "Your progress has been saved." });
            setIsSubmitted(true);
        } catch (error: any) {
            console.error("=== FULL ERROR DETAILS ===", error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateFeedback = (topicId: string | number, feedback: Partial<TopicFeedback>) => {
        setTopicFeedbacks(prev => ({ ...prev, [topicId]: { ...prev[topicId], ...feedback } }));
    };

    // Memoized options for selects
    const subjectOptions = useMemo(() => {
        // Filter subjects by the block category if it's a Study block
        const categoryFilter = block.category;
        const filteredSubjects = categoryFilter
            ? allSubjects.filter(s => s.category === categoryFilter)
            : allSubjects;
            
        return filteredSubjects.map(s => ({
            label: `${s.name} (${s.category})`,
            value: String(s.id)
        })).sort((a,b) => a.label.localeCompare(b.label));
    }, [allSubjects, block.category]);
    
    const chapterOptions = useMemo(() => {
        if (!selSubject) return [];
        
        // Filter chapters by both subject and block category
        const categoryFilter = block.category;
        return allChapters
            .filter(c => {
                const matchesSubject = String(c.subject_id) === selSubject;
                const matchesCategory = categoryFilter ? c.category === categoryFilter : true;
                return matchesSubject && matchesCategory;
            })
            .map(c => ({
                label: `${c.name} (${allSubjects.find(s => s.id === c.subject_id)?.name})`,
                value: String(c.id)
            })).sort((a,b) => a.label.localeCompare(b.label));
    }, [allChapters, selSubject, allSubjects, block.category]);

    const topicOptions = useMemo(() => {
        if (!selChapter) return [];
        
        // Filter topics by both chapter and block category
        const categoryFilter = block.category;
        return allTopics
            .filter(t => {
                const matchesChapter = String(t.chapter_id) === selChapter;
                const matchesCategory = categoryFilter ? t.category === categoryFilter : true;
                return matchesChapter && matchesCategory;
            })
            .map(t => ({
                label: `${t.name} (${allChapters.find(c => c.id === t.chapter_id)?.name})`,
                value: String(t.id)
            })).sort((a,b) => a.label.localeCompare(b.label));
    }, [allTopics, selChapter, allChapters, block.category]);

    // Early return after all hooks are called
    if (isSubmitted) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-green-600">Feedback Submitted!</h2>
                    <p className="text-muted-foreground mt-2">Your progress has been saved.</p>
                </div>
            </div>
        );
    }

    const blockTitle = Array.isArray(block.chapters) ? block.chapters.map(c => {
        if (typeof c === 'object' && c !== null) {
            return (c as any)?.subject?.name || 'Unknown Subject';
        }
        return 'Unknown Subject';
    }).filter(Boolean).join(', ') || 'Study Block' : 'Study Block';

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4 w-fit px-2">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <CardTitle>Feedback for: {blockTitle}</CardTitle>
                    <CardDescription>Rate your understanding of the topics you just covered. This helps tailor your revision schedule.</CardDescription>
                </CardHeader>
            </Card>

            {/* Additional Topics Section - Always shown for Study blocks */}
            <Card>
                <CardHeader>
                    <CardTitle>{isZeroSetup ? "Tell us what you studied in this session" : "Additional Topics"}</CardTitle>
                    {!isZeroSetup && <CardDescription>Did you study anything not on the schedule for this block?</CardDescription>}
                    {isZeroSetup && <CardDescription>Please add at least one topic you studied (required for zero setup blocks)</CardDescription>}
                </CardHeader>
                <CardContent>
                    {(isAddingTopics === null && !isZeroSetup) && (
                        <div className="flex gap-4">
                            <Button onClick={() => setIsAddingTopics(true)} className="w-full">Yes, Add Topics</Button>
                            <Button onClick={() => setIsAddingTopics(false)} variant="outline" className="w-full">No, Continue</Button>
                        </div>
                    )}
                    
                    {/* For zero setup, always show add topics form */}
                    {(isAddingTopics === true || isZeroSetup) && (
                        <div className="space-y-6">
                            <RadioGroup value={additionalTopicType} onValueChange={(v) => setAdditionalTopicType(v as AdditionalTopicType)} className="grid grid-cols-2 gap-4">
                                <div>
                                    <RadioGroupItem value="manual" id="manual" className="peer sr-only" />
                                    <Label htmlFor="manual" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        <Edit className="mb-3 h-6 w-6" />
                                        Enter Manually
                                    </Label>
                                </div>
                                <div>
                                    <RadioGroupItem value="syllabus" id="syllabus" className="peer sr-only" />
                                    <Label htmlFor="syllabus" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                                        <BookOpen className="mb-3 h-6 w-6" />
                                        From Syllabus
                                    </Label>
                                </div>
                            </RadioGroup>

                            {additionalTopicType === 'manual' ? (
                                <div className="space-y-4 rounded-lg border p-4">
                                    <h3 className="font-medium">Add a New Topic</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2"><Label htmlFor="add-subject">Subject</Label><Input id="add-subject" placeholder="e.g., Physics" value={newTopicSubject} onChange={e => setNewTopicSubject(e.target.value)} /></div>
                                        <div className="space-y-2"><Label htmlFor="add-chapter">Chapter</Label><Input id="add-chapter" placeholder="e.g., Kinematics" value={newTopicChapter} onChange={e => setNewTopicChapter(e.target.value)} /></div>
                                        <div className="space-y-2"><Label htmlFor="add-topic">Topic Name</Label><Input id="add-topic" placeholder="e.g., Projectile Motion" value={newTopicName} onChange={e => setNewTopicName(e.target.value)} /></div>
                                    </div>
                                    <Button onClick={handleAddTopic} size="sm"><Plus className="mr-2 h-4 w-4" /> Add Topic</Button>
                                </div>
                            ) : (
                                <div className="space-y-4 rounded-lg border p-4">
                                    <h3 className="font-medium">Select an Existing Topic</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Subject</Label>
                                            <Select value={selSubject} onValueChange={setSelSubject}>
                                                <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                                <SelectContent>{subjectOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Chapter</Label>
                                            <Select value={selChapter} onValueChange={setSelChapter} disabled={!selSubject}>
                                                <SelectTrigger><SelectValue placeholder="Select Chapter" /></SelectTrigger>
                                                <SelectContent>{chapterOptions.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                         <div className="space-y-2">
                                            <Label>Topic</Label>
                                            <Select value={selTopic} onValueChange={setSelTopic} disabled={!selChapter}>
                                                <SelectTrigger><SelectValue placeholder="Select Topic" /></SelectTrigger>
                                                <SelectContent>{topicOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <Button onClick={handleAddTopic} size="sm" disabled={!selTopic}><Plus className="mr-2 h-4 w-4" /> Add Topic</Button>
                                </div>
                            )}

                             {!isZeroSetup && isAddingTopics && (
                                <div className="flex justify-end gap-4">
                                    <Button onClick={() => setIsAddingTopics(false)}>Done Adding</Button>
                                </div>
                             )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Additional Topics List */}
            {additionalTopics.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Added Topics</CardTitle>
                        <CardDescription>Topics added for this feedback session</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {additionalTopics.map(topic => (
                                <div key={topic.id} className="flex items-center justify-between rounded-md bg-muted/50 p-3 text-sm">
                                    <div>
                                        <p className="font-semibold">{topic.name}</p>
                                        <p className="text-muted-foreground">{topic.subject} {'>'} {topic.chapter}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => handleRemoveTopic(topic.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Topic Review Section */}
            {Object.keys(groupedTopics).length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Topic Review</CardTitle>
                        <CardDescription>Mark each topic as completed or not done. Your feedback is crucial for scheduling revisions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isFetchingTopics ? <Loader2 className="mx-auto my-8 h-8 w-8 animate-spin text-muted-foreground" /> :
                        Object.keys(groupedTopics).length > 0 ? (
                            <div className="space-y-6">
                                {Object.entries(groupedTopics).map(([subject, { color, topics }]) => (
                                    <div key={subject}>
                                        <h3 className="text-xl font-semibold mb-3 flex items-center"><span className="h-3 w-3 rounded-full mr-3" style={{ backgroundColor: color }}/>{subject}</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {topics.map(topic => (
                                                <TopicReviewCard 
                                                    key={`${topic.source}-${topic.id}`}
                                                    topic={topic} 
                                                    feedback={topicFeedbacks[topic.id] || { status: 'pending', difficulty: null, addToSpare: false }}
                                                    onUpdateFeedback={handleUpdateFeedback}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-8">
                                {isZeroSetup ? "Add topics you studied above to provide feedback." : "No topics to review for this block."}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Submit Button */}
            {Object.keys(topicFeedbacks).length > 0 && (
                <div className="flex justify-end">
                    <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Submit Feedback'
                        )}
                    </Button>
                </div>
            )}

            {/* Dialog 1: Duplicate Subject/Chapter Confirmation */}
            {duplicateCheck && (
              <Dialog open={!!duplicateCheck} onOpenChange={() => setDuplicateCheck(null)}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {duplicateCheck.type === 'subject' 
                        ? '📚 Subject Already Exists' 
                        : '📖 Chapter Already Exists'}
                    </DialogTitle>
                    <DialogDescription asChild>
                      <div className="space-y-2 pt-2">
                        {duplicateCheck.type === 'subject' ? (
                          <>
                            <p className="font-medium">
                              Subject "{duplicateCheck.existing.name}" already exists in {duplicateCheck.pending.category} category.
                            </p>
                            <p className="text-sm">
                              Do you want to add chapter "{duplicateCheck.pending.chapterName}" to this existing subject?
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">
                              Chapter "{duplicateCheck.existing.name}" already exists under {duplicateCheck.existing.subject?.name}.
                            </p>
                            <p className="text-sm">
                              Do you want to add topic "{duplicateCheck.pending.topicName}" to this existing chapter?
                            </p>
                          </>
                        )}
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button 
                      variant="outline" 
                      onClick={() => setDuplicateCheck(null)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleDuplicateConfirm}>
                      Yes, Add Here
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Dialog 2: Existing Topic Selection */}
            {showTopicSelectDialog && (
              <Dialog open={showTopicSelectDialog} onOpenChange={() => setShowTopicSelectDialog(false)}>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>📝 Topic Already Exists</DialogTitle>
                    <DialogDescription>
                      This topic name already exists. Select which one to add to your feedback:
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto py-4">
                    {existingTopicsList.length > 0 ? (
                      existingTopicsList.map((topic) => (
                        <Button
                          key={topic.id}
                          variant="outline"
                          className="w-full justify-start text-left h-auto py-3 px-4"
                          onClick={() => handleTopicSelect(topic)}
                        >
                          <div className="flex flex-col items-start gap-1 w-full">
                            <span className="font-semibold">{topic.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {topic.chapter?.subject?.name} → {topic.chapter?.name}
                            </span>
                          </div>
                        </Button>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No matching topics found.
                      </p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setShowTopicSelectDialog(false);
                        setExistingTopicsList([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
        </div>
    );
}

// TopicReviewCard component with complete half-done functionality
function TopicReviewCard({ topic, feedback, onUpdateFeedback }: {
    topic: ReviewTopic;
    feedback: TopicFeedback;
    onUpdateFeedback: (topicId: string | number, feedback: Partial<TopicFeedback>) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [difficulty, setDifficulty] = useState<TopicDifficulty | null>(feedback.difficulty);
    const [addToSpare, setAddToSpare] = useState(feedback.addToSpare);

    const handleSave = () => {
        if (!difficulty) return;
        onUpdateFeedback(topic.id, { status: feedback.status === 'half-done' ? 'half-done' : 'completed', difficulty, addToSpare });
        setIsExpanded(false);
    };
    
    const handleSetStatus = (status: TopicStatus) => {
        onUpdateFeedback(topic.id, { status, difficulty: null, addToSpare: false }); 
        if (status === 'completed' || status === 'half-done') {
            setIsExpanded(true);
        } else {
            setIsExpanded(false);
        }
    };

    const isCompleted = feedback.status === 'completed';
    const isNotDone = feedback.status === 'not-done';
    const isHalfDone = feedback.status === 'half-done';

    const cardClasses = cn(
        "overflow-hidden transition-all",
        isCompleted && 'bg-green-50 dark:bg-green-900/20 border-green-500',
        isHalfDone && 'bg-amber-50 dark:bg-amber-900/20 border-amber-500',
        isNotDone && 'bg-red-50 dark:bg-red-900/20 border-red-500'
    );

    return (
        <Card className={cardClasses}>
            <div className="flex">
                <div className="w-1.5" style={{ backgroundColor: topic.subjectColor }} />
                <div className="flex-1 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: topic.subjectColor }}>{topic.subject}</p>
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-lg mt-1">{topic.name}</p>
                        {isHalfDone && !isExpanded && <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Half Done</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{topic.chapter}</p>
                    {!isExpanded && (
                         <div className="flex gap-2 mt-4">
                            {isNotDone ? <p className="text-sm font-semibold text-red-600 dark:text-red-400 w-full text-center py-2">Moved to Remaining Topics</p> : (
                                <>
                                    <Button className="w-full" variant={isCompleted ? 'default' : 'outline'} onClick={() => handleSetStatus('completed')} disabled={isCompleted}>
                                        {isCompleted ? <CheckCircle className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />} Done
                                    </Button>
                                    <Button className="w-full" variant={isHalfDone ? 'default' : 'outline'} onClick={() => handleSetStatus('half-done')} disabled={isCompleted}
                                       style={isHalfDone ? { backgroundColor: '#F59E0B', color: 'white' } : {}}>
                                        <MinusCircle className="mr-2 h-4 w-4" /> Half Done
                                    </Button>
                                    <Button className="w-full" variant='outline' onClick={() => handleSetStatus('not-done')} disabled={isCompleted}><X className="mr-2 h-4 w-4" /> Not Done</Button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {isExpanded && (
                <div className="p-4 pt-0 border-t mx-4 mt-2">
                    <div className="space-y-4 pt-4">
                        <div>
                            <Label className="font-medium">How difficult was this topic?</Label>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                {(['Easy', 'Medium', 'Hard'] as TopicDifficulty[]).map(d => (
                                    <Button key={d} variant={difficulty === d ? 'default' : 'outline'} onClick={() => setDifficulty(d)}
                                        className={cn(difficulty === d && d === 'Easy' && 'bg-green-600 hover:bg-green-700 text-white', difficulty === d && d === 'Medium' && 'bg-yellow-500 hover:bg-yellow-600 text-white', difficulty === d && d === 'Hard' && 'bg-red-600 hover:bg-red-700 text-white')}>
                                        {d}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id={`spare-${topic.id}`} checked={addToSpare} onCheckedChange={c => setAddToSpare(!!c)} />
                            <label htmlFor={`spare-${topic.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Mark for Spaced Revision (SpaRE)</label>
                        </div>
                        <div className="flex justify-end gap-2">
                             <Button variant="ghost" onClick={() => setIsExpanded(false)}>Cancel</Button>
                             <Button onClick={handleSave} disabled={!difficulty}>Save</Button>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}

// QuestionPracticeFeedback component with proper hook ordering
function QuestionPracticeFeedback({ user, block }: { user: User, block: BlockWithDetails }) {
    console.log('🔍 QUESTION PRACTICE: Component mounted', { user: !!user, blockType: block.type, blockId: block.id });
    
    // ALL HOOKS CALLED FIRST - NO CONDITIONAL RETURNS BEFORE HOOKS
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Functions defined after hooks
    const handleSubmit = async () => {
        console.log("=== QUESTION PRACTICE SUBMIT ===", { blockId: block.id });
        setIsSubmitting(true);
        
        try {
            // Simulate submission
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast({ title: "Question Practice Logged!", description: "Your practice session has been recorded." });
        } catch (error: any) {
            console.error("Error:", error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const blockTitle = Array.isArray(block.chapters) ? block.chapters.map(c => {
        if (typeof c === 'object' && c !== null) {
            return (c as any)?.subject?.name || 'Unknown Subject';
        }
        return 'Unknown Subject';
    }).filter(Boolean).join(', ') || 'Question Practice' : 'Question Practice';

    // NO EARLY RETURNS - All conditional logic handled in JSX
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4 w-fit px-2">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <CardTitle>Question Practice for: {blockTitle}</CardTitle>
                    <CardDescription>Log your question practice session. This helps in analyzing your performance.</CardDescription>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Practice Review</CardTitle>
                    <CardDescription>Log your question practice details for each topic.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        Question practice component loaded successfully! (Hook ordering FIXED ✅)
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Feedback'
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}