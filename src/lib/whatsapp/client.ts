import { Client, LocalAuth, Message, MessageMedia, Events } from 'whatsapp-web.js';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { promisify } from 'util';
import axios from 'axios';
import * as os from 'os';

// Evento personalizado para comunicar eventos de WhatsApp a otras partes de la aplicación
class WhatsAppEvents extends EventEmitter {}
export const whatsappEvents = new WhatsAppEvents();

// Directorio para almacenar la sesión
const SESSION_DIR = './whatsapp-session';

// Asegurarnos de que el directorio existe
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Clase para manejar el cliente de WhatsApp
export class WhatsAppClient {
  private client: Client;
  private static instance: WhatsAppClient;
  private isInitialized = false;
  
  private constructor() {
    // Detectamos el sistema operativo para configurar Puppeteer adecuadamente
    const chromePaths = {
      darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
      win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
      linux: '/usr/bin/google-chrome' // Linux
    };
    
    const platform = os.platform() as 'darwin' | 'win32' | 'linux';
    const defaultChromePath = chromePaths[platform];
    
    // Verificamos si el ejecutable de Chrome existe en la ruta por defecto
    const chromePath = fs.existsSync(defaultChromePath) ? defaultChromePath : undefined;
    
    console.log(`Sistema operativo detectado: ${platform}`);
    console.log(`Ruta de Chrome: ${chromePath || 'No detectada, usando puppeteer por defecto'}`);
    
    // Configuramos el cliente de WhatsApp con una configuración más robusta
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'whatsapp-bot',
        dataPath: SESSION_DIR
      }),
      puppeteer: {
        headless: true,
        executablePath: chromePath, // Usa la ruta de Chrome si existe, si no, puppeteer usará su versión integrada
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-web-security',
          '--allow-running-insecure-content'
        ],
        ignoreDefaultArgs: ['--disable-extensions'],
        defaultViewport: null
      },
      webVersionCache: {
        type: 'local'
      }
    });

    // Configurar eventos
    this.setupEvents();
  }
  
  // Patrón Singleton para tener una sola instancia del cliente
  public static getInstance(): WhatsAppClient {
    if (!WhatsAppClient.instance) {
      WhatsAppClient.instance = new WhatsAppClient();
    }
    return WhatsAppClient.instance;
  }
  
  private setupEvents() {
    // Evento cuando se recibe el código QR para autenticación
    this.client.on(Events.QR_RECEIVED, (qr) => {
      console.log('QR RECIBIDO:', qr);
      whatsappEvents.emit('qr', qr);
    });
    
    // Evento cuando el cliente está listo
    this.client.on(Events.READY, () => {
      console.log('Cliente WhatsApp está listo');
      this.isInitialized = true;
      whatsappEvents.emit('ready');
    });
    
    // Evento cuando se recibe un mensaje
    this.client.on(Events.MESSAGE_RECEIVED, async (message) => {
      console.log(`Mensaje recibido: ${message.body} de ${message.from}`);
      
      // Procesar el mensaje para detectar comandos
      await this.processMessageCommands(message);
      
      // Emitir el evento para otros manejadores
      whatsappEvents.emit('message', message);
    });

    // Evento cuando el cliente se desconecta
    this.client.on(Events.DISCONNECTED, (reason) => {
      console.log('Cliente WhatsApp desconectado', reason);
      this.isInitialized = false;
      whatsappEvents.emit('disconnected', reason);
    });
    
    // Evento cuando cambia el estado de autenticación
    this.client.on(Events.AUTHENTICATION_FAILURE, (err) => {
      console.error('Error de autenticación:', err);
      whatsappEvents.emit('auth_failure', err);
    });
    
    // Evento cuando el mensaje ha sido enviado y ha sido recibido por el servidor
    this.client.on(Events.MESSAGE_ACK, (msg, ack) => {
      console.log(`Mensaje ${msg.id._serialized} cambió estado a: ${ack}`);
      whatsappEvents.emit('message_ack', msg, ack);
    });
    
    // Evento cuando el estado de la batería del teléfono cambia
    this.client.on(Events.BATTERY_CHANGED, (batteryInfo) => {
      console.log('Estado de batería actualizado:', batteryInfo);
      whatsappEvents.emit('battery', batteryInfo);
    });
  }
  
  // Inicializar el cliente de WhatsApp
  public async initialize() {
    if (!this.isInitialized) {
      try {
        console.log('Iniciando cliente WhatsApp...');
        await this.client.initialize();
        console.log('Cliente WhatsApp inicializado con éxito!');
        this.isInitialized = true;
        return true;
      } catch (error) {
        console.error('Error al inicializar el cliente WhatsApp:', error);
        console.error('Detalles del error:', JSON.stringify(error, null, 2));
        return false;
      }
    }
    return true;
  }

  // Enviar un mensaje a un número específico
  public async sendMessage(to: string, message: string) {
    if (!this.isInitialized) {
      throw new Error('Cliente WhatsApp no inicializado');
    }
    
    // Normalizar el número de teléfono
    const chatId = this.normalizeChatId(to);
    
    try {
      const response = await this.client.sendMessage(chatId, message);
      return response;
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      throw error;
    }
  }
  
  // Enviar un mensaje multimedia (imagen, documento, audio, etc)
  public async sendMediaMessage(to: string, media: MessageMedia, caption?: string) {
    if (!this.isInitialized) {
      throw new Error('Cliente WhatsApp no inicializado');
    }
    
    const chatId = this.normalizeChatId(to);
    
    try {
      const response = await this.client.sendMessage(chatId, media, { caption });
      return response;
    } catch (error) {
      console.error('Error al enviar mensaje multimedia:', error);
      throw error;
    }
  }
  
  // Crear un mensaje multimedia a partir de una URL
  public async createMediaFromUrl(url: string, filename?: string): Promise<MessageMedia> {
    try {
      return await MessageMedia.fromUrl(url, { unsafeMime: true, filename });
    } catch (error) {
      console.error('Error al crear media desde URL:', error);
      throw error;
    }
  }
  
  // Crear un mensaje multimedia a partir de un archivo local
  public async createMediaFromPath(filePath: string): Promise<MessageMedia> {
    try {
      const filename = path.basename(filePath);
      return await MessageMedia.fromFilePath(filePath);
    } catch (error) {
      console.error('Error al crear media desde archivo:', error);
      throw error;
    }
  }
  
  // Normalizar el ID del chat (número de teléfono)
  private normalizeChatId(number: string): string {
    // Asegurarse de que el número tiene el formato correcto para WhatsApp (ejemplo: 5521999999999@c.us)
    if (!number.includes('@c.us')) {
      // Eliminar símbolos y espacios
      let cleaned = number.replace(/[\s+\-()]/g, '');
      
      // Si no empieza con un código de país, asumimos que es un número local
      if (!cleaned.startsWith('+')) {
        // Aquí puedes definir tu código de país predeterminado
        cleaned = `+${cleaned}`;
      }
      
      // Eliminar el + inicial si existe
      cleaned = cleaned.replace(/^\+/, '');
      
      // Formato para WhatsApp
      return `${cleaned}@c.us`;
    }
    
    return number;
  }

  // Obtener el cliente raw para operaciones avanzadas
  public getClient(): Client {
    return this.client;
  }

  // Verificar si el cliente está inicializado
  public isReady(): boolean {
    return this.isInitialized;
  }

  // Desconectar el cliente y cerrar sesión
  public async logout() {
    if (this.client && this.isInitialized) {
      try {
        console.log('Cerrando sesión de WhatsApp...');
        await this.client.logout();
        console.log('Sesión de WhatsApp cerrada exitosamente');
        this.isInitialized = false;
        whatsappEvents.emit('logout_success');
        return true;
      } catch (error) {
        console.error('Error al cerrar sesión de WhatsApp:', error);
        whatsappEvents.emit('logout_error', error);
        throw error;
      }
    } else {
      console.warn('No hay una sesión activa para cerrar');
      return false;
    }
  }

  // Obtener información de la sesión actual
  public async getSessionInfo() {
    if (this.client && this.isInitialized) {
      try {
        // Intentamos obtener el estado de la sesión
        const state = await this.client.getState();
        let phoneNumber = null;
        
        // WhatsApp Web JS no proporciona un método directo para obtener solo
        // el número de teléfono en esta versión, así que usaremos el ID de la sesión
        // que es suficiente para identificar la sesión activa
        try {
          // Intentar obtener información adicional si es posible
          const info = this.client.info;
          if (info) {
            console.log('Información de la sesión disponible');
          }
        } catch (infoError) {
          console.warn('No se pudo obtener información adicional de la sesión:', infoError);
        }
        
        return {
          state, // 'CONNECTED', 'DISCONNECTED', etc.
          connected: state === 'CONNECTED',
          ready: this.isInitialized,
          authenticated: true,
          phoneNumber,
          sessionId: `session_${Date.now()}` // Identificador único para la sesión
        };
      } catch (error) {
        console.error('Error al obtener información de la sesión:', error);
        return {
          state: 'ERROR',
          connected: false,
          ready: false,
          authenticated: this.isInitialized, // Si está inicializado pero hay error, probablemente sí está autenticado
          phoneNumber: null,
          error: (error as Error).message
        };
      }
    } else {
      return {
        state: 'DISCONNECTED',
        connected: false,
        ready: false,
        authenticated: false,
        phoneNumber: null
      };
    }
  }
  
  // Eliminar los datos de sesión almacenados localmente
  public async deleteSession() {
    try {
      // Primero intentamos cerrar la sesión correctamente
      if (this.isInitialized) {
        try {
          await this.logout();
        } catch (logoutError) {
          console.warn('No se pudo cerrar sesión correctamente, procediendo a eliminar datos locales:', logoutError);
        }
      }
      
      // Lista de directorios relacionados con WhatsApp Web.js que deben ser eliminados
      const dirsToDelete = [
        path.resolve(SESSION_DIR),      // Directorio principal de sesión
        path.resolve('./.wwebjs_auth'), // Directorio de autenticación
        path.resolve('./.wwebjs_cache') // Directorio de caché
      ];
      
      // Usamos un enfoque recursivo para eliminar el directorio
      const deleteFolderRecursive = (pathToDelete: string) => {
        if (fs.existsSync(pathToDelete)) {
          try {
            fs.readdirSync(pathToDelete).forEach((file) => {
              const curPath = path.join(pathToDelete, file);
              if (fs.lstatSync(curPath).isDirectory()) {
                // Es un directorio, eliminar recursivamente
                deleteFolderRecursive(curPath);
              } else {
                // Es un archivo, eliminarlo
                try {
                  fs.unlinkSync(curPath);
                } catch (unlinkError) {
                  console.error(`Error al eliminar archivo ${curPath}:`, unlinkError);
                }
              }
            });
            // Finalmente eliminar el directorio vacío
            try {
              fs.rmdirSync(pathToDelete);
            } catch (rmdirError) {
              console.error(`Error al eliminar directorio ${pathToDelete}:`, rmdirError);
            }
          } catch (readError) {
            console.error(`Error al leer directorio ${pathToDelete}:`, readError);
          }
        }
      };
      
      let allDeleted = true;
      let deletedAny = false;
      
      // Eliminar cada directorio de la lista
      for (const dir of dirsToDelete) {
        if (fs.existsSync(dir)) {
          console.log(`Eliminando directorio: ${dir}`);
          try {
            deleteFolderRecursive(dir);
            deletedAny = true;
            // Verificar si realmente se eliminó
            if (fs.existsSync(dir)) {
              console.warn(`¡Advertencia! El directorio ${dir} aún existe después de intentar eliminarlo`);
              allDeleted = false;
              
              // Intento adicional con comandos del sistema como último recurso
              try {
                const { execSync } = require('child_process');
                if (process.platform === 'win32') {
                  execSync(`rmdir /s /q "${dir}"`);
                } else {
                  execSync(`rm -rf "${dir}"`);
                }
                console.log(`Segundo intento de eliminación para ${dir} completado`);
              } catch (execError) {
                console.error(`Error en el segundo intento de eliminación para ${dir}:`, execError);
              }
            }
          } catch (error) {
            console.error(`Error al eliminar directorio ${dir}:`, error);
            allDeleted = false;
          }
        }
      }
      
      // Matar cualquier proceso de Chromium que pueda estar bloqueando archivos
      try {
        const { execSync } = require('child_process');
        if (process.platform === 'win32') {
          execSync('taskkill /f /im chrome.exe /t');
        } else if (process.platform === 'darwin') { // macOS
          execSync('pkill -f "Chromium|Google Chrome"');
        } else { // Linux
          execSync('pkill -f "chromium|chrome"');
        }
        console.log('Procesos de Chromium terminados');
      } catch (killError) {
        // Es normal que falle si no hay procesos para matar
        console.log('No se encontraron procesos de Chromium para terminar o ya estaban cerrados');
      }
      
      if (deletedAny) {
        console.log(`Limpieza de sesión ${allDeleted ? 'completada exitosamente' : 'realizada con algunos problemas'}`);
        whatsappEvents.emit('session_deleted');
        
        // Reiniciar la instancia para forzar una nueva inicialización
        WhatsAppClient.instance = new WhatsAppClient();
        return true;
      } else {
        console.log('No se encontraron datos de sesión para eliminar');
        return true;
      }
    } catch (error) {
      console.error('Error en el proceso de eliminación de sesión:', error);
      whatsappEvents.emit('session_delete_error', error);
      throw error;
    }
  }
  
  // Procesar los mensajes para detectar y responder comandos
  private async processMessageCommands(message: Message) {
    try {
      const text = message.body.trim();
      
      if (!text) return; // Ignorar mensajes vacíos
      
      const db = await (await import('../database/mysql')).getDatabase();
      
      // Buscar comandos con prefijo
      if (text.startsWith('!')) {
        const command = text.toLowerCase();
        
        // Buscar en la base de datos el comando con prefijo
        const results = await db.query(
          'SELECT command, response FROM custom_commands WHERE command = ? AND use_prefix = 1',
          [command]
        );
        
        if (Array.isArray(results) && results.length > 0) {
          const { response } = results[0];
          await message.reply(response);
          return;
        }
      }
      
      // Buscar comandos sin prefijo (coincidencia exacta con el texto completo)
      const results = await db.query(
        'SELECT command, response FROM custom_commands WHERE command = ? AND use_prefix = 0',
        [text.toLowerCase()]
      );
      
      if (Array.isArray(results) && results.length > 0) {
        const { response } = results[0];
        await message.reply(response);
        return;
      }
      
      // También buscar si el texto contiene un comando sin prefijo
      const partialResults = await db.query(
        'SELECT command, response FROM custom_commands WHERE use_prefix = 0 AND ? LIKE CONCAT("%", command, "%")',
        [text.toLowerCase()]
      );
      
      if (Array.isArray(partialResults) && partialResults.length > 0) {
        const { response } = partialResults[0]; // Tomar la primera coincidencia
        await message.reply(response);
      }
      
    } catch (error) {
      console.error('Error al procesar comandos:', error);
    }
  }
}

// Exportar una instancia por defecto para facilitar su uso
export const whatsappClient = WhatsAppClient.getInstance();
