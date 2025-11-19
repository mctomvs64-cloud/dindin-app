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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bill_payments: {
        Row: {
          amount_paid: number
          bill_id: string
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string
          receipt_url: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          amount_paid: number
          bill_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date: string
          receipt_url?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          amount_paid?: number
          bill_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          receipt_url?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bill_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "fixed_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bill_payments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string | null
          description: string | null
          discount: number | null
          id: string
          items: Json
          project_id: string | null
          status: string | null
          subtotal: number
          terms: string | null
          title: string
          total: number
          updated_at: string | null
          user_id: string
          valid_until: string | null
          workspace_id: string | null
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string | null
          description?: string | null
          discount?: number | null
          id?: string
          items?: Json
          project_id?: string | null
          status?: string | null
          subtotal: number
          terms?: string | null
          title: string
          total: number
          updated_at?: string | null
          user_id: string
          valid_until?: string | null
          workspace_id?: string | null
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string | null
          description?: string | null
          discount?: number | null
          id?: string
          items?: Json
          project_id?: string | null
          status?: string | null
          subtotal?: number
          terms?: string | null
          title?: string
          total?: number
          updated_at?: string | null
          user_id?: string
          valid_until?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_cash_closures: {
        Row: {
          closure_date: string
          created_at: string | null
          entries_count: number
          id: string
          notes: string | null
          total_amount: number
          total_card: number
          total_cash: number
          total_pix: number
          user_id: string
          workspace_id: string
        }
        Insert: {
          closure_date: string
          created_at?: string | null
          entries_count: number
          id?: string
          notes?: string | null
          total_amount: number
          total_card: number
          total_cash: number
          total_pix: number
          user_id: string
          workspace_id: string
        }
        Update: {
          closure_date?: string
          created_at?: string | null
          entries_count?: number
          id?: string
          notes?: string | null
          total_amount?: number
          total_card?: number
          total_cash?: number
          total_pix?: number
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_cash_closures_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_cash_entries: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          description: string | null
          entry_date: string
          entry_time: string
          id: string
          payment_method: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          entry_date?: string
          entry_time?: string
          id?: string
          payment_method?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          entry_date?: string
          entry_time?: string
          id?: string
          payment_method?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_cash_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_cash_entries_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_bills: {
        Row: {
          amount: number
          auto_repeat: boolean | null
          category_id: string | null
          created_at: string | null
          description: string | null
          due_day: number
          frequency: Database["public"]["Enums"]["bill_frequency"] | null
          id: string
          name: string
          notify_before_days: number | null
          receipt_url: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          amount: number
          auto_repeat?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          due_day: number
          frequency?: Database["public"]["Enums"]["bill_frequency"] | null
          id?: string
          name: string
          notify_before_days?: number | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          amount?: number
          auto_repeat?: boolean | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          due_day?: number
          frequency?: Database["public"]["Enums"]["bill_frequency"] | null
          id?: string
          name?: string
          notify_before_days?: number | null
          receipt_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_bills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_bills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_bills_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      folders: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          parent_folder_id: string | null
          sort_order: number | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category_id: string | null
          created_at: string | null
          current_amount: number | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          period: Database["public"]["Enums"]["goal_period"] | null
          project_id: string | null
          start_date: string
          status: Database["public"]["Enums"]["goal_status"] | null
          target_amount: number
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          current_amount?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          period?: Database["public"]["Enums"]["goal_period"] | null
          project_id?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["goal_status"] | null
          target_amount: number
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          current_amount?: number | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          period?: Database["public"]["Enums"]["goal_period"] | null
          project_id?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["goal_status"] | null
          target_amount?: number
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string // Referencia auth.users(id)
          full_name: string | null
          avatar_url: string | null
          email: string
          role: string
          subscription_status: string
          subscription_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string // Deve ser fornecido de auth.users.id
          full_name?: string | null
          avatar_url?: string | null
          email: string
          role?: string
          subscription_status?: string
          subscription_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string
          role?: string
          subscription_status?: string
          subscription_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          folder_id: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number | null
          status: Database["public"]["Enums"]["project_status"] | null
          tags: string[] | null
          target_amount: number | null
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          folder_id?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["project_status"] | null
          tags?: string[] | null
          target_amount?: number | null
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          folder_id?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          status?: Database["public"]["Enums"]["project_status"] | null
          tags?: string[] | null
          target_amount?: number | null
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          date: string
          description: string
          frequency: Database["public"]["Enums"]["transaction_frequency"] | null
          id: string
          is_recurring: boolean | null
          notes: string | null
          project_id: string | null
          receipt_url: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          date: string
          description: string
          frequency?:
            | Database["public"]["Enums"]["transaction_frequency"]
            | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          project_id?: string | null
          receipt_url?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          date?: string
          description?: string
          frequency?:
            | Database["public"]["Enums"]["transaction_frequency"]
            | null
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          project_id?: string | null
          receipt_url?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_monthly_bills_stats: {
        Args: { p_month: number; p_user_id: string; p_year: number }
        Returns: Json
      }
      calculate_project_progress: {
        Args: { p_project_id: string }
        Returns: Json
      }
      create_default_categories: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      create_default_categories_in_workspace: {
        Args: { p_user_id: string; p_workspace_id: string }
        Returns: undefined
      }
    }
    Enums: {
      bill_frequency: "monthly" | "yearly" | "custom"
      goal_period: "daily" | "weekly" | "monthly" | "yearly" | "custom"
      goal_status: "active" | "completed" | "cancelled"
      payment_status: "pending" | "paid" | "overdue"
      project_status: "active" | "paused" | "completed" | "archived"
      transaction_frequency: "once" | "daily" | "weekly" | "monthly" | "yearly"
      transaction_type: "income" | "expense"
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
      bill_frequency: ["monthly", "yearly", "custom"],
      goal_period: ["daily", "weekly", "monthly", "yearly", "custom"],
      goal_status: ["active", "completed", "cancelled"],
      payment_status: ["pending", "paid", "overdue"],
      project_status: ["active", "paused", "completed", "archived"],
      transaction_frequency: ["once", "daily", "weekly", "monthly", "yearly"],
      transaction_type: ["income", "expense"],
    },
  },
} as const