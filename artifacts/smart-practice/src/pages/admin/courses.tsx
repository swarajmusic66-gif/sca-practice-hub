import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  BookOpen
} from "lucide-react";
import { 
  useListCourses, 
  useCreateCourse, 
  useUpdateCourse, 
  useDeleteCourse,
  getListCoursesQueryKey,
  Course
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const courseSchema = z.object({
  courseCode: z.string().min(2, "Code must be at least 2 characters"),
  courseName: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  duration: z.string().optional(),
  trainerName: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type CourseFormValues = z.infer<typeof courseSchema>;

export default function AdminCourses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<Course | null>(null);

  // Queries
  const { data: courses = [], isLoading } = useListCourses({});

  // Mutations
  const createMutation = useCreateCourse({
    mutation: {
      onSuccess: () => {
        toast({ title: "Course created successfully" });
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        setIsFormOpen(false);
        form.reset();
      },
      onError: (error) => {
        toast({ title: "Failed to create course", variant: "destructive" });
      }
    }
  });

  const updateMutation = useUpdateCourse({
    mutation: {
      onSuccess: () => {
        toast({ title: "Course updated successfully" });
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        setIsFormOpen(false);
        setEditingCourse(null);
      },
      onError: (error) => {
        toast({ title: "Failed to update course", variant: "destructive" });
      }
    }
  });

  const deleteMutation = useDeleteCourse({
    mutation: {
      onSuccess: () => {
        toast({ title: "Course deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListCoursesQueryKey() });
        setIsDeleteOpen(false);
        setDeletingCourse(null);
      },
      onError: (error) => {
        toast({ title: "Failed to delete course", description: "May contain related students/questions.", variant: "destructive" });
        setIsDeleteOpen(false);
      }
    }
  });

  // Form setup
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema) as any,
    defaultValues: {
      courseCode: "",
      courseName: "",
      description: "",
      duration: "",
      trainerName: "",
      status: "active",
    },
  });

  // Reset form when editing changes
  useEffect(() => {
    if (editingCourse) {
      form.reset({
        courseCode: editingCourse.courseCode,
        courseName: editingCourse.courseName,
        description: editingCourse.description || "",
        duration: editingCourse.duration || "",
        trainerName: editingCourse.trainerName || "",
        status: editingCourse.status,
      });
    } else {
      form.reset({
        courseCode: "",
        courseName: "",
        description: "",
        duration: "",
        trainerName: "",
        status: "active",
      });
    }
  }, [editingCourse, form]);

  const onSubmit = (data: CourseFormValues) => {
    if (editingCourse) {
      updateMutation.mutate({ id: editingCourse.id, data });
    } else {
      createMutation.mutate({ data });
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setIsFormOpen(true);
  };

  const handleDelete = (course: Course) => {
    setDeletingCourse(course);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (deletingCourse) {
      deleteMutation.mutate({ id: deletingCourse.id });
    }
  };

  // Filtering
  const filteredCourses = courses.filter(course => 
    course.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.courseCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-accent" />
              Course Management
            </h1>
            <p className="text-muted-foreground mt-1">Add and manage institute courses.</p>
          </div>
          
          <Button 
            onClick={() => {
              setEditingCourse(null);
              setIsFormOpen(true);
            }} 
            className="shrink-0 shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" /> Add New Course
          </Button>
        </div>

        <Card className="shadow-sm border-t-4 border-t-primary">
          <CardHeader className="bg-muted/10 border-b pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Course Directory</CardTitle>
                <CardDescription>Total {courses.length} courses registered</CardDescription>
              </div>
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Search code or name..." 
                  className="pl-9" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="text-center py-16 px-4">
                <BookOpen className="h-12 w-12 text-muted-foreground opacity-20 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No courses found</h3>
                <p className="text-muted-foreground">Adjust your search or add a new course.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/5">
                      <TableHead className="w-[100px]">Code</TableHead>
                      <TableHead>Course Name</TableHead>
                      <TableHead>Trainer</TableHead>
                      <TableHead className="text-center">Students</TableHead>
                      <TableHead className="text-center">Questions</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCourses.map((course) => (
                      <TableRow key={course.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono font-medium text-xs">{course.courseCode}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-primary">{course.courseName}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">{course.duration}</div>
                        </TableCell>
                        <TableCell className="text-sm">{course.trainerName || "-"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono bg-blue-50/50">{course.studentCount || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono bg-purple-50/50">{course.questionCount || 0}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={course.status === 'active' ? 'success' : 'secondary'}>
                            {course.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleEdit(course)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Course
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(course)}
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingCourse ? 'Edit Course' : 'Create New Course'}</DialogTitle>
              <DialogDescription>
                Fill in the details for the course. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control as any}
                    name="courseCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. MSCIT" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control as any}
                  name="courseName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. MS-CIT Advanced" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control as any}
                    name="trainerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trainer Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 3 Months" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control as any}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Brief description of the course content..." 
                          className="resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Course"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the course <strong className="text-foreground">{deletingCourse?.courseName}</strong>. 
                This action cannot be undone. If there are students or questions associated with this course, deletion may fail.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Yes, Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </AdminLayout>
  );
}
