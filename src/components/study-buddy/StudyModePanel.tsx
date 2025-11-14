"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, Brain, Zap, Sparkles, ClipboardList, Layers } from "lucide-react";

export type StudyModeDifficulty = "beginner" | "intermediate" | "advanced";
export type StudyModeExplanationStyle = "simple" | "deep" | "exam_notes";

export interface StudyModeState {
  subject: string;
  topic: string;
  difficulty: StudyModeDifficulty;
  explanationStyle: StudyModeExplanationStyle;
}

interface StudyModePanelProps {
  value: StudyModeState;
  onChange: (value: StudyModeState) => void;
  onGenerateQuiz?: () => void;
  onGenerateFlashcards?: () => void;
}

export function StudyModePanel({ value, onChange, onGenerateQuiz, onGenerateFlashcards }: StudyModePanelProps) {
  const update = (patch: Partial<StudyModeState>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <Card className="mb-3 border-indigo-200 bg-indigo-50/70">
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-white">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
                Study Mode 
                <Badge variant="outline" className="border-indigo-300 bg-indigo-100 text-[11px] font-medium">
                  ON
                </Badge>
              </div>
              <p className="text-[11px] text-indigo-700">Questions are treated as learning queries with structured answers.</p>
            </div>
          </div>
          <div className="hidden gap-1 md:flex">
            {onGenerateQuiz && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={onGenerateQuiz}
              >
                <ClipboardList className="mr-1 h-3 w-3" /> Quiz
              </Button>
            )}
            {onGenerateFlashcards && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={onGenerateFlashcards}
              >
                <Layers className="mr-1 h-3 w-3" /> Flashcards
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {/* Subject */}
          <div className="space-y-1">
            <Label className="text-xs">Subject 📚</Label>
            <Input
              placeholder="e.g. Physics, Calculus"
              value={value.subject}
              onChange={(e) => update({ subject: e.target.value })}
              className="h-8 text-xs"
            />
          </div>

          {/* Topic */}
          <div className="space-y-1">
            <Label className="text-xs">Topic 🎯</Label>
            <Input
              placeholder="e.g. Newton's Laws, Integrals"
              value={value.topic}
              onChange={(e) => update({ topic: e.target.value })}
              className="h-8 text-xs"
            />
          </div>

          {/* Difficulty */}
          <div className="space-y-1">
            <Label className="text-xs">Difficulty 🎓</Label>
            <Select
              value={value.difficulty}
              onValueChange={(difficulty: StudyModeDifficulty) => update({ difficulty })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">
                  <div className="flex items-center gap-2 text-xs">
                    <GraduationCap className="h-3 w-3 text-emerald-600" /> Beginner
                  </div>
                </SelectItem>
                <SelectItem value="intermediate">
                  <div className="flex items-center gap-2 text-xs">
                    <Brain className="h-3 w-3 text-amber-600" /> Intermediate
                  </div>
                </SelectItem>
                <SelectItem value="advanced">
                  <div className="flex items-center gap-2 text-xs">
                    <Zap className="h-3 w-3 text-rose-600" /> Advanced
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Explanation style */}
          <div className="space-y-1">
            <Label className="text-xs">Explanation style 🧠</Label>
            <Select
              value={value.explanationStyle}
              onValueChange={(explanationStyle: StudyModeExplanationStyle) => update({ explanationStyle })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Choose style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">
                  <div className="flex items-center gap-2 text-xs">
                    <Sparkles className="h-3 w-3 text-sky-600" /> Simple
                  </div>
                </SelectItem>
                <SelectItem value="deep">
                  <div className="flex items-center gap-2 text-xs">
                    <Brain className="h-3 w-3 text-indigo-600" /> Deep
                  </div>
                </SelectItem>
                <SelectItem value="exam_notes">
                  <div className="flex items-center gap-2 text-xs">
                    <ClipboardList className="h-3 w-3 text-violet-600" /> Exam Notes
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default StudyModePanel;
