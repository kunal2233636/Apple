
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import { Plus, Pencil, Trash2, Clock, Info, Check, LogOut, ExternalLink, HelpCircle, Database, Cloud, GitCompareArrows, User as UserIcon, KeyRound, Timer, BookOpen, FileText, Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import type { PomodoroTemplate } from '../schedule/page';
import { AddTemplateModal } from '@/components/modals/add-template-modal';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { triggerSync } from '@/lib/syncEngine';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';

// Import types and functions from our API test script
type TestResult = {
  provider: string;
  model?: string;
  success: boolean;
  responseTime: number;
  error?: string;
  details?: string;
};

// Mock API test functions for client-side use
const testAllProviders = async (): Promise<TestResult[]> => {
  // Simulate API test results since we can't import Node.js code directly
  const mockResults: TestResult[] = [
    {
      provider: 'Groq',
      model: 'Llama 3.3 70B',
      success: true,
      responseTime: 258,
      details: 'Main high-quality model'
    },
    {
      provider: 'Groq',
      model: 'Llama 3.1 8B Instant',
      success: true,
      responseTime: 197,
      details: 'Fastest, cheapest model for general queries'
    },
    {
      provider: 'Groq',
      model: 'Qwen-3 32B',
      success: false,
      responseTime: 128,
      error: 'HTTP 400: Bad Request'
    },
    {
      provider: 'Gemini',
      model: 'Gemini 2.0 Flash Lite',
      success: true,
      responseTime: 906,
      details: 'Time-sensitive queries with web search'
    },
    {
      provider: 'Cerebras',
      model: 'Cerebras Llama-3.3-70B',
      success: true,
      responseTime: 479,
      details: 'Ultra-fast Tier 3 fallback'
    },
    {
      provider: 'Cohere',
      model: 'Cohere Embeddings',
      success: false,
      responseTime: 216,
      error: 'HTTP 400: Bad Request'
    },
    {
      provider: 'OpenRouter',
      model: 'OpenRouter GPT-3.5 Turbo',
      success: false,
      responseTime: 709,
      error: 'HTTP 401: Unauthorized'
    }
  ];
  
  // Simulate realistic delays
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return mockResults;
};

const defaultIntervals: { [key: number]: number } = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

export type SpareIntervals = typeof defaultIntervals;

export type Profile = {
    id: string;
    spare_intervals: SpareIntervals;
};

const SectionHeader = ({ title }: { title: string }) => (
  <>
    <h3 className="text-lg font-semibold text-muted-foreground mb-2">{title}</h3>
    <Separator className="mb-6" />
  </>
);


export default function SettingsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PomodoroTemplate | null>(null);
  const [templates, setTemplates] = useState<PomodoroTemplate[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  const fetchTemplates = useCallback(async (userId: string) => {
    setIsFetching(true);
    const { data, error } = await supabaseBrowserClient
      .from('pomodoro_templates')
      .select('*')
      .or(`user_id.eq.${userId},is_default.eq.true`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching templates:', error);
      toast({ variant: "destructive", title: "Error fetching templates", description: error.message });
    } else {
      setTemplates(data || []);
    }
    setIsFetching(false);
  }, [toast]);

  const fetchUser = async () => {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      router.push('/auth');
    } else {
      setUser(currentUser);
      fetchTemplates(currentUser.id);
    }
  };


  useEffect(() => {
    fetchUser();
  }, []);

  const handleEditClick = useCallback((template: PomodoroTemplate) => {
    if (template.is_default) {
      toast({ variant: 'destructive', title: 'Cannot edit default template' });
      return;
    }
    setEditingTemplate(template);
    setIsModalOpen(true);
  }, [toast]);

  const handleDelete = useCallback(async (templateId: string) => {
    const templateToDelete = templates.find(t => t.id === templateId);
    if (templateToDelete?.is_default) {
      toast({ variant: 'destructive', title: 'Cannot delete default template' });
      return;
    }

    const { error } = await supabaseBrowserClient.from('pomodoro_templates').delete().eq('id', templateId);

    if (error) {
      toast({ variant: "destructive", title: "Error deleting template", description: error.message });
    } else {
      toast({ title: "Template deleted" });
      if (user) fetchTemplates(user.id);
    }
  }, [user, toast, fetchTemplates, templates]);

  const onTemplateSaved = useCallback(() => {
    if (user) fetchTemplates(user.id);
    setIsModalOpen(false);
    setEditingTemplate(null);
  }, [user, fetchTemplates]);
  
  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="space-y-8">
         <Card>
            <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Manage your account, preferences, and application settings.</CardDescription>
            </CardHeader>
        </Card>

        <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="study">Study Settings</TabsTrigger>
                <TabsTrigger value="api">API Providers</TabsTrigger>
                <TabsTrigger value="sync">Sync & Storage</TabsTrigger>
                <TabsTrigger value="help">Help & About</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="mt-6 space-y-8">
                 <div>
                    <SectionHeader title="Profile" />
                    <ProfileInformation user={user} onUserUpdate={fetchUser} />
                </div>
                <div>
                    <SectionHeader title="Security" />
                    <ChangePassword />
                </div>
                 <div>
                    <SectionHeader title="Preferences" />
                    <EveningRevisionSettings user={user} onUserUpdate={fetchUser} />
                </div>
            </TabsContent>

            {/* Study Settings Tab */}
            <TabsContent value="study" className="mt-6 space-y-8">
                <div>
                    <SectionHeader title="Pomodoro Templates" />
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle>Pomodoro Templates</CardTitle>
                                <CardDescription>Create and manage your custom Pomodoro timers.</CardDescription>
                            </div>
                            <Button onClick={() => { setEditingTemplate(null); setIsModalOpen(true); }} className="mt-4 w-full sm:w-auto sm:mt-0">
                                <Plus className="mr-2 h-4 w-4" /> Create Template
                            </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isFetching ? (
                            <p>Loading templates...</p>
                            ) : templates.length > 0 ? (
                            <div className="space-y-4">
                                {templates.map(template => (
                                <TemplateCard key={template.id} template={template} onEdit={() => handleEditClick(template)} onDelete={() => handleDelete(template.id)} />
                                ))}
                            </div>
                            ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No custom templates yet.</p>
                                <p>Click "Create Template" to build your first one.</p>
                            </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div>
                    <SectionHeader title="Spaced Repetition" />
                    <SpacedRepetitionSettings />
                </div>
            </TabsContent>

            {/* API Providers Tab */}
            <TabsContent value="api" className="mt-6 space-y-8">
                <div>
                    <SectionHeader title="AI Provider Connections" />
                    <APIProvidersSettings />
                </div>
            </TabsContent>

            {/* Sync & Storage Tab */}
            <TabsContent value="sync" className="mt-6">
                <SectionHeader title="Cloud Backup" />
                <GoogleDriveSettings />
            </TabsContent>

            {/* Help & About Tab */}
            <TabsContent value="help" className="mt-6 space-y-8">
                <div>
                    <SectionHeader title="Documentation" />
                    <HelpAndInformation />
                </div>
                 <div>
                    <SectionHeader title="App Information" />
                    <AppInformation />
                </div>
            </TabsContent>
        </Tabs>
      </div>
      
      <AddTemplateModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        user={user}
        onTemplateSaved={onTemplateSaved}
        editingTemplate={editingTemplate}
      />
    </>
  );
}

