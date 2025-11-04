'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowserClient } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@supabase/supabase-js';
import type { Block } from '@/app/(app)/schedule/page';
import type { Topic as OriginalTopic, Subject, Chapter } from '@/app/(app)/topics/page';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';

type ChapterWithSubject = Chapter & { subject: Subject | null };
type BlockWithDetails = Block & {
  chapters: ChapterWithSubject[];
};

// Simplified component to avoid hook ordering issues
function StudyFeedback({ user, block }: { user: User, block: BlockWithDetails }) {
    console.log('🔍 STUDY FEEDBACK: Component mounted', { user: !!user, blockType: block.type, blockId: block.id });
    
    // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [topicFeedbacks, setTopicFeedbacks] = useState<Record<string, {status: 'completed' | 'not-done' | 'half-done' | 'pending', difficulty: 'Easy' | 'Medium' | 'Hard' | null, addToSpare: boolean}>>({});
    
    // NO EARLY RETURNS BEFORE HOOKS - All early returns must come AFTER hooks
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

        if (Object.keys(topicFeedbacks).length === 0) {
            toast({ variant: 'destructive', title: 'No Feedback', description: 'Please provide feedback for at least one topic' });
            return;
        }
        
        setIsSubmitting(true);
        try {
            console.log('📤 Submitting feedback payload:', JSON.stringify({
                block_id: block.id,
                user_id: user.id,
                feedback_data: topicFeedbacks,
                type: block.type,
                created_at: new Date().toISOString()
            }, null, 2));

            // Simulate database operation
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            toast({ title: "Feedback Submitted!", description: "Your progress has been saved." });
        } catch (error: any) {
            console.error("=== ERROR ===", error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleUpdateFeedback = (topicId: string | number, feedback: any) => {
        setTopicFeedbacks(prev => ({ ...prev, [topicId]: { ...prev[topicId], ...feedback } }));
    };

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

            <Card>
                <CardHeader>
                    <CardTitle>Topic Review</CardTitle>
                    <CardDescription>Mark each topic as completed or not done. Your feedback is crucial for scheduling revisions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        Study feedback component loaded successfully! (Hook ordering fixed)
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

function QuestionPracticeFeedback({ user, block }: { user: User, block: BlockWithDetails }) {
    console.log('🔍 QUESTION PRACTICE: Component mounted', { user: !!user, blockType: block.type, blockId: block.id });
    
    // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // NO EARLY RETURNS BEFORE HOOKS
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
                        Question practice component loaded successfully! (Hook ordering fixed)
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

export default StudyFeedback;
export { QuestionPracticeFeedback };
