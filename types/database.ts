// Generated from the migrated schema (supabase/migrations). Regenerate after schema changes:
//   npm run db:types   (writes types/database.generated.ts; diff and replace this file)
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      admin_roles: {
        Row: {
          id: string;
          user_id: string;
          role: Database["public"]["Enums"]["admin_role"];
          granted_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: Database["public"]["Enums"]["admin_role"];
          granted_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: Database["public"]["Enums"]["admin_role"];
          granted_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      app_settings: {
        Row: {
          key: string;
          value: Json;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          member_id: string;
          service_id: string;
          attendance_session_id: string | null;
          mode: Database["public"]["Enums"]["attendance_mode"];
          method: Database["public"]["Enums"]["attendance_method"];
          checked_in_at: string;
          recorded_by: string | null;
          note: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          service_id: string;
          attendance_session_id?: string | null;
          mode?: Database["public"]["Enums"]["attendance_mode"];
          method?: Database["public"]["Enums"]["attendance_method"];
          checked_in_at?: string;
          recorded_by?: string | null;
          note?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          service_id?: string;
          attendance_session_id?: string | null;
          mode?: Database["public"]["Enums"]["attendance_mode"];
          method?: Database["public"]["Enums"]["attendance_method"];
          checked_in_at?: string;
          recorded_by?: string | null;
          note?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_attendance_session_id_fkey";
            columns: ["attendance_session_id"];
            isOneToOne: false;
            referencedRelation: "attendance_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      attendance_sessions: {
        Row: {
          id: string;
          service_id: string;
          label: string;
          qr_token_hash: string;
          qr_token_nonce: string;
          online_token_hash: string | null;
          online_token_nonce: string | null;
          starts_at: string;
          ends_at: string;
          is_enabled: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          service_id: string;
          label?: string;
          qr_token_hash: string;
          qr_token_nonce: string;
          online_token_hash?: string | null;
          online_token_nonce?: string | null;
          starts_at: string;
          ends_at: string;
          is_enabled?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          service_id?: string;
          label?: string;
          qr_token_hash?: string;
          qr_token_nonce?: string;
          online_token_hash?: string | null;
          online_token_nonce?: string | null;
          starts_at?: string;
          ends_at?: string;
          is_enabled?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          summary: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          summary?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          summary?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      content_posts: {
        Row: {
          id: string;
          content_type: string;
          title: string;
          slug: string | null;
          summary: string | null;
          body: string | null;
          key_takeaways: string[];
          cover_image_path: string | null;
          media_paths: string[];
          speaker_name: string | null;
          scripture_reference: string | null;
          event_starts_at: string | null;
          event_ends_at: string | null;
          event_location: string | null;
          status: Database["public"]["Enums"]["content_status"];
          is_featured: boolean;
          display_order: number;
          people_consent_confirmed: boolean;
          published_at: string | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          content_type: string;
          title: string;
          slug?: string | null;
          summary?: string | null;
          body?: string | null;
          key_takeaways?: string[];
          cover_image_path?: string | null;
          media_paths?: string[];
          speaker_name?: string | null;
          scripture_reference?: string | null;
          event_starts_at?: string | null;
          event_ends_at?: string | null;
          event_location?: string | null;
          status?: Database["public"]["Enums"]["content_status"];
          is_featured?: boolean;
          display_order?: number;
          people_consent_confirmed?: boolean;
          published_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          content_type?: string;
          title?: string;
          slug?: string | null;
          summary?: string | null;
          body?: string | null;
          key_takeaways?: string[];
          cover_image_path?: string | null;
          media_paths?: string[];
          speaker_name?: string | null;
          scripture_reference?: string | null;
          event_starts_at?: string | null;
          event_ends_at?: string | null;
          event_location?: string | null;
          status?: Database["public"]["Enums"]["content_status"];
          is_featured?: boolean;
          display_order?: number;
          people_consent_confirmed?: boolean;
          published_at?: string | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      follow_ups: {
        Row: {
          id: string;
          member_id: string;
          subject: string;
          details: string | null;
          status: string;
          priority: string;
          due_at: string | null;
          assigned_to: string | null;
          created_by: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          subject: string;
          details?: string | null;
          status?: string;
          priority?: string;
          due_at?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          subject?: string;
          details?: string | null;
          status?: string;
          priority?: string;
          due_at?: string | null;
          assigned_to?: string | null;
          created_by?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_ups_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_contact_logs: {
        Row: {
          id: string;
          member_id: string;
          follow_up_id: string | null;
          channel: string;
          subject: string | null;
          message_summary: string | null;
          outcome: string | null;
          next_step: string | null;
          contacted_by: string | null;
          contacted_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          follow_up_id?: string | null;
          channel: string;
          subject?: string | null;
          message_summary?: string | null;
          outcome?: string | null;
          next_step?: string | null;
          contacted_by?: string | null;
          contacted_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          follow_up_id?: string | null;
          channel?: string;
          subject?: string | null;
          message_summary?: string | null;
          outcome?: string | null;
          next_step?: string | null;
          contacted_by?: string | null;
          contacted_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_contact_logs_follow_up_id_fkey";
            columns: ["follow_up_id"];
            isOneToOne: false;
            referencedRelation: "follow_ups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_contact_logs_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_private: {
        Row: {
          member_id: string;
          residential_address: string | null;
          date_of_birth: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          updated_at: string;
        };
        Insert: {
          member_id: string;
          residential_address?: string | null;
          date_of_birth?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          updated_at?: string;
        };
        Update: {
          member_id?: string;
          residential_address?: string | null;
          date_of_birth?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_private_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: true;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_recognitions: {
        Row: {
          id: string;
          member_id: string | null;
          display_name: string;
          recognition_title: string;
          description: string | null;
          image_path: string | null;
          service_id: string | null;
          display_date: string;
          display_order: number;
          status: Database["public"]["Enums"]["content_status"];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id?: string | null;
          display_name: string;
          recognition_title: string;
          description?: string | null;
          image_path?: string | null;
          service_id?: string | null;
          display_date?: string;
          display_order?: number;
          status?: Database["public"]["Enums"]["content_status"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string | null;
          display_name?: string;
          recognition_title?: string;
          description?: string | null;
          image_path?: string | null;
          service_id?: string | null;
          display_date?: string;
          display_order?: number;
          status?: Database["public"]["Enums"]["content_status"];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "member_recognitions_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_recognitions_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      members: {
        Row: {
          id: string;
          auth_user_id: string | null;
          member_number: string | null;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          preferred_name: string | null;
          email: string | null;
          phone: string | null;
          whatsapp_number: string | null;
          profile_photo_path: string | null;
          gender: string | null;
          marital_status: string | null;
          city: string | null;
          state: string | null;
          is_student: boolean;
          school_name: string | null;
          course_or_department: string | null;
          education_level: string | null;
          graduation_year: number | null;
          occupation: string | null;
          company_or_business: string | null;
          date_joined_church: string | null;
          church_department: string | null;
          ministry_unit: string | null;
          usual_service: string | null;
          previous_church: string | null;
          is_baptized: boolean | null;
          interested_in_serving: boolean | null;
          heard_about_church: string | null;
          membership_status: Database["public"]["Enums"]["member_status"];
          is_first_timer: boolean;
          registration_assisted: boolean;
          registration_assisted_by: string | null;
          consent_to_contact: boolean;
          consent_recorded_at: string | null;
          photo_consent: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          member_number?: string | null;
          first_name: string;
          middle_name?: string | null;
          last_name: string;
          preferred_name?: string | null;
          email?: string | null;
          phone?: string | null;
          whatsapp_number?: string | null;
          profile_photo_path?: string | null;
          gender?: string | null;
          marital_status?: string | null;
          city?: string | null;
          state?: string | null;
          is_student?: boolean;
          school_name?: string | null;
          course_or_department?: string | null;
          education_level?: string | null;
          graduation_year?: number | null;
          occupation?: string | null;
          company_or_business?: string | null;
          date_joined_church?: string | null;
          church_department?: string | null;
          ministry_unit?: string | null;
          usual_service?: string | null;
          previous_church?: string | null;
          is_baptized?: boolean | null;
          interested_in_serving?: boolean | null;
          heard_about_church?: string | null;
          membership_status?: Database["public"]["Enums"]["member_status"];
          is_first_timer?: boolean;
          registration_assisted?: boolean;
          registration_assisted_by?: string | null;
          consent_to_contact?: boolean;
          consent_recorded_at?: string | null;
          photo_consent?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          member_number?: string | null;
          first_name?: string;
          middle_name?: string | null;
          last_name?: string;
          preferred_name?: string | null;
          email?: string | null;
          phone?: string | null;
          whatsapp_number?: string | null;
          profile_photo_path?: string | null;
          gender?: string | null;
          marital_status?: string | null;
          city?: string | null;
          state?: string | null;
          is_student?: boolean;
          school_name?: string | null;
          course_or_department?: string | null;
          education_level?: string | null;
          graduation_year?: number | null;
          occupation?: string | null;
          company_or_business?: string | null;
          date_joined_church?: string | null;
          church_department?: string | null;
          ministry_unit?: string | null;
          usual_service?: string | null;
          previous_church?: string | null;
          is_baptized?: boolean | null;
          interested_in_serving?: boolean | null;
          heard_about_church?: string | null;
          membership_status?: Database["public"]["Enums"]["member_status"];
          is_first_timer?: boolean;
          registration_assisted?: boolean;
          registration_assisted_by?: string | null;
          consent_to_contact?: boolean;
          consent_recorded_at?: string | null;
          photo_consent?: boolean;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      recovery_codes: {
        Row: {
          id: string;
          member_id: string;
          code_hash: string;
          created_by: string | null;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          code_hash: string;
          created_by?: string | null;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          code_hash?: string;
          created_by?: string | null;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recovery_codes_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          service_type: string;
          starts_at: string;
          ends_at: string;
          location: string | null;
          status: Database["public"]["Enums"]["service_status"];
          allow_physical_attendance: boolean;
          allow_online_attendance: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          service_type?: string;
          starts_at: string;
          ends_at: string;
          location?: string | null;
          status?: Database["public"]["Enums"]["service_status"];
          allow_physical_attendance?: boolean;
          allow_online_attendance?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          service_type?: string;
          starts_at?: string;
          ends_at?: string;
          location?: string | null;
          status?: Database["public"]["Enums"]["service_status"];
          allow_physical_attendance?: boolean;
          allow_online_attendance?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      admin_role_assignments: {
        Row: {
          id: string | null;
          user_id: string | null;
          role: Database["public"]["Enums"]["admin_role"] | null;
          granted_by: string | null;
          created_at: string | null;
          member_id: string | null;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          member_number: string | null;
        };
        Relationships: [];
      };
      attendance_report: {
        Row: {
          id: string | null;
          member_id: string | null;
          service_id: string | null;
          attendance_session_id: string | null;
          mode: Database["public"]["Enums"]["attendance_mode"] | null;
          method: Database["public"]["Enums"]["attendance_method"] | null;
          checked_in_at: string | null;
          note: string | null;
          recorded_by: string | null;
          updated_at: string | null;
          member_number: string | null;
          first_name: string | null;
          last_name: string | null;
          preferred_name: string | null;
          phone: string | null;
          gender: string | null;
          membership_status: Database["public"]["Enums"]["member_status"] | null;
          church_department: string | null;
          ministry_unit: string | null;
          service_title: string | null;
          service_type: string | null;
          service_starts_at: string | null;
          is_first_attendance: boolean | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      admin_archive_member: {
        Args: {
          p_member_id: string;
          p_archive?: boolean;
        };
        Returns: undefined;
      };
      admin_create_recovery_code: {
        Args: {
          p_member_id: string;
          p_code_hash: string;
          p_valid_minutes?: number;
        };
        Returns: string;
      };
      admin_dashboard_stats: {
        Args: {
          p_tz?: string;
        };
        Returns: Json;
      };
      admin_erase_member: {
        Args: {
          p_member_id: string;
          p_confirm: string;
        };
        Returns: string;
      };
      admin_member_picker: {
        Args: {
          p_query: string;
          p_limit?: number;
        };
        Returns: {
          id: string | null;
          display_name: string | null;
          member_number: string | null;
          photo_consent: boolean | null;
          has_account: boolean | null;
          phone_last4: string | null;
        }[];
      };
      admin_record_attendance: {
        Args: {
          p_member_id: string;
          p_service_id: string;
          p_mode: Database["public"]["Enums"]["attendance_mode"];
          p_method: Database["public"]["Enums"]["attendance_method"];
          p_reason: string;
          p_checked_in_at?: string;
        };
        Returns: Json;
      };
      admin_remove_attendance: {
        Args: {
          p_attendance_id: string;
          p_reason: string;
        };
        Returns: undefined;
      };
      admin_revoke_member_sessions: {
        Args: {
          p_member_id: string;
        };
        Returns: number;
      };
      admin_save_member: {
        Args: {
          p_member_id: string | null;
          p_profile?: Json;
          p_private?: Json;
          p_admin?: Json;
        };
        Returns: string;
      };
      admin_update_attendance: {
        Args: {
          p_attendance_id: string;
          p_mode: Database["public"]["Enums"]["attendance_mode"];
          p_checked_in_at: string | null;
          p_reason: string;
        };
        Returns: undefined;
      };
      check_in: {
        Args: {
          p_token: string;
        };
        Returns: Json;
      };
      followup_candidates: {
        Args: {
          p_days?: number;
          p_limit?: number;
        };
        Returns: {
          member_id: string | null;
          display_name: string | null;
          phone: string | null;
          whatsapp_number: string | null;
          membership_status: Database["public"]["Enums"]["member_status"] | null;
          reason: string | null;
          first_attended_at: string | null;
          last_attended_at: string | null;
          attendance_count: number | null;
          last_contacted_at: string | null;
          consent_to_contact: boolean | null;
        }[];
      };
      link_member_auth_user: {
        Args: {
          p_member_id: string;
          p_auth_user_id: string;
        };
        Returns: undefined;
      };
      member_filter_options: {
        Args: never;
        Returns: Json;
      };
      redeem_recovery_code: {
        Args: {
          p_code_hash: string;
        };
        Returns: Json;
      };
      register_self: {
        Args: {
          p_profile: Json;
          p_private?: Json;
        };
        Returns: Json;
      };
      set_my_profile_photo: {
        Args: {
          p_path: string | null;
        };
        Returns: undefined;
      };
      staff_directory: {
        Args: never;
        Returns: {
          user_id: string | null;
          display_name: string | null;
          roles: Database["public"]["Enums"]["admin_role"][] | null;
        }[];
      };
      update_my_profile: {
        Args: {
          p_profile?: Json;
          p_private?: Json;
        };
        Returns: undefined;
      };
    };
    Enums: {
      admin_role: "super_admin" | "attendance_admin" | "content_admin" | "pastoral_admin";
      attendance_method: "qr" | "online" | "manual" | "admin_assisted";
      attendance_mode: "physical" | "online";
      content_status: "draft" | "published" | "archived";
      member_status: "first_timer" | "visitor" | "regular_attendee" | "member" | "inactive";
      service_status: "draft" | "scheduled" | "active" | "closed" | "cancelled";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
