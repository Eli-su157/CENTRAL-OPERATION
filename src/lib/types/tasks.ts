import type { UserSector, AttachmentType } from './database';

export type TaskPriority = 'baixa' | 'media' | 'alta';
export type TaskStatus = 'a_fazer' | 'fazendo' | 'concluida';
export type { AttachmentType };

export interface TaskMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  sector: UserSector | null;
}

export interface TaskComment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  commenter: { id: string; full_name: string } | null;
}

export interface TaskAttachment {
  id: string;
  type: AttachmentType;
  url: string;
  label: string;
  created_at: string;
}

export interface Task {
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
  // Joined in JS
  assignee: { id: string; full_name: string } | null;
  creator: { id: string; full_name: string } | null;
  dashboard: { id: string; name: string } | null;
  task_comments: TaskComment[];
  task_attachments: TaskAttachment[];
}

export interface RealTeamData {
  tarefas_atrasadas: { setor: string; quantidade: number }[];
  tarefas_pendentes_total: number;
  membros_ativos: number;
}

// Labels helpers
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  a_fazer: 'A Fazer',
  fazendo: 'Fazendo',
  concluida: 'Concluída',
};

export const SECTOR_LABELS: Record<string, string> = {
  trafego: 'Tráfego',
  edicao: 'Edição',
  dev: 'Dev',
  financeiro: 'Financeiro',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  alta: 'bg-red-500',
  media: 'bg-amber-500',
  baixa: 'bg-emerald-500',
};

export const PRIORITY_TEXT: Record<TaskPriority, string> = {
  alta: 'text-red-400',
  media: 'text-amber-400',
  baixa: 'text-emerald-400',
};

export const STATUS_NEXT: Record<TaskStatus, TaskStatus | null> = {
  a_fazer: 'fazendo',
  fazendo: 'concluida',
  concluida: null,
};

export const STATUS_PREV: Record<TaskStatus, TaskStatus | null> = {
  a_fazer: null,
  fazendo: 'a_fazer',
  concluida: 'fazendo',
};
