import { useState } from "react";
import { motion } from "framer-motion";
import { User, Lock, Save, KeyRound, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store/use-auth-store";
import { useUpdateProfile, useChangePassword } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fadeUp, stagger } from "@/lib/animations";

export function ProfilePage() {
  const { user } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [name, setName] = useState(user?.name || "");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateProfile.mutate({ name });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return;
    }
    changePassword.mutate({ oldPassword, newPassword });
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
      <motion.div
        className="mx-auto max-w-2xl"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile information and security preferences.
          </p>
        </motion.div>

        {/* Profile Section */}
        <motion.div
          variants={fadeUp}
          className="mb-8 border border-border bg-card p-6 shadow-none"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-primary/20 bg-primary/5 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">General Information</h2>
              <p className="text-xs text-muted-foreground">
                Your public profile details.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateName} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={user?.email || ""}
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
              <p className="text-[10px] text-muted-foreground italic">
                Email address cannot be changed. Contact support for assistance.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <Button
              type="submit"
              disabled={updateProfile.isPending || name === user?.name}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </motion.div>

        {/* Security Section */}
        <motion.div
          variants={fadeUp}
          className="border border-border bg-card p-6 shadow-none"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border border-amber-500/20 bg-amber-500/5 text-amber-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Security</h2>
              <p className="text-xs text-muted-foreground">
                Update your password to keep your account secure.
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="old-password">Current Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="old-password"
                  type="password"
                  autoComplete="current-password"
                  className="pl-9"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs font-medium text-destructive">
                Passwords do not match.
              </p>
            )}

            <Button
              type="submit"
              variant="secondary"
              disabled={
                changePassword.isPending ||
                !oldPassword ||
                !newPassword ||
                newPassword !== confirmPassword
              }
              className="gap-2"
            >
              <Lock className="h-4 w-4" />
              {changePassword.isPending ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
