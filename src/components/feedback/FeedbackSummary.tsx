'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowserClient, getCurrentUser } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, PartyPopper, History, Edit, Link2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type FeedbackSummaryData = {
    completedCount: number;
    halfDoneCount: number;
    notDoneCount: number;
    addedToSpareCount: number;
    extraTopicsCount: number;
};

type AdditionalSupabaseTopic = {
    id: number;
    study_block_id: string;
    custom_name: string | null;
    type: 'custom' | 'linked';
    user_confirmed: boolean;
    linked_topic_id: number | null;
    linked_chapter_id: number | null;
    linked_subject_id: number | null;
    match_confidence: number | null;
    // Joined data from Supabase
    topics: {
        name: string;
        chapters: {
            name: string;
            subjects: {
                name: string;
            } | null;
        } | null;
    } | null;
};

type SearchResult = {
    topic: {
        id: number;
        name: string;
        chapter_id: string;
        subject_id: string;
        chapter?: {
            name: string;
            subject?: {
                name: string;
            };
        };
    };
    confidence: number;
};

function levenshtein(a: string, b: string): number {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i-1] === a[j-1]) {
                matrix[i][j] = matrix[i-1][j-1];
            } else {
                matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1);
            }
        }
    }
    return matrix[b.length][a.length];
}

