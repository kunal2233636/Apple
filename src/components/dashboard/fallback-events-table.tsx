'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, XCircle, Clock, ArrowRight, Info } from 'lucide-react';
import type { FallbackEvent } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface FallbackEventsTableProps {
  events: FallbackEvent[];
  onLoadMore: () => void;
  hasMore: boolean;
}

// Generate mock fallback events
const generateMockEvents = (): FallbackEvent[] => [
  {
    id: '1',
    timestamp: new Date(Date.now() - 120000), // 2 minutes ago
    featureName: 'General Chat',
    primaryModel: 'groq:llama-3.3-70b',
    fallbackModel: 'cerebras:llama-3.3-70b',
    reason: 'Rate limit exceeded',
    status: 'success',
    responseTime: 2100
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 300000), // 5 minutes ago
    featureName: 'Study Assistant',
    primaryModel: 'gemini:gemini-2.0-flash',
    fallbackModel: 'mistral:mistral-large-latest',
    reason: 'Provider timeout',
    status: 'success',
    responseTime: 1800
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 450000), // 7.5 minutes ago
    featureName: 'General Chat',
    primaryModel: 'groq:llama-3.3-70b',
    fallbackModel: 'openrouter:gpt-3.5-turbo',
    reason: 'Model unavailable',
    status: 'failed',
    responseTime: 0
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 600000), // 10 minutes ago
    featureName: 'Study Assistant',
    primaryModel: 'cerebras:llama-3.3-70b',
    fallbackModel: 'groq:llama-3.1-8b',
    reason: 'Rate limit approaching',
    status: 'success',
    responseTime: 1950
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 900000), // 15 minutes ago
    featureName: 'General Chat',
    primaryModel: 'mistral:mistral-medium-latest',
    fallbackModel: 'cohere:command',
    reason: 'Provider maintenance',
    status: 'success',
    responseTime: 2300
  }
];

const formatRelativeTime = (date: Date) => {
  const now = Date.now();
  const diff = now - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

const getStatusIcon = (status: FallbackEvent['status']) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-yellow-500" />;
  }
};

const getStatusBadge = (status: FallbackEvent['status']) => {
  switch (status) {
    case 'success':
      return <Badge className="bg-green-100 text-green-800 border-green-300">Success</Badge>;
    case 'failed':
      return <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>;
    default:
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
  }
};

export function FallbackEventsTable({ events, onLoadMore, hasMore }: FallbackEventsTableProps) {
  // Use mock data if no events provided
  const displayEvents = events.length > 0 ? events : generateMockEvents();

  const handleRowClick = (event: FallbackEvent) => {
    // In a real implementation, this would open a modal or navigate to a detail page
    console.log('Event details:', event);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Recent Fallback Events</h2>
        <p className="text-muted-foreground">
          Latest fallback chain activations across all features
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Fallback Events Log</CardTitle>
              <CardDescription>
                Last {displayEvents.length} fallback events
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Info className="h-4 w-4 mr-2" />
              View All Events
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Time</TableHead>
                  <TableHead className="w-[120px]">Feature</TableHead>
                  <TableHead>Primary Model</TableHead>
                  <TableHead className="w-[80px]">→</TableHead>
                  <TableHead>Fallback Used</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead className="w-[100px]">Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayEvents.map((event) => (
                  <TableRow
                    key={event.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleRowClick(event)}
                  >
                    <TableCell className="font-mono text-sm">
                      {formatRelativeTime(event.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{event.featureName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm text-muted-foreground">
                        {event.primaryModel}
                      </div>
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4 mx-auto text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">
                        {event.fallbackModel}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[150px] truncate" title={event.reason}>
                        {event.reason}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(event.status)}
                        {getStatusBadge(event.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.status === 'success' ? (
                        <span className="font-mono text-sm">
                          {event.responseTime}ms
                        </span>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Load more button */}
          {hasMore && (
            <div className="flex justify-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={onLoadMore}
                className="min-w-[200px]"
              >
                Show more events
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fallback statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {displayEvents.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Events</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {displayEvents.filter(e => e.status === 'success').length}
              </div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {displayEvents.filter(e => e.status === 'failed').length}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {displayEvents.length > 0 
                  ? Math.round(displayEvents.filter(e => e.status === 'success').reduce((sum, e) => sum + e.responseTime, 0) / displayEvents.filter(e => e.status === 'success').length)
                  : 0}ms
              </div>
              <div className="text-sm text-muted-foreground">Avg Fallback Time</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}