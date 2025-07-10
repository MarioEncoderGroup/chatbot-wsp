import { Message, Chat, Contact, GroupChat, MessageMedia } from 'whatsapp-web.js';

export interface BotConfig {
  prefix: string;
  ownerNumber: string;
  botName: string;
  language: string;
}

export interface CommandContext {
  message: Message;
  args: string[];
  chat?: Chat;
  contact?: Contact;
  isGroup: boolean;
  groupChat?: GroupChat;
}

export interface BotResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: Error;
}

export enum CommandCategory {
  GENERAL = 'general',
  ADMIN = 'admin',
  FUN = 'fun',
  UTILITY = 'utility',
  MISC = 'misc',
  SYSTEM = 'sistema',
  MEDIA = 'multimedia'
}

// Interfaz para los comandos del bot
export interface BotCommand {
  name: string;
  description: string;
  usage?: string;
  category: CommandCategory;
  aliases?: string[];
  requiresAuth?: boolean;
  ownerOnly?: boolean;
  handler: (message: Message, args?: string[]) => Promise<BotResponse>;
}

// Interfaz para los mensajes multimedia
export interface MediaMessage {
  media: MessageMedia;
  caption?: string;
  options?: {
    sendMediaAsSticker?: boolean;
    sendMediaAsDocument?: boolean;
    mimetype?: string;
    filename?: string;
  };
}
