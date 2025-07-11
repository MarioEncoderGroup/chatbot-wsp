import { whatsappClient, whatsappEvents } from '../lib/whatsapp/client';
import { botHandler } from '../lib/whatsapp/botHandler';
import { getDatabase } from '../lib/database/mysql';
import { BotConfig, BotResponse } from '../types/whatsapp';
import qrcode from 'qrcode';

// Clase de servicio para la gestión del bot
export class WhatsAppService {
  private static instance: WhatsAppService;
  private currentQR: string | null = null;
  private isClientReady: boolean = false;
  private config: BotConfig = {
    prefix: '!',
    ownerNumber: '',
    botName: 'WhatsApp Bot',
    language: 'es'
  };

  private constructor() {
    this.setupEventListeners();
  }

  // Patrón Singleton
  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService();
    }
    return WhatsAppService.instance;
  }

  // Configurar los escuchadores de eventos
  private setupEventListeners() {
    whatsappEvents.on('qr', (qr: string) => {
      this.currentQR = qr;
      this.saveQRToDatabase(qr).catch(err => console.error('Error al guardar QR:', err));
    });

    whatsappEvents.on('ready', () => {
      this.isClientReady = true;
      this.currentQR = null;
      console.log('WhatsApp client está listo');
    });

    whatsappEvents.on('disconnected', (reason) => {
      this.isClientReady = false;
      this.currentQR = null;
      console.log(`WhatsApp client se desconectó: ${reason}`);
      this.saveStatusToDatabase('disconnected', { reason }).catch((err: Error) => 
        console.error('Error al guardar estado de desconexión:', err)
      );
    });
    
    // Eventos relacionados con la sesión
    whatsappEvents.on('logout_success', () => {
      this.isClientReady = false;
      this.currentQR = null;
      console.log('Sesión cerrada exitosamente');
      this.saveStatusToDatabase('logout', { timestamp: Date.now() }).catch((err: Error) => 
        console.error('Error al guardar estado de cierre de sesión:', err)
      );
    });
    
    whatsappEvents.on('logout_error', (error) => {
      console.error('Error al cerrar sesión:', error);
      this.saveStatusToDatabase('logout_error', { error: error.toString() }).catch((err: Error) => 
        console.error('Error al guardar estado de error de cierre de sesión:', err)
      );
    });
    
    whatsappEvents.on('session_deleted', () => {
      this.isClientReady = false;
      this.currentQR = null;
      console.log('Datos de sesión eliminados');
      this.saveStatusToDatabase('session_deleted', { timestamp: Date.now() }).catch((err: Error) => 
        console.error('Error al guardar estado de eliminación de sesión:', err)
      );
    });

    whatsappEvents.on('message', async (message) => {
      try {
        // Guardar mensaje en la base de datos
        await this.saveMessageToDatabase(message);
      } catch (error) {
        console.error('Error al procesar mensaje:', error);
      }
    });
  }

  // Inicializar el cliente WhatsApp
  public async initialize(): Promise<boolean> {
    try {
      const result = await whatsappClient.initialize();
      return result;
    } catch (error) {
      console.error('Error al inicializar el cliente WhatsApp:', error);
      return false;
    }
  }

  // Guardar el QR en la base de datos para un acceso posterior
  private async saveQRToDatabase(qrData: string) {
    try {
      const db = await getDatabase();
      // Guardar en la tabla de QR
      await db.query(
        'INSERT INTO qr_codes (qr_data, created_at) VALUES (?, NOW()) ' +
        'ON DUPLICATE KEY UPDATE qr_data = ?, updated_at = NOW()',
        [qrData, qrData]
      );
    } catch (error) {
      console.error('Error al guardar QR en la base de datos:', error);
      // No lanzamos el error para que no interrumpa el flujo
    }
  }
  
  // Guardar el estado del cliente en la base de datos
  private async saveStatusToDatabase(status: string, data: Record<string, any>) {
    try {
      const db = await getDatabase();
      // Guardar en la tabla de estados
      await db.query(
        'INSERT INTO whatsapp_status (status_type, status_data, created_at) VALUES (?, ?, NOW())',
        [status, JSON.stringify(data)]
      );
    } catch (error: any) {
      console.error(`Error al guardar estado '${status}' en la base de datos:`, error);
      // No lanzamos el error para que no interrumpa el flujo
    }
  }

  // Guardar mensaje en la base de datos
  private async saveMessageToDatabase(message: any): Promise<void> {
    try {
      const db = await getDatabase();
      
      // Obtener o crear usuario
      const [user] = await db.query<any[]>(
        'SELECT id FROM users WHERE phone = ? LIMIT 1',
        [message.from]
      );
      
      let userId;
      
      if (user && user.length > 0) {
        userId = user[0].id;
      } else {
        // Crear nuevo usuario
        const result = await db.query<any>(
          'INSERT INTO users (phone, name) VALUES (?, ?)',
          [message.from, message._data?.notifyName || 'Unknown']
        );
        userId = result.insertId;
      }
      
      // Guardar mensaje
      await db.query(
        'INSERT INTO messages (user_id, direction, message_type, content) VALUES (?, ?, ?, ?)',
        [userId, 'incoming', message.type, message.body]
      );
    } catch (error) {
      console.error('Error al guardar mensaje en la base de datos:', error);
    }
  }

  // Obtener el código QR actual como string o imagen base64
  public async getQR(asImage: boolean = false): Promise<string | null> {
    if (!this.currentQR) return null;
    
    if (asImage) {
      try {
        return await qrcode.toDataURL(this.currentQR);
      } catch (error) {
        console.error('Error al convertir QR a imagen:', error);
        return null;
      }
    }
    
    return this.currentQR;
  }

  // Verificar si el cliente está listo
  public isReady(): boolean {
    return this.isClientReady;
  }
  
  // Obtener información de la sesión actual
  public async getSessionInfo() {
    return await whatsappClient.getSessionInfo();
  }
  
  // Cerrar la sesión actual
  public async logout() {
    try {
      await whatsappClient.logout();
      return { success: true, message: 'Sesión cerrada correctamente' };
    } catch (error) {
      console.error('Error al cerrar sesión desde el servicio:', error);
      return { 
        success: false, 
        message: 'Error al cerrar sesión', 
        error: (error as Error).message 
      };
    }
  }
  
  // Eliminar datos de sesión
  public async deleteSession() {
    try {
      await whatsappClient.deleteSession();
      return { success: true, message: 'Datos de sesión eliminados correctamente' };
    } catch (error) {
      console.error('Error al eliminar datos de sesión desde el servicio:', error);
      return { 
        success: false, 
        message: 'Error al eliminar datos de sesión', 
        error: (error as Error).message 
      };
    }
  }

  // Enviar mensaje a un número específico
  public async sendMessage(to: string, message: string): Promise<any> {
    if (!this.isClientReady) {
      throw new Error('Cliente WhatsApp no está listo');
    }
    
    try {
      const result = await whatsappClient.sendMessage(to, message);
      
      // Registrar mensaje enviado en la base de datos
      const db = await getDatabase();
      
      // Obtener o crear usuario
      const [user] = await db.query<any[]>(
        'SELECT id FROM users WHERE phone = ? LIMIT 1',
        [to]
      );
      
      let userId;
      
      if (user && user.length > 0) {
        userId = user[0].id;
      } else {
        // Crear nuevo usuario
        const result = await db.query<any>(
          'INSERT INTO users (phone) VALUES (?)',
          [to]
        );
        userId = result.insertId;
      }
      
      // Guardar mensaje enviado
      await db.query(
        'INSERT INTO messages (user_id, direction, message_type, content) VALUES (?, ?, ?, ?)',
        [userId, 'outgoing', 'text', message]
      );
      
      return result;
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      throw error;
    }
  }

  // Registrar un comando personalizado
  public async registerCustomCommand(command: string, response: string, createdBy: string): Promise<boolean> {
    try {
      const db = await getDatabase();
      
      // Verificar si el comando ya existe
      const [existing] = await db.query<any[]>(
        'SELECT id FROM custom_commands WHERE command = ? LIMIT 1',
        [command.toLowerCase()]
      );
      
      if (existing && existing.length > 0) {
        // Actualizar comando existente
        await db.query(
          'UPDATE custom_commands SET response = ? WHERE id = ?',
          [response, existing[0].id]
        );
      } else {
        // Crear nuevo comando
        await db.query(
          'INSERT INTO custom_commands (command, response, created_by) VALUES (?, ?, ?)',
          [command.toLowerCase(), response, createdBy]
        );
        
        // Registrar en el botHandler
        botHandler.registerCommand({
          name: command.toLowerCase(),
          description: `Comando personalizado: ${command}`,
          category: botHandler.getDefaultCategory(),
          handler: async (message) => {
            await message.reply(response);
            return { success: true, message: 'Comando personalizado ejecutado' };
          }
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error al registrar comando personalizado:', error);
      return false;
    }
  }

  // Cargar comandos personalizados desde la base de datos
  public async loadCustomCommands(): Promise<number> {
    try {
      const db = await getDatabase();
      
      const commands = await db.query<any[]>('SELECT * FROM custom_commands');
      
      if (!Array.isArray(commands) || commands.length === 0) return 0;
      
      let loadedCount = 0;
      
      for (const cmd of commands) {
        botHandler.registerCommand({
          name: cmd.command,
          description: `Comando personalizado: ${cmd.command}`,
          category: botHandler.getDefaultCategory(),
          handler: async (message) => {
            await message.reply(cmd.response);
            return { success: true, message: 'Comando personalizado ejecutado' };
          }
        });
        
        loadedCount++;
      }
      
      return loadedCount;
    } catch (error) {
      console.error('Error al cargar comandos personalizados:', error);
      return 0;
    }
  }

  // Cambiar la configuración del bot
  public updateConfig(newConfig: Partial<BotConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Actualizar el prefijo en el botHandler
    if (newConfig.prefix) {
      botHandler.setPrefix(newConfig.prefix);
    }
  }

  // Obtener la configuración actual
  public getConfig(): BotConfig {
    return { ...this.config };
  }
}

// Exportar una instancia por defecto para facilitar su uso
export const whatsappService = WhatsAppService.getInstance();
