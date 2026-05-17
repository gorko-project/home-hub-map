export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      building_photos: {
        Row: {
          building_id: string
          created_at: string
          display_order: number
          id: string
          is_primary: boolean
          url: string
        }
        Insert: {
          building_id: string
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          url: string
        }
        Update: {
          building_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_photos_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      building_reviews: {
        Row: {
          building_condition: number | null
          building_id: string
          comment: string | null
          created_at: string
          id: string
          location: number | null
          management: number | null
          overall: number
          quietness: number | null
          tenancy_period: string | null
          updated_at: string
          user_id: string
          value_for_money: number | null
        }
        Insert: {
          building_condition?: number | null
          building_id: string
          comment?: string | null
          created_at?: string
          id?: string
          location?: number | null
          management?: number | null
          overall: number
          quietness?: number | null
          tenancy_period?: string | null
          updated_at?: string
          user_id: string
          value_for_money?: number | null
        }
        Update: {
          building_condition?: number | null
          building_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          location?: number | null
          management?: number | null
          overall?: number
          quietness?: number | null
          tenancy_period?: string | null
          updated_at?: string
          user_id?: string
          value_for_money?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "building_reviews_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      building_scores: {
        Row: {
          building_id: string
          condition: number | null
          condition_rationale: string | null
          created_at: string
          id: string
          location: number | null
          location_rationale: string | null
          management: number | null
          management_rationale: string | null
          noise: number | null
          noise_rationale: string | null
          value: number | null
          value_rationale: string | null
        }
        Insert: {
          building_id: string
          condition?: number | null
          condition_rationale?: string | null
          created_at?: string
          id?: string
          location?: number | null
          location_rationale?: string | null
          management?: number | null
          management_rationale?: string | null
          noise?: number | null
          noise_rationale?: string | null
          value?: number | null
          value_rationale?: string | null
        }
        Update: {
          building_id?: string
          condition?: number | null
          condition_rationale?: string | null
          created_at?: string
          id?: string
          location?: number | null
          location_rationale?: string | null
          management?: number | null
          management_rationale?: string | null
          noise?: number | null
          noise_rationale?: string | null
          value?: number | null
          value_rationale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "building_scores_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          address: string | null
          admin_notes: string | null
          bike_score: number | null
          building_amenities: string | null
          cats_allowed: boolean | null
          composite_score: number | null
          created_at: string
          dogs_allowed: boolean | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          neighborhood: string | null
          pet_notes: string | null
          photo_url: string | null
          slug: string
          status: string
          summary_cons: string | null
          summary_pros: string | null
          transit_score: number | null
          unit_features: string | null
          walk_score: number | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          bike_score?: number | null
          building_amenities?: string | null
          cats_allowed?: boolean | null
          composite_score?: number | null
          created_at?: string
          dogs_allowed?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          neighborhood?: string | null
          pet_notes?: string | null
          photo_url?: string | null
          slug: string
          status?: string
          summary_cons?: string | null
          summary_pros?: string | null
          transit_score?: number | null
          unit_features?: string | null
          walk_score?: number | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          bike_score?: number | null
          building_amenities?: string | null
          cats_allowed?: boolean | null
          composite_score?: number | null
          created_at?: string
          dogs_allowed?: boolean | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          neighborhood?: string | null
          pet_notes?: string | null
          photo_url?: string | null
          slug?: string
          status?: string
          summary_cons?: string | null
          summary_pros?: string | null
          transit_score?: number | null
          unit_features?: string | null
          walk_score?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
