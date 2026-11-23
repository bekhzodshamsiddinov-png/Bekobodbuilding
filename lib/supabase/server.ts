import "server-only";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";
import type { Database } from "./types";

/**
 * Per-request client that carries the signed-in user's session (CRM, server
 * actions). RLS sees the user as `authenticated`.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Cookie-less client acting as `anon`. Used for public, cacheable reads
 * (inventory) and for the lead RPC. Never sees a user session.
 */
export function createPublicClient() {
  return createPlainClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
