'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AddResourceModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onResourceSaved: () => void;
  editingResource?: {
    id: number;
    title: string;
    description: string | null;
    category: 'JEE' | 'Other';
    subject: string | null;
    tags: string[] | null;
    is_favorite: boolean;
    content: string | null;
    url: string | null;
  } | null;
  type: 'note' | 'other';
}

export function AddResourceModal({ 
  isOpen, 
  onOpenChange, 
  onResourceSaved, 
  editingResource,
  type 
}: AddResourceModalProps) {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Other' as 'JEE' | 'Other',
    subject: '',
    content: '',
    url: '',
    tags: [] as string[],
    isFavorite: false
  });

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (editingResource) {
      setFormData({
        title: editingResource.title,
        description: editingResource.description || '',
        category: editingResource.category,
        subject: editingResource.subject || '',
        content: editingResource.content || '',
        url: editingResource.url || '',
        tags: editingResource.tags || [],
        isFavorite: editingResource.is_favorite
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'Other',
        subject: '',
        content: type === 'note' ? '' : '',
        url: '',
        tags: [],
        isFavorite: false
      });
    }
  }, [editingResource, isOpen, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim()) {
      toast({ variant: 'destructive', title: 'Title is required' });
      return;
    }

    setLoading(true);

    try {
      const resourceData = {
        user_id: user.id,
        type,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        subject: formData.subject.trim() || null,
        content: type === 'note' ? formData.content.trim() || null : null,
        url: formData.url.trim() || null,
        tags: formData.tags.length > 0 ? formData.tags : null,
        is_favorite: formData.isFavorite,
        updated_at: new Date().toISOString()
      };

      if (editingResource) {
        const { error } = await supabaseBrowserClient
          .from('resources')
          .update(resourceData)
          .eq('id', editingResource.id);
        
        if (error) {
          // Check if it's a missing table error
          if (error.message.includes('Could not find the table') || error.code === 'PGRST205') {
            toast({
              variant: 'destructive',
              title: 'Database setup required',
              description: 'The resources table needs to be created. Please contact your administrator to run the migration.'
            });
            return;
          }
          throw error;
        }
        toast({ title: 'Resource updated successfully' });
      } else {
        const { error } = await supabaseBrowserClient
          .from('resources')
          .insert([resourceData]);
        
        if (error) {
          // Check if it's a missing table error
          if (error.message.includes('Could not find the table') || error.code === 'PGRST205') {
            toast({
              variant: 'destructive',
              title: 'Database setup required',
              description: 'The resources table needs to be created. Please contact your administrator to run the migration.'
            });
            return;
          }
          throw error;
        }
        toast({ title: 'Resource created successfully' });
      }

      onResourceSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error saving resource', 
        description: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingResource ? 'Edit Resource' : `Add New ${type === 'note' ? 'Note' : 'Resource'}`}
          </DialogTitle>
          <DialogDescription>
            {type === 'note' 
              ? 'Create a new study note with your content and tags.'
              : 'Add a new resource like a website, document, or external link.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder={type === 'note' ? 'Enter note title...' : 'Enter resource name...'}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value: 'JEE' | 'Other') => 
                  setFormData(prev => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="JEE">JEE</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="subject">Subject (Optional)</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g., Physics, Chemistry..."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of this resource..."
              rows={2}
            />
          </div>

          {type === 'note' && (
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter your note content here..."
                rows={6}
              />
            </div>
          )}

          {type === 'other' && (
            <div>
              <Label htmlFor="url">URL (Optional)</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
          )}

          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a tag..."
                className="flex-1"
              />
              <Button type="button" onClick={addTag} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="favorite"
              checked={formData.isFavorite}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFavorite: checked }))}
            />
            <Label htmlFor="favorite">Mark as favorite</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (editingResource ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}