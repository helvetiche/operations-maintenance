"use client";

import { useState, FormEvent } from "react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Alert } from "../ui/Alert";
import { usePasswordlessLogin } from "@/hooks/usePasswordlessLogin";
import { useEmailPasswordLogin } from "@/hooks/useEmailPasswordLogin";

type AuthMode = "password" | "passwordless";

export const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("password");
  
  const { sendLink, loading: passwordlessLoading, error: passwordlessError, success: passwordlessSuccess, reset: resetPasswordless } = usePasswordlessLogin();
  const { signIn, loading: passwordLoading, error: passwordError, reset: resetPassword } = useEmailPasswordLogin();

  const loading = passwordlessLoading || passwordLoading;
  const error = authMode === "password" ? passwordError : passwordlessError;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (authMode === "password") {
      await signIn(email, password);
    } else {
      await sendLink(email);
    }
  };

  // Clear error when user types
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) {
      resetPasswordless();
      resetPassword();
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) {
      resetPassword();
    }
  };

  const handleModeSwitch = (mode: AuthMode) => {
    setAuthMode(mode);
    resetPasswordless();
    resetPassword();
    setPassword("");
  };

  if (passwordlessSuccess) {
    return (
      <div className="space-y-4">
        <Alert type="success" title="Check your email">
          <p>
            We&apos;ve sent a sign-in link to your email address. Click the link in the email to sign in.
          </p>
        </Alert>
        <Button
          type="button"
          variant="secondary"
          fullWidth
          onClick={() => {
            resetPasswordless();
            setAuthMode("password");
          }}
        >
          Back to Login
        </Button>
      </div>
    );
  }

  const isFormValid = authMode === "password" 
    ? email.trim() && password.trim()
    : email.trim();

  return (
    <div className="space-y-6">
      {/* Auth Mode Tabs */}
      <div className="flex bg-gray-50 rounded-lg p-1">
        <button
          type="button"
          onClick={() => handleModeSwitch("password")}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            authMode === "password"
              ? "bg-white text-emerald-900 shadow-sm"
              : "text-gray-600 hover:text-emerald-800"
          }`}
        >
          Email & Password
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch("passwordless")}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            authMode === "passwordless"
              ? "bg-white text-emerald-900 shadow-sm"
              : "text-gray-600 hover:text-emerald-800"
          }`}
        >
          Email Link
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}

        <Input
          type="email"
          label="Email Address"
          placeholder="your.email@example.com"
          value={email}
          onChange={handleEmailChange}
          disabled={loading}
          required
        />

        {authMode === "password" && (
          <Input
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={handlePasswordChange}
            disabled={loading}
            required
          />
        )}

        <Button 
          className="bg-emerald-900 hover:bg-emerald-800 focus:ring-emerald-900/20" 
          type="submit" 
          fullWidth 
          disabled={loading || !isFormValid}
        >
          {loading 
            ? (authMode === "password" ? "Signing in..." : "Sending...")
            : (authMode === "password" ? "Sign In" : "Send Sign-In Link")
          }
        </Button>

        <p className="mt-6 text-center text-xs font-regular text-emerald-800/60 dark:text-zinc-400">
          {authMode === "password" 
            ? "Enter your email and password to sign in"
            : "We'll send you a secure link to sign in without a password"
          }
        </p>
      </form>
    </div>
  );
};
