import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [isInvite, setIsInvite] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [errorDetail, setErrorDetail] = useState("");
  const sessionReadyRef = useRef(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;

    const isRecovery = hash.includes("type=recovery") || search.includes("type=recovery");
    const invite = hash.includes("type=invite") || search.includes("type=invite");
    setIsInvite(invite);

    // Surface any error embedded in the URL hash
    if (hash.includes("error=") || hash.includes("error_description=")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const errorMsg = params.get("error_description") || params.get("error") || "Link invalid";
      setLinkInvalid(true);
      setVerifying(false);
      setErrorDetail(decodeURIComponent(errorMsg));
      return;
    }

    const markReady = () => {
      sessionReadyRef.current = true;
      setSessionReady(true);
      setVerifying(false);
    };

    // Subscribe FIRST so we don't miss the event Supabase fires
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[ResetPassword] Auth event:", event, "session?", !!session);
      if (session?.access_token) markReady();
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error("[ResetPassword] getSession error:", error);
      if (session?.access_token) {
        markReady();
      } else {
        // Wait briefly for the listener to fire from the URL hash
        setTimeout(() => {
          if (!sessionReadyRef.current) {
            const hasAuthIndicator = isRecovery || invite || hash.includes("access_token");
            if (!hasAuthIndicator) {
              setLinkInvalid(true);
              setErrorDetail("This link is invalid or has expired. Please request a new invitation or password reset.");
            }
            setVerifying(false);
          }
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionReady) {
      toast({ title: "Please wait", description: "Still verifying your invitation link. Try again in a moment.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Password must be at least 8 characters long.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both password fields match.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error("[ResetPassword] updateUser error:", error);
      toast({ title: "Failed to set password", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    if (!data?.user) {
      toast({ title: "Failed to set password", description: "User not found. Please request a new invitation.", variant: "destructive" });
      setLoading(false);
      return;
    }

    toast({ title: "Password set successfully!", description: "Welcome to HRConnect. Redirecting…" });
    window.history.replaceState(null, "", window.location.pathname);
    setTimeout(() => navigate("/", { replace: true }), 1000);
    setLoading(false);
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardContent className="py-12 flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verifying your invitation link…</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (linkInvalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md shadow-lg border-border/50">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="flex items-center justify-center mb-4">
              <span className="text-[28px] font-extrabold tracking-tighter text-primary" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>HR</span>
              <span className="text-[28px] font-extrabold tracking-tighter text-foreground" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>Connect</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-8 px-8 text-center space-y-4">
            <p className="text-sm font-medium text-destructive">⚠️ Invalid or expired link</p>
            <p className="text-sm text-muted-foreground">{errorDetail || "This invitation link is invalid or has expired. Please contact your administrator."}</p>
            <Button onClick={() => navigate("/")} variant="outline" className="w-full">Go to Login</Button>
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
            <span className="text-[28px] font-extrabold tracking-tighter text-primary" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>HR</span>
              <span className="text-[28px] font-extrabold tracking-tighter text-foreground" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>Connect</span>
          </div>
          <p className="text-sm text-muted-foreground">{isInvite ? "Welcome! Set a password to activate your account" : "Set your new password"}</p>
        </CardHeader>
        <CardContent className="pt-4 pb-8 px-8">
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="new-password" type={showPassword ? "text" : "password"} placeholder="Min 8 characters" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" required minLength={8} autoComplete="new-password" />
                <button type="button" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="confirm-password" type={showPassword ? "text" : "password"} placeholder="Re-enter password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="pl-10" required minLength={8} autoComplete="new-password" />
              </div>
            </div>
            <Button type="submit" className="w-full gradient-ey" disabled={loading || !sessionReady}>
              {loading ? "Setting password..." : isInvite ? "Activate Account" : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
