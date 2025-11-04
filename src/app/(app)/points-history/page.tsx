
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUser, supabaseBrowserClient } from '@/lib/supabase';
import { format, formatDistanceToNow, startOfToday, startOfWeek, startOfMonth } from 'date-fns';
import { PlusCircle, MinusCircle, Star, CheckCircle, AlertTriangle, Loader2, ArrowUp, ArrowDown, History, BarChart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getLevelTitle, LEVEL_SYSTEM } from '@/lib/gamification/levels';
import type { Database } from '@/lib/database.types';
import { useRouter } from 'next/navigation';

type PointsHistory = Database['public']['Tables']['points_history']['Row'];
type UserPenalty = Database['public']['Tables']['user_penalties']['Row'];
type GamificationData = Database['public']['Tables']['user_gamification']['Row'];

type ActivityItem = {
    id: string;
    type: 'reward' | 'penalty';
    points: number;
    description: string;
    timestamp: string;
    details?: any;
};

type FilterPeriod = 'all' | 'today' | 'week' | 'month';
type FilterType = 'all' | 'rewards' | 'penalties';
type SortOption = 'recent' | 'highest' | 'lowest';

const PAGE_SIZE = 20;

export default function PointsHistoryPage() {
    const [gamificationData, setGamificationData] = useState<GamificationData | null>(null);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [sortOption, setSortOption] = useState<SortOption>('recent');
    
    const { toast } = useToast();
    const router = useRouter();

    const fetchActivities = useCallback(async (pageNum: number) => {
        const user = await getCurrentUser();
        if (!user) {
            router.push('/auth');
            return { items: [], hasMore: false };
        }
        
        if (pageNum === 0) setIsLoading(true);
        else setIsLoadingMore(true);

        let fromDate: string | undefined;
        if (filterPeriod === 'today') fromDate = startOfToday().toISOString();
        if (filterPeriod === 'week') fromDate = startOfWeek(new Date()).toISOString();
        if (filterPeriod === 'month') fromDate = startOfMonth(new Date()).toISOString();

        const from = pageNum * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const rewardsQuery = supabaseBrowserClient.from('points_history').select('*').eq('user_id', user.id);
        const penaltiesQuery = supabaseBrowserClient.from('user_penalties').select('*').eq('user_id', user.id);
        
        if (fromDate) {
            rewardsQuery.gte('created_at', fromDate);
            penaltiesQuery.gte('created_at', fromDate);
        }
        
        const [rewardsRes, penaltiesRes] = await Promise.all([
            filterType !== 'penalties' ? rewardsQuery : Promise.resolve({ data: [], error: null }),
            filterType !== 'rewards' ? penaltiesQuery : Promise.resolve({ data: [], error: null }),
        ]);

        if (rewardsRes.error || penaltiesRes.error) {
            toast({ variant: 'destructive', title: 'Error fetching history' });
            setIsLoading(false);
            setIsLoadingMore(false);
            return { items: [], hasMore: false };
        }

        const rewards: ActivityItem[] = (rewardsRes.data || []).map(p => ({
            id: `rew-${p.id}`, type: 'reward', points: p.points_awarded || 0,
            description: (p.reason || 'Activity').replace(/_/g, ' '), timestamp: p.created_at, details: p.details
        }));
        const penalties: ActivityItem[] = (penaltiesRes.data || []).map(p => ({
            id: `pen-${p.id}`, type: 'penalty', points: p.points_deducted || 0,
            description: p.reason, timestamp: p.created_at, details: p.details
        }));
        
        const combined = [...rewards, ...penalties].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        const newItems = combined.slice(from, to + 1);

        if (pageNum === 0) {
            setActivities(newItems);
        } else {
            setActivities(prev => [...prev, ...newItems]);
        }

        const moreToLoad = newItems.length === PAGE_SIZE;
        setHasMore(moreToLoad);
        setPage(pageNum + 1);
        
        setIsLoading(false);
        setIsLoadingMore(false);
    }, [filterPeriod, filterType, toast, router]);

    useEffect(() => {
        const fetchInitialData = async () => {
            const user = await getCurrentUser();
            if (!user) {
                router.push('/auth');
                return;
            }
            const { data } = await supabaseBrowserClient.from('user_gamification').select('*').eq('user_id', user.id).single();
            setGamificationData(data);
            fetchActivities(0);
        };
        fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterPeriod, filterType, sortOption]); // Re-fetch when filters change


    const sortedActivities = useMemo(() => {
        const sorted = [...activities];
        if (sortOption === 'highest') {
            sorted.sort((a, b) => b.points - a.points);
        } else if (sortOption === 'lowest') {
            sorted.sort((a, b) => a.points - b.points);
        }
        // 'recent' is the default from the fetch
        return sorted;
    }, [activities, sortOption]);


    if (isLoading) {
        return <PageSkeleton />;
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                        <History className="h-6 w-6 text-primary" /> Points History
                    </CardTitle>
                    <CardDescription>Review your points earned and penalties received over time.</CardDescription>
                </CardHeader>
            </Card>

            <SummaryCards data={gamificationData} />

            <Card>
                <CardHeader>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select value={filterPeriod} onValueChange={(v: FilterPeriod) => setFilterPeriod(v)}>
                            <SelectTrigger><SelectValue placeholder="Filter by period..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterType} onValueChange={(v: FilterType) => setFilterType(v)}>
                            <SelectTrigger><SelectValue placeholder="Filter by type..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Activities</SelectItem>
                                <SelectItem value="rewards">Rewards Only</SelectItem>
                                <SelectItem value="penalties">Penalties Only</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={sortOption} onValueChange={(v: SortOption) => setSortOption(v)}>
                            <SelectTrigger><SelectValue placeholder="Sort by..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="recent">Most Recent</SelectItem>
                                <SelectItem value="highest">Highest Points</SelectItem>
                                <SelectItem value="lowest">Lowest Points</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {sortedActivities.length > 0 ? (
                        <div className="space-y-4">
                            {sortedActivities.map((item, index) => <ActivityCard key={`${item.id}-${index}`} item={item} />)}
                            {hasMore && (
                                <div className="text-center">
                                    <Button onClick={() => fetchActivities(page)} disabled={isLoadingMore}>
                                        {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Loading...</> : 'Load More'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-muted-foreground">
                            <BarChart className="mx-auto h-12 w-12" />
                            <p className="mt-4 font-semibold">No activities found</p>
                            <p className="text-sm">Try adjusting your filters.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function SummaryCards({ data }: { data: GamificationData | null }) {
    if (!data) return null;
    const netPoints = (data.total_points_earned || 0) - (data.total_penalty_points || 0);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800">
                <CardHeader><CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Earned</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold text-green-600 dark:text-green-400">+{data.total_points_earned || 0}</p></CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800">
                <CardHeader><CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Total Penalties</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold text-red-600 dark:text-red-400">-{data.total_penalty_points || 0}</p></CardContent>
            </Card>
             <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
                <CardHeader><CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Net XP</CardTitle></CardHeader>
                <CardContent><p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{netPoints}</p></CardContent>
            </Card>
             <Card className="bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800">
                <CardHeader><CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Current Level</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">Lvl {data.level || 1}: {getLevelTitle(data.level || 1)}</p></CardContent>
            </Card>
        </div>
    );
}

function ActivityCard({ item }: { item: ActivityItem }) {
    const isReward = item.type === 'reward';
    const Icon = isReward ? PlusCircle : MinusCircle;
    
    return (
        <div className={cn("p-4 rounded-lg flex items-start gap-4", isReward ? "bg-muted/50" : "bg-destructive/10")}>
            <Icon className={cn("h-6 w-6 mt-1", isReward ? "text-green-500" : "text-destructive")} />
            <div className="flex-1">
                <p className="font-semibold capitalize">{item.description}</p>
                <p className="text-xs text-muted-foreground">{format(new Date(item.timestamp), 'MMM d, yyyy, h:mm a')}</p>
            </div>
            <div className={cn("text-lg font-bold text-right", isReward ? "text-green-600" : "text-destructive")}>
                <p>{isReward ? `+${item.points}` : `-${item.points}`}</p>
                <p className="text-xs font-normal text-muted-foreground">{formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}</p>
            </div>
        </div>
    );
}

function PageSkeleton() {
    return (
        <div className="space-y-6">
            <Skeleton className="h-28 w-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
            <Card>
                <CardHeader><Skeleton className="h-10 w-full" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}
