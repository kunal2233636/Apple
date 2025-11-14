'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { 
  Archive, 
  Plus, 
  Search, 
  Filter, 
  BookOpen, 
  FileText, 
  Upload, 
  Download, 
  ExternalLink, 
  Calculator, 
  Brain, 
  Code, 
  Globe, 
  FileText as ResearchIcon, 
  Lightbulb, 
  Star, 
  Trash2,
  Edit,
  Folder,
  Tag,
  Calendar,
  Highlighter
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AddResourceModal } from '@/components/modals/add-resource-modal';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Resource {
  id: number;
  user_id: string;
  type: 'note' | 'other';
  title: string;
  content: string | null;
  description: string | null;
  url: string | null;
  category: 'JEE' | 'Other';
  subject: string | null;
  tags: string[] | null;
  is_favorite: boolean;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

interface ResourceDisplay {
  id: number;
  title: string;
  description: string | null;
  category: 'JEE' | 'Other';
  subject: string | null;
  date: string;
  tags: string[] | null;
  isFavorite: boolean;
  content?: string | null;
  url?: string | null;
  type?: string;
  name?: string;
}

const categoryFilters = [
  { value: 'all', label: 'All Categories' },
  { value: 'JEE', label: 'JEE' },
  { value: 'Other', label: 'Other' }
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'website': return <Globe className="h-4 w-4" />;
    case 'document': return <FileText className="h-4 w-4" />;
    default: return <FileText className="h-4 w-4" />;
  }
};

const parseHighlightContent = (content: string | null | undefined) => {
  if (!content) {
    return { highlight: '', summary: '' };
  }

  const summaryLabel = 'Summary of the rest:';
  const summaryIndex = content.indexOf(summaryLabel);

  let highlightPart = content;
  let summaryPart = '';

  if (summaryIndex !== -1) {
    highlightPart = content.slice(0, summaryIndex);
    summaryPart = content.slice(summaryIndex + summaryLabel.length);
  }

  // Remove the leading "Highlight:" label and whitespace/newlines
  const highlight = highlightPart
    .replace(/^\s*Highlight:\s*/i, '')
    .trim();

  const summary = summaryPart
    .replace(/^\s*[\n\r]*/,'')
    .trim();

  return { highlight, summary };
};

