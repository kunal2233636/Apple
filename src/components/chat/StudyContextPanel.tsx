'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Target, 
  Clock, 
  Users, 
  Plus, 
  X, 
  GraduationCap,
  Brain,
  Zap,
  Award,
  Save,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudyContext } from '@/app/(app)/chat/page';

interface StudyContextPanelProps {
  value: StudyContext;
  onChange: (context: StudyContext) => void;
  className?: string;
}

const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner', icon: GraduationCap, color: 'text-green-600' },
  { value: 'intermediate', label: 'Intermediate', icon: Brain, color: 'text-yellow-600' },
  { value: 'advanced', label: 'Advanced', icon: Zap, color: 'text-red-600' },
];

const COMMON_SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
  'History', 'Geography', 'English', 'Literature', 'Economics',
  'Psychology', 'Philosophy', 'Art', 'Music', 'Foreign Languages',
  'Business', 'Engineering', 'Medicine', 'Law', 'Social Sciences'
];

const COMMON_GOALS = [
  'Exam Preparation', 'Concept Understanding', 'Problem Solving',
  'Research & Analysis', 'Creative Writing', 'Language Learning',
  'Skill Development', 'Knowledge Retention', 'Critical Thinking',
  'Practical Application', 'Theory Mastery', 'Quick Review'
];

export default function StudyContextPanel({ value, onChange, className }: StudyContextPanelProps) {
  const [newGoal, setNewGoal] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const updateField = (field: keyof StudyContext, newValue: any) => {
    onChange({
      ...value,
      [field]: newValue,
      lastActivity: new Date(),
    });
  };

  const addGoal = () => {
    if (newGoal.trim() && !value.learningGoals.includes(newGoal.trim())) {
      updateField('learningGoals', [...value.learningGoals, newGoal.trim()]);
      setNewGoal('');
    }
  };

  const removeGoal = (goal: string) => {
    updateField('learningGoals', value.learningGoals.filter(g => g !== goal));
  };

  const addTopic = () => {
    if (newTopic.trim() && !value.topics.includes(newTopic.trim())) {
      updateField('topics', [...value.topics, newTopic.trim()]);
      setNewTopic('');
    }
  };

  const removeTopic = (topic: string) => {
    updateField('topics', value.topics.filter(t => t !== topic));
  };

  const addCommonSubject = (subject: string) => {
    updateField('subject', subject);
  };

  const addCommonGoal = (goal: string) => {
    if (!value.learningGoals.includes(goal)) {
      updateField('learningGoals', [...value.learningGoals, goal]);
    }
  };

  const resetContext = () => {
    onChange({
      subject: '',
      difficultyLevel: 'intermediate',
      learningGoals: [],
      topics: [],
      timeSpent: 0,
      lastActivity: new Date(),
    });
  };

  const saveContext = () => {
    // Auto-save is handled by parent component
    onChange({ ...value, lastActivity: new Date() });
  };

  const getDifficultyIcon = (level: string) => {
    const config = DIFFICULTY_LEVELS.find(d => d.value === level);
    return config ? config.icon : Brain;
  };

  const getDifficultyColor = (level: string) => {
    const config = DIFFICULTY_LEVELS.find(d => d.value === level);
    return config ? config.color : 'text-gray-600';
  };

  const formatTimeSpent = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Context Overview */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">
              {value.subject || 'No Subject Set'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {value.learningGoals.length > 0 
                ? `${value.learningGoals.length} goal${value.learningGoals.length !== 1 ? 's' : ''} set`
                : 'No learning goals defined'
              }
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Time Spent</div>
            <div className="font-medium">{formatTimeSpent(value.timeSpent)}</div>
          </div>
        </div>
      </Card>

      {/* Subject Input */}
      <div className="space-y-2">
        <Label>Study Subject</Label>
        <Input
          value={value.subject}
          onChange={(e) => updateField('subject', e.target.value)}
          placeholder="e.g., Mathematics, Physics, History..."
          className="w-full"
        />
        
        {/* Quick Subject Selection */}
        <div className="flex flex-wrap gap-1 mt-2">
          {COMMON_SUBJECTS.slice(0, 8).map((subject) => (
            <Button
              key={subject}
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => addCommonSubject(subject)}
            >
              {subject}
            </Button>
          ))}
        </div>
      </div>

      {/* Difficulty Level */}
      <div className="space-y-2">
        <Label>Difficulty Level</Label>
        <Select value={value.difficultyLevel} onValueChange={(level: any) => updateField('difficultyLevel', level)}>
          <SelectTrigger>
            <SelectValue>
              <div className="flex items-center gap-2">
                {(() => {
                  const Icon = getDifficultyIcon(value.difficultyLevel);
                  return <Icon className={cn('h-4 w-4', getDifficultyColor(value.difficultyLevel))} />;
                })()}
                <span>
                  {DIFFICULTY_LEVELS.find(d => d.value === value.difficultyLevel)?.label}
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {DIFFICULTY_LEVELS.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                <div className="flex items-center gap-2">
                  <level.icon className={cn('h-4 w-4', level.color)} />
                  <span>{level.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Learning Goals */}
      <div className="space-y-3">
        <Label>Learning Goals</Label>
        
        {/* Add Goal Input */}
        <div className="flex gap-2">
          <Input
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder="Add a learning goal..."
            onKeyDown={(e) => e.key === 'Enter' && addGoal()}
            className="flex-1"
          />
          <Button onClick={addGoal} size="sm" disabled={!newGoal.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Common Goals */}
        <div className="flex flex-wrap gap-1">
          {COMMON_GOALS.slice(0, 6).map((goal) => (
            <Button
              key={goal}
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={() => addCommonGoal(goal)}
            >
              <Plus className="h-3 w-3 mr-1" />
              {goal}
            </Button>
          ))}
        </div>

        {/* Goals List */}
        {value.learningGoals.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {value.learningGoals.map((goal) => (
              <Badge key={goal} variant="secondary" className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                {goal}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeGoal(goal)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Topics */}
      <div className="space-y-3">
        <Label>Topics to Cover</Label>
        
        {/* Add Topic Input */}
        <div className="flex gap-2">
          <Input
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="Add a topic..."
            onKeyDown={(e) => e.key === 'Enter' && addTopic()}
            className="flex-1"
          />
          <Button onClick={addTopic} size="sm" disabled={!newTopic.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Topics List */}
        {value.topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {value.topics.map((topic) => (
              <Badge key={topic} variant="outline" className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {topic}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeTopic(topic)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Time Tracking */}
      <div className="space-y-2">
        <Label>Time Spent (minutes)</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            value={value.timeSpent}
            onChange={(e) => updateField('timeSpent', parseInt(e.target.value) || 0)}
            min="0"
            placeholder="0"
            className="flex-1"
          />
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatTimeSpent(value.timeSpent)}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={saveContext} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          Save Context
        </Button>
        <Button onClick={resetContext} variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Help Text */}
      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <p className="font-medium mb-1">💡 Study Context Tips:</p>
        <ul className="space-y-1 text-xs">
          <li>• Setting study context helps the AI provide more relevant responses</li>
          <li>• Your context is saved automatically and shared across chat sessions</li>
          <li>• Use specific subjects and goals for better AI assistance</li>
        </ul>
      </div>
    </div>
  );
}