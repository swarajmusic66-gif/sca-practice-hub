import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Clock, Monitor, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { 
  useStartTest, 
  useSubmitTest,
  TestSession,
  AnswerInput
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

type AnswerState = Record<number, string>;

export default function TestPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [session, setSession] = useState<TestSession | null>(null);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const timerRef = useRef<number | null>(null);
  const sessionStarted = useRef(false);

  const startTest = useStartTest({
    mutation: {
      onSuccess: (data) => {
        setSession(data);
      },
      onError: (error) => {
        toast({
          title: "Failed to start test",
          description: (error?.data as any)?.error || error?.message || "Not enough questions in bank.",
          variant: "destructive"
        });
        setLocation("/dashboard");
      }
    }
  });

  const submitTest = useSubmitTest({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Test submitted successfully!" });
        setLocation(`/result/${data.attemptId}`);
      },
      onError: (error) => {
        setIsSubmitting(false);
        toast({
          title: "Submission failed",
          description: (error?.data as any)?.error || error?.message || "Please try again.",
          variant: "destructive"
        });
      }
    }
  });

  useEffect(() => {
    if (!sessionStarted.current) {
      sessionStarted.current = true;
      startTest.mutate({ data: { questionCount: 50 } });
    }
  }, []);

  useEffect(() => {
    if (session) {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session]);

  const handleAnswerSelect = (value: string) => {
    if (!session) return;
    const currentQ = session.questions[currentIdx];
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: value
    }));
  };

  const handleNext = () => {
    if (session && currentIdx < session.totalQuestions - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleJumpTo = (index: number) => {
    setCurrentIdx(index);
  };

  const handleSubmit = () => {
    if (!session) return;
    setIsSubmitting(true);
    
    if (timerRef.current) clearInterval(timerRef.current);

    const formattedAnswers: AnswerInput[] = Object.entries(answers).map(([qId, ans]) => ({
      questionId: parseInt(qId),
      selectedAnswer: ans as any,
    }));

    submitTest.mutate({
      attemptId: session.attemptId,
      data: {
        answers: formattedAnswers,
        durationSeconds: elapsedSeconds
      }
    });
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Monitor className="h-16 w-16 text-primary animate-pulse mb-6" />
        <h2 className="text-2xl font-bold mb-2">Preparing your test...</h2>
        <p className="text-muted-foreground max-w-md text-center">
          Loading questions from the course bank. This will only take a moment.
        </p>
      </div>
    );
  }

  const currentQuestion = session.questions[currentIdx];
  const selectedAnswer = answers[currentQuestion.id] || "";
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Test Header */}
      <header className="h-16 border-b bg-card px-4 md:px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 text-primary p-2 rounded hidden md:block">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm md:text-base leading-tight">{session.courseName} Practice Test</h1>
            <p className="text-xs text-muted-foreground">Attempt ID: #{session.attemptId}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="bg-secondary px-4 py-2 rounded-md border flex items-center gap-2 font-mono text-lg tracking-wider font-bold">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-primary">{formatTime(elapsedSeconds)}</span>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="default" className="hidden md:flex">
                Submit Test
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit Practice Test?</AlertDialogTitle>
                <AlertDialogDescription>
                  You have answered {answeredCount} out of {session.totalQuestions} questions.
                  Once submitted, you cannot change your answers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Resume Test</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Yes, Submit Test"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden max-w-7xl w-full mx-auto w-full">
        
        {/* Main Test Area */}
        <main className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full">
              Question {currentIdx + 1} of {session.totalQuestions}
            </span>
            <span className="text-sm text-muted-foreground">
              Topic: {currentQuestion.topic}
            </span>
          </div>

          <Card className="flex-1 shadow-sm border-t-4 border-t-primary flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg md:text-xl font-normal leading-relaxed text-foreground">
                <span className="font-bold mr-2">{currentIdx + 1}.</span> 
                {currentQuestion.question}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <RadioGroup 
                value={selectedAnswer} 
                onValueChange={handleAnswerSelect}
                className="space-y-3"
              >
                {[
                  { id: 'A', text: currentQuestion.optionA },
                  { id: 'B', text: currentQuestion.optionB },
                  { id: 'C', text: currentQuestion.optionC },
                  { id: 'D', text: currentQuestion.optionD },
                ].map((option) => (
                  <div 
                    key={option.id}
                    className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50
                      ${selectedAnswer === option.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                    onClick={() => handleAnswerSelect(option.id)}
                  >
                    <RadioGroupItem value={option.id} id={`option-${option.id}`} className="mt-1" />
                    <Label htmlFor={`option-${option.id}`} className="flex-1 text-base cursor-pointer font-normal leading-relaxed">
                      <span className="font-bold mr-2 text-muted-foreground">{option.id}.</span> 
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
            <CardFooter className="bg-muted/30 border-t p-4 flex justify-between">
              <Button 
                variant="outline" 
                onClick={handlePrev} 
                disabled={currentIdx === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button 
                variant="default" 
                onClick={handleNext}
                disabled={currentIdx === session.totalQuestions - 1}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </CardFooter>
          </Card>
          
          <div className="mt-4 md:hidden">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" className="w-full" size="lg">
                  Submit Test
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit Practice Test?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You have answered {answeredCount} out of {session.totalQuestions} questions.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Resume</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit Test"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </main>

        {/* Sidebar Palette */}
        <aside className="w-full md:w-72 bg-card border-l flex flex-col shrink-0 h-64 md:h-auto">
          <div className="p-4 border-b">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              Question Palette
            </h3>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-primary border border-primary"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm border border-input bg-background"></div>
                <span>Not Visited</span>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-5 gap-2">
              {session.questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = currentIdx === idx;
                
                let btnClass = "h-10 w-full p-0 font-medium text-sm transition-all ";
                
                if (isCurrent) {
                  btnClass += "ring-2 ring-primary ring-offset-1 ring-offset-background ";
                }
                
                if (isAnswered) {
                  btnClass += "bg-primary text-primary-foreground hover:bg-primary/90";
                } else {
                  btnClass += "bg-background border border-input text-foreground hover:bg-muted";
                }

                return (
                  <Button
                    key={q.id}
                    variant="outline"
                    className={btnClass}
                    onClick={() => handleJumpTo(idx)}
                  >
                    {idx + 1}
                  </Button>
                );
              })}
            </div>
          </div>
          
          <div className="p-4 border-t bg-muted/20 text-sm">
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Answered:</span>
              <span className="font-bold">{answeredCount}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-muted-foreground">Unanswered:</span>
              <span className="font-bold">{session.totalQuestions - answeredCount}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
