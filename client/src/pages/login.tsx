import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { FormHeader } from "@/components/koncurent-logo";
import { LogIn, Eye, EyeOff, Shield } from "lucide-react";

// Extended login schema to include 2FA
const loginSchema = z.object({
  usernameOrEmail: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
  twoFactorCode: z.string().optional(),
});

type LoginData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [loginCredentials, setLoginCredentials] = useState<{usernameOrEmail: string; password: string} | null>(null);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      usernameOrEmail: "",
      password: "",
      twoFactorCode: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest("/api/auth/login", "POST", data);
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.requires2FA) {
        // First login attempt without 2FA code
        setRequires2FA(true);
        setLoginCredentials({
          usernameOrEmail: form.getValues('usernameOrEmail'),
          password: form.getValues('password')
        });
        toast({
          title: "Security Check Required",
          description: "Please open your authenticator app and enter the 6-digit code to continue.",
        });
      } else {
        // Successful login
        const user = data.user;
        toast({
          title: "Login successful",
          description: `Welcome back, ${user?.firstName || user?.username || 'User'}!`,
        });
        login(user);
        navigate("/");
      }
    },
    onError: (error) => {
      const isCodeError = error.message?.includes("2FA") || error.message?.includes("code");
      toast({
        title: isCodeError ? "Authentication Code Issue" : "Login Problem",
        description: isCodeError 
          ? "The security code didn't work. Please try the current code from your authenticator app."
          : error.message || "Please check your email and password and try again.",
        variant: "destructive",
      });
      
      if (isCodeError) {
        // Clear 2FA code on error for retry
        form.setValue('twoFactorCode', '');
      }
    },
  });

  const onSubmit = (data: LoginData) => {
    // If 2FA is required and we have stored credentials, include them
    if (requires2FA && loginCredentials) {
      loginMutation.mutate({
        ...loginCredentials,
        twoFactorCode: data.twoFactorCode
      });
    } else {
      loginMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <FormHeader 
            title="Welcome back"
            subtitle="Sign in to your Hi-LYTE account"
          />
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="usernameOrEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email address"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          {...field}
                          disabled={requires2FA}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {requires2FA && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <FormField
                    control={form.control}
                    name="twoFactorCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2 text-blue-800 font-semibold">
                          <Shield className="h-4 w-4" />
                          Security Code Required
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="000000"
                            maxLength={6}
                            className="text-center text-2xl tracking-widest font-mono h-14 bg-white border-blue-300"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                        <div className="text-sm text-blue-700 space-y-1">
                          <p className="font-medium">📱 Check your authenticator app for the 6-digit code</p>
                          <p className="text-xs">The code changes every 30 seconds</p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={loginMutation.isPending || (requires2FA && form.getValues('twoFactorCode')?.length !== 6)}
              >
                <LogIn className="h-4 w-4 mr-2" />
                {loginMutation.isPending 
                  ? "Verifying..." 
                  : requires2FA 
                    ? form.getValues('twoFactorCode')?.length === 6
                      ? "🔐 Verify & Sign In" 
                      : "Enter 6-Digit Code"
                    : "Sign in"
                }
              </Button>

              {requires2FA && (
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">
                    Lost your authenticator device?
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // TODO: Implement backup code login
                        toast({
                          title: "Contact Support",
                          description: "Please contact support to recover your account using backup codes.",
                        });
                      }}
                    >
                      Use backup code
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRequires2FA(false);
                        setLoginCredentials(null);
                        form.reset();
                      }}
                    >
                      Different account
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Form>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              Create account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}