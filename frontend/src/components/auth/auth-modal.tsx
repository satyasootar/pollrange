import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { ForgotPasswordForm } from "./forgot-password-form";
import { GoogleAuthButton } from "./google-auth-button";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

export function AuthModal({
  isOpen,
  onClose,
  defaultTab = "login",
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot-password">(
    defaultTab
  );

  const handleSuccess = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] p-6 gap-6">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-2xl font-bold tracking-tight text-center">
            {activeTab === "forgot-password"
              ? "Reset Password"
              : activeTab === "login"
              ? "Welcome back"
              : "Create an account"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {activeTab === "forgot-password"
              ? "We'll help you get back into your account"
              : "Enter your details below to continue"}
          </DialogDescription>
        </DialogHeader>

        {activeTab !== "forgot-password" && (
          <>
            <GoogleAuthButton />
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>
          </>
        )}

        {activeTab === "forgot-password" ? (
          <ForgotPasswordForm onBack={() => setActiveTab("login")} />
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "login" | "register")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm
                onSuccess={handleSuccess}
                onForgotPassword={() => setActiveTab("forgot-password")}
              />
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm onSuccess={handleSuccess} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
