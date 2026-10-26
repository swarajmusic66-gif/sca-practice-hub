import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { 
  PlayCircle, 
  Award, 
  Target, 
  Clock, 
  TrendingUp,
  History,
  Calendar,
  UserCircle,
  BookOpen
} from "lucide-react";
import { 
  useGetMe, 
  useGetStudentStats,
  getGetStudentStatsQueryKey,
  useGetCourse,
  getGetCourseQueryKey,
  useGetTestHistory,
  getGetTestHistoryQueryKey,
} from "@workspace/api-client-react";

import { StudentLayout } from "@/components/layout/student-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export default function StudentDashboard() {
  const [, setLocation] = useLocation();
  const { data: user } = useGetMe();
  
  const { data: stats, isLoading: isLoadingStats } = useGetStudentStats(
    user?.studentDbId || 0,
    {
      query: {
        queryKey: getGetStudentStatsQueryKey(user?.studentDbId || 0),
        enabled: !!user?.studentDbId
      }
    }
  );

  const { data: course, isLoading: isLoadingCourse } = useGetCourse(
    user?.courseId || 0,
    {
      query: {
        queryKey: getGetCourseQueryKey(user?.courseId || 0),
        enabled: !!user?.courseId
      }
    }
  );

  const historyParams = { limit: 5 };
  const { data: historyData } = useGetTestHistory(
    historyParams,
    {
      query: {
        queryKey: getGetTestHistoryQueryKey(historyParams),
        enabled: !!user?.studentDbId
      }
    }
  );

  const recentAttempts = historyData || [];

  return (
    <StudentLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="bg-primary text-primary-foreground rounded-lg p-6 md:p-8 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-accent/20 rounded-full translate-y-1/3 translate-x-1/4"></div>
          
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              Welcome back, {user?.fullName?.split(' ')[0]}!
            </h1>
            <p className="text-primary-foreground/80 max-w-xl mb-6 text-lg">
              Ready to continue your preparation for the {user?.courseName} examination?
            </p>
            
            <Button 
              size="lg" 
              className="bg-accent text-accent-foreground hover:bg-accent/90 border-none font-bold px-8 shadow-lg shadow-accent/20"
              onClick={() => setLocation("/test")}
            >
              <PlayCircle className="mr-2 h-5 w-5" />
              Start Practice Test
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tests Taken</p>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold">{stats?.totalAttempts || 0}</h3>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-accent/20 text-accent-foreground flex items-center justify-center shrink-0">
                <Award className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Highest Score</p>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold">{stats?.highestPercentage || 0}%</h3>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Score</p>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold">{stats?.averagePercentage || 0}%</h3>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Latest Score</p>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <h3 className="text-2xl font-bold">
                    {recentAttempts.length > 0 ? `${recentAttempts[0].percentage}%` : '-'}
                  </h3>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="lg:col-span-2 shadow-sm border-t-2 border-t-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle>Recent Attempts</CardTitle>
                <CardDescription>Your latest practice test results</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/history">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentAttempts.length === 0 ? (
                <div className="text-center py-10">
                  <History className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                  <p className="text-muted-foreground font-medium">No tests taken yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Take your first practice test to see results here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentAttempts.map((attempt) => (
                    <div key={attempt.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm
                          ${attempt.percentage >= 80 ? 'bg-green-100 text-green-700' : 
                            attempt.percentage >= 50 ? 'bg-amber-100 text-amber-700' : 
                            'bg-red-100 text-red-700'}`}>
                          {attempt.percentage}%
                        </div>
                        <div>
                          <p className="font-semibold">{attempt.courseName}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(attempt.completedAt), "MMM d, yyyy • h:mm a")}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{attempt.score} / {attempt.totalQuestions}</p>
                        <Button variant="link" size="sm" className="h-auto p-0 text-primary" asChild>
                          <Link href={`/result/${attempt.id}`}>Review</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Course Info */}
          <Card className="shadow-sm border-t-2 border-t-accent">
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingCourse ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ) : course ? (
                <>
                  <div>
                    <h4 className="text-lg font-semibold">{course.courseName}</h4>
                    <p className="text-sm text-muted-foreground">{course.courseCode}</p>
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-3">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="text-muted-foreground text-xs">Trainer</p>
                        <p className="font-medium">{course.trainerName || "Unassigned"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="text-muted-foreground text-xs">Duration</p>
                        <p className="font-medium">{course.duration || "N/A"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="text-muted-foreground text-xs">Question Bank</p>
                        <p className="font-medium">{course.questionCount} Questions Available</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Course information not available.</p>
              )}
            </CardContent>
            <CardFooter className="bg-muted/50 p-4 border-t">
              <div className="w-full">
                <div className="flex justify-between text-xs mb-1 font-medium">
                  <span>Course Progress</span>
                  <span>{stats?.totalAttempts ? Math.min(100, stats.totalAttempts * 5) : 0}%</span>
                </div>
                <Progress value={stats?.totalAttempts ? Math.min(100, stats.totalAttempts * 5) : 0} className="h-2" />
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </StudentLayout>
  );
}
