import { Link } from "wouter";
import { format } from "date-fns";
import { 
  Users, 
  BookOpen, 
  HelpCircle, 
  Target, 
  Activity,
  ArrowRight,
  TrendingUp,
  FileText
} from "lucide-react";
import { 
  useGetAdminDashboard,
  useGetCourseStats,
  useGetRecentAttempts 
} from "@workspace/api-client-react";

import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

export default function AdminDashboard() {
  const { data: dashboard, isLoading: isLoadingDash } = useGetAdminDashboard();
  const { data: courseStats, isLoading: isLoadingStats } = useGetCourseStats();
  const { data: recentAttemptsData, isLoading: isLoadingAttempts } = useGetRecentAttempts({ limit: 10 });

  const recentAttempts = recentAttemptsData || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">System Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of portal activity and key metrics.</p>
        </div>

        {/* Top Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="border-t-4 border-t-blue-500 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Students</p>
                {isLoadingDash ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <h3 className="text-2xl font-bold">{dashboard?.totalStudents || 0}</h3>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-t-4 border-t-purple-500 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Active Courses</p>
                {isLoadingDash ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <h3 className="text-2xl font-bold">{dashboard?.totalCourses || 0}</h3>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                <BookOpen className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-t-4 border-t-amber-500 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Question Bank</p>
                {isLoadingDash ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <h3 className="text-2xl font-bold">{dashboard?.totalQuestions || 0}</h3>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                <HelpCircle className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-t-4 border-t-green-500 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Tests</p>
                {isLoadingDash ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <h3 className="text-2xl font-bold">{dashboard?.totalAttempts || 0}</h3>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <Target className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-t-4 border-t-red-500 shadow-sm">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Tests Today</p>
                {isLoadingDash ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <h3 className="text-2xl font-bold">{dashboard?.todayAttempts || 0}</h3>
                )}
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <Activity className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Course Performance */}
          <Card className="xl:col-span-2 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
              <div className="space-y-1">
                <CardTitle className="text-lg">Course Analytics</CardTitle>
                <CardDescription>Performance metrics across all active courses</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/courses">Manage Courses</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingStats ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : courseStats && courseStats.length > 0 ? (
                <Table>
                  <TableHeader className="bg-muted/10">
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead className="text-center">Students</TableHead>
                      <TableHead className="text-center">Questions</TableHead>
                      <TableHead className="text-center">Tests Taken</TableHead>
                      <TableHead className="text-right pr-6">Avg Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courseStats.map((stat) => (
                      <TableRow key={stat.courseId}>
                        <TableCell className="font-medium">{stat.courseName}</TableCell>
                        <TableCell className="text-center">{stat.studentCount}</TableCell>
                        <TableCell className="text-center">{stat.questionCount}</TableCell>
                        <TableCell className="text-center">{stat.totalAttempts}</TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge variant={stat.averagePercentage >= 60 ? "success" : stat.averagePercentage >= 40 ? "warning" : "destructive"}>
                            {Math.round(stat.averagePercentage)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No course data available yet.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="shadow-sm flex flex-col">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Live Activity Feed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
              {isLoadingAttempts ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-4">
                      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentAttempts.length > 0 ? (
                <div className="divide-y">
                  {recentAttempts.map((attempt) => (
                    <div key={attempt.attemptId} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm truncate pr-2" title={attempt.studentName}>
                          {attempt.studentName}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${attempt.percentage >= 40 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {attempt.percentage}%
                        </span>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                            <FileText className="h-3 w-3" /> {attempt.courseName}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {format(new Date(attempt.completedAt), "MMM d, h:mm a")}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          ID: {attempt.studentId}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p>No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
