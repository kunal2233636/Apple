
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabaseBrowserClient } from '@/lib/supabase';
import { Plus, Brain, X, Info, Lock, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';
import { Badge } from '@/components/ui/badge';
import type { PomodoroTemplate } from '@/app/(app)/schedule/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


type Session = {
  type: 'study' | 'break';
  duration: number;
};

export function AddTemplateModal({
  isOpen,
  onOpenChange,
  user,
  onTemplateSaved,
  editingTemplate,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: User;
  onTemplateSaved: (newTemplate?: PomodoroTemplate) => void;
  editingTemplate: PomodoroTemplate | null;
}) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [sessions, setSessions] = useState<Session[]>([
    { type: 'study', duration: 25 },
    { type: 'break', duration: 5 },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = !!editingTemplate;
  
  const totalDuration = useMemo(() => sessions.reduce((acc, s) => acc + s.duration, 0), [sessions]);

  useEffect(() => {
    if (isOpen) {
      if (isEditing && editingTemplate) {
        setName(editingTemplate.name);
        setSessions(editingTemplate.sessions_json);
      } else {
        setName('');
        setSessions([
          { type: 'study', duration: 25 },
          { type: 'break', duration: 5 },
          { type: 'study', duration: 25 },
        ]);
      }
    }
  }, [editingTemplate, isEditing, isOpen]);
  
  const addSession = useCallback(() => {
    setSessions(prevSessions => {
        const lastSession = prevSessions[prevSessions.length - 1];
        const newSessions = [...prevSessions];

        if (lastSession.type === 'study') {
            return [...newSessions, { type: 'break', duration: 5 }, { type: 'study', duration: 25 }];
        } else { // last session is break
            return [...newSessions, { type: 'study', duration: 25 }];
        }
    });
  }, []);

  const removeSession = useCallback((index: number) => {
    if (sessions.length <= 1) {
        toast({
            variant: 'destructive',
            title: "Validation Error",
            description: "Template must have at least one Study session.",
        });
        return;
    }
    const newSessions = sessions.filter((_, i) => i !== index);
     // If we removed the only study session, or the new last session is a break, fix it.
    if (newSessions.length > 0 && newSessions[newSessions.length - 1].type === 'break') {
        // If there's another session before it, just remove the last break
        if(newSessions.length > 1) {
             setSessions(newSessions.slice(0, -1));
        } else {
            // If it's the only session left, change it to study
            newSessions[0].type = 'study';
            setSessions(newSessions);
        }
    } else if (newSessions.length === 0) {
        // Always ensure at least one study session
        setSessions([{ type: 'study', duration: 25 }]);
    }
    else {
        setSessions(newSessions);
    }
  }, [sessions, toast]);
  
  const updateSession = useCallback((index: number, updatedSession: Partial<Session>) => {
    const newSessions = [...sessions];
    newSessions[index] = { ...newSessions[index], ...updatedSession };
    setSessions(newSessions);
  }, [sessions]);
  
  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Template name is required.' });
      return;
    }
    if (sessions.length === 0 || !sessions.some(s => s.type === 'study')) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Template must include at least one study session.' });
        return;
    }
     if (sessions[0].type === 'break') {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'The first session must be a "Study" session.' });
        return;
    }
    if (sessions.length > 0 && sessions[sessions.length - 1].type !== 'study') {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'The last session in a template must be a "Study" session.' });
        return;
    }
    if (totalDuration > 180) {
        toast({ variant: 'destructive', title: 'Validation Error', description: `Total duration cannot exceed 180 minutes. Current: ${totalDuration} min.` });
        return;
    }

    setIsSaving(true);

    const templateData = {
      user_id: user.id,
      name,
      sessions_json: sessions,
      is_default: false,
    };

    if (isEditing && editingTemplate) {
        const { error: updateError } = await supabaseBrowserClient
          .from('pomodoro_templates')
          .update({ name: templateData.name, sessions_json: templateData.sessions_json })
          .eq('id', editingTemplate.id);
        
        setIsSaving(false);
        
        if (updateError) {
          toast({ variant: "destructive", title: "Error updating template", description: updateError.message });
        } else {
          toast({ title: 'Template updated successfully' });
          onTemplateSaved();
        }
    } else {
        const { data: newTemplate, error: insertError } = await supabaseBrowserClient
            .from('pomodoro_templates')
            .insert(templateData)
            .select()
            .single();

        setIsSaving(false);

        if (insertError) {
            toast({ variant: "destructive", title: "Error creating template", description: insertError.message });
        } else {
            toast({ title: 'Template created successfully' });
            onTemplateSaved(newTemplate as PomodoroTemplate);
        }
    }
  }, [name, sessions, totalDuration, user, isEditing, editingTemplate, toast, onTemplateSaved]);


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? 'Edit Template' : 'Create Custom Template'}</DialogTitle>
           <DialogDescription>
            {isEditing ? 'Update your Pomodoro template.' : 'Build a new Pomodoro timer with custom study and break sessions.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-6 -mr-6">
          <div className="grid gap-6 py-4">
            <div>
              <label htmlFor="template-name" className="text-sm font-medium">Template Name</label>
              <Input id="template-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Marathon Study, Quick Review" className="mt-2" disabled={isSaving} />
            </div>
            
            <div>
              <label className="text-sm font-medium">Session Builder</label>
              <div className="mt-2 space-y-3 rounded-md border p-4">
                <TooltipProvider>
                {sessions.map((session, index) => {
                  const isFirstSession = index === 0;
                  const isLastSession = index === sessions.length - 1;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">{index + 1}.</span>
                      <Select 
                        value={session.type} 
                        onValueChange={(value: 'study' | 'break') => updateSession(index, { type: value })} 
                        disabled={isSaving || isFirstSession || (isLastSession && session.type === 'study')}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="study">
                              <div className='flex items-center gap-2'><Brain className='h-4 w-4' /> Study</div>
                          </SelectItem>
                          <SelectItem value="break" disabled={isLastSession}>
                              <div className='flex items-center gap-2'><Clock className='h-4 w-4' /> Break</div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {isFirstSession && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Lock className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>First session must be a Study session.</p>
                            </TooltipContent>
                        </Tooltip>
                      )}
                      
                      {isLastSession && !isFirstSession && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Lock className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Last session must be a Study session.</p>
                            </TooltipContent>
                        </Tooltip>
                      )}

                      <div className="flex-1 flex items-center gap-2">
                        <Input
                            type="number"
                            min={1}
                            max={180}
                            value={session.duration}
                            onChange={(e) => updateSession(index, { duration: Math.max(1, Math.min(180, e.target.valueAsNumber || 0)) })}
                            className="w-24 text-center"
                            disabled={isSaving}
                        />
                         <span className="text-sm text-muted-foreground">min</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSession(index)} disabled={isSaving || sessions.length <= 1}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
                </TooltipProvider>
                 <Button variant="outline" size="sm" onClick={addSession} disabled={isSaving} className='w-full mt-2'>
                  <Plus className="mr-2 h-4 w-4" /> Add Session
                </Button>
              </div>
              <div className="mt-3 flex justify-between items-center text-sm font-medium px-1">
                  <span>Total Duration: {totalDuration} min</span>
                  {totalDuration > 180 && <span className='text-destructive flex items-center gap-1'><Info className='h-4 w-4' /> Max 180 min</span>}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium">Preview</label>
              <Card className="p-3 bg-muted/50 mt-2">
                <div className="flex flex-wrap gap-2 items-center">
                  {sessions.map((session, index) => (
                    <Badge key={index} variant={session.type === 'study' ? 'default' : 'secondary'} className={cn(session.type === 'study' ? 'bg-blue-500/80' : 'bg-green-500/80', "text-white")}>
                      {session.type === 'study' ? <Brain className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />} {session.duration}m
                    </Badge>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : isEditing ? 'Update Template' : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


