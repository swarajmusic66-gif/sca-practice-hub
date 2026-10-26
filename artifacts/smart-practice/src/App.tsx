import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

// Pages
import Login from "./pages/login";
import StudentDashboard from "./pages/student/dashboard";
import TestPage from "./pages/student/test";
import TestResult from "./pages/student/result";
import TestHistory from "./pages/student/history";
import AdminDashboard from "./pages/admin/dashboard";
import AdminCourses from "./pages/admin/courses";
import AdminStudents from "./pages/admin/students";
import AdminQuestions from "./pages/admin/questions";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => {
        window.location.href = "/login";
        return null;
      }} />
      <Route path="/login" component={Login} />
      
      {/* Student Routes */}
      <Route path="/dashboard" component={StudentDashboard} />
      <Route path="/test" component={TestPage} />
      <Route path="/result/:attemptId" component={TestResult} />
      <Route path="/history" component={TestHistory} />
      
      {/* Admin Routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/courses" component={AdminCourses} />
      <Route path="/admin/students" component={AdminStudents} />
      <Route path="/admin/questions" component={AdminQuestions} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="smart-practice-theme">
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
