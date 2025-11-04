'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { Loader2, ChevronsUpDown, BarChart, Activity, AlertTriangle } from 'lucide-react';
import type { Database } from '@/lib/database.types';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

type ActivityLog = Database['public']['Tables']['activity_logs']['Row'];
type Category = ActivityLog['category'];
const categories: Category[] = ['study', 'revision', 'questions', 'gamification', 'achievement', 'penalty', 'schedule', 'board_exam', 'spare'];

const categoryColors: Record<Category, string> = {
    study: 'bg-blue-100 text-blue-800 border-blue-300',
    revision: 'bg-green-100 text-green-800 border-green-300',
    questions: 'bg-purple-100 text-purple-800 border-purple-300',
    gamification: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    achievement: 'bg-amber-100 text-amber-800 border-amber-300',
    penalty: 'bg-red-100 text-red-800 border-red-300',
    schedule: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    board_exam: 'bg-teal-100 text-teal-800 border-teal-300',
    spare: 'bg-gray-100 text-gray-800 border-gray-300',
};

const PAGE_SIZE = 50;

export default function ActivityLogsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    // Filters
    const [filterPeriod, setFilterPeriod] = useState('all');
    const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');

    const fetchLogs = useCallback(async (userId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            let query = supabaseBrowserClient
                .from('activity_logs')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(PAGE_SIZE);

            if (filterCategory !== 'all') {
                query = query.eq('category', filterCategory);
            }

            // You can expand date filtering here
            // For now, it's simple and re-fetches everything

            const { data, error: queryError, count } = await query;
            
            if (queryError) {
                // Throwing the error will be caught by the catch block
                throw queryError;
            }

            setLogs(data || []);
            setTotalCount(count || 0);

        } catch (e: any) {
            console.error("Failed to load activity logs:", e);
            setError("Could not load activity logs. Make sure the 'activity_logs' table exists and is accessible in Supabase.");
            toast({
                variant: 'destructive',
                title: 'Error Loading Logs',
                description: e.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [filterCategory, toast]);


    useEffect(() => {
        const checkUser = async () => {
            const currentUser = await getCurrentUser();
            if (!currentUser) {
                router.push('/auth');
            } else {
                setUser(currentUser);
            }
        };
        checkUser();
    }, [router]);
    
    useEffect(() => {
        if(user) {
            fetchLogs(user.id);
        }
    }, [user, fetchLogs]);

    const groupedLogs = useMemo(() => {
        const groups: { [key: string]: ActivityLog[] } = {};
        logs.forEach(log => {
            const date = new Date(log.created_at);
            let groupKey = format(date, 'MMMM d, yyyy');
            if (isToday(date)) groupKey = 'Today';
            if (isYesterday(date)) groupKey = 'Yesterday';
            if (!groups[groupKey]) groups[groupKey] = [];
            groups[groupKey].push(log);
        });
        return groups;
    }, [logs]);
    
    if (isLoading) {
        return <PageSkeleton />;
    }
    
    if (error) {
        return (
            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle />
                        Error Loading Data
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p>{error}</p>
                    <Button onClick={() => user && fetchLogs(user.id)} className="mt-4">Retry</Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-6 w-6 text-primary" /> Activity Logs
                    </CardTitle>
                    <CardDescription>View all {totalCount > 0 ? totalCount : '0'} logged activities</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <Select value={filterPeriod} onValueChange={setFilterPeriod} disabled>
                            <SelectTrigger><SelectValue placeholder="Filter by date..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="7days">Last 7 days</SelectItem>
                                <SelectItem value="30days">Last 30 days</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterCategory} onValueChange={(val) => setFilterCategory(val as Category | 'all')}>
                            <SelectTrigger><SelectValue placeholder="Filter by category..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
            
            {logs.length === 0 ? (
                 <Card className="text-center py-16 text-muted-foreground">
                    <BarChart className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-medium">No Activities Logged Yet</h3>
                    <p className="text-sm">Activity logging will start automatically as you use the app.</p>
                </Card>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                        <div key={date}>
                            <h3 className="text-lg font-semibold mb-3">{date}</h3>
                            <div className="space-y-3">
                                {dateLogs.map(log => <LogCard key={log.id} log={log} />)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function LogCard({ log }: { log: ActivityLog }) {
    const categoryColor = categoryColors[log.category as Category] || 'bg-gray-100 text-gray-800';

    return (
        <Collapsible className="border rounded-lg overflow-hidden">
            <div className="flex items-start gap-4 p-4 bg-card">
                <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                         <Badge className={categoryColor}>{log.category}</Badge>
                         <Badge variant="outline">{log.activity_type}</Badge>
                        <span className="text-muted-foreground">{format(new Date(log.created_at), 'h:mm:ss a')} ({formatDistanceToNow(new Date(log.created_at), { addSuffix: true })})</span>
                    </div>
                    <p className="text-sm font-medium">{log.summary}</p>
                    {(log.context_tags as string[])?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {(log.context_tags as string[]).map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
                        </div>
                    )}
                </div>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="self-center">
                        <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
                <div className="p-4 bg-muted/50 border-t">
                    <h4 className="font-semibold mb-2">Detailed Data</h4>
                    <pre className="text-xs bg-background p-3 rounded-md overflow-x-auto">
                        {JSON.stringify(log.activity_data, null, 2)}
                    </pre>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function PageSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        </div>
    );
}
