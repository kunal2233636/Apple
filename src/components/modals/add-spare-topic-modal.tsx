

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabaseBrowserClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Chapter, Subject, Topic } from '@/app/(app)/topics/page';

export function AddSpareTopicModal({ 
    isOpen, 
    onOpenChange, 
    user, 
    onTopicSaved,
    subjects
}: {
  isOpen: boolean; 
  onOpenChange: (isOpen: boolean) => void; 
  user: User | null; 
  onTopicSaved: () => void; 
  subjects: Subject[];
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | undefined>(undefined);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDifficulty(undefined);
      setSelectedSubjectId('');
      setSelectedChapterId('');
      setChapters([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedSubjectId) {
        setChapters([]);
        setSelectedChapterId('');
        return;
    }
    
    const fetchChapters = async () => {
        const { data, error } = await supabaseBrowserClient
            .from('chapters')
            .select('*')
            .eq('subject_id', selectedSubjectId);
        
        if (error) {
            toast({ variant: 'destructive', title: 'Error fetching chapters', description: error.message });
        } else {
            setChapters(data || []);
        }
    };
    
    fetchChapters();
  }, [selectedSubjectId, toast]);

  const handleSave = async () => {
    if (!user) { 
        toast({ variant: "destructive", title: "Authentication or Data Error" }); 
        return; 
    }
    if (!name.trim() || !selectedSubjectId || !selectedChapterId) { 
        toast({ variant: "destructive", title: "Validation Error", description: "Subject, Chapter, and Topic Name are required." }); 
        return; 
    }
    
    setIsSaving(true);
    
    const today = new Date().toISOString();

    const topicData = {
        name,
        chapter_id: selectedChapterId,
        subject_id: selectedSubjectId,
        user_id: user.id,
        difficulty: difficulty || null,
        is_in_spare: true,
        is_spare_only: true,
        revision_count: 0,
        spare_started_date: today,
        next_revision_date: today,
        status: 'pending' as const,
        metadata: null
    };

    console.log("Attempting to insert topic with:", {
        subject_id: topicData.subject_id,
        chapter_id: topicData.chapter_id,
    });

    const { error } = await supabaseBrowserClient.from('topics').insert(topicData);
      
    setIsSaving(false);

    if (error) { 
      toast({ variant: "destructive", title: "Error creating topic", description: error.message });
    }
    else { 
      toast({ title: "Topic created and added to revision queue!" }); 
      onTopicSaved(); 
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Quick Topic for Revision</DialogTitle>
          <DialogDescription>
            Create a new topic that will only exist within your SpaRE schedule.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="subject-select">Subject</Label>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={isSaving}>
                <SelectTrigger id="subject-select" className="mt-2">
                    <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={String(subject.id)}>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.color }}/>
                            {`${subject.name} (${subject.category})`}
                        </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

             <div>
              <Label htmlFor="chapter-select">Chapter</Label>
              <Select value={selectedChapterId} onValueChange={setSelectedChapterId} disabled={isSaving || !selectedSubjectId}>
                <SelectTrigger id="chapter-select" className="mt-2">
                    <SelectValue placeholder={!selectedSubjectId ? "First select a subject" : "Select chapter"} />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map(chapter => (
                    <SelectItem key={chapter.id} value={String(chapter.id)}>{chapter.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="topic-name">Topic Name</Label>
              <Input id="topic-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Projectile Motion" className="mt-2" disabled={isSaving} />
            </div>

            <div>
                <Label htmlFor="difficulty-select">Difficulty (Optional)</Label>
                <Select value={difficulty} onValueChange={(v: 'Easy' | 'Medium' | 'Hard') => setDifficulty(v)} disabled={isSaving}>
                <SelectTrigger id="difficulty-select" className="mt-2"><SelectValue placeholder="Select difficulty" /></SelectTrigger>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !name || !selectedChapterId || !selectedSubjectId}>
            {isSaving ? 'Saving...' : 'Create & Add to Revision'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
