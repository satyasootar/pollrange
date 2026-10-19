import { useState } from "react"
import { motion } from "framer-motion"
import {
  User,
  Lock,
  Save,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Building2,
  LogOut,
  CreditCard,
} from "lucide-react"
import { Link } from "react-router-dom"
import { useAuthStore } from "@/store/use-auth-store"
import { useUpdateProfile, useChangePassword } from "@/hooks/use-profile"
import { useRequestVerification } from "@/hooks/use-auth-actions"
import { useLogout } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { fadeUp, stagger } from "@/lib/animations"

/** Google "G" logo, inline so it needs no asset. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}

export function ProfilePage() {
  const { user } = useAuthStore()
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const requestVerification = useRequestVerification()
  const logout = useLogout()

  const [name, setName] = useState(user?.name || "")
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfile.mutate({ name })
  }

  // Google-only accounts have no password yet: they add one (no current password to check), then update it like anyone.
  const addingPassword = user?.hasPassword === false
  const tooShort = newPassword.length > 0 && newPassword.length < 8

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword || tooShort) {
      return
    }
    changePassword.mutate(
      { oldPassword: addingPassword ? undefined : oldPassword, newPassword },
      {
        // Keep what was typed if it failed (e.g. wrong current password).
        onSuccess: () => {
          setOldPassword("")
          setNewPassword("")
          setConfirmPassword("")
        },
      }
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-border px-4 md:px-8">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            Account Settings
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            Manage your profile information and security preferences.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
        <motion.div
          className="mx-auto max-w-2xl"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
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

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email">Email Address</Label>
                  {user?.isEmailVerified ? (
                    <Badge
                      variant="secondary"
                      className="gap-1.5 border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-500"
                    >
                      <ShieldCheck className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="gap-1.5 border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-500"
                    >
                      <ShieldAlert className="h-3 w-3" />
                      Unverified
                    </Badge>
                  )}
                </div>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="cursor-not-allowed bg-muted/50"
                />
                {!user?.isEmailVerified && (
                  <div className="mt-2 flex items-start gap-3 rounded-none border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="mt-0.5">
                      <Mail className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-amber-600">
                        Email not verified
                      </p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-amber-600/80">
                        Please verify your email to unlock all features and
                        secure your account.
                      </p>
                      <Button
                        variant="link"
                        className="mt-2 h-auto p-0 text-[10px] font-bold text-amber-600 underline underline-offset-2"
                        onClick={() => requestVerification.mutate()}
                        disabled={requestVerification.isPending}
                      >
                        {requestVerification.isPending
                          ? "Sending..."
                          : "Send Verification Link"}
                      </Button>
                    </div>
                  </div>
                )}
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
                disabled={
                  updateProfile.isPending ||
                  name === user?.name
                }
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </motion.div>

          {/* Plan shortcut (the only way to reach billing on mobile) */}
          <Link
            to="/dashboard/billing"
            className="mb-8 flex items-center gap-3 border border-border bg-card p-4 hover:border-primary/40"
          >
            <div className="flex h-10 w-10 items-center justify-center border border-primary/20 bg-primary/5 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Plan & usage</p>
              <p className="text-xs text-muted-foreground">See your limits and upgrade options</p>
            </div>
          </Link>

          {/* Brand kit shortcut */}
          <Link
            to="/dashboard/branding"
            className="mb-8 flex items-center gap-3 border border-border bg-card p-4 hover:border-primary/40"
          >
            <div className="flex h-10 w-10 items-center justify-center border border-indigo-500/20 bg-indigo-500/5 text-indigo-500">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Brand kit</p>
              <p className="text-xs text-muted-foreground">Logo, colours and fonts for your forms, polls and QR codes</p>
            </div>
          </Link>

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
                  {addingPassword
                    ? "Add a password to sign in with your email too."
                    : "Update your password to keep your account secure."}
                </p>
              </div>
            </div>

            {user?.hasGoogle && (
              <div className="mb-5 flex items-start gap-3 border border-border bg-muted/30 p-3 text-sm">
                <GoogleMark />
                <p className="text-muted-foreground">
                  {addingPassword ? (
                    <>
                      You sign in with <span className="font-medium text-foreground">Google</span>, so there's no
                      password to update yet. Add one below to also sign in with{" "}
                      <span className="font-medium text-foreground">{user.email}</span> and a password.
                    </>
                  ) : (
                    <>
                      Linked to <span className="font-medium text-foreground">Google</span>. You can sign in with Google
                      or with your email and password.
                    </>
                  )}
                </p>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {!addingPassword && (
              <div className="space-y-2">
                <Label htmlFor="old-password">Current Password</Label>
                <div className="relative">
                  <KeyRound className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-password">{addingPassword ? "Password" : "New Password"}</Label>
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

              {tooShort && (
                <p className="text-xs font-medium text-destructive">
                  Use at least 8 characters.
                </p>
              )}
              {newPassword &&
                confirmPassword &&
                newPassword !== confirmPassword && (
                  <p className="text-xs font-medium text-destructive">
                    Passwords do not match.
                  </p>
                )}

              <Button
                type="submit"
                variant="secondary"
                disabled={
                  changePassword.isPending ||
                  (!addingPassword && !oldPassword) ||
                  !newPassword ||
                  tooShort ||
                  newPassword !== confirmPassword
                }
                className="gap-2"
              >
                <Lock className="h-4 w-4" />
                {changePassword.isPending
                  ? addingPassword
                    ? "Adding..."
                    : "Updating..."
                  : addingPassword
                    ? "Add Password"
                    : "Update Password"}
              </Button>
            </form>
          </motion.div>

          {/* Sign out — the only mobile-reachable place to do this now that the app uses a bottom tab bar instead of a sidebar drawer on phones */}
          <motion.div
            variants={fadeUp}
            className="mt-8 border border-border bg-card p-6 shadow-none"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center border border-destructive/20 bg-destructive/5 text-destructive">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Sign out</h2>
                <p className="text-xs text-muted-foreground">
                  End your session on this device.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOut className="h-4 w-4" />
              {logout.isPending ? "Signing out..." : "Sign out"}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
