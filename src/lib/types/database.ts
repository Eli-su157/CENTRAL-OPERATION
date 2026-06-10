export type UserRole = 'dono' | 'head' | 'lider' | 'executor';
export type UserSector = 'trafego' | 'edicao' | 'dev' | 'financeiro';
export type InviteStatus = 'pendente' | 'aceito' | 'expirado';
export type PermissionOverrideType = 'ver_financeiro' | 'atribuir_tarefa' | 'restrito_a_dashboard';
export type TaskPriority = 'baixa' | 'media' | 'alta';
export type TaskStatus = 'a_fazer' | 'fazendo' | 'concluida';
export type AttachmentType = 'arquivo' | 'link';
// Fase 6: tipos de material (usados em components/materials/* e edicao/page.tsx)
export type MaterialType = 'criativo_imagem' | 'criativo_video' | 'vsl' | 'pagina' | 'copy';
export type MaterialStorageKind = 'upload' | 'link';
export type MaterialStatus = 'em_producao' | 'pronto' | 'no_ar' | 'aposentado';

export interface Database {
  public: {
    Tables: {
      operations: {
        Row: {
          id: string;
          name: string;
          owner_user_id: string;
          max_dashboards: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_user_id: string;
          max_dashboards?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['operations']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          operation_id: string;
          full_name: string;
          email: string;
          role: UserRole;
          sector: UserSector | null;
          created_at: string;
        };
        Insert: {
          id: string;
          operation_id: string;
          full_name: string;
          email: string;
          role: UserRole;
          sector?: UserSector | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      dashboards: {
        Row: { id: string; operation_id: string; name: string; created_at: string };
        Insert: { id?: string; operation_id: string; name: string; created_at?: string };
        Update: Partial<Database['public']['Tables']['dashboards']['Insert']>;
      };
      invites: {
        Row: {
          id: string;
          operation_id: string;
          email: string;
          role: UserRole;
          sector: UserSector | null;
          token: string;
          status: InviteStatus;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          operation_id: string;
          email: string;
          role: UserRole;
          sector?: UserSector | null;
          token?: string;
          status?: InviteStatus;
          expires_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['invites']['Insert']>;
      };
      permission_overrides: {
        Row: {
          id: string;
          operation_id: string;
          user_id: string;
          type: PermissionOverrideType;
          value: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          operation_id: string;
          user_id: string;
          type: PermissionOverrideType;
          value?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['permission_overrides']['Insert']>;
      };
      tasks: {
        Row: {
          id: string;
          operation_id: string;
          dashboard_id: string | null;
          title: string;
          description: string | null;
          assignee_user_id: string | null;
          sector: UserSector;
          priority: TaskPriority;
          due_date: string | null;
          status: TaskStatus;
          created_by_user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          operation_id: string;
          dashboard_id?: string | null;
          title: string;
          description?: string | null;
          assignee_user_id?: string | null;
          sector: UserSector;
          priority?: TaskPriority;
          due_date?: string | null;
          status?: TaskStatus;
          created_by_user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
      };
      task_attachments: {
        Row: {
          id: string;
          task_id: string;
          operation_id: string;
          type: AttachmentType;
          url: string;
          label: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          operation_id: string;
          type: AttachmentType;
          url: string;
          label: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['task_attachments']['Insert']>;
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          operation_id: string;
          user_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          operation_id: string;
          user_id: string;
          body: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['task_comments']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_my_operation_id: { Args: Record<string, never>; Returns: string };
      get_my_role: { Args: Record<string, never>; Returns: UserRole };
    };
    Enums: {
      user_role: UserRole;
      user_sector: UserSector;
      invite_status: InviteStatus;
      permission_override_type: PermissionOverrideType;
      task_priority: TaskPriority;
      task_status: TaskStatus;
      attachment_type: AttachmentType;
    };
  };
}
