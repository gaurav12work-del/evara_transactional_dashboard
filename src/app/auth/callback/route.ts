import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const safeNext = (raw: string | null) =>
  raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")
    ? raw
    : "/dashboard";

export const GET = async (request: Request) => {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));

  const failure = (reason: string, detail?: string | null) => {
    const url = new URL("/login", origin);
    url.searchParams.set("error", reason);
    if (detail) url.searchParams.set("error_description", detail);
    return NextResponse.redirect(url.toString());
  };

  // A dead link (expired, already used, or consumed by a mail security scanner)
  // comes back with error params instead of a code.
  const errorCode = searchParams.get("error_code") ?? searchParams.get("error");
  if (errorCode) {
    return failure(errorCode, searchParams.get("error_description"));
  }

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!code && !tokenHash) {
    return failure("missing_code");
  }

  const supabase = await createClient();

  // `?code=` is the PKCE shape, produced by `{{ .ConfirmationURL }}` links.
  // `?token_hash=&type=` is the shape produced by `{{ .TokenHash }}` links,
  // which verify without a browser-local code verifier and so survive being
  // opened on a different device to the one that requested the reset.
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ type: type ?? "recovery", token_hash: tokenHash! });

  if (error) {
    return failure(error.code ?? "auth_failed", error.message);
  }

  return NextResponse.redirect(new URL(next, origin).toString());
};
