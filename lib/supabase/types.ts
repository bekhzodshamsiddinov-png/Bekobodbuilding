// Database types in the shape `supabase gen types typescript` produces.
// Regenerate once the Supabase project exists:
//   pnpm dlx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
// Until then this hand-written subset covers the tables the app touches.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Row<T> = { Row: T; Insert: Partial<T>; Update: Partial<T>; Relationships: [] };

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13" };
  public: {
    Tables: {
      projects: Row<{
        id: string;
        slug: string;
        name: string;
        city: string;
        address: string;
        status: string;
        hero_media: Json | null;
        usd_rate: number;
        created_at: string;
      }>;
      buildings: Row<{
        id: string;
        project_id: string;
        code: string;
        name: string;
        floors: number;
        entrances: number;
        first_residential_floor: number;
        facade_image: string | null;
        floor_bands: Json | null;
        sort: number;
      }>;
      apartments: Row<{
        id: string;
        building_id: string;
        entrance: number;
        floor: number;
        number: string;
        slug: string;
        rooms: number;
        area_m2: number;
        price_uzs: number;
        price_usd: number;
        status: Database["public"]["Enums"]["apartment_status"];
        orientation: Database["public"]["Enums"]["orientation"];
        has_balcony: boolean;
        plan_2d_url: string | null;
        plan_3d_url: string | null;
        tour_id: string | null;
        finish_options: Json | null;
        updated_at: string;
      }>;
      leads: Row<{
        id: string;
        apartment_id: string | null;
        name: string;
        phone: string;
        source: string;
        utm: Json | null;
        stage: Database["public"]["Enums"]["lead_stage"];
        manager_id: string | null;
        notes: string | null;
        created_at: string;
      }>;
      profiles: Row<{
        id: string;
        full_name: string | null;
        role: Database["public"]["Enums"]["staff_role"] | null;
        created_at: string;
      }>;
    };
    Views: { [_ in never]: never };
    Functions: {
      submit_lead: {
        Args: {
          p_name: string;
          p_phone: string;
          p_apartment_id?: string | null;
          p_source?: string;
          p_utm?: Json | null;
          p_notes?: string | null;
        };
        Returns: string;
      };
      bulk_reprice: {
        Args: { p_building_id: string; p_percent: number; p_only_free?: boolean; p_rooms?: number | null };
        Returns: number;
      };
    };
    Enums: {
      apartment_status: "free" | "reserved" | "sold" | "hidden";
      orientation: "yard" | "street";
      lead_stage: "new" | "contacted" | "meeting" | "reserved" | "contract" | "lost";
      staff_role: "owner" | "sales_head" | "manager" | "accountant" | "lawyer" | "admin";
    };
    CompositeTypes: { [_ in never]: never };
  };
};
