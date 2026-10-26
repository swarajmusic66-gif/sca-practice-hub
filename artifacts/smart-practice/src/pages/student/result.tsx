import { useRoute, Link } from "wouter";
import { format } from "date-fns";
import { 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  ArrowLeft,
  Clock,
  Target,
  Trophy,
  PieChart as PieChartIcon
} from "lucide-react";
import { useGetTestAttempt, getGetTestAttemptQueryKey } from "@workspace/api-client-react";

import { StudentLayout } from "@/components/layout/student-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function TestResult() {
  const [match, params] = useRoute("/result/:attemptId");
  const attemptId = match ? parseInt(params.attemptId) : 0;
  
  const { data: result, isLoading, error } = useGetTestAttempt(attemptId, {
    query: {
      enabled: !!attemptId,
      queryKey: getGetTestAttemptQueryKey(attemptId)
    }
  });

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </StudentLayout>
    );
  }

  if (error || !result) {
    return (
      <StudentLayout>
        <div className="max-w-4xl mx-auto p-4 text-center mt-20">
          <h2 className="text-2xl font-bold text-destructive mb-2">Result not found</h2>
          <p className="text-muted-foreground mb-6">We couldn't load the test result. It may not exist or you don't have permission.</p>
          <Button asChild>
            <Link href="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </StudentLayout>
    );
  }

  // Calculate some derived stats
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const isPassing = result.percentage >= 40; // Assuming 40% is passing

  // Calculate topic-wise performance
  const topics: Record<string, { total: number; correct: number }> = {};
  if ('answers' in result && result.answers) {
    result.answers.forEach(ans => {
      if (!topics[ans.topic]) topics[ans.topic] = { total: 0, correct: 0 };
      topics[ans.topic].total += 1;
      if (ans.isCorrect) topics[ans.topic].correct += 1;
    });
  }

  return (
    <StudentLayout>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild className="pl-0 text-muted-foreground hover:text-foreground">
            <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
          </Button>
          <div className="text-sm text-muted-foreground flex items-center">
            <Clock className="h-4 w-4 mr-1.5" />
            {format(new Date(result.completedAt), "MMM d, yyyy 'at' h:mm a")}
          </div>
        </div>

        {/* Top Summary Card */}
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className={`h-2 ${isPassing ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              {/* Score Gauge Area */}
              <div className="bg-muted/30 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r min-w-[300px]">
                <h2 className="text-xl font-semibold mb-6">{result.courseName}</h2>
                
                <div className="relative w-48 h-48 flex items-center justify-center rounded-full border-[12px] border-muted bg-background shadow-inner">
                  <div 
                    className={`absolute inset-0 rounded-full border-[12px] ${isPassing ? 'border-green-500' : 'border-red-500'}`}
                    style={{ 
                      clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`, 
                      transform: `rotate(${(result.percentage / 100) * 360 - 90}deg)`,
                      borderRightColor: 'transparent',
                      borderBottomColor: 'transparent',
                    }}
                  ></div>
                  <div className="flex flex-col items-center">
                    <span className="text-5xl font-black">{result.percentage}%</span>
                    <span className="text-sm font-medium text-muted-foreground mt-1">
                      {isPassing ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center gap-2 text-sm font-medium">
                  <Trophy className={`h-4 w-4 ${isPassing ? 'text-green-500' : 'text-red-500'}`} />
                  <span>Score: {result.score} / {result.totalQuestions}</span>
                </div>
              </div>
              
              {/* Stats Breakdown */}
              <div className="flex-1 p-8 flex flex-col justify-center">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Performance Summary
                </h3>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-card border rounded-lg p-4 flex items-start gap-4 shadow-sm">
                    <div className="bg-green-100 text-green-700 p-2 rounded-md shrink-0">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{result.correct}</p>
                      <p className="text-sm font-medium text-muted-foreground">Correct</p>
                    </div>
                  </div>
                  
                  <div className="bg-card border rounded-lg p-4 flex items-start gap-4 shadow-sm">
                    <div className="bg-red-100 text-red-700 p-2 rounded-md shrink-0">
                      <XCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{result.wrong}</p>
                      <p className="text-sm font-medium text-muted-foreground">Incorrect</p>
                    </div>
                  </div>
                  
                  <div className="bg-card border rounded-lg p-4 flex items-start gap-4 shadow-sm">
                    <div className="bg-muted text-muted-foreground p-2 rounded-md shrink-0">
                      <MinusCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{result.skipped}</p>
                      <p className="text-sm font-medium text-muted-foreground">Skipped</p>
                    </div>
                  </div>
                  
                  <div className="bg-card border rounded-lg p-4 flex items-start gap-4 shadow-sm">
                    <div className="bg-blue-100 text-blue-700 p-2 rounded-md shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatTime(result.durationSeconds)}</p>
                      <p className="text-sm font-medium text-muted-foreground">Time Taken</p>
                    </div>
                  </div>
                </div>

                {/* Topic Breakdown */}
                {Object.keys(topics).length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4" /> Topic Breakdown
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(topics).map(([topic, data]) => {
                        const pct = Math.round((data.correct / data.total) * 100);
                        return (
                          <div key={topic}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium">{topic}</span>
                              <span className="text-muted-foreground">{data.correct}/{data.total} ({pct}%)</span>
                            </div>
                            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Answer Review */}
        {'answers' in result && result.answers && (
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <CardTitle>Detailed Review</CardTitle>
              <CardDescription>Review your answers against the correct solutions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {result.answers.map((ans, idx) => (
                  <div key={ans.questionId} className="p-6 hover:bg-muted/10 transition-colors">
                    <div className="flex gap-4">
                      <div className="shrink-0 mt-1">
                        {ans.isCorrect ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : !ans.selectedAnswer ? (
                          <MinusCircle className="h-6 w-6 text-muted-foreground" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-500" />
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-muted-foreground">Q{idx + 1}.</span>
                            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">{ans.topic}</Badge>
                          </div>
                          <p className="font-medium text-base">{ans.question}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          {['A', 'B', 'C', 'D'].map(opt => {
                            const optionText = ans[`option${opt}` as keyof typeof ans];
                            if (!optionText) return null;
                            
                            const isSelected = ans.selectedAnswer === opt;
                            const isCorrect = ans.correctAnswer === opt;
                            
                            let boxClass = "border p-3 rounded-md flex gap-3 ";
                            
                            if (isCorrect) {
                              boxClass += "bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-800/30 dark:text-green-300 font-medium";
                            } else if (isSelected && !isCorrect) {
                              boxClass += "bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-300";
                            } else {
                              boxClass += "bg-background border-border text-muted-foreground";
                            }
                            
                            return (
                              <div key={opt} className={boxClass}>
                                <span className="font-bold w-5 shrink-0">{opt}.</span>
                                <span>{String(optionText)}</span>
                                {isCorrect && <CheckCircle2 className="h-4 w-4 ml-auto text-green-600 dark:text-green-400 shrink-0" />}
                                {isSelected && !isCorrect && <XCircle className="h-4 w-4 ml-auto text-red-600 dark:text-red-400 shrink-0" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
}
