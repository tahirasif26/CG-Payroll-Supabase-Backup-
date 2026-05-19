import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForgotPassword, useLogin, isApiClientError } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const loginMut = useLogin();
  const forgotMut = useForgotPassword();
  const loading = loginMut.isPending || forgotMut.isPending;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMut.mutateAsync({ email, password });
      navigate("/");
    } catch (err) {
      const msg = isApiClientError(err) ? err.toToastMessage() : "Login failed";
      const isInvalidCreds = isApiClientError(err) && err.code === "INVALID_CREDENTIALS";
      toast({
        title: "Login failed",
        description: isInvalidCreds
          ? "Wrong email/password — or your account is not yet activated. Check your email for the invite link to set a password."
          : msg,
        variant: "destructive",
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email required",
        description: "Enter your email to reset password",
        variant: "destructive",
      });
      return;
    }
    try {
      await forgotMut.mutateAsync({ email });
      toast({
        title: "Reset link sent",
        description: "If an account exists for that address, a reset email is on its way.",
      });
      setForgotMode(false);
    } catch (err) {
      // Backend always 202s — only network failures land here.
      toast({
        title: "Error",
        description: isApiClientError(err) ? err.toToastMessage() : "Unable to send reset email",
        variant: "destructive",
      });
    }
  };

  if (forgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="flex items-center justify-center mb-4">
              <span
                className="text-[28px] font-extrabold tracking-tighter text-primary"
                style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}
              >
                HR
              </span>
              <span
                className="text-[28px] font-extrabold tracking-tighter text-foreground"
                style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}
              >
                Connect
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Reset your password</p>
          </CardHeader>
          <CardContent className="pt-4 pb-8 px-8">
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full gradient-ey" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={() => setForgotMode(false)}
              >
                Back to login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="flex items-center justify-center mb-1">
            <span
              className="text-[28px] font-extrabold tracking-tighter text-primary"
              style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}
            >
              HR
            </span>
            <span
              className="text-[28px] font-extrabold tracking-tighter text-foreground"
              style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}
            >
              Connect
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground tracking-wide font-medium">
            powered by Consultify Global
          </p>
        </CardHeader>
        <CardContent className="pt-6 pb-8 px-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="login-password">Password</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setForgotMode(true)}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full gradient-ey" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/*
            OAuth (Google/Apple/Microsoft) buttons removed in the Phase 2.1
            cutover — the Lovable cloud-auth-js wrapper depended on Supabase
            Auth. OAuth strategies will return via NestJS Passport in Phase 1b.
          */}
        </CardContent>
      </Card>
    </div>
  );
}
