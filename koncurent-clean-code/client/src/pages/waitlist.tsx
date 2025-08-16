import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Building2, CheckCircle, ArrowRight } from "lucide-react";

const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  company: z.string().optional(),
  industry: z.string().optional(),
  projectType: z.string().optional(),
  referralSource: z.string().optional(),
  reasonForInterest: z.string().optional(),
});

type WaitlistFormData = z.infer<typeof waitlistSchema>;

export default function WaitlistPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      company: "",
      industry: "",
      projectType: "",
      referralSource: "",
      reasonForInterest: "",
    },
  });

  const joinWaitlistMutation = useMutation({
    mutationFn: async (data: WaitlistFormData) => {
      const response = await apiRequest("POST", "/api/beta/waitlist", data);
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Welcome to the waitlist!",
        description: "We'll notify you when beta access becomes available.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join waitlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WaitlistFormData) => {
    joinWaitlistMutation.mutate(data);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900">You're on the list!</h2>
              <p className="text-gray-600">
                Thank you for your interest in Koncurent Hi-LYTE. We'll notify you as soon as beta access becomes available.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                <p><strong>What's next?</strong></p>
                <ul className="mt-2 space-y-1 text-left">
                  <li>• We'll review your application</li>
                  <li>• Priority given to active construction professionals</li>
                  <li>• You'll receive an invitation email when ready</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <Building2 className="h-10 w-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Koncurent Hi-LYTE</h1>
          </div>
          <p className="text-xl text-gray-600">
            Revolutionary AI-powered construction document analysis
          </p>
          <div className="bg-blue-600 text-white px-6 py-3 rounded-full inline-block">
            <span className="font-semibold">Beta Access - Invitation Only</span>
          </div>
        </div>

        {/* Waitlist Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Join the Beta Waitlist</CardTitle>
            <CardDescription>
              Be among the first to experience intelligent construction drawing analysis. 
              We're currently accepting a limited number of beta testers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Professional Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Construction Company Inc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="commercial">Commercial Construction</SelectItem>
                            <SelectItem value="residential">Residential Construction</SelectItem>
                            <SelectItem value="infrastructure">Infrastructure</SelectItem>
                            <SelectItem value="industrial">Industrial</SelectItem>
                            <SelectItem value="architecture">Architecture</SelectItem>
                            <SelectItem value="engineering">Engineering</SelectItem>
                            <SelectItem value="project-management">Project Management</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="projectType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Project Type (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="office-buildings">Office Buildings</SelectItem>
                          <SelectItem value="retail">Retail Spaces</SelectItem>
                          <SelectItem value="healthcare">Healthcare Facilities</SelectItem>
                          <SelectItem value="education">Educational Buildings</SelectItem>
                          <SelectItem value="residential">Residential Projects</SelectItem>
                          <SelectItem value="industrial">Industrial Facilities</SelectItem>
                          <SelectItem value="infrastructure">Infrastructure</SelectItem>
                          <SelectItem value="mixed-use">Mixed Use</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referralSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How did you hear about us? (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="colleague">Colleague Referral</SelectItem>
                          <SelectItem value="linkedin">LinkedIn</SelectItem>
                          <SelectItem value="industry-event">Industry Event</SelectItem>
                          <SelectItem value="google">Google Search</SelectItem>
                          <SelectItem value="construction-forum">Construction Forum</SelectItem>
                          <SelectItem value="newsletter">Newsletter</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reasonForInterest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What interests you most about Hi-LYTE? (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell us about your current challenges with construction drawings, document analysis, or data extraction..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={joinWaitlistMutation.isPending}
                >
                  {joinWaitlistMutation.isPending ? (
                    "Joining waitlist..."
                  ) : (
                    <>
                      Join Beta Waitlist
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Features Preview */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">What you'll get with beta access:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">AI-powered data extraction</p>
                <p className="text-gray-600">Automatically extract critical information from construction drawings</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">$10 in free AI credits</p>
                <p className="text-gray-600">Start analyzing your drawings immediately</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Priority support</p>
                <p className="text-gray-600">Direct access to our development team</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Early feature access</p>
                <p className="text-gray-600">Be first to try new capabilities</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}