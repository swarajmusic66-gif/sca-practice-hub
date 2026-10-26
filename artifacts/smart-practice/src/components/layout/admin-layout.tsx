import { Link, useLocation } from "wouter";
import { BookOpen, Users, HelpCircle, LogOut, LayoutDashboard, Monitor } from "lucide-react";
import { useGetMe, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { clearToken } from "@/lib/auth-token";
import { useQueryClient } from "@tanstack/react-query";

export function AdminLayout({ children }: { children: React.ReactNode }) {
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
        // Server call failed but we can still log out on the client
        doLogout();
      },
    }
  });

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      setLocation("/login");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { href: "/admin/courses", icon: BookOpen, label: "Courses" },
    { href: "/admin/students", icon: Users, label: "Students" },
    { href: "/admin/questions", icon: HelpCircle, label: "Question Bank" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <Monitor className="h-6 w-6" />
            <span>Smart Practice</span>
          </div>
        </div>
        
        <div className="p-4 border-b">
          <p className="text-sm font-medium">Admin Panel</p>
          <p className="text-xs text-muted-foreground truncate">{user.adminId || "Administrator"}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? location === item.href
              : location.startsWith(item.href);
              
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile header placeholder - could add a hamburger menu here later */}
        <header className="h-16 border-b bg-card flex items-center px-6 md:hidden justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Monitor className="h-5 w-5" />
            <span>Smart Practice</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-muted/30">
          {children}
        </div>
      </main>
    </div>
  );
}
