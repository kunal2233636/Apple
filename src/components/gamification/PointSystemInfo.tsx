'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Info, Star, TrendingUp, TrendingDown, Award, Zap } from 'lucide-react';
import { LEVEL_SYSTEM } from '@/lib/gamification/levels';

interface PointSystemInfoProps {
  children: React.ReactNode;
}

export function PointSystemInfo({ children }: PointSystemInfoProps) {
  const rewards = [
    {
      category: 'Session Completion',
      items: [
        { action: 'Complete Study Session', points: 50, description: 'Finish any study session with meaningful progress' },
        { action: 'First Session of Day', points: 25, description: 'Extra bonus for starting your daily study routine' },
        { action: 'Complete Pomodoro Cycle', points: 10, description: 'Each completed 25-minute focused study period' },
        { action: 'Complete Block', points: 30, description: 'Finish any scheduled study block' },
      ]
    },
    {
      category: 'Study Progress',
      items: [
        { action: 'Study Hour', points: 50, description: 'For every hour of productive study time' },
        { action: 'Study 30 Minutes', points: 25, description: 'For every 30 minutes of focused study' },
        { action: 'Topic Completed', points: 15, description: 'Successfully master and complete a topic' },
        { action: 'Question Solved', points: 3, description: 'Correctly answer individual practice questions' },
        { action: 'Revision Completed', points: 25, description: 'Complete scheduled topic revision' },
      ]
    },
    {
      category: 'Goals & Bonuses',
      items: [
        { action: 'Daily Goal Met (10+ hours)', points: 200, description: 'Achieve the daily study target' },
        { action: 'Daily Streak', points: 100, description: 'Maintain consistent daily study habits' },
        { action: 'Weekly Goal Met', points: 500, description: 'Complete weekly study objectives' },
        { action: 'Early Riser Bonus', points: 50, description: 'Start first block before 7 AM' },
        { action: 'Night Owl (Finish before 11 PM)', points: 30, description: 'Complete all blocks before late hours' },
      ]
    }
  ];

  const penalties = [
    {
      category: 'Study Deficiency',
      items: [
        { action: 'Study Below 10 Hours', points: -10000, description: 'Daily study less than minimum target', severity: 'high' },
        { action: 'Incomplete Day', points: -5000, description: 'Complete less than 5 blocks in a day', severity: 'high' },
        { action: 'Late Start', points: -1000, description: 'First block starts after 8 AM', severity: 'medium' },
        { action: 'Board Block Insufficient', points: -5000, description: 'Study less than 2 hours of boards content', severity: 'high' },
      ]
    },
    {
      category: 'Performance Issues',
      items: [
        { action: 'Wrong Answer', points: -50, description: 'Incorrect answer in practice questions', severity: 'low' },
        { action: 'Block Skipped', points: -1500, description: 'Skip a planned study block', severity: 'medium' },
        { action: 'Time Exceeded Penalty', points: -1, description: '1 point per second over planned duration', severity: 'medium' },
        { action: 'Late Start Delay', points: -10, description: 'Per second delay when starting late', severity: 'low' },
      ]
    },
    {
      category: 'Revision & Maintenance',
      items: [
        { action: 'Revision Queue Overflow', points: -2000, description: 'Per overdue topic in revision queue', severity: 'medium' },
        { action: 'Zero Revision (2+ days)', points: -3000, description: 'No revision activity for extended period', severity: 'high' },
      ]
    }
  ];

  const getPointColor = (points: number) => {
    if (points > 0) return 'text-green-600 dark:text-green-400';
    if (points < -1000) return 'text-red-600 dark:text-red-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;
    const variants = {
      low: 'default' as const,
      medium: 'secondary' as const,
      high: 'destructive' as const,
    };
    return (
      <Badge variant={variants[severity as keyof typeof variants]} className="text-xs">
        {severity}
      </Badge>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Info className="h-5 w-5 text-blue-600" />
            Point System Guide
          </DialogTitle>
          <DialogDescription>
            Understand how to earn points and avoid penalties in the gamification system
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-8">
            {/* Level System */}
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                Level Progression
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {LEVEL_SYSTEM.map((level) => (
                  <div key={level.level} className="text-center p-3 rounded-lg border bg-muted/50">
                    <div className="text-2xl font-bold text-blue-600">Lv.{level.level}</div>
                    <div className="text-sm font-medium">{level.title}</div>
                    <div className="text-xs text-muted-foreground">{level.xp.toLocaleString()} XP</div>
                  </div>
                ))}
              </div>
            </section>

            {/* Rewards */}
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Earning Points (Rewards)
              </h3>
              <div className="space-y-6">
                {rewards.map((category, idx) => (
                  <div key={idx}>
                    <h4 className="font-medium mb-3 text-muted-foreground">{category.category}</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {category.items.map((item, itemIdx) => (
                          <TableRow key={itemIdx}>
                            <TableCell className="font-medium">{item.action}</TableCell>
                            <TableCell>
                              <span className={`font-bold flex items-center gap-1 ${getPointColor(item.points)}`}>
                                <Zap className="h-3 w-3" />
                                +{item.points}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.description}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            </section>

            {/* Penalties */}
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Point Deductions (Penalties)
              </h3>
              <div className="space-y-6">
                {penalties.map((category, idx) => (
                  <div key={idx}>
                    <h4 className="font-medium mb-3 text-muted-foreground">{category.category}</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {category.items.map((item, itemIdx) => (
                          <TableRow key={itemIdx}>
                            <TableCell className="font-medium">{item.action}</TableCell>
                            <TableCell>
                              <span className={`font-bold flex items-center gap-1 ${getPointColor(item.points)}`}>
                                {item.points}
                              </span>
                            </TableCell>
                            <TableCell>
                              {getSeverityBadge(item.severity)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.description}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            </section>

            {/* Streak Bonuses */}
            <section>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-600" />
                Streak Bonuses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                  <div className="font-semibold text-blue-700 dark:text-blue-300">Daily Streak</div>
                  <div className="text-2xl font-bold text-blue-600">100 XP</div>
                  <div className="text-sm text-muted-foreground">For maintaining daily study habits</div>
                </div>
                <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-950/20">
                  <div className="font-semibold text-purple-700 dark:text-purple-300">Weekly Streak</div>
                  <div className="text-2xl font-bold text-purple-600">500 XP</div>
                  <div className="text-sm text-muted-foreground">7 consecutive days of study</div>
                </div>
                <div className="p-4 rounded-lg border bg-yellow-50 dark:bg-yellow-950/20">
                  <div className="font-semibold text-yellow-700 dark:text-yellow-300">Monthly Streak</div>
                  <div className="text-2xl font-bold text-yellow-600">2000 XP</div>
                  <div className="text-sm text-muted-foreground">30 consecutive days of study</div>
                </div>
              </div>
            </section>

            {/* Tips */}
            <section className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">💡 Pro Tips</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Start your day early to avoid late start penalties and earn the Early Riser bonus</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Focus on completing your daily 10-hour goal to avoid major penalties</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Keep up with revision schedules to prevent queue overflow penalties</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Monitor your time to avoid time-exceeded penalties</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Maintain streaks for exponential point growth through bonuses</span>
                </li>
              </ul>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}