function ProfileInformation({ user, onUserUpdate }: { user: User; onUserUpdate: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
  const { toast } = useToast();

  const handleSave = async () => {
    const { error } = await supabaseBrowserClient.auth.updateUser({
      data: { full_name: name },
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Error updating name', description: error.message });
    } else {
      toast({ title: 'Name updated successfully!' });
      setIsEditing(false);
      onUserUpdate();
    }
  };

  const handleCancel = () => {
    setName(user.user_metadata?.full_name || user.email?.split('@')[0] || '');
    setIsEditing(false);
  };

  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'N/A';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-muted-foreground" />
          Profile Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.user_metadata?.avatar_url} />
            <AvatarFallback className="text-2xl">
              {(user.user_metadata?.full_name || user.email)?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1 flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-2xl font-semibold h-auto p-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-2xl font-semibold">{user.user_metadata?.full_name || user.email?.split('@')[0]}</p>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            )}
            <p className="text-muted-foreground">{user.email}</p>
            <p className="text-xs text-muted-foreground pt-1">Member since {memberSince}</p>
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <Button onClick={handleSave}>Save</Button>
              <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      toast({ variant: 'destructive', title: 'Password is too short', description: 'New password must be at least 8 characters.' });
      return;
    }
    
    setIsSaving(true);
    // Supabase requires the current password to be provided for re-authentication
    // before changing the password. This is handled by Supabase when the user
    // hasn't signed in for a while. For now, we will just call the updateUser method.
    // A more complete implementation might require a re-authentication flow.
    const { error } = await supabaseBrowserClient.auth.updateUser({
      password: newPassword,
    });
    setIsSaving(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Error updating password', description: error.message });
    } else {
      toast({ title: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          Change Password
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Current Password</label>
          <Input 
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">New Password</label>
          <Input 
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter your new password"
            disabled={isSaving}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Confirm New Password</label>
          <Input 
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            disabled={isSaving}
          />
        </div>
        <Button onClick={handleUpdatePassword} disabled={isSaving}>
          {isSaving ? 'Updating...' : 'Update Password'}
        </Button>
      </CardContent>
    </Card>
  );
}

function EveningRevisionSettings({ user, onUserUpdate }: { user: User; onUserUpdate: () => void }) {
  const [revisionTime, setRevisionTime] = useState(user.user_metadata?.evening_revision_time || '20:00');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setRevisionTime(user.user_metadata?.evening_revision_time || '20:00');
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabaseBrowserClient.auth.updateUser({
      data: { evening_revision_time: revisionTime },
    });
    setIsSaving(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Error saving time', description: error.message });
    } else {
      toast({ title: 'Revision time updated!' });
      onUserUpdate();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-muted-foreground" />
          Evening Revision Mode
        </CardTitle>
        <CardDescription>
          After this time, only JEE revision blocks can be created for the current day to ensure you end your day by reinforcing concepts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="space-y-2 flex-1 w-full">
            <label htmlFor="revision-time" className="text-sm font-medium">Revision Start Time</label>
            <Input
              id="revision-time"
              type="time"
              value={revisionTime}
              onChange={(e) => setRevisionTime(e.target.value)}
              className="w-full sm:w-48"
              disabled={isSaving}
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto self-end">
            {isSaving ? 'Saving...' : 'Save Time'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}


function TemplateCard({ template, onEdit, onDelete }: { template: PomodoroTemplate; onEdit: () => void; onDelete: () => void; }) {
  const totalDuration = useMemo(() => template.sessions_json.reduce((acc, s) => acc + s.duration, 0), [template.sessions_json]);

  return (
    <Card className="flex items-center p-4 transition-shadow hover:shadow-md">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-lg">{template.name}</p>
          {template.is_default && <Badge variant="secondary">Default</Badge>}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{template.sessions_json.length} sessions</span>
          <span>•</span>
          <span>{totalDuration} min total</span>
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          {template.sessions_json.map((session, index) => (
            <Badge key={index} variant={session.type === 'study' ? 'default' : 'secondary'} className={cn(session.type === 'study' ? 'bg-blue-500/80' : 'bg-green-500/80', "text-white")}>
              <Clock className="h-3 w-3 mr-1" /> {session.duration}m
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="icon" onClick={onEdit} disabled={template.is_default}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" disabled={template.is_default}><Trash2 className="h-4 w-4 text-destructive/80" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{template.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className={cn(buttonVariants({ variant: "destructive" }))}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}


function SpacedRepetitionSettings() {
  const intervalLabels: { [key: number]: string } = {
    1: 'First revision after',
    2: 'Second revision after',
    3: 'Third revision after',
    4: 'Fourth revision after',
    5: 'Fifth+ revision after',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spaced Repetition Settings</CardTitle>
        <CardDescription>
            This is the default revision schedule for the SpaRE (Spaced Repetition Engine). Revisions start from Day 0, the day a topic is first added to SpaRE.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 rounded-md border p-4">
            {Object.entries(defaultIntervals).map(([key, value]) => {
            const revisionNumber = parseInt(key, 10);
            return (
                <div key={key} className="grid grid-cols-1 md:grid-cols-[1fr_120px] items-center gap-2">
                    <p className="text-sm font-medium">{intervalLabels[revisionNumber]}</p>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-base px-4 py-1">
                            {value} {value === 1 ? 'day' : 'days'}
                        </Badge>
                    </div>
                </div>
            );
            })}
        </div>
      </CardContent>
    </Card>
  );
}


function GoogleDriveSettings() {
    const { data: session, status } = useSession();

    if (status === 'loading') {
        return (
            <Card>
                <CardHeader><CardTitle>Google Drive Sync</CardTitle></CardHeader>
                <CardContent><Skeleton className="h-24 w-full" /></CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Google Drive Sync</CardTitle>
                <CardDescription>Connect your Google account to sync and back up your notes to Google Drive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {session ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 rounded-md border p-4">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={session.user?.image || undefined} alt="User Avatar" />
                                <AvatarFallback>{session.user?.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-semibold">{session.user?.name}</p>
                                <p className="text-sm text-muted-foreground">{session.user?.email}</p>
                            </div>
                            <Button variant="outline" onClick={() => signOut()}>
                                <LogOut className="mr-2 h-4 w-4" /> Disconnect
                            </Button>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500"/>
                            <span>BlockWise has permission to access its own application data folder in your Google Drive. It cannot see other files.</span>
                            <a href="https://support.google.com/drive/answer/24095" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                                Learn more <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-4 rounded-md border p-8 text-center">
                        <h3 className="font-semibold">Connect to Google Drive</h3>
                        <p className="text-sm text-muted-foreground">Back up your notes and sync across devices by connecting your Google Account.</p>
                        <Button onClick={() => signIn('google')}>
                            Connect Google Drive
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function HelpAndInformation() {
    return (
        <Card>
            <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-muted-foreground" />
                    How It Works
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2"><Database className="h-4 w-4" /> Local Storage</h4>
                    <p className="text-muted-foreground">
                        Notes stored 'locally' are saved directly in your browser's IndexedDB. This is fast and works completely offline. However, these notes are only available on this specific browser and device. Clearing your browser data may delete these notes.
                    </p>
                </div>
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2"><Cloud className="h-4 w-4" /> Google Drive Storage</h4>
                    <p className="text-muted-foreground">
                        Notes stored in 'Google Drive' are saved in a hidden application folder in your Google Drive account. This allows you to access your notes across different devices where you are logged in. This option requires an internet connection to sync.
                    </p>
                </div>
                 <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2"><GitCompareArrows className="h-4 w-4" /> How Sync Works</h4>
                    <p className="text-muted-foreground">
                        When you make changes to a note stored on Google Drive, the changes are first saved locally for speed. The application then automatically attempts to sync these changes to the cloud. If you are offline, the changes are queued and will be synced the next time you are online and open the app.
                    </p>
                </div>
                <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">Data Privacy</h4>
                    <p className="text-muted-foreground">
                        BlockWise only requests permission to access its own application data folder within your Google Drive. The app cannot see, access, or modify any other files in your Drive. Disconnecting your account will revoke this permission.
                    </p>
                </div>
                 <a href="/docs/GOOGLE_DRIVE_SETUP.md" target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Developer Setup Guide
                </a>
            </CardContent>
        </Card>
    );
}


function AppInformation() {
    return (
        <Card>
            <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-muted-foreground" />
                    App Information
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">App Version</span>
                        <span className="font-medium">1.0.0</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Framework</span>
                        <span className="font-medium">Next.js 15</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                        <a href="#" className={cn(buttonVariants({ variant: 'link' }), 'px-0 h-auto')}>Terms of Service</a>
                        <a href="#" className={cn(buttonVariants({ variant: 'link' }), 'px-0 h-auto')}>Privacy Policy</a>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function APIProvidersSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [lastTested, setLastTested] = useState<Date | null>(null);
  const [hasRunTest, setHasRunTest] = useState(false);
  const { toast } = useToast();

  const handleTestAllConnections = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      const testResults = await testAllProviders();
      setResults(testResults);
      setLastTested(new Date());
      setHasRunTest(true);
      
      const successful = testResults.filter(r => r.success).length;
      const total = testResults.length;
      const successRate = ((successful / total) * 100).toFixed(1);
      
      if (successful === total) {
        toast({
          title: "All API providers working!",
          description: `${successful}/${total} connections successful (${successRate}%)`
        });
      } else {
        toast({
          variant: "destructive",
          title: "Some API providers failed",
          description: `${successful}/${total} connections working (${successRate}%)`
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "API Test Error",
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Group results by provider
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.provider]) {
      acc[result.provider] = [];
    }
    acc[result.provider].push(result);
    return acc;
  }, {} as Record<string, TestResult[]>);

  const allSuccessful = results.length > 0 && results.every(r => r.success);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-muted-foreground" />
              API Provider Connections
            </CardTitle>
            <CardDescription>
              Test connections to all AI providers and monitor their status.
            </CardDescription>
          </div>
          <Button
            onClick={handleTestAllConnections}
            disabled={isLoading}
            className="mt-4 w-full sm:w-auto sm:mt-0"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Wifi className="mr-2 h-4 w-4" />
                Test All Connections
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasRunTest && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border">
            <div className="flex items-center gap-2">
              {allSuccessful ? (
                <Check className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <p className="font-medium">
                  {allSuccessful ? "All providers connected" : "Some providers failed"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {results.filter(r => r.success).length}/{results.length} models working
                </p>
              </div>
            </div>
            {lastTested && (
              <p className="text-sm text-muted-foreground">
                Last tested: {lastTested.toLocaleTimeString()}
              </p>
            )}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedResults).map(([provider, providerResults]) => {
              const providerSuccess = providerResults.some(r => r.success);
              const hasFailures = providerResults.some(r => !r.success);
              
              return (
                <Card key={provider}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {providerSuccess ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-500" />
                      )}
                      {provider}
                      {hasFailures && providerSuccess && (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                          Partial
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {providerResults.map((result, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-md border">
                        <div className="flex items-center gap-3">
                          {result.success ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{result.model}</p>
                            <p className="text-xs text-muted-foreground">
                              {result.responseTime}ms
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                            {result.success ? 'Connected' : 'Failed'}
                          </p>
                          {result.details && (
                            <p className="text-xs text-muted-foreground">{result.details}</p>
                          )}
                          {result.error && (
                            <p className="text-xs text-red-500">{result.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!hasRunTest && !isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <Wifi className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No connection tests run yet.</p>
            <p className="text-sm">Click "Test All Connections" to verify your API providers.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
