import { useState, useEffect } from "react";
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
  Users,
  Key
} from "lucide-react";
import { 
  useListStudents, 
  useCreateStudent, 
  useUpdateStudent, 
  useDeleteStudent,
  useListCourses,
  getListStudentsQueryKey,
  Student
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

const studentSchema = z.object({
  fullName: z.string().min(3, "Full name is required"),
  mobile: z.string().min(10, "Valid mobile required"),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.string().optional(),
  address: z.string().optional(),
  courseId: z.coerce.number().min(1, "Course selection is required"),
  batch: z.string().min(1, "Batch is required"),
  trainer: z.string().optional(),
  admissionDate: z.string().min(1, "Admission date is required"),
  courseDuration: z.string().optional(),
  password: z.string().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export default function AdminStudents() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);

  // Queries
  const { data: courses = [] } = useListCourses({});
  const { data: students = [], isLoading } = useListStudents({
    courseId: courseFilter !== "all" ? parseInt(courseFilter) : undefined,
    search: searchTerm || undefined
  });

  // Mutations
  const createMutation = useCreateStudent({
    mutation: {
      onSuccess: (data) => {
        toast({ 
          title: "Student registered successfully", 
          description: `Generated ID: ${data.studentId}`
        });
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setIsFormOpen(false);
        form.reset();
      },
      onError: (error) => {
        toast({ title: "Registration failed", variant: "destructive" });
      }
    }
  });

  const updateMutation = useUpdateStudent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Student updated successfully" });
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setIsFormOpen(false);
        setEditingStudent(null);
      },
      onError: (error) => {
        toast({ title: "Update failed", variant: "destructive" });
      }
    }
  });

  const deleteMutation = useDeleteStudent({
    mutation: {
      onSuccess: () => {
        toast({ title: "Student deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setIsDeleteOpen(false);
        setDeletingStudent(null);
      },
      onError: (error) => {
        toast({ title: "Deletion failed", variant: "destructive" });
        setIsDeleteOpen(false);
      }
    }
  });

  // Form setup
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema) as any,
    defaultValues: {
      fullName: "",
      mobile: "",
      email: "",
      dateOfBirth: "",
      gender: "Male",
      address: "",
      courseId: 0,
      batch: "",
      trainer: "",
      admissionDate: format(new Date(), 'yyyy-MM-dd'),
      courseDuration: "",
      password: "",
    },
  });

  // Reset form when editing changes
  useEffect(() => {
    if (editingStudent) {
      form.reset({
        fullName: editingStudent.fullName,
        mobile: editingStudent.mobile,
        email: editingStudent.email || "",
        dateOfBirth: editingStudent.dateOfBirth || "",
        gender: editingStudent.gender || "Male",
        address: editingStudent.address || "",
        courseId: editingStudent.courseId,
        batch: editingStudent.batch,
        trainer: editingStudent.trainer || "",
        admissionDate: editingStudent.admissionDate,
        courseDuration: editingStudent.courseDuration || "",
        password: "", // don't pre-fill password for updates
      });
    } else {
      form.reset({
        fullName: "",
        mobile: "",
        email: "",
        dateOfBirth: "",
        gender: "Male",
        address: "",
        courseId: 0,
        batch: "",
        trainer: "",
        admissionDate: format(new Date(), 'yyyy-MM-dd'),
        courseDuration: "",
        password: "",
      });
    }
  }, [editingStudent, form]);

  const onSubmit = (data: StudentFormValues) => {
    // Clean up empty strings to undefined
    const cleanData = { ...data };
    if (cleanData.password === "") delete cleanData.password;
    
    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent.id, data: cleanData });
    } else {
      createMutation.mutate({ data: cleanData });
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const handleDelete = (student: Student) => {
    setDeletingStudent(student);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (deletingStudent) {
      deleteMutation.mutate({ id: deletingStudent.id });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <Users className="h-8 w-8 text-accent" />
              Student Directory
            </h1>
            <p className="text-muted-foreground mt-1">Manage enrollments and student profiles.</p>
          </div>
          
          <Button 
            onClick={() => {
              setEditingStudent(null);
              setIsFormOpen(true);
            }} 
            className="shrink-0 shadow-md"
          >
            <Plus className="h-4 w-4 mr-2" /> Register Student
          </Button>
        </div>

        <Card className="shadow-sm border-t-4 border-t-primary">
          <CardHeader className="bg-muted/10 border-b pb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle>All Students</CardTitle>
                <CardDescription>
                  {isLoading ? 'Loading...' : `Showing ${students.length} registered students`}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.courseName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="relative w-full sm:w-[250px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Search name, ID or mobile..." 
                    className="pl-9" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Users className="h-12 w-12 text-muted-foreground opacity-20 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No students found</h3>
                <p className="text-muted-foreground">Adjust your filters or register a new student.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/5">
                      <TableHead className="w-[150px]">Student ID</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono font-medium text-xs text-primary">{student.studentId}</TableCell>
                        <TableCell>
                          <div className="font-semibold">{student.fullName}</div>
                          <div className="text-xs text-muted-foreground">Admitted: {format(new Date(student.admissionDate), 'MMM d, yyyy')}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{student.mobile}</div>
                          {student.email && <div className="text-xs text-muted-foreground">{student.email}</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50/50 truncate max-w-[150px]">{student.courseName}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{student.batch}</TableCell>
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
                              <DropdownMenuItem onClick={() => handleEdit(student)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Profile
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(student)}
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
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStudent ? 'Edit Student Profile' : 'Register New Student'}</DialogTitle>
              <DialogDescription>
                {editingStudent 
                  ? 'Update student details. Leave password blank to keep current password.' 
                  : 'Enter details to register. A unique Student ID will be generated automatically.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                
                <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
                  <h4 className="font-semibold text-sm border-b pb-2">Personal Information</h4>
                  <FormField
                    control={form.control as any}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Last Name First Name Middle Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control as any}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="10 digit number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="student@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control as any}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
                  <h4 className="font-semibold text-sm border-b pb-2">Academic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control as any}
                      name="courseId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course *</FormLabel>
                          <Select 
                            onValueChange={(val) => field.onChange(parseInt(val))} 
                            defaultValue={field.value ? field.value.toString() : ""}
                            value={field.value ? field.value.toString() : ""}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select course" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {courses.filter(c => c.status === 'active' || (editingStudent && c.id === editingStudent.courseId)).map((c) => (
                                <SelectItem key={c.id} value={c.id.toString()}>{c.courseName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name="batch"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Batch Time *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 8:00 AM - 10:00 AM" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control as any}
                      name="admissionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admission Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name="trainer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assigned Trainer</FormLabel>
                          <FormControl>
                            <Input placeholder="Trainer name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
                  <h4 className="font-semibold text-sm border-b pb-2 flex items-center gap-2">
                    <Key className="h-4 w-4" /> Authentication
                  </h4>
                  <FormField
                    control={form.control as any}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{editingStudent ? "Reset Password (Optional)" : "Login Password *"}</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder={editingStudent ? "Leave blank to keep current" : "Set initial password"} 
                            {...field} 
                          />
                        </FormControl>
                        {editingStudent && <p className="text-xs text-muted-foreground mt-1">Only fill this if the student needs a password reset.</p>}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="pt-4 sticky bottom-0 bg-background pb-2">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingStudent ? "Update Student" : "Register Student"}
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
              <AlertDialogTitle>Delete Student Record?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the record for <strong className="text-foreground">{deletingStudent?.fullName} ({deletingStudent?.studentId})</strong>. 
                All associated test attempts and history will also be permanently removed. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDelete} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Yes, Delete Record"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </AdminLayout>
  );
}
