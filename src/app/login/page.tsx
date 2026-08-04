"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createRecoveryClient } from "@/lib/supabase/recovery-client";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "signin" | "reset";

// Reasons `/auth/callback` can bounce a recovery link back here. Anything not
// listed falls back to the raw description Supabase sent.
const CALLBACK_ERRORS: Record<string, string> = {
  otp_expired:
    "That reset link has expired or was already used. Request a new one below.",
  access_denied:
    "That reset link is no longer valid. Request a new one below.",
  missing_code:
    "That reset link was incomplete. Request a new one below.",
  flow_state_not_found:
    "Open the reset link in the same browser you requested it from, or request a new one below.",
  flow_state_expired:
    "That reset link has expired. Request a new one below.",
  bad_code_verifier:
    "Open the reset link in the same browser you requested it from, or request a new one below.",
  validation_failed:
    "Open the reset link in the same browser you requested it from, or request a new one below.",
};

const LoginForm = () => {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");

  const [mode, setMode] = useState<Mode>(callbackError ? "reset" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    callbackError
      ? CALLBACK_ERRORS[callbackError] ??
          searchParams.get("error_description") ??
          "That reset link could not be verified. Request a new one below."
      : null
  );
  const [notice, setNotice] = useState<string | null>(
    searchParams.get("reset") === "success"
      ? "Password updated. Sign in with your new password."
      : null
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSignIn = async () => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleSendResetLink = async () => {
    // Sent on the implicit flow so the link carries its own session and can be
    // opened on any device — see createRecoveryClient.
    const { error: resetError } = await createRecoveryClient().auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      }
    );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setNotice(
      "If an account exists for that address, a reset link is on its way. Open it in this browser."
    );
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    if (mode === "signin") {
      await handleSignIn();
    } else {
      await handleSendResetLink();
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center flex flex-col items-center">
          <img
            src="https://inzxvkqqqaksridaypmt.supabase.co/storage/v1/object/public/logo/evara%20logo.jpeg"
            alt="EVARAA Logo"
            className="h-16 w-16 rounded-xl object-cover mb-3"
          />
          <h1 className="text-3xl font-bold tracking-widest text-foreground">
            EVARAA
          </h1>
          <p className="mt-1 text-xs tracking-wider text-muted-foreground uppercase">
            {mode === "signin"
              ? "Stay • Retreat • Serenity"
              : "Reset your password"}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-lg border border-border bg-card p-5 sm:p-8 shadow-sm"
        >
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="you@example.com"
                aria-label="Email address"
              />
            </div>

            {mode === "signin" && (
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="••••••••"
                  aria-label="Password"
                />
              </div>
            )}
          </div>

          {error && (
            <div
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              className="rounded-md bg-success/10 p-3 text-sm text-success"
              role="status"
            >
              {notice}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? mode === "signin"
                ? "Signing in..."
                : "Sending..."
              : mode === "signin"
              ? "Sign in"
              : "Send reset link"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => switchMode(mode === "signin" ? "reset" : "signin")}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {mode === "signin" ? "Forgot password?" : "Back to sign in"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

// `useSearchParams` needs a Suspense boundary so the shell can still prerender.
const LoginPage = () => (
  <Suspense>
    <LoginForm />
  </Suspense>
);

export default LoginPage;
