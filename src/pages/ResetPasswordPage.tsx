import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [isInvite, setIsInvite] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    const isRecovery = hash.includes("type=recovery");
    const invite = hash.includes("type=invite");
    setIsInvite(invite);

    // Subscribe FIRST so we don't miss the event Supabase fires when it
    // parses the access_token from the URL hash.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        setSessionReady(true);
      }
    });

    // Also check existing session (covers the case where the listener
    // already fired before we mounted, e.g. fast refresh).
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
      else if (!isRecovery && !invite) {
        setLinkInvalid(true);
        toast({ title: "Invalid link", description: "This link is invalid or expired.", variant: "destructive" });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionReady) {
      toast({ title: "Please wait", description: "Still verifying your invite link…" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated", description: "Your password has been set successfully." });
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="flex items-center justify-center mb-4">
            <span className="text-[28px] font-extrabold tracking-tighter text-foreground" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>Connect</span>
            <span className="text-[28px] font-extrabold tracking-tighter text-primary" style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}>HR</span>
          </div>
          <p className="text-sm text-muted-foreground">{isInvite ? "Welcome! Set a password to activate your account" : "Set your new password"}</p>
        </CardHeader>
        <CardContent className="pt-4 pb-8 px-8">
          {linkInvalid ? (
            <div className="text-center text-sm text-muted-foreground py-6">
              This link is invalid or expired. Please request a new invite or password reset.
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input id="new-password" type={showPassword ? "text" : "password"} placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" required minLength={6} />
                  <button type="button" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {!sessionReady && (
                  <p className="text-[11px] text-muted-foreground">Verifying your link…</p>
                )}
              </div>
              <Button type="submit" className="w-full gradient-ey" disabled={loading || !sessionReady}>
                {loading ? "Updating..." : !sessionReady ? "Verifying link…" : "Update Password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
