// Tipos base para el proyecto WhatsApp Bot

export interface ListItem {
  id?: number;
  row_id: string;
  title: string;
  description?: string;
  response: string;
}

export interface Command {
  id?: number;
  command: string;
  title?: string;
  intro_text?: string;
  response: string;
  use_prefix: boolean;
  response_type: 'text' | 'list' | 'buttons';
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  items?: ListItem[];
}

export interface User {
  id?: number;
  phone: string;
  name?: string;
  is_blocked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id?: number;
  user_id: number;
  direction: 'incoming' | 'outgoing';
  message_type: string;
  content: string;
  timestamp?: string;
}

export interface WhatsAppStatus {
  id?: number;
  status_type: string;
  status_data: any;
  created_at?: string;
}

// Tipos para respuestas de API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Tipos para filtros y paginación
export interface QueryFilters {
  type?: string;
  limit?: number;
  offset?: number;
  search?: string;
}