export default function ResourcesPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [modalType, setModalType] = useState<'note' | 'other'>('note');

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        fetchResources(currentUser.id);
      } else {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const fetchResources = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabaseBrowserClient
        .from('resources')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        // Check if it's a missing table error
        if (error.message.includes('Could not find the table') || error.code === 'PGRST205') {
          toast({
            variant: 'destructive',
            title: 'Database setup required',
            description: 'The resources table needs to be created. Please contact your administrator to run the migration.'
          });
          setResources([]); // Set empty array as fallback
          return;
        }
        throw error;
      }
      setResources(data || []);
    } catch (error: any) {
      console.error('Error fetching resources:', error);
      toast({
        variant: 'destructive',
        title: 'Error fetching resources',
        description: 'Unable to load resources. Please try again later.'
      });
      setResources([]); // Set empty array as fallback
    } finally {
      setLoading(false);
    }
  };

  const notes = useMemo(() => 
    resources
      .filter(r => r.type === 'note' && !(r.tags?.includes('ai-highlight')))
      .map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        subject: r.subject,
        date: new Date(r.updated_at).toISOString().split('T')[0],
        tags: r.tags,
        isFavorite: r.is_favorite,
        content: r.content
      })), 
    [resources]
  );

  const aiHighlightNotes = useMemo(() =>
    resources
      .filter(r => r.type === 'note' && r.tags?.includes('ai-highlight'))
      .map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        subject: r.subject,
        date: new Date(r.updated_at).toISOString().split('T')[0],
        tags: r.tags,
        isFavorite: r.is_favorite,
        content: r.content
      })),
    [resources]
  );

  const otherResources = useMemo(() => 
    resources
      .filter(r => r.type === 'other')
      .map(r => ({
        id: r.id,
        name: r.title,
        url: r.url,
        description: r.description,
        category: r.category,
        type: r.url ? 'website' : 'document',
        dateAdded: new Date(r.updated_at).toISOString().split('T')[0],
        tags: r.tags
      })), 
    [resources]
  );

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (note.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
                           (note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) || false);
      const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [notes, searchQuery, selectedCategory]);

  const filteredAiHighlights = useMemo(() => {
    return aiHighlightNotes.filter(note => {
      const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (note.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
                           (note.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) || false);
      const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [aiHighlightNotes, searchQuery, selectedCategory]);

  const filteredOtherResources = useMemo(() => {
    return otherResources.filter(resource => {
      const matchesSearch = resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           (resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
                           (resource.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) || false);
      const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [otherResources, searchQuery, selectedCategory]);

  const handleDeleteNote = async (resourceId: number) => {
    if (!user) return;

    try {
      const { error } = await supabaseBrowserClient
        .from('resources')
        .delete()
        .eq('id', resourceId);

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
      
      setResources(prev => prev.filter(r => r.id !== resourceId));
      toast({ title: "Note deleted successfully" });
    } catch (error: any) {
      console.error('Error deleting note:', error);
      toast({
        variant: 'destructive',
        title: 'Error deleting note',
        description: 'Unable to delete note. Please try again later.'
      });
    }
  };

  const handleDeleteResource = async (resourceId: number) => {
    if (!user) return;

    try {
      const { error } = await supabaseBrowserClient
        .from('resources')
        .delete()
        .eq('id', resourceId);

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
      
      setResources(prev => prev.filter(r => r.id !== resourceId));
      toast({ title: "Resource deleted successfully" });
    } catch (error: any) {
      console.error('Error deleting resource:', error);
      toast({
        variant: 'destructive',
        title: 'Error deleting resource',
        description: 'Unable to delete resource. Please try again later.'
      });
    }
  };

  const handleResourceSaved = () => {
    if (user) {
      fetchResources(user.id);
    }
  };

  const openAddModal = (type: 'note' | 'other') => {
    setModalType(type);
    setEditingResource(null);
    setIsModalOpen(true);
  };

  const openEditModal = (resource: Resource) => {
    setEditingResource(resource);
    setModalType(resource.type);
    setIsModalOpen(true);
  };

  const toggleFavorite = async (resource: Resource) => {
    if (!user) return;

    try {
      const { error } = await supabaseBrowserClient
        .from('resources')
        .update({ is_favorite: !resource.is_favorite })
        .eq('id', resource.id);

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
      
      setResources(prev => prev.map(r =>
        r.id === resource.id ? { ...r, is_favorite: !r.is_favorite } : r
      ));
      toast({ title: resource.is_favorite ? "Removed from favorites" : "Added to favorites" });
    } catch (error: any) {
      console.error('Error updating favorite:', error);
      toast({
        variant: 'destructive',
        title: 'Error updating favorite',
        description: 'Unable to update favorite. Please try again later.'
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="text-lg">Loading resources...</div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Archive className="h-6 w-6 text-primary" />
            Resources
          </CardTitle>
          <CardDescription>
            Organize your study notes and resources with easy categorization and search
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notes and resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  // TODO: Implement advanced filter functionality
                  toast({ title: "Advanced filter coming soon" });
                }}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button onClick={() => openAddModal(activeTab === 'notes' ? 'note' : 'other')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </Button>
            </div>
          </div>
          
          {/* Category Filter Pills */}
          <div className="flex gap-2 mt-4">
            {categoryFilters.map((filter) => (
              <Button
                key={filter.value}
                variant={selectedCategory === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(filter.value)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="other" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Other Resources
          </TabsTrigger>
          <TabsTrigger value="ai-highlights" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Highlights
          </TabsTrigger>
        </TabsList>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <div className="grid gap-4">
            {filteredNotes.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No notes found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'Try adjusting your search or filter criteria' 
                      : 'Start by adding your first study note'
                    }
                  </p>
                  <Button onClick={() => openAddModal('note')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Note
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredNotes.map((note) => (
                <Card key={note.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{note.title}</h3>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const foundResource = resources.find(r => r.id === note.id);
                              if (foundResource) {
                                toggleFavorite(foundResource);
                              }
                            }}
                            className="h-6 w-6"
                          >
                            <Star className={cn(
                              "h-4 w-4",
                              note.isFavorite && "text-yellow-500 fill-current"
                            )} />
                          </Button>
                          <Badge variant={note.category === 'JEE' ? 'default' : 'secondary'}>
                            {note.category}
                          </Badge>
                        </div>
                        {note.description && (
                          <p className="text-sm text-muted-foreground mb-2">{note.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {note.date}
                          </span>
                          {note.subject && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {note.subject}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 mt-2">
                          {note.tags?.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="icon" onClick={() => {
                          const foundResource = resources.find(r => r.id === note.id);
                          if (foundResource) {
                            openEditModal(foundResource);
                          }
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteNote(note.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* AI Highlights Tab */}
        <TabsContent value="ai-highlights" className="space-y-4">
          <div className="grid gap-4">
            {filteredAiHighlights.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No AI highlights yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Use the save/highlight options in StudyBuddy to store important messages here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredAiHighlights.map((note) => (
                <Card key={note.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold">{note.title}</h3>
                          <Badge variant="secondary">AI Highlight</Badge>
                          <Badge variant={note.category === 'JEE' ? 'default' : 'secondary'}>
                            {note.category}
                          </Badge>
                        </div>
                        {note.description && (
                          <p className="text-sm text-muted-foreground mb-2">{note.description}</p>
                        )}
                        {(() => {
                          const { highlight, summary } = parseHighlightContent(note.content);
                          return (
                            <div className="space-y-3 mb-2">
                              {highlight && (
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Highlighter className="h-3 w-3 text-yellow-500" />
                                    <span className="text-xs font-semibold uppercase tracking-wide">Highlight</span>
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap">
                                    {highlight}
                                  </p>
                                </div>
                              )}
                              {summary && (
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <Brain className="h-3 w-3 text-purple-500" />
                                    <span className="text-xs font-semibold uppercase tracking-wide">Summary</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                    {summary}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {note.date}
                          </span>
                          {note.subject && (
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {note.subject}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1 mt-2">
                          {note.tags?.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Other Resources Tab */}
        <TabsContent value="other" className="space-y-4">
          <div className="grid gap-4">
            {filteredOtherResources.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Archive className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No resources found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {searchQuery || selectedCategory !== 'all' 
                      ? 'Try adjusting your search or filter criteria' 
                      : 'Add your first resource to get started'
                    }
                  </p>
                  <Button onClick={() => openAddModal('other')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Resource
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredOtherResources.map((resource) => (
                <Card key={resource.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-2 bg-muted rounded-lg">
                          {getTypeIcon(resource.type || 'document')}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold">{resource.name}</h3>
                            <Badge variant={resource.category === 'JEE' ? 'default' : 'secondary'}>
                              {resource.category}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const foundResource = resources.find(r => r.id === resource.id);
                                if (foundResource) {
                                  toggleFavorite(foundResource);
                                }
                              }}
                              className="h-6 w-6"
                            >
                              <Star className={cn(
                                "h-4 w-4",
                                resources.find(r => r.id === resource.id)?.is_favorite && "text-yellow-500 fill-current"
                              )} />
                            </Button>
                          </div>
                          {resource.description && (
                            <p className="text-sm text-muted-foreground mb-2">{resource.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Added {resource.dateAdded}
                            </span>
                            <span className="flex items-center gap-1">
                              <Folder className="h-3 w-3" />
                              {resource.type}
                            </span>
                          </div>
                          <div className="flex gap-1 mt-2">
                            {resource.tags?.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {resource.url && resource.url !== '#' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resource.url && window.open(resource.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Visit
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => {
                          const foundResource = resources.find(r => r.id === resource.id);
                          if (foundResource) {
                            openEditModal(foundResource);
                          }
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteResource(resource.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Help Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <span className="font-medium">Getting Started</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Organize your study materials by creating categorized notes and adding helpful resources. 
            Use the category filters (JEE, Other) to quickly find what you need. 
            Click the plus button to add new content to your collection.
          </p>
        </CardContent>
      </Card>

      {/* Add/Edit Resource Modal */}
      <AddResourceModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onResourceSaved={handleResourceSaved}
        editingResource={editingResource}
        type={modalType}
      />
    </div>
  );
}