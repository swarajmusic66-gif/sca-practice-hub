import { useState } from "react";
import { Link } from "wouter";
import { format } from "date-fns";
import { History, Search, ArrowRight, BookOpen, Clock, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { useGetTestHistory, getGetTestHistoryQueryKey, useGetMe } from "@workspace/api-client-react";

import { StudentLayout } from "@/components/layout/student-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

export default function TestHistory() {
  const { data: user } = useGetMe();
  const [page, setPage] = useState(1);
  const limit = 10;
  const offset = (page - 1) * limit;

  const historyParams = { limit, offset };
  const { data, isLoading } = useGetTestHistory(
    historyParams,
    {
      query: {
        queryKey: getGetTestHistoryQueryKey(historyParams),
        enabled: !!user?.studentDbId
      }
    }
  );

  const attempts = data || [];
  const total = data?.length || 0;
  const totalPages = Math.ceil(total / limit);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <History className="h-8 w-8 text-accent" />
              Test History
            </h1>
            <p className="text-muted-foreground mt-1">Review your past practice sessions and track progress</p>
          </div>
          
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href="/test">
              <BookOpen className="h-4 w-4 mr-2" /> Start New Test
            </Link>
          </Button>
        </div>

        <Card className="shadow-md border-t-4 border-t-primary">
          <CardHeader className="bg-muted/20 border-b pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>All Attempts</CardTitle>
                <CardDescription>Showing {attempts.length} of {total} total attempts</CardDescription>
              </div>
              <div className="relative w-64 hidden sm:block">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search by course..." className="pl-9 bg-background" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-md" />
                ))}
              </div>
            ) : attempts.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="bg-muted h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="h-10 w-10 text-muted-foreground opacity-50" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No history found</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  You haven't taken any practice tests yet. Start a test to begin building your history.
                </p>
                <Button asChild>
                  <Link href="/test">Take Your First Test</Link>
                </Button>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        <TableHead className="w-[100px]">ID</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attempts.map((attempt) => (
                        <TableRow key={attempt.id} className="hover:bg-muted/50 cursor-pointer group" onClick={() => window.location.href = `/result/${attempt.id}`}>
                          <TableCell className="font-mono text-xs text-muted-foreground">#{attempt.id}</TableCell>
                          <TableCell className="font-medium">{attempt.courseName}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(attempt.completedAt), "MMM d, yyyy")}
                              <span className="text-xs text-muted-foreground block">
                                {format(new Date(attempt.completedAt), "h:mm a")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="font-bold text-lg">{attempt.percentage}%</div>
                            <div className="text-xs text-muted-foreground">{attempt.score}/{attempt.totalQuestions}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={attempt.percentage >= 40 ? "success" : "destructive"} className="px-3">
                              {attempt.percentage >= 40 ? 'PASS' : 'FAIL'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground flex items-center gap-1.5 pt-6">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDuration(attempt.durationSeconds)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild className="group-hover:text-primary group-hover:bg-primary/10">
                              <Link href={`/result/${attempt.id}`}>
                                View <ArrowRight className="ml-1.5 h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y">
                  {attempts.map((attempt) => (
                    <div key={attempt.id} className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant="outline" className="mb-2 text-[10px]">#{attempt.id}</Badge>
                          <h4 className="font-bold">{attempt.courseName}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(attempt.completedAt), "MMM d, yyyy • h:mm a")}
                          </p>
                        </div>
                        <Badge variant={attempt.percentage >= 40 ? "success" : "destructive"}>
                          {attempt.percentage}%
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm bg-muted/30 p-2 rounded pt-3">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span>{attempt.score}/{attempt.totalQuestions}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDuration(attempt.durationSeconds)}</span>
                        </div>
                        <Button variant="link" size="sm" asChild className="h-auto p-0">
                          <Link href={`/result/${attempt.id}`}>Details</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 border-t flex items-center justify-between bg-muted/10">
                    <p className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
