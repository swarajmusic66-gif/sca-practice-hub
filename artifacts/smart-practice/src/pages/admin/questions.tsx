import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  HelpCircle,
  Upload,
  Filter,
  CheckCircle2
} from "lucide-react";
import { 
  useListQuestions, 
  useCreateQuestion, 
  useUpdateQuestion, 
  useDeleteQuestion,
  useBulkUploadQuestions,
  useListCourses,
  getListQuestionsQueryKey,
  Question,
  QuestionDifficulty
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const questionSchema = z.object({
  courseId: z.coerce.number().min(1, "Course selection is required"),
  topic: z.string().min(2, "Topic is required"),
  question: z.string().min(5, "Question text is required"),
  optionA: z.string().min(1, "Option A is required"),
  optionB: z.string().min(1, "Option B is required"),
  optionC: z.string().min(1, "Option C is required"),
  optionD: z.string().min(1, "Option D is required"),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

type QuestionFormValues = z.infer<typeof questionSchema>;

export default function AdminQuestions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 20;
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [uploadCourseId, setUploadCourseId] = useState<string>("");

  // Queries
  const { data: courses = [] } = useListCourses({ status: "active" });
  
  // Auto-select first course if available
  useEffect(() => {
    if (courses.length > 0 && courseFilter === "all") {
      setCourseFilter(courses[0].id.toString());
    }
  }, [courses, courseFilter]);

  const questionParams = {
    courseId: courseFilter !== "all" ? parseInt(courseFilter) : undefined,
    difficulty: difficultyFilter !== "all" ? (difficultyFilter as QuestionDifficulty) : undefined,
    search: searchTerm || undefined,
    limit,
    offset: (page - 1) * limit
  };
  const { data: questionsData, isLoading } = useListQuestions(questionParams, {
    query: {
      queryKey: getListQuestionsQueryKey(questionParams),
      enabled: courseFilter !== "all"
    }
  });

  const questions = questionsData?.questions || [];
  const total = questionsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Mutations
  const createMutation = useCreateQuestion({
    mutation: {
      onSuccess: () => {
        toast({ title: "Question added successfully" });
        queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
        setIsFormOpen(false);
      },
      onError: () => toast({ title: "Failed to add question", variant: "destructive" })
    }
  });

  const updateMutation = useUpdateQuestion({
    mutation: {
      onSuccess: () => {
        toast({ title: "Question updated successfully" });
        queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
        setIsFormOpen(false);
        setEditingQuestion(null);
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" })
    }
  });

  const deleteMutation = useDeleteQuestion({
    mutation: {
      onSuccess: () => {
        toast({ title: "Question deleted" });
        queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
        setIsDeleteOpen(false);
      },
      onError: () => toast({ title: "Deletion failed", variant: "destructive" })
    }
  });

  const uploadMutation = useBulkUploadQuestions({
    mutation: {
      onSuccess: (data) => {
        toast({ 
          title: "Bulk upload complete", 
          description: `Successfully inserted ${data.inserted} questions. ${data.failed > 0 ? `Failed: ${data.failed}` : ''}`
        });
        queryClient.invalidateQueries({ queryKey: getListQuestionsQueryKey() });
        setIsUploadOpen(false);
        setJsonInput("");
      },
      onError: (error) => {
        toast({ 
          title: "Upload failed", 
          description: (error?.data as any)?.error || "Invalid JSON format or data structure",
          variant: "destructive" 
        });
      }
    }
  });

  // Form setup
  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionSchema) as any,
    defaultValues: {
      courseId: courseFilter !== "all" ? parseInt(courseFilter) : 0,
      topic: "",
      question: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctAnswer: "A",
      difficulty: "medium",
    },
  });

  // Reset form when editing changes
  useEffect(() => {
    if (editingQuestion) {
      form.reset({
        courseId: editingQuestion.courseId,
        topic: editingQuestion.topic,
        question: editingQuestion.question,
        optionA: editingQuestion.optionA,
        optionB: editingQuestion.optionB,
        optionC: editingQuestion.optionC,
        optionD: editingQuestion.optionD,
        correctAnswer: editingQuestion.correctAnswer,
        difficulty: editingQuestion.difficulty,
      });
    } else {
      form.reset({
        courseId: courseFilter !== "all" ? parseInt(courseFilter) : 0,
        topic: "",
        question: "",
        optionA: "",
        optionB: "",
        optionC: "",
        optionD: "",
        correctAnswer: "A",
        difficulty: "medium",
      });
    }
  }, [editingQuestion, form, courseFilter]);

  const onSubmit = (data: QuestionFormValues) => {
    if (editingQuestion) {
      updateMutation.mutate({ id: editingQuestion.id, data });
    } else {
      createMutation.mutate({ data });
    }
  };

  const handleBulkUpload = () => {
    if (!uploadCourseId) {
      toast({ title: "Please select a course", variant: "destructive" });
      return;
    }
    
    try {
      const parsedJson = JSON.parse(jsonInput);
      if (!Array.isArray(parsedJson)) {
        throw new Error("JSON must be an array of questions");
      }
      
      uploadMutation.mutate({
        data: {
          courseId: parseInt(uploadCourseId),
          questions: parsedJson
        }
      });
    } catch (e) {
      toast({ 
        title: "Invalid JSON", 
        description: e instanceof Error ? e.message : "Parse error",
        variant: "destructive" 
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
              <HelpCircle className="h-8 w-8 text-accent" />
              Question Bank
            </h1>
            <p className="text-muted-foreground mt-1">Manage questions across all courses.</p>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <Button 
              variant="outline"
              onClick={() => {
                setUploadCourseId(courseFilter !== "all" ? courseFilter : "");
                setJsonInput("");
                setIsUploadOpen(true);
              }} 
            >
              <Upload className="h-4 w-4 mr-2" /> Bulk Upload
            </Button>
            <Button 
              onClick={() => {
                setEditingQuestion(null);
                setIsFormOpen(true);
              }} 
            >
              <Plus className="h-4 w-4 mr-2" /> Add Question
            </Button>
          </div>
        </div>

        {/* Filters Card */}
        <Card className="shadow-sm border-t-4 border-t-primary">
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end md:items-center bg-muted/10">
            <div className="w-full md:w-1/3">
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground font-bold">Select Course</Label>
              <Select value={courseFilter} onValueChange={(val) => { setCourseFilter(val); setPage(1); }}>
                <SelectTrigger className="bg-background font-semibold">
                  <SelectValue placeholder="Select Course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.courseName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-1/4">
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground font-bold">Difficulty</Label>
              <Select value={difficultyFilter} onValueChange={(val) => { setDifficultyFilter(val); setPage(1); }}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="All Difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Difficulties</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:flex-1">
              <Label className="mb-2 block text-xs uppercase tracking-wider text-muted-foreground font-bold">Search Questions</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Search by topic or content..." 
                  className="pl-9 bg-background" 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Table */}
        <Card className="shadow-sm">
          <CardHeader className="py-4 border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Questions Directory</CardTitle>
              <Badge variant="outline" className="font-mono">
                {isLoading ? "..." : total} Items
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {courseFilter === "all" ? (
              <div className="text-center py-20 px-4">
                <Filter className="h-12 w-12 text-muted-foreground opacity-20 mx-auto mb-4" />
                <h3 className="text-lg font-medium">Please select a course</h3>
                <p className="text-muted-foreground mt-1">Choose a course from the dropdown above to view its question bank.</p>
              </div>
            ) : isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full" />)}
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-16 px-4">
                <HelpCircle className="h-12 w-12 text-muted-foreground opacity-20 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No questions found</h3>
                <p className="text-muted-foreground mt-1">Start building the bank by adding questions.</p>
              </div>
            ) : (
              <div className="divide-y">
                {questions.map((q) => (
                  <div key={q.id} className="p-4 hover:bg-muted/10 transition-colors">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">{q.topic}</Badge>
                          <Badge 
                            variant="secondary" 
                            className={`text-[10px] uppercase font-bold tracking-wider ${
                              q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              q.difficulty === 'medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}
                          >
                            {q.difficulty}
                          </Badge>
                        </div>
                        <p className="font-semibold text-sm md:text-base leading-snug mt-1">{q.question}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingQuestion(q); setIsFormOpen(true); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => { setDeletingQuestion(q); setIsDeleteOpen(true); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mt-3 pl-2">
                      {['A', 'B', 'C', 'D'].map(opt => {
                        const isCorrect = q.correctAnswer === opt;
                        return (
                          <div 
                            key={opt} 
                            className={`text-xs px-2 py-1.5 rounded border flex items-start gap-2 ${
                              isCorrect ? 'bg-green-50 border-green-200 text-green-900 font-medium' : 'bg-background text-muted-foreground border-border'
                            }`}
                          >
                            <span className="font-bold opacity-50 shrink-0">{opt}.</span>
                            <span className="line-clamp-2">{String(q[`option${opt}` as keyof Question])}</span>
                            {isCorrect && <CheckCircle2 className="h-3 w-3 ml-auto shrink-0 mt-0.5" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Pagination Controls */}
            {!isLoading && totalPages > 1 && (
              <div className="p-4 border-t bg-muted/5 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
              <DialogDescription>
                Provide the question text, options, and identify the correct answer.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control as any}
                    name="courseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course</FormLabel>
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
                            {courses.map((c) => (
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
                    name="topic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Topic / Chapter</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. MS Word Basics" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as any}
                    name="difficulty"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select difficulty" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control as any}
                  name="question"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Question Text</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Type your question here..." 
                          className="min-h-[100px] resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
                  <h4 className="font-semibold text-sm border-b pb-2">Answer Options</h4>
                  
                  <FormField
                    control={form.control as any}
                    name="correctAnswer"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                          className="grid grid-cols-1 gap-4"
                        >
                          {['A', 'B', 'C', 'D'].map((opt) => (
                            <div key={opt} className={`flex items-start space-x-2 border rounded-md p-3 ${field.value === opt ? 'bg-primary/5 border-primary/50' : 'bg-background'}`}>
                              <RadioGroupItem value={opt} id={`opt-${opt}`} className="mt-2" />
                              <div className="flex-1">
                                <Label htmlFor={`opt-${opt}`} className="font-bold cursor-pointer mb-1 block">
                                  Option {opt} {field.value === opt && <Badge variant="default" className="ml-2 py-0 h-4 text-[10px]">Correct</Badge>}
                                </Label>
                                <FormField
                                  control={form.control as any}
                                  name={`option${opt}` as keyof QuestionFormValues}
                                  render={({ field: optField }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          placeholder={`Answer text for option ${opt}`} 
                                          {...optField} 
                                          value={optField.value as string}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="pt-2 sticky bottom-0 bg-background pb-2">
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Question"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Bulk Upload Dialog */}
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Bulk Upload Questions</DialogTitle>
              <DialogDescription>
                Paste a JSON array of questions to add them all at once.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Target Course</Label>
                <Select value={uploadCourseId} onValueChange={setUploadCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.courseName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>JSON Data</Label>
                  <span className="text-xs text-muted-foreground">Format: [&#123; "topic": "...", "question": "...", "optionA": "...", ... &#125;]</span>
                </div>
                <Textarea 
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder="[\n  {\n    &quot;topic&quot;: &quot;Word&quot;,\n    &quot;question&quot;: &quot;What is Ctrl+C?&quot;,\n    &quot;optionA&quot;: &quot;Copy&quot;,\n    &quot;optionB&quot;: &quot;Paste&quot;,\n    &quot;optionC&quot;: &quot;Cut&quot;,\n    &quot;optionD&quot;: &quot;Undo&quot;,\n    &quot;correctAnswer&quot;: &quot;A&quot;,\n    &quot;difficulty&quot;: &quot;easy&quot;\n  }\n]"
                  className="font-mono text-xs min-h-[300px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleBulkUpload} 
                disabled={uploadMutation.isPending || !jsonInput.trim()}
              >
                {uploadMutation.isPending ? "Processing..." : "Upload Questions"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Question?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the question from the course question bank. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deletingQuestion && deleteMutation.mutate({ id: deletingQuestion.id })} 
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
