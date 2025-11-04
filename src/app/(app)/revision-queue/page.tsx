
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import { History, CheckCircle2, BrainCircuit, PartyPopper, Loader2 } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { Topic as OriginalTopic } from '../topics/page';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


type RevisionQueueItem = {
    id: number;
    user_id: string;
    topic_id: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    added_date: string;
    topics: {
        id: number;
        name: string;
        chapters: {
            id: number;
            name: string;
            subjects: {
                id: number;
                name: string;
            } | null;
        } | null;
    };
};


export default function RevisionQueuePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [revisionQueue, setRevisionQueue] = useState<RevisionQueueItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<number | null>(null);

  const fetchRevisionQueue = useCallback(async (userId: string) => {
    setIsLoading(true);
    const { data, error } = await supabaseBrowserClient
      .from('revision_queue')
      .select(`
        id,
        user_id,
        topic_id,
        difficulty,
        added_date,
        topics (
          id,
          name,
          chapters (
            id,
            name,
            subjects (
              id,
              name
            )
          )
        )
      `)
      .eq('user_id', userId)
      .order('added_date', { ascending: false });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error fetching revision queue',
        description: error.message,
      });
      setRevisionQueue([]);
    } else {
      setRevisionQueue(data as RevisionQueueItem[] || []);
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/auth');
      } else {
        setUser(currentUser);
        fetchRevisionQueue(currentUser.id);
      }
    };
    checkUser();
  }, [router, fetchRevisionQueue]);

  const handleStartRevision = async (item: RevisionQueueItem) => {
    if (!user) return;
    setIsSubmitting(item.id);
    
    const today = new Date().toISOString();

    // 1. Update the topic to move it to SpaRE
    const { error: topicUpdateError } = await supabaseBrowserClient
        .from('topics')
        .update({
            is_in_spare: true,
            spare_started_date: today,
            next_revision_date: today,
        })
        .eq('id', item.topic_id);

    if (topicUpdateError) {
        toast({
            variant: 'destructive',
            title: 'Error starting revision',
            description: topicUpdateError.message,
        });
        setIsSubmitting(null);
        return;
    }

    // 2. Delete the item from the revision_queue
    const { error: queueDeleteError } = await supabaseBrowserClient
        .from('revision_queue')
        .delete()
        .eq('id', item.id);
    
    setIsSubmitting(null);

    if (queueDeleteError) {
        toast({
            variant: 'destructive',
            title: 'Error clearing item from queue',
            description: queueDeleteError.message,
        });
        // You might want to revert the topic update here, or handle this case more gracefully
    } else {
        toast({
            title: 'Topic Added to SpaRE!',
            description: `"${item.topics.name}" is now in your revision schedule.`,
        });
        setRevisionQueue(prev => prev.filter(t => t.id !== item.id));
    }
  };

  if (isLoading) {
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
            </Card>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
        </div>
    );
  }

  if (revisionQueue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4 min-h-[60vh]">
        <Card className="w-full max-w-lg shadow-none border-none bg-transparent">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-300">
                <PartyPopper className="h-10 w-10" />
            </div>
            <CardTitle className="mt-4 text-3xl">Queue Cleared!</CardTitle>
            <CardDescription className="text-lg">
              You've queued up all your topics for revision.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              New topics you study will appear here, ready to be added to SpaRE.
            </p>
            <Button onClick={() => router.push('/topics')}>
              Go to Topics
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-primary" />
            Revision Queue
          </CardTitle>
          <CardDescription>
            These are topics you've studied but haven't started revising with SpaRE yet. Add them to your spaced repetition schedule to begin.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="space-y-4">
        {revisionQueue.map((item) => (
          <Card key={item.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
                <p className="font-bold text-lg">{item.topics.name}</p>
                <p className="text-sm text-muted-foreground">
                    {item.topics.chapters?.subjects?.name || 'Subject'} &gt; {item.topics.chapters?.name || 'Chapter'}
                </p>
                <div className='flex items-center gap-4 mt-2 text-xs'>
                    {item.added_date && (
                        <p className="text-muted-foreground">
                            Added: <span className="font-semibold text-foreground">{formatDistanceToNowStrict(parseISO(item.added_date), { addSuffix: true })}</span>
                        </p>
                    )}
                    {item.difficulty && <Badge variant="outline">{item.difficulty}</Badge>}
                </div>
            </div>
            <Button 
                onClick={() => handleStartRevision(item)}
                disabled={isSubmitting === item.id}
                className="w-full sm:w-auto"
            >
                {isSubmitting === item.id ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>
                ) : (
                    <>
                        <History className="mr-2 h-4 w-4" /> Add to SpaRE
                    </>
                )}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