export default function FeedbackSummary({ summary, blockId }: { summary: FeedbackSummaryData, blockId: string }) {
    const router = useRouter();
    const { toast } = useToast();
    const [topicInput, setTopicInput] = useState('');
    const [additionalTopics, setAdditionalTopics] = useState<AdditionalSupabaseTopic[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const normalize = (str: string) => str.toLowerCase().trim();

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    useEffect(() => {
        const searchTopics = async () => {
            if (debouncedSearchTerm.trim().length < 3) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const user = await getCurrentUser();
                if (!user) {
                    setIsSearching(false);
                    return;
                }
    
                // Fetch the block to get its category
                const { data: blockData, error: blockError } = await supabaseBrowserClient
                    .from('blocks')
                    .select('category')
                    .eq('id', blockId)
                    .single();
    
                if (blockError) {
                    console.error("Error fetching block", blockError);
                    setIsSearching(false);
                    return;
                }
    
                const { data, error } = await supabaseBrowserClient
                    .from('topics')
                    .select('*, chapter:chapters(name, subject:subjects(name))')
                    .eq('user_id', user.id)
                    .eq('category', blockData.category);
    
                if (error) {
                    console.error("Error searching topics", error);
                    toast({variant: 'destructive', title: "Search Failed", description: "Could not fetch topics from your syllabus."})
                } else if (data) {
                    const normalizedInput = normalize(debouncedSearchTerm);
                    const matches: SearchResult[] = [];
    
                    for (const topic of data as any[]) {
                        const normalizedTopicName = normalize(topic.name);
                        let confidence = 0;
    
                        if (normalizedTopicName === normalizedInput) {
                            confidence = 1.0;
                        } else if (normalizedTopicName.startsWith(normalizedInput)) {
                            confidence = 0.9;
                        } else {
                            const distance = levenshtein(normalizedInput, normalizedTopicName);
                            if (distance <= 2) {
                                confidence = Math.max(confidence, 0.8);
                            }
                            if (normalizedTopicName.includes(normalizedInput)) {
                                confidence = Math.max(confidence, 0.7);
                            }
                        }
                        
                        if (confidence > 0.7) {
                            matches.push({ topic, confidence });
                        }
                    }
                    
                    matches.sort((a, b) => b.confidence - a.confidence);
                    setSearchResults(matches.slice(0, 3));
                }
            } catch (e: any) {
                 toast({variant: 'destructive', title: "Search Error", description: "An unexpected error occurred."})
            } finally {
                setIsSearching(false);
            }
        };
        searchTopics();
    }, [debouncedSearchTerm, toast, blockId]);

    const fetchAdditionalTopics = useCallback(async () => {
        const { data, error } = await supabaseBrowserClient
            .from('additional_topics')
            .select('*, topics(name, chapters(name, subjects(name)))')
            .eq('study_block_id', blockId);
        
        if (error) {
            toast({ variant: 'destructive', title: 'Error fetching additional topics', description: error.message });
        } else {
            setAdditionalTopics((data as any) || []);
        }
    }, [blockId, toast]);

    useEffect(() => {
        fetchAdditionalTopics();
    }, [fetchAdditionalTopics]);

    const getMotivationalMessage = () => {
        if (summary.completedCount === 0 && summary.halfDoneCount === 0) return "Every step counts! Keep up the effort for next time.";
        if (summary.completedCount <= 2 && summary.halfDoneCount <= 3) return "Good progress! Keep building on this momentum.";
        return "Fantastic work! You've crushed this session.";
    };

    const handleAddTopic = async ({ type, topic, confidence }: { 
        type: 'custom' | 'linked'; 
        topic?: { id: number; name: string; chapter_id: string; subject_id: string; chapter?: { name: string; subject?: { name: string; } }; }; 
        confidence?: number;
    }) => {
        if (type === 'custom' && !topicInput.trim()) return;
        setIsSubmitting(true);
        
        let insertData: any = {
            study_block_id: blockId,
            type: type,
            user_confirmed: true,
        };

        if (type === 'linked' && topic) {
            insertData = {
                ...insertData,
                custom_name: topic.name,
                linked_topic_id: topic.id,
                linked_chapter_id: topic.chapter_id,
                linked_subject_id: topic.subject_id,
                match_confidence: confidence,
            };
        } else {
            insertData.custom_name = topicInput.trim();
        }

        const { error } = await supabaseBrowserClient
            .from('additional_topics')
            .insert(insertData);

        if (error) {
            toast({ variant: 'destructive', title: 'Failed to add topic', description: error.message });
        } else {
            setTopicInput('');
            setSearchTerm('');
            setSearchResults([]);
            fetchAdditionalTopics(); // Re-fetch the list
        }
        setIsSubmitting(false);
    };

    const handleRemoveTopic = async (topicId: number) => {
        const { error } = await supabaseBrowserClient
            .from('additional_topics')
            .delete()
            .eq('id', topicId);
        
        if (error) {
            toast({ variant: 'destructive', title: 'Failed to remove topic', description: error.message });
        } else {
            setAdditionalTopics(prev => prev.filter(t => t.id !== topicId));
        }
    };
    
    const singlePerfectMatch = useMemo(() => {
        return searchResults.length === 1 && searchResults[0].confidence === 1.0 ? searchResults[0] : null;
    }, [searchResults]);

    return (
         <div className="flex items-center justify-center min-h-screen bg-muted/20 p-4">
            <Card className="w-full max-w-2xl text-center shadow-lg animate-in fade-in-50 zoom-in-95">
                <CardHeader>
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300">
                        <PartyPopper className="h-10 w-10" />
                    </div>
                    <CardTitle className="mt-4 text-3xl">Session Complete!</CardTitle>
                    <CardDescription className="text-lg">{getMotivationalMessage()}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-left">
                        <div className="rounded-lg bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Topics Completed</p><p className="text-2xl font-bold">{summary.completedCount}</p></div>
                        <div className="rounded-lg bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Half Done</p><p className="text-2xl font-bold">{summary.halfDoneCount}</p></div>
                        <div className="rounded-lg bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Topics for Next Time</p><p className="text-2xl font-bold">{summary.notDoneCount + summary.halfDoneCount}</p></div>
                        <div className="rounded-lg bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Added to SpaRE</p><p className="text-2xl font-bold">{summary.addedToSpareCount}</p></div>
                        {summary.extraTopicsCount > 0 && <div className="col-span-2 rounded-lg bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Extra Topics Covered</p><p className="text-2xl font-bold">{summary.extraTopicsCount}</p></div>}
                    </div>
                    <Separator className="my-6" />
                    <div className="text-left relative">
                        <h3 className="font-semibold">Additional Topics to Study</h3>
                        <p className="text-sm text-muted-foreground mb-4">Add topics you want to cover in the next session.</p>
                        <div className="relative flex items-center">
                            <Input 
                                placeholder="e.g., Physics, Thermodynamics, Heat"
                                value={topicInput}
                                onChange={(e) => {
                                    setTopicInput(e.target.value);
                                    setSearchTerm(e.target.value);
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTopic({ type: 'custom' })}
                                disabled={isSubmitting}
                            />
                             {isSearching && <Loader2 className="absolute right-3 h-5 w-5 animate-spin text-muted-foreground" />}
                        </div>
                        <div className="absolute top-full left-0 w-full z-10 mt-2">
                          {(searchResults.length > 0 || (searchTerm.length > 2 && !isSearching)) && (
                              <div className="p-2 bg-background border border-border rounded-md shadow-lg space-y-1">
                                {singlePerfectMatch ? (
                                    <div className="p-2 text-center">
                                      <p className="text-sm">💡 Did you mean: <span className="font-semibold">{singlePerfectMatch.topic.name}</span> ({singlePerfectMatch.topic.chapter?.subject?.name} &gt; {singlePerfectMatch.topic.chapter?.name})?</p>
                                      <div className="flex gap-2 justify-center mt-2">
                                        <Button size="sm" onClick={() => handleAddTopic({ type: 'linked', topic: singlePerfectMatch.topic, confidence: 1.0 })}>Yes, Link It</Button>
                                        <Button size="sm" variant="outline" onClick={() => setSearchResults([])}>No</Button>
                                      </div>
                                    </div>
                                ) : searchResults.length > 0 ? (
                                    <>
                                        {searchResults.map(match => (
                                            <div key={match.topic.id} className="flex items-center justify-between bg-muted/50 hover:bg-muted p-2 rounded transition-colors">
                                                <div>
                                                    <p className="font-medium text-sm">{match.topic.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {match.topic.chapter?.subject?.name} &gt; {match.topic.chapter?.name}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={match.confidence > 0.9 ? 'default' : 'secondary'} className={cn(match.confidence > 0.9 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800')}>{Math.round(match.confidence * 100)}%</Badge>
                                                    <Button size="sm" onClick={() => handleAddTopic({ type: 'linked', topic: match.topic, confidence: match.confidence })} disabled={isSubmitting}>
                                                       Link
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        <Separator />
                                         <Button variant="link" size="sm" className="w-full" onClick={() => handleAddTopic({ type: 'custom' })}>
                                            No, create "{topicInput}" as a new custom topic
                                        </Button>
                                    </>
                                ) : (
                                    <div className="p-2 text-center text-sm text-muted-foreground">
                                        <p>⚠️ No match in your syllabus.</p>
                                        <div className="flex gap-2 justify-center mt-2">
                                          <Button size="sm" variant="default" onClick={() => handleAddTopic({ type: 'custom' })}>Create custom</Button>
                                          <Button size="sm" variant="outline" onClick={() => router.push('/topics')}>Browse syllabus</Button>
                                        </div>
                                    </div>
                                )}
                              </div>
                          )}
                        </div>

                        {additionalTopics.length > 0 && (
                            <div className="mt-4 space-y-2 pt-16">
                                {additionalTopics.map((topic) => {
                                    const isLinked = topic.type === 'linked';
                                    let displayName = topic.custom_name;
                                    let subtext = null;
                                    if (isLinked && topic.topics) {
                                        const subjectName = topic.topics.chapters?.subjects?.name;
                                        const chapterName = topic.topics.chapters?.name;
                                        displayName = topic.topics.name;
                                        subtext = `${subjectName} > ${chapterName}`;
                                    }

                                    return (
                                    <div key={topic.id} className="flex items-center justify-between rounded-md bg-muted/50 p-2 pl-4 text-sm">
                                        <div className="flex items-center gap-2">
                                            {isLinked ? <Link2 className="h-4 w-4 text-blue-600" /> : <Edit className="h-4 w-4 text-muted-foreground" />}
                                            <div>
                                                <p className="font-medium">{displayName}</p>
                                                {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveTopic(topic.id)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-3 pt-4">
                    <Button className="w-full" size="lg" onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
                    {(summary.addedToSpareCount > 0 || summary.notDoneCount > 0 || summary.halfDoneCount > 0) && (
                        <Button className="w-full" size="lg" variant="outline" onClick={() => router.push('/topics')}><History className="mr-2 h-4 w-4"/>View Syllabus</Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}