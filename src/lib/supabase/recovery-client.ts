import { createClient } from "@supabase/supabase-js";

/**
 * Client used only for the password-recovery round trip.
 *
 * `@supabase/ssr`'s browser client hardcodes `flowType: "pkce"`, which ties the
 * reset link to a code verifier held in the browser that asked for the reset.
 * A link tapped in a phone's mail app opens in a different browser, so that
 * verifier is never present and the link cannot be redeemed. The implicit flow
 * returns the session in the URL fragment instead, so the link works wherever
 * it is opened.
 *
 * The session is deliberately not persisted: it lives just long enough to set
 * the new password, after which the user signs in through the normal client.
 */
export const createRecoveryClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
