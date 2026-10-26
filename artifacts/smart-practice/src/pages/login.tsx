import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Monitor, User, ShieldAlert } from "lucide-react";
import { 
  useStudentLogin, 
  useAdminLogin, 
  useGetMe,
  getGetMeQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { storeToken } from "@/lib/auth-token";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const studentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  password: z.string().min(1, "Password is required"),
});

const adminSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: user, isLoading: isLoadingUser } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false
    }
  });

  useEffect(() => {
    if (user) {
      if (user.role === "student") {
        setLocation("/dashboard");
      } else if (user.role === "admin") {
        setLocation("/admin");
      }
    }
  }, [user, setLocation]);

  const studentForm = useForm<z.infer<typeof studentSchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(studentSchema) as any,
    defaultValues: { studentId: "", password: "" },
  });

  const adminForm = useForm<z.infer<typeof adminSchema>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(adminSchema) as any,
    defaultValues: { username: "", password: "" },
  });

  const studentLogin = useStudentLogin({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Login successful" });
        const token = (data as any).token as string | undefined;
        if (token) storeToken(token);
        queryClient.setQueryData(getGetMeQueryKey(), data.user);
        setLocation("/dashboard");
      },
      onError: (error) => {
        toast({ 
          title: "Login failed", 
          description: (error?.data as any)?.error || "Invalid credentials",
          variant: "destructive"
        });
      }
    }
  });

  const adminLogin = useAdminLogin({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Login successful" });
        const token = (data as any).token as string | undefined;
        if (token) storeToken(token);
        queryClient.setQueryData(getGetMeQueryKey(), data.user);
        setLocation("/admin");
      },
      onError: (error) => {
        toast({ 
          title: "Login failed", 
          description: (error?.data as any)?.error || "Invalid credentials",
          variant: "destructive"
        });
      }
    }
  });

  const onStudentSubmit = (values: z.infer<typeof studentSchema>) => {
    studentLogin.mutate({ data: values });
  };

  const onAdminSubmit = (values: z.infer<typeof adminSchema>) => {
    adminLogin.mutate({ data: values });
  };

  if (isLoadingUser) {
    return <div className="min-h-screen bg-muted/30 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="bg-primary p-4 rounded-2xl mb-4 shadow-lg">
          <Monitor className="h-10 w-10 text-accent" />
        </div>
        <h1 className="text-3xl font-bold text-primary tracking-tight mb-2">Smart Practice Portal</h1>
        <p className="text-muted-foreground max-w-sm text-[24px] font-extrabold">
          MADE BY SWARAJ DHANGEKER
        </p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <Tabs defaultValue="student" className="w-full">
          <CardHeader className="pb-0">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="student" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <User className="h-4 w-4 mr-2" />
                Student
              </TabsTrigger>
              <TabsTrigger value="admin" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ShieldAlert className="h-4 w-4 mr-2" />
                Admin
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-2">
            <TabsContent value="student" className="mt-0 space-y-4">
              <div className="text-center mb-6">
                <CardTitle className="text-xl">Student Login</CardTitle>
                <CardDescription>Enter your Student ID to access practice tests</CardDescription>
              </div>
              <Form {...studentForm}>
                <form onSubmit={studentForm.handleSubmit(onStudentSubmit)} className="space-y-4">
                  <FormField
                    control={studentForm.control as any}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. MSCIT-2026-0001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={studentForm.control as any}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={studentLogin.isPending}
                  >
                    {studentLogin.isPending ? "Logging in..." : "Login to Portal"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="admin" className="mt-0 space-y-4">
              <div className="text-center mb-6">
                <CardTitle className="text-xl">Administrator Login</CardTitle>
                <CardDescription>Authorized personnel only</CardDescription>
              </div>
              <Form {...adminForm}>
                <form onSubmit={adminForm.handleSubmit(onAdminSubmit)} className="space-y-4">
                  <FormField
                    control={adminForm.control as any}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Admin username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={adminForm.control as any}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    size="lg"
                    disabled={adminLogin.isPending}
                  >
                    {adminLogin.isPending ? "Logging in..." : "Secure Login"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
      
      <div className="mt-12 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} Smart Practice Portal. All rights reserved.</p>
        <p className="mt-1">For support, contact your center coordinator.</p>
      </div>
    </div>
  );
}
