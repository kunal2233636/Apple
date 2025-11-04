
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
import type { Chapter, Topic } from '@/app/(app)/topics/page';

export function AddTopicModal({ isOpen, onOpenChange, user, onTopicSaved, editingTopic, chapters, currentChapter }: {
  isOpen: boolean; onOpenChange: (isOpen: boolean) => void; user: User | null; onTopicSaved: () => void; editingTopic: Topic | null; chapters: Chapter[]; currentChapter: Chapter | null;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!editingTopic;
  
  useEffect(() => {
    if (isOpen) {
      if (isEditing && editingTopic) {
        setName(editingTopic.name);
        setDifficulty(editingTopic.difficulty || undefined);
      } else {
        setName('');
        setDifficulty(undefined);
      }
    }
  }, [editingTopic, isEditing, isOpen]);

  const handleSave = async () => {
    if (!user || !currentChapter) {
        toast({ variant: "destructive", title: "Authentication or Data Error" });
        return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
        toast({ variant: "destructive", title: "Validation Error", description: "Topic name is required." });
        return;
    }

    setIsSaving(true);
    
    try {
        let query = supabaseBrowserClient
            .from('topics')
            .select('id', { count: 'exact' })
            .eq('chapter_id', currentChapter.id)
            .ilike('name', trimmedName);
        
        if (isEditing) {
            query = query.not('id', 'eq', editingTopic.id);
        }

        const { count, error: checkError } = await query;
        if (checkError) throw checkError;

        if (count && count > 0) {
            toast({
                variant: "destructive",
                title: "Duplicate Topic",
                description: `Topic '${trimmedName}' already exists in ${currentChapter.name}. (Matches are case-insensitive)`,
            });
            setIsSaving(false);
            return;
        }

        const topicData = {
            name: trimmedName,
            chapter_id: currentChapter.id,
            subject_id: currentChapter.subject_id,
            user_id: user.id,
            difficulty: difficulty || null,
            category: currentChapter.category || 'OTHERS',
        };

        const { error } = isEditing
            ? await supabaseBrowserClient.from('topics').update({ name: topicData.name, difficulty: topicData.difficulty, category: topicData.category }).eq('id', editingTopic!.id)
            : await supabaseBrowserClient.from('topics').insert(topicData);
        
        if (error) throw error;

        toast({ title: `Topic ${isEditing ? 'updated' : 'added'} successfully!` });
        onTopicSaved();

    } catch (error: any) {
        console.error("Error saving topic:", { error, topicData: { name, currentChapter } });
        toast({
            variant: "destructive",
            title: `Failed to save topic`,
            description: error.message || "An unexpected error occurred.",
        });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Topic' : 'Add Topic'}</DialogTitle>
          <DialogDescription>{isEditing ? `Update details for "${editingTopic?.name} (${currentChapter?.name})".` : `Add a new topic to "${currentChapter?.name} (${currentChapter?.subjects?.name})".`}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div>
            <Label>Chapter</Label>
            <Input value={`${currentChapter?.name} (${currentChapter?.subjects?.name})` || ''} disabled className="mt-2" />
          </div>
          <div>
            <Label htmlFor="topic-name">Topic Name</Label>
            <Input id="topic-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Projectile Motion" className="mt-2" disabled={isSaving} />
          </div>
          {isEditing && (
            <div>
              <label htmlFor="status-select" className="text-sm font-medium">Status</label>
              <Select value={editingTopic?.status} disabled>
                <SelectTrigger id="status-select" className="mt-2">
                    <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label htmlFor="difficulty-select" className="text-sm font-medium">Difficulty (Optional)</label>
            <Select value={difficulty} onValueChange={(v: 'Easy' | 'Medium' | 'Hard') => setDifficulty(v)} disabled={isSaving}>
              <SelectTrigger id="difficulty-select" className="mt-2"><SelectValue placeholder="Select difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : isEditing ? 'Update Topic' : 'Save Topic'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
