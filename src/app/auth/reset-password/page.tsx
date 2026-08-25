"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createRecoveryClient } from "@/lib/supabase/recovery-client";
import PasswordInput from "@/components/password-input";

const MIN_PASSWORD_LENGTH = 8;

const ResetPasswordPage = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createRecoveryClient(), []);

  // The implicit flow returns the outcome in the URL fragment, which never
  // reaches the server — a session on success, an error on a dead link. The
  // client picks the session up as it initialises; wait for that before showing
  // the form so a spent link says so up front rather than after the user has
  // typed a new password.
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (fragment.get("error") || fragment.get("error_code")) {
      setExpired(true);
      setChecking(false);
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setChecking(false);
      } else if (event === "INITIAL_SESSION") {
        setExpired(true);
        setChecking(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExpired(false);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      // No session means the recovery token was never verified — the session
      // expired while the form sat open, or the link was already used.
      if (updateError.message.toLowerCase().includes("session")) {
        setExpired(true);
      } else {
        setError(updateError.message);
      }
      setLoading(false);
      return;
    }

    // The recovery session is intentionally never written to cookies, so the
    // app itself is still signed out — send the user through a normal sign in.
    await supabase.auth.signOut();
    router.push("/login?reset=success");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center flex flex-col items-center">
          <h1 className="text-3xl font-bold tracking-widest text-foreground">
            EVARAA
          </h1>
          <p className="mt-1 text-xs tracking-wider text-muted-foreground uppercase">
            Choose a new password
          </p>
        </div>

        {checking ? (
          <div className="mt-8 rounded-lg border border-border bg-card p-5 sm:p-8 shadow-sm text-center text-sm text-muted-foreground">
            Verifying your reset link...
          </div>
        ) : expired ? (
          <div className="mt-8 space-y-4 rounded-lg border border-border bg-card p-5 sm:p-8 shadow-sm">
            <div
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              This reset link has expired or was already used.
            </div>
            <Link
              href="/login"
              className="block w-full rounded-md bg-primary px-4 py-2.5 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-6 rounded-lg border border-border bg-card p-5 sm:p-8 shadow-sm"
          >
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground"
                >
                  New password
                </label>
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  aria-label="New password"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  At least {MIN_PASSWORD_LENGTH} characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-foreground"
                >
                  Confirm new password
                </label>
                <PasswordInput
                  id="confirm-password"
                  name="confirm-password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  aria-label="Confirm new password"
                />
              </div>
            </div>

            {error && (
              <div
                className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
};

export default ResetPasswordPage;
