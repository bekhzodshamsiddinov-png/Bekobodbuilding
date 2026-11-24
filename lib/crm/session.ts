import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "../supabase/env";
import { createClient } from "../supabase/server";
import type { StaffRole } from "../types";

export type Staff = {
  id: string;
  email: string;
  name: string;
  role: StaffRole | null;
  /** No database connected: read-only preview on sample data, nothing is saved. */
  demo: boolean;
};

/** Current staff member, or null when signed out. Cached per request. */
export const getStaff = cache(async (): Promise<Staff | null> => {
  if (!isSupabaseConfigured()) {
    return { id: "demo", email: "demo@local", name: "Demo", role: "owner", demo: true };
  }
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data: profile } = await db.from("profiles").select("full_name, role").eq("id", user.id).single();
  return {
    id: user.id,
    email: user.email ?? "",
    name: profile?.full_name || user.email || "",
    role: profile?.role ?? null,
    demo: false,
  };
});

/** Signed-in staff with a role; otherwise redirects to login / waiting page. */
export async function requireStaff(): Promise<Staff & { role: StaffRole }> {
  const staff = await getStaff();
  if (!staff) redirect("/crm/login");
  if (!staff.role) redirect("/crm/kutish");
  return staff as Staff & { role: StaffRole };
}
