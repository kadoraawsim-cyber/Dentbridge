export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_role: string | null
          actor_type: string
          actor_user_id: string | null
          api_version: string | null
          category: string
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          event_version: number
          id: string
          ip_address: string | null
          metadata_json: Json
          metadata_schema: string
          request_id: string | null
          severity: string
          source_service: string
          success: boolean
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_role?: string | null
          actor_type?: string
          actor_user_id?: string | null
          api_version?: string | null
          category?: string
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          event_version?: number
          id?: string
          ip_address?: string | null
          metadata_json?: Json
          metadata_schema?: string
          request_id?: string | null
          severity?: string
          source_service?: string
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_role?: string | null
          actor_type?: string
          actor_user_id?: string | null
          api_version?: string | null
          category?: string
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          event_version?: number
          id?: string
          ip_address?: string | null
          metadata_json?: Json
          metadata_schema?: string
          request_id?: string | null
          severity?: string
          source_service?: string
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      case_progress_entries: {
        Row: {
          appointment_date: string | null
          appointment_time: string | null
          case_id: string
          created_at: string
          department_at_time: string | null
          id: string
          needs_faculty_attention: boolean
          next_appointment_date: string | null
          next_appointment_time: string | null
          next_step: string | null
          note: string | null
          stage_id: string | null
          status_at_time: string
          student_id: string
          student_name: string | null
          what_was_done: string | null
        }
        Insert: {
          appointment_date?: string | null
          appointment_time?: string | null
          case_id: string
          created_at?: string
          department_at_time?: string | null
          id?: string
          needs_faculty_attention?: boolean
          next_appointment_date?: string | null
          next_appointment_time?: string | null
          next_step?: string | null
          note?: string | null
          stage_id?: string | null
          status_at_time: string
          student_id: string
          student_name?: string | null
          what_was_done?: string | null
        }
        Update: {
          appointment_date?: string | null
          appointment_time?: string | null
          case_id?: string
          created_at?: string
          department_at_time?: string | null
          id?: string
          needs_faculty_attention?: boolean
          next_appointment_date?: string | null
          next_appointment_time?: string | null
          next_step?: string | null
          note?: string | null
          stage_id?: string | null
          status_at_time?: string
          student_id?: string
          student_name?: string | null
          what_was_done?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_progress_entries_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "patient_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_progress_entries_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "case_routing_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      case_routing_stages: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          cancelled_at: string | null
          case_id: string
          completed_at: string | null
          created_at: string
          department: string
          faculty_notes: string | null
          id: string
          released_at: string | null
          released_by: string | null
          sequence: number
          stage_reviewed_at: string | null
          stage_reviewed_by: string | null
          stage_submitted_at: string | null
          stage_submitted_by: string | null
          status: string
          student_email: string | null
          student_id: string | null
          student_request_id: string | null
          target_student_level: string | null
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          cancelled_at?: string | null
          case_id: string
          completed_at?: string | null
          created_at?: string
          department: string
          faculty_notes?: string | null
          id?: string
          released_at?: string | null
          released_by?: string | null
          sequence: number
          stage_reviewed_at?: string | null
          stage_reviewed_by?: string | null
          stage_submitted_at?: string | null
          stage_submitted_by?: string | null
          status?: string
          student_email?: string | null
          student_id?: string | null
          student_request_id?: string | null
          target_student_level?: string | null
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          cancelled_at?: string | null
          case_id?: string
          completed_at?: string | null
          created_at?: string
          department?: string
          faculty_notes?: string | null
          id?: string
          released_at?: string | null
          released_by?: string | null
          sequence?: number
          stage_reviewed_at?: string | null
          stage_reviewed_by?: string | null
          stage_submitted_at?: string | null
          stage_submitted_by?: string | null
          status?: string
          student_email?: string | null
          student_id?: string | null
          student_request_id?: string | null
          target_student_level?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_routing_stages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "patient_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      case_decision_history: {
        Row: {
          id: string
          case_id: string
          stage_id: string | null
          request_id: string | null
          actor_user_id: string
          actor_role: string
          action: string
          from_state: string | null
          to_state: string | null
          reason_category: string
          reason_summary: string
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          stage_id?: string | null
          request_id?: string | null
          actor_user_id: string
          actor_role: string
          action: string
          from_state?: string | null
          to_state?: string | null
          reason_category: string
          reason_summary: string
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          stage_id?: string | null
          request_id?: string | null
          actor_user_id?: string
          actor_role?: string
          action?: string
          from_state?: string | null
          to_state?: string | null
          reason_category?: string
          reason_summary?: string
          created_at?: string
        }
        Relationships: []
      }
      consent_records: {
        Row: {
          accepted_at: string
          canonical_route: string | null
          consent_status: string
          consent_type: string
          consent_version: string
          country_code: string | null
          created_at: string
          document_fingerprint: string | null
          document_title: string | null
          id: string
          ip_address: string | null
          jurisdiction: string | null
          language: string | null
          patient_request_id: string
          policy_version: string | null
          source: string
          university_key: string | null
          user_agent: string | null
          withdrawn_at: string | null
        }
        Insert: {
          accepted_at?: string
          canonical_route?: string | null
          consent_status?: string
          consent_type: string
          consent_version: string
          country_code?: string | null
          created_at?: string
          document_fingerprint?: string | null
          document_title?: string | null
          id?: string
          ip_address?: string | null
          jurisdiction?: string | null
          language?: string | null
          patient_request_id: string
          policy_version?: string | null
          source?: string
          university_key?: string | null
          user_agent?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          accepted_at?: string
          canonical_route?: string | null
          consent_status?: string
          consent_type?: string
          consent_version?: string
          country_code?: string | null
          created_at?: string
          document_fingerprint?: string | null
          document_title?: string | null
          id?: string
          ip_address?: string | null
          jurisdiction?: string | null
          language?: string | null
          patient_request_id?: string
          policy_version?: string | null
          source?: string
          university_key?: string | null
          user_agent?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_patient_request_id_fkey"
            columns: ["patient_request_id"]
            isOneToOne: false
            referencedRelation: "patient_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          phone: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          full_name?: string
          id: string
          phone?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          max_attempts: number
          phone: string
          purpose: string
          request_ip: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          max_attempts?: number
          phone: string
          purpose?: string
          request_ip?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          max_attempts?: number
          phone?: string
          purpose?: string
          request_ip?: string | null
        }
        Relationships: []
      }
      patient_files: {
        Row: {
          bucket: string
          cleanup_attempts: number
          cleanup_claimed_at: string | null
          cleanup_last_error_at: string | null
          checksum_sha256: string | null
          confirmed_at: string | null
          created_at: string
          declared_mime: string
          detected_mime: string | null
          expires_at: string | null
          extension: string
          id: string
          ip_address: string | null
          object_path: string
          original_filename: string
          patient_request_id: string | null
          scan_provider: string | null
          scan_state: string | null
          scanned_at: string | null
          size_bytes: number | null
          status: string
          upload_session_id: string | null
          uploaded_by_actor: string | null
        }
        Insert: {
          bucket?: string
          cleanup_attempts?: number
          cleanup_claimed_at?: string | null
          cleanup_last_error_at?: string | null
          checksum_sha256?: string | null
          confirmed_at?: string | null
          created_at?: string
          declared_mime: string
          detected_mime?: string | null
          expires_at?: string | null
          extension: string
          id?: string
          ip_address?: string | null
          object_path: string
          original_filename: string
          patient_request_id?: string | null
          scan_provider?: string | null
          scan_state?: string | null
          scanned_at?: string | null
          size_bytes?: number | null
          status?: string
          upload_session_id?: string | null
          uploaded_by_actor?: string | null
        }
        Update: {
          bucket?: string
          cleanup_attempts?: number
          cleanup_claimed_at?: string | null
          cleanup_last_error_at?: string | null
          checksum_sha256?: string | null
          confirmed_at?: string | null
          created_at?: string
          declared_mime?: string
          detected_mime?: string | null
          expires_at?: string | null
          extension?: string
          id?: string
          ip_address?: string | null
          object_path?: string
          original_filename?: string
          patient_request_id?: string | null
          scan_provider?: string | null
          scan_state?: string | null
          scanned_at?: string | null
          size_bytes?: number | null
          status?: string
          upload_session_id?: string | null
          uploaded_by_actor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_files_patient_request_id_fkey"
            columns: ["patient_request_id"]
            isOneToOne: false
            referencedRelation: "patient_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_requests: {
        Row: {
          age: number | null
          assigned_department: string | null
          attachment_name: string | null
          attachment_path: string | null
          best_contact_time: string | null
          clinical_notes: string | null
          complaint_text: string
          consent: boolean | null
          consent_accepted_at: string | null
          consent_version: string | null
          contact_method: string | null
          country: string | null
          country_code: string | null
          created_at: string | null
          current_stage_id: string | null
          full_name: string
          gender: string | null
          id: string
          medical_condition: string | null
          pain_score: number | null
          phone: string
          preferred_days: string | null
          preferred_language: string | null
          preferred_university: string | null
          prior_treatment: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          routing_completed_at: string | null
          status: string | null
          submission_id: string | null
          symptom_duration: string | null
          target_student_level: string | null
          treatment_type: string
          urgency: string
        }
        Insert: {
          age?: number | null
          assigned_department?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          best_contact_time?: string | null
          clinical_notes?: string | null
          complaint_text: string
          consent?: boolean | null
          consent_accepted_at?: string | null
          consent_version?: string | null
          contact_method?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          current_stage_id?: string | null
          full_name: string
          gender?: string | null
          id?: string
          medical_condition?: string | null
          pain_score?: number | null
          phone: string
          preferred_days?: string | null
          preferred_language?: string | null
          preferred_university?: string | null
          prior_treatment?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          routing_completed_at?: string | null
          status?: string | null
          submission_id?: string | null
          symptom_duration?: string | null
          target_student_level?: string | null
          treatment_type: string
          urgency: string
        }
        Update: {
          age?: number | null
          assigned_department?: string | null
          attachment_name?: string | null
          attachment_path?: string | null
          best_contact_time?: string | null
          clinical_notes?: string | null
          complaint_text?: string
          consent?: boolean | null
          consent_accepted_at?: string | null
          consent_version?: string | null
          contact_method?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          current_stage_id?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          medical_condition?: string | null
          pain_score?: number | null
          phone?: string
          preferred_days?: string | null
          preferred_language?: string | null
          preferred_university?: string | null
          prior_treatment?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          routing_completed_at?: string | null
          status?: string | null
          submission_id?: string | null
          symptom_duration?: string | null
          target_student_level?: string | null
          treatment_type?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_requests_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "case_routing_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      student_case_requests: {
        Row: {
          case_id: string
          clinical_notes: string | null
          created_at: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          stage_id: string | null
          status: string
          student_email: string
          student_id: string
        }
        Insert: {
          case_id: string
          clinical_notes?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          stage_id?: string | null
          status?: string
          student_email: string
          student_id: string
        }
        Update: {
          case_id?: string
          clinical_notes?: string | null
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          stage_id?: string | null
          status?: string
          student_email?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_case_requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "patient_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_case_requests_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "case_routing_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      student_planner_events: {
        Row: {
          created_at: string | null
          description: string | null
          event_date: string
          id: number
          language: string | null
          lifecycle_state: string | null
          patient_id: string | null
          source_case_id: string | null
          source_kind: string | null
          stage_id: string | null
          student_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_date: string
          id?: number
          language?: string | null
          lifecycle_state?: string | null
          patient_id?: string | null
          source_case_id?: string | null
          source_kind?: string | null
          stage_id?: string | null
          student_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_date?: string
          id?: number
          language?: string | null
          lifecycle_state?: string | null
          patient_id?: string | null
          source_case_id?: string | null
          source_kind?: string | null
          stage_id?: string | null
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_planner_events_source_case_id_fkey"
            columns: ["source_case_id"]
            isOneToOne: false
            referencedRelation: "patient_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_planner_events_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "case_routing_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_request_status_by_phone: {
        Args: { lookup_phone: string }
        Returns: {
          assigned_department: string
          created_at: string
          id: string
          preferred_days: string
          status: string
          treatment_type: string
        }[]
      }
      student_has_current_stage_assignment: {
        Args: { p_case_id: string }
        Returns: boolean
      }
      student_pool_cases: {
        Args: Record<string, never>
        Returns: {
          id: string
          age: number | null
          treatment_type: string
          complaint_text: string | null
          urgency: string
          assigned_department: string | null
          target_student_level: string | null
          pain_score: number | null
          preferred_days: string | null
          symptom_duration: string | null
          medical_condition: string | null
          clinical_notes: string | null
          created_at: string | null
          has_attachment: boolean
        }[]
      }
      student_active_cases: {
        Args: Record<string, never>
        Returns: {
          id: string
          treatment_type: string
          assigned_department: string | null
          status: string | null
          full_name: string
          phone: string
          current_stage_id: string | null
        }[]
      }
      student_requested_case_overview: {
        Args: Record<string, never>
        Returns: {
          request_id: string
          case_id: string
          stage_id: string | null
          request_status: string
          effective_status: string
          created_at: string
          treatment_type: string
          assigned_department: string | null
          urgency: string
          case_status: string | null
          current_stage_id: string | null
          stage_department: string | null
        }[]
      }
      admin_approve_student_request: {
        Args: { p_case_id: string; p_request_id: string }
        Returns: Json
      }
      admin_return_case_to_pool: {
        Args: {
          p_case_id: string
          p_assigned_department?: string | null
          p_urgency?: string | null
          p_target_student_level?: string | null
          p_clinical_notes?: string | null
        }
        Returns: Json
      }
      admin_return_case_to_pool_with_decision: {
        Args: {
          p_case_id: string
          p_assigned_department?: string | null
          p_urgency?: string | null
          p_target_student_level?: string | null
          p_clinical_notes?: string | null
          p_reason?: string | null
        }
        Returns: Json
      }
      admin_release_next_stage: {
        Args: {
          p_case_id: string
          p_department: string
          p_target_student_level?: string | null
          p_urgency?: string | null
          p_clinical_notes?: string | null
        }
        Returns: Json
      }
      admin_release_next_stage_with_decision: {
        Args: {
          p_case_id: string
          p_department: string
          p_target_student_level?: string | null
          p_urgency?: string | null
          p_clinical_notes?: string | null
          p_reason?: string | null
        }
        Returns: Json
      }
      admin_set_case_terminal_state: {
        Args: { p_case_id: string; p_action: string; p_reason?: string | null }
        Returns: Json
      }
      admin_set_case_terminal_state_with_decision: {
        Args: { p_case_id: string; p_action: string; p_reason?: string | null }
        Returns: Json
      }
      admin_set_student_request_decision: {
        Args: { p_case_id: string; p_request_id: string; p_action: string; p_reason: string }
        Returns: Json
      }
      admin_update_case_triage_with_decision: {
        Args: {
          p_case_id: string
          p_assigned_department: string
          p_urgency: string
          p_target_student_level: string
          p_clinical_notes: string
          p_reason?: string | null
        }
        Returns: Json
      }
      submit_patient_request_atomic: {
        Args: {
          p_submission_id: string
          p_request: Json
          p_consents: Json
          p_file_id?: string | null
          p_context?: Json
        }
        Returns: string
      }
      claim_orphan_patient_files: {
        Args: { p_limit?: number }
        Returns: { file_id: string; object_path: string }[]
      }
      complete_patient_file_cleanup: {
        Args: { p_file_id: string; p_success: boolean }
        Returns: boolean
      }
      consume_rate_limit: {
        Args: {
          p_scope: string
          p_key_hash: string
          p_window_seconds: number
          p_limit: number
        }
        Returns: {
          allowed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
