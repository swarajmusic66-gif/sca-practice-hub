import { Link, useLocation } from "wouter";
import { BookOpen, History, LogOut, LayoutDashboard, Monitor } from "lucide-react";
import { useGetMe, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { clearToken } from "@/lib/auth-token";
import { useQueryClient } from "@tanstack/react-query";

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useGetMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const doLogout = () => {
    clearToken();
    queryClient.setQueryData(getGetMeQueryKey(), null);
    queryClient.clear();
    setLocation("/login");
  };

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        toast({ title: "Logged out successfully" });
        doLogout();
      },
      onError: () => {
        doLogout();
      },
    }
  });

  // Test session doesn't use the standard layout
  if (location === "/test") {
    return <>{children}</>;
  }

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!user || user.role !== "student") {
    setLocation("/login");
    return null;
  }

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { href: "/history", icon: History, label: "Test History" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 border-b bg-primary text-primary-foreground flex items-center px-4 md:px-8 justify-between shrink-0">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Monitor className="h-6 w-6 text-accent" />
          <span>Smart Practice Portal</span>
        </div>
        
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.exact 
                ? location === item.href
                : location.startsWith(item.href);
                
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary-foreground/10 text-white" 
                      : "text-primary-foreground/70 hover:bg-primary-foreground/5 hover:text-white"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium leading-none text-white">{user.fullName}</p>
              <p className="text-xs text-primary-foreground/70 mt-1">{user.studentId}</p>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              className="text-primary-foreground/70 hover:text-white hover:bg-primary-foreground/10"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <div className="md:hidden border-b bg-card px-4 py-2 flex gap-2 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = item.exact 
            ? location === item.href
            : location.startsWith(item.href);
            
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
      
      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-muted/20">
        {children}
      </main>
    </div>
  );
}
