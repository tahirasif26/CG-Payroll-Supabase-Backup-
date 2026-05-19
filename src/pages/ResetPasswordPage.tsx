import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isApiClientError, useResetPassword } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetMut = useResetPassword();

  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const linkInvalid = !token;

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both password fields match.",
        variant: "destructive",
      });
      return;
    }

    try {
      await resetMut.mutateAsync({ token, password });
      toast({
        title: "Password updated",
        description: "You can now sign in with your new password.",
      });
      navigate("/auth", { replace: true });
    } catch (err) {
      toast({
        title: "Failed to set password",
        description: isApiClientError(err)
          ? err.toToastMessage()
          : "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  if (linkInvalid) {
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
          </CardHeader>
          <CardContent className="pt-2 pb-8 px-8 text-center space-y-4">
            <p className="text-sm font-medium text-destructive">⚠️ Invalid or expired link</p>
            <p className="text-sm text-muted-foreground">
              This password-reset link is missing a token. Please request a new reset email.
            </p>
            <Button onClick={() => navigate("/auth")} variant="outline" className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <p className="text-sm text-muted-foreground">Set your new password</p>
        </CardHeader>
        <CardContent className="pt-4 pb-8 px-8">
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <Button type="submit" className="w-full gradient-ey" disabled={resetMut.isPending}>
              {resetMut.isPending ? "Setting password..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
