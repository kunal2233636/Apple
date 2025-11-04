
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle, XCircle, Award, Sparkles, Target, AlertTriangle, Plus, Clock, Database } from 'lucide-react';
import { sampleQuestions, type SampleQuestion } from '@/lib/sample-questions';
import { generateBoardQuestions, type BoardQuestion } from '@/lib/gemini-questions';
import { questionManager } from '@/lib/question-manager';
import { cn } from '@/lib/utils';
import { InlineMath } from 'react-katex';
import type { QuestionSet } from '@/lib/question-storage';
import { formatDistanceToNow } from 'date-fns';


interface QuestionAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterName: string;
  chapterId: number;
  subjectName: string;
  onCertificationSuccess: (chapterId: number) => void;
  onAssessmentFailed: (chapterId: number) => void;
}

const MathRenderer = ({ text }: { text: string }) => {
  const parts = text.split(/(\$.*?\$)/g);
  return (
    <p className="text-base mb-4 whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          return <InlineMath key={index} math={part.slice(1, -1)} />;
        }
        return <span key={index}>{part}</span>;
      })}
    </p>
  );
};


export function QuestionAssessmentModal({
  isOpen,
  onClose,
  chapterName,
  chapterId,
  subjectName,
  onCertificationSuccess,
  onAssessmentFailed,
}: QuestionAssessmentModalProps) {
  
  const [questions, setQuestions] = useState<BoardQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Enhanced state for persistence features
  const [questionSource, setQuestionSource] = useState<'storage' | 'generated' | 'sample'>('generated');
  const [questionSet, setQuestionSet] = useState<QuestionSet | undefined>();
  const [isExistingQuestions, setIsExistingQuestions] = useState(false);
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const [questionAvailability, setQuestionAvailability] = useState<any>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchQuestions = useCallback(async (useSample: boolean = false) => {
    setIsGenerating(true);
    setGenerationError(null);
    setShowResults(false);
    
    if (useSample) {
        setQuestions(sampleQuestions as BoardQuestion[]);
        setUserAnswers(Array(sampleQuestions.length).fill(''));
        setQuestionSource('sample');
        setIsGenerating(false);
        return;
    }

    try {
        // Check question availability first
        const availability = await questionManager.checkQuestionAvailability(chapterName, subjectName);
        setQuestionAvailability(availability);
        
        // Load questions using the question manager
        const result = await questionManager.loadQuestions(chapterName, subjectName);
        
        setQuestions(result.questions);
        setUserAnswers(Array(result.questions.length).fill(''));
        setQuestionSource(result.source);
        setQuestionSet(result.questionSet);
        setIsExistingQuestions(result.isExisting);
        setTotalQuestions(result.totalQuestions);
        
        console.log('[QuestionAssessment] Loaded questions:', {
            source: result.source,
            isExisting: result.isExisting,
            totalQuestions: result.totalQuestions,
        });
    } catch (error: any) {
        console.error("Question Generation Error:", error);
        setGenerationError(error.message || "An unknown error occurred during question generation.");
    } finally {
        setIsGenerating(false);
    }
  }, [chapterName, subjectName]);
  
  // Add extra questions functionality
  const handleAddExtraQuestions = useCallback(async () => {
    if (!isExistingQuestions) {
        setGenerationError("No existing questions found. Generate questions first.");
        return;
    }
    
    setIsAddingExtra(true);
    setGenerationError(null);
    
    try {
        const result = await questionManager.addExtraQuestions(chapterName, subjectName);
        
        // Reset answers array for new total
        setQuestions(result.questions);
        setUserAnswers(Array(result.questions.length).fill(''));
        setQuestionSet(result.questionSet);
        setTotalQuestions(result.totalQuestions);
        
        console.log('[QuestionAssessment] Added extra questions:', {
            addedCount: result.addedCount,
            totalQuestions: result.totalQuestions,
        });
    } catch (error: any) {
        console.error("Error adding extra questions:", error);
        setGenerationError(error.message || "Failed to add extra questions.");
    } finally {
        setIsAddingExtra(false);
    }
  }, [chapterName, subjectName, isExistingQuestions]);

  useEffect(() => {
    if (isOpen) {
        fetchQuestions();
    }
  }, [isOpen, fetchQuestions]);

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercentage = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const handleAnswerChange = (text: string) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentQuestionIndex] = text;
    setUserAnswers(newAnswers);
  };

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    let totalScore = 0;
    const totalPossibleMarks = questions.reduce((sum, q) => sum + q.marks, 0);

    userAnswers.forEach((answer, index) => {
      const question = questions[index];
      if (!question || !answer) return;

      let questionScore = 0;
      question.correctAnswerPoints.forEach(point => {
        if (answer.toLowerCase().includes(point.toLowerCase())) {
          questionScore += 1;
        }
      });
      const scoreForQuestion = (questionScore / question.correctAnswerPoints.length) * question.marks;
      totalScore += scoreForQuestion;
    });

    const finalPercentage = totalPossibleMarks > 0 ? (totalScore / totalPossibleMarks) * 100 : 0;
    
    setTimeout(() => {
        setScore(finalPercentage);
        setShowResults(true);
        setIsSubmitting(false);
        if (finalPercentage >= 90) {
            onCertificationSuccess(chapterId);
        } else {
            onAssessmentFailed(chapterId);
        }
    }, 1500);
  };
  
  const resetAssessment = (useSample: boolean) => {
    setCurrentQuestionIndex(0);
    setUserAnswers([]);
    setShowResults(false);
    setScore(0);
    fetchQuestions(useSample);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">Chapter Assessment</DialogTitle>
        {isGenerating ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <h2 className="text-2xl font-bold">Generating Questions...</h2>
                <p className="text-muted-foreground text-center max-w-md">AI is analyzing "{chapterName}" and generating challenging CBSE pattern questions. This may take a moment.</p>
            </div>
        ) : generationError ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 p-6">
                <AlertTriangle className="h-16 w-16 text-destructive" />
                <h2 className="text-2xl font-bold">Error Generating Questions</h2>
                <p className="text-muted-foreground">{generationError}</p>
                <div className="flex gap-4 mt-4">
                    <Button onClick={() => fetchQuestions()}>Retry</Button>
                    <Button variant="outline" onClick={() => resetAssessment(true)}>Use Sample Questions</Button>
                </div>
            </div>
        ) : showResults ? (
          <ResultsView 
            score={score}
            chapterName={chapterName}
            userAnswers={userAnswers}
            questions={questions}
            onRetry={() => resetAssessment(false)}
            onClose={onClose}
          />
        ) : (
          <>
            <DialogHeader className="p-6 pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <DialogTitle className="text-2xl">Chapter Certification: {chapterName}</DialogTitle>
                  <DialogDescription>CBSE Class 12 Board Exam Pattern Assessment</DialogDescription>
                </div>
                
                {/* Question Status and Actions */}
                <div className="flex flex-col items-end gap-2">
                  {/* Question Source and Count */}
                  {questions.length > 0 && (
                    <div className="flex items-center gap-2">
                      {questionSource === 'storage' ? (
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                          <Database className="w-3 h-3 mr-1" />
                          {totalQuestions} Saved Questions
                        </Badge>
                      ) : questionSource === 'generated' ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <Sparkles className="w-3 h-3 mr-1" />
                          {questions.length} Fresh Questions
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Sample Questions
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Generation Time for Stored Questions */}
                  {questionSource === 'storage' && questionSet && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Last updated {formatDistanceToNow(new Date(questionSet.last_modified), { addSuffix: true })}
                    </div>
                  )}
                  
                  {/* Add Extra Questions Button */}
                  {isExistingQuestions && !showResults && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddExtraQuestions}
                      disabled={isAddingExtra}
                      className="h-8"
                    >
                      {isAddingExtra ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3 mr-1" />
                          Add Extra Questions
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </DialogHeader>
            <div className="px-6">
                <Progress value={progressPercentage} />
                <p className="text-sm text-muted-foreground text-center mt-2">Question {currentQuestionIndex + 1} of {questions.length}</p>
            </div>
            <ScrollArea className="flex-1 px-6 py-4">
                <div className="space-y-4">
                    {currentQuestion && (
                        <>
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg">Question {currentQuestion.questionNumber}</CardTitle>
                                    <div className="flex gap-2">
                                        {currentQuestion.isPYQ && (
                                            <Badge variant="secondary">CBSE Board {currentQuestion.pyqYear}</Badge>
                                        )}
                                        <Badge>{currentQuestion.marks} Marks</Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <MathRenderer text={currentQuestion.questionText} />
                                <div className="flex flex-wrap gap-2">
                                    {currentQuestion.keyConceptsTested.map(concept => (
                                        <Badge key={concept} variant="outline">{concept}</Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        <Textarea
                            value={userAnswers[currentQuestionIndex] || ''}
                            onChange={(e) => handleAnswerChange(e.target.value)}
                            placeholder="Write your detailed answer here. Follow CBSE marking scheme format..."
                            className="min-h-[200px] text-base"
                        />
                        <p className="text-xs text-muted-foreground text-right">{(userAnswers[currentQuestionIndex] || '').length} characters</p>
                        </>
                    )}
                </div>
            </ScrollArea>
            <DialogFooter className="p-6 pt-2 border-t justify-between">
              <Button variant="outline" onClick={goToPrevious} disabled={currentQuestionIndex === 0}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              {currentQuestionIndex < questions.length - 1 ? (
                <Button onClick={goToNext}>
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    'Submit Assessment'
                  )}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ResultsView({ score, chapterName, userAnswers, questions, onRetry, onClose }: {
    score: number;
    chapterName: string;
    userAnswers: string[];
    questions: BoardQuestion[];
    onRetry: () => void;
    onClose: () => void;
}) {
    const passed = score >= 90;

    if (passed) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 relative">
                <Award className="h-20 w-20 text-green-500 mb-4" />
                <h2 className="text-3xl font-bold text-green-600">Chapter Certified!</h2>
                <p className="text-xl font-medium mt-2">Excellent work on mastering "{chapterName}".</p>
                <p className="text-muted-foreground mt-2">Your score: {score.toFixed(2)}%</p>
                <Button onClick={onClose} className="mt-8">Continue</Button>
            </div>
        )
    }

    return (
        <>
            <DialogHeader className="p-6 pb-2 text-center items-center">
                <XCircle className="h-16 w-16 text-destructive mb-4" />
                <DialogTitle className="text-3xl">Needs Improvement</DialogTitle>
                <DialogDescription className="text-lg">
                    Your score for "{chapterName}" was {score.toFixed(2)}%. A score of 90% or above is required to certify.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 px-6">
                <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-center">Detailed Feedback</h3>
                    {questions.map((q, index) => (
                        <FeedbackCard key={q.questionNumber} question={q} userAnswer={userAnswers[index]} />
                    ))}
                </div>
            </ScrollArea>
            <DialogFooter className="p-6 border-t flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Review Later</Button>
                <Button onClick={onRetry} className="w-full sm:w-auto">Retry Assessment</Button>
            </DialogFooter>
        </>
    );
}

function FeedbackCard({ question, userAnswer }: { question: BoardQuestion; userAnswer: string }) {
    // Simple scoring for immediate feedback
    const score = useMemo(() => {
        let questionScore = 0;
        if (userAnswer) {
            question.correctAnswerPoints.forEach(point => {
                if (userAnswer.toLowerCase().includes(point.toLowerCase())) {
                    questionScore++;
                }
            });
        }
        return (questionScore / question.correctAnswerPoints.length) * question.marks;
    }, [userAnswer, question]);

    const missedPoints = useMemo(() => {
        if (!userAnswer) return question.correctAnswerPoints;
        return question.correctAnswerPoints.filter(point => !userAnswer.toLowerCase().includes(point.toLowerCase()));
    }, [userAnswer, question]);

    return (
        <Card className="overflow-hidden">
            <CardHeader className={cn("p-4", score < question.marks ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20")}>
                 <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-semibold">Q{question.questionNumber}: {question.questionText.substring(0, 50)}...</CardTitle>
                    <Badge variant={score < question.marks ? "destructive" : "default"}>Score: {score.toFixed(1)} / {question.marks}</Badge>
                 </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div>
                    <h4 className="font-semibold text-sm mb-2">Your Answer:</h4>
                    <p className="text-sm bg-muted/50 p-3 rounded-md whitespace-pre-wrap">{userAnswer || "No answer provided."}</p>
                </div>
                 {missedPoints.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm mb-2 text-destructive flex items-center gap-2"><Target className="h-4 w-4" /> Key Points Missed:</h4>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            {missedPoints.map((point, i) => (
                                <li key={i}>{point}</li>
                            ))}
                        </ul>
                    </div>
                )}
                <div>
                    <h4 className="font-semibold text-sm mb-2 text-green-600 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Ideal Answer:</h4>
                    <p className="text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-md whitespace-pre-wrap">{question.fullAnswerCBSE}</p>
                </div>
            </CardContent>
        </Card>
    )
}
