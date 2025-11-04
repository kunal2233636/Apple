
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { notesClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Subject, Chapter } from '@/app/(app)/topics/page';
import type { StorageType, NoteFormData, NoteWithRelations, Note } from '@/types/notes';
import { Loader2 } from 'lucide-react';
import { getNote } from '@/lib/indexedDB';


const noteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  subject_id: z.string().min(1, 'Subject is required'),
  chapter_id: z.string().optional(),
  content: z.string().optional(),
  storage_type: z.enum(['local', 'gdrive', 'both']),
});

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string | null;
  onSuccess: () => void;
  user: User;
  subjects: Subject[];
  chapters: Chapter[];
}

export function NoteModal({ isOpen, onClose, noteId, onSuccess, user, subjects, chapters }: NoteModalProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const isEditing = !!noteId;

  const form = useForm<z.infer<typeof noteSchema>>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: '',
      subject_id: '',
      chapter_id: '',
      content: '',
      storage_type: 'local',
    },
  });
  
  const selectedSubjectId = form.watch('subject_id');

  const filteredChapters = useMemo(() => {
    if (!selectedSubjectId) return [];
    return chapters.filter(c => String(c.subject_id) === selectedSubjectId);
  }, [chapters, selectedSubjectId]);

  useEffect(() => {
    async function fetchNote() {
      if (noteId && isOpen) {
        setIsLoading(true);
        const note = await getNote(noteId);

        if (!note) {
          toast({ variant: 'destructive', title: 'Failed to fetch note details' });
          onClose();
        } else {
          form.reset({
            title: note.title || '',
            subject_id: String(note.subject_id || ''),
            chapter_id: String(note.chapter_id || ''),
            content: note.content || '',
            storage_type: note.storage_type as StorageType,
          });
        }
        setIsLoading(false);
      }
    }
    fetchNote();
  }, [noteId, isOpen, form, toast, onClose]);

  useEffect(() => {
    if (!isOpen) {
      form.reset({
        title: '',
        subject_id: '',
        chapter_id: '',
        content: '',
        storage_type: 'local',
      });
      setIsSaving(false);
      setIsLoading(false);
    }
  }, [isOpen, form]);
  
  const onSubmit = async (values: z.infer<typeof noteSchema>) => {
    setIsSaving(true);
    try {
      const noteData = {
        ...values,
        user_id: user.id,
        subject_id: Number(values.subject_id),
        chapter_id: values.chapter_id ? Number(values.chapter_id) : undefined,
      };
      
      if (isEditing && noteId) {
        await notesClient.updateNote(noteId, noteData);
        toast({ title: 'Note updated successfully!' });
      } else {
        await notesClient.createNote(noteData);
        toast({ title: 'Note created successfully!' });
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'An error occurred', description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl flex flex-col h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Note' : 'Create New Note'}</DialogTitle>
          <DialogDescription>{isEditing ? 'Update the details of your note.' : 'Fill in the details to create a new note.'}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden">
              <div className="flex-grow space-y-4 overflow-y-auto pr-6 -mr-6 pl-1 -ml-1">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Gauss's Law Derivation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="subject_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a subject" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name} ({s.category})</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="chapter_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chapter</FormLabel>
                           <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSubjectId}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={selectedSubjectId ? "Select a chapter" : "Select a subject first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredChapters.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Start writing your notes..." className="min-h-[250px] flex-grow" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                    control={form.control}
                    name="storage_type"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Storage Option</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                            >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="local" />
                                </FormControl>
                                <FormLabel className="font-normal">Local Only</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="gdrive" disabled />
                                </FormControl>
                                <FormLabel className="font-normal text-muted-foreground">Google Drive (Coming Soon)</FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

              </div>
              <DialogFooter className="pt-6 border-t mt-4 flex-shrink-0">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSaving ? 'Saving...' : (isEditing ? 'Update Note' : 'Create Note')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
