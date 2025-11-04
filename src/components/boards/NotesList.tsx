
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { notesClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { NoteWithRelations, StorageType } from '@/types/notes';
import type { Subject, Chapter } from '@/app/(app)/topics/page';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Plus, Search, Edit, Trash2, FileText, Loader2, AlertCircle, Cloud, Laptop, GitCompareArrows } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

type SortOption = 'created_at_desc' | 'created_at_asc' | 'updated_at_desc' | 'title_asc';

interface NotesListProps {
  user: User;
  subjects: Subject[];
  chapters: Chapter[];
  onEditNote: (noteId: string | null) => void;
  onNoteDeleted: () => void;
}

export default function NotesList({ user, subjects, chapters, onEditNote, onNoteDeleted }: NotesListProps) {
  const [notes, setNotes] = useState<NoteWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Filtering and Sorting State
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedChapter, setSelectedChapter] = useState<string>('all');
  const [selectedStorage, setSelectedStorage] = useState<StorageType | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('updated_at_desc');

  const fetchNotes = useCallback(async (userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: notesError } = await notesClient.getNotes(userId);
      if (notesError) throw notesError;
      setNotes((data as NoteWithRelations[]) || []);
    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Failed to fetch notes', description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchNotes(user.id);
  }, [fetchNotes, user.id]);

  const filteredChapters = useMemo(() => {
    if (selectedSubject === 'all') return chapters;
    return chapters.filter(c => String(c.subject_id) === selectedSubject);
  }, [chapters, selectedSubject]);

  const filteredAndSortedNotes = useMemo(() => {
    let filtered = notes
      .filter(note => {
        const matchesSearch = debouncedSearchTerm ? note.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) : true;
        const matchesSubject = selectedSubject === 'all' || (note.subject_id && String(note.subject_id) === selectedSubject);
        const matchesChapter = selectedChapter === 'all' || (note.chapter_id && String(note.chapter_id) === selectedChapter);
        const matchesStorage = selectedStorage === 'all' || note.storage_type === selectedStorage;
        return matchesSearch && matchesSubject && matchesChapter && matchesStorage;
      });

    return filtered.sort((a, b) => {
      switch (sortOption) {
        case 'created_at_asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'updated_at_desc': return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
        case 'title_asc': return (a.title || '').localeCompare(b.title || '');
        case 'created_at_desc':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [notes, debouncedSearchTerm, selectedSubject, selectedChapter, selectedStorage, sortOption]);

  const handleDelete = async (noteId: string) => {
    try {
        const { error } = await notesClient.deleteNote(noteId);
        if (error) throw error;
        toast({ title: 'Note deleted successfully.' });
        onNoteDeleted();
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Failed to delete note', description: e.message });
    }
  };

  if (isLoading) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56" />)}
            </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-16">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h3 className="mt-4 text-lg font-medium">An Error Occurred</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => user && fetchNotes(user.id)} className="mt-4">Retry</Button>
        </div>
    );
  }
  
  const FilterControls = () => (
    <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Search notes by title..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
             <Button onClick={() => onEditNote(null)} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Create Note
            </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Filter by Subject" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={selectedSubject === 'all'}>
                <SelectTrigger><SelectValue placeholder="Filter by Chapter" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Chapters</SelectItem>
                    {filteredChapters.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={selectedStorage} onValueChange={v => setSelectedStorage(v as StorageType | 'all')}>
                <SelectTrigger><SelectValue placeholder="Filter by Storage" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Storage Types</SelectItem>
                    <SelectItem value="local">Local</SelectItem>
                    <SelectItem value="gdrive">Google Drive</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                </SelectContent>
            </Select>
            <Select value={sortOption} onValueChange={v => setSortOption(v as SortOption)}>
                <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="updated_at_desc">Last Updated</SelectItem>
                    <SelectItem value="created_at_desc">Newest First</SelectItem>
                    <SelectItem value="created_at_asc">Oldest First</SelectItem>
                    <SelectItem value="title_asc">Title (A-Z)</SelectItem>
                </SelectContent>
            </Select>
        </div>
    </div>
  );

  const NoteCard = ({ note }: { note: NoteWithRelations }) => {
    const storageIcons = {
        local: <Laptop className="h-3 w-3" />,
        gdrive: <Cloud className="h-3 w-3" />,
        both: <GitCompareArrows className="h-3 w-3" />,
    };
    
    // Find subject and chapter names from props, fallback to what's in note object
    const subject = subjects.find(s => s.id === note.subject_id);
    const chapter = chapters.find(c => c.id === note.chapter_id);

    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-start justify-between">
                    <span className="truncate pr-4">{note.title || 'Untitled Note'}</span>
                    <Badge variant="outline" className="flex items-center gap-1.5 capitalize shrink-0">
                        {storageIcons[note.storage_type as StorageType]}
                        {note.storage_type}
                    </Badge>
                </CardTitle>
                 {subject && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span style={{color: subject.color || 'inherit'}}>{subject.name}</span>
                        {chapter && <span>&gt;</span>}
                        {chapter && <span>{chapter.name}</span>}
                    </div>
                )}
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">
                    {note.content ? note.content.substring(0, 100) : 'No content'}
                </p>
            </CardContent>
            <CardFooter className="flex justify-between items-center text-xs text-muted-foreground">
                <span>
                    Updated {formatDistanceToNow(new Date(note.updated_at || note.created_at), { addSuffix: true })}
                </span>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditNote(note.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/80 hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Note?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to delete "{note.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(note.id)} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardFooter>
        </Card>
    );
  };
  
  const EmptyState = () => (
    <div className="text-center py-16 rounded-lg bg-muted/50">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">
          {notes.length === 0 ? 'No notes yet' : 'No notes match your filters'}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {notes.length === 0 ? 'Get started by creating your first note.' : 'Try adjusting your search or filter criteria.'}
        </p>
        {notes.length === 0 && (
          <Button className="mt-6" onClick={() => onEditNote(null)}>
            <Plus className="mr-2 h-4 w-4" /> Create First Note
          </Button>
        )}
    </div>
  );

  return (
    <div className="space-y-6">
      <FilterControls />
      {filteredAndSortedNotes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedNotes.map(note => <NoteCard key={note.id} note={note} />)}
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
