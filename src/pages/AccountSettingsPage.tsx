import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/FileUpload";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound, Phone, ImageIcon, Mail } from "lucide-react";

export default function AccountSettingsPage() {
  const { user, profile } = useRole();
  const { toast } = useToast();

  const displayName = profile?.full_name || "User";
  const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profile?.avatar_url ?? undefined);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState<string>("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    setAvatarUrl(profile?.avatar_url ?? undefined);
    setFullName(profile?.full_name ?? "");
  }, [profile]);

  // Load phone from profiles row
  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", user.id)
        .maybeSingle();
      setPhone((data?.phone as string) ?? "");
    })();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq("id", user.id);
      if (error) throw error;
      // Best-effort: also reflect on the linked employee row
      await (supabase as any).from("employees").update({ phone: phone.trim() || null }).eq("user_id", user.id);
      toast({ title: "Profile updated", description: "Your details have been saved." });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message ?? "Could not save profile.", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!user?.email) return;
    if (newPwd.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPwd !== confirmPwd) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }
    setSavingPwd(true);
    try {
      // Re-authenticate with current password to verify identity
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPwd,
      });
      if (signInError) {
        toast({ title: "Current password incorrect", description: "Please re-enter your existing password.", variant: "destructive" });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      toast({ title: "Password changed", description: "Your password has been updated." });
    } catch (err: any) {
      toast({ title: "Change failed", description: err.message ?? "Could not change password.", variant: "destructive" });
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Account Settings" description="Manage your profile photo, contact details, and password." />

      {/* Profile photo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" />Profile photo</CardTitle>
          <CardDescription>PNG, JPG or WEBP up to 2MB.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-lg">
              {avatarUrl ? <AvatarImage src={avatarUrl} className="rounded-lg object-cover" /> : null}
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <FileUpload
              bucket="avatars"
              pathPrefix={user?.id ?? "anonymous"}
              fileName="avatar"
              accept="image/png,image/jpeg,image/webp"
              maxSizeMB={2}
              currentUrl={avatarUrl}
              onUploaded={(_p, url) => {
                if (!url || !user) return;
                setAvatarUrl(url);
                void supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
                void (supabase as any).from("employees").update({ avatar_url: url }).eq("user_id", user.id);
                toast({ title: "Photo updated" });
              }}
              onRemoved={() => {
                if (!user) return;
                setAvatarUrl(undefined);
                void supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
                void (supabase as any).from("employees").update({ avatar_url: null }).eq("user_id", user.id);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Profile details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" />Profile details</CardTitle>
          <CardDescription>Update your name and contact phone number.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+966 5X XXX XXXX" maxLength={32} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />Email</Label>
              <Input value={user?.email ?? ""} disabled />
              <p className="text-[11px] text-muted-foreground">Email is managed by your administrator and cannot be changed here.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={savingProfile}>
              {savingProfile && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" />Change password</CardTitle>
          <CardDescription>Use at least 8 characters with a mix of letters and numbers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="currentPwd">Current password</Label>
              <Input id="currentPwd" type="password" autoComplete="current-password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPwd">New password</Label>
              <Input id="newPwd" type="password" autoComplete="new-password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPwd">Confirm new password</Label>
              <Input id="confirmPwd" type="password" autoComplete="new-password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={changePassword} disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd}>
              {savingPwd && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
              Update password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
