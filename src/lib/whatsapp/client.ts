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

  // Desconectar el cliente
  public async logout() {
    if (this.isInitialized) {
      await this.client.logout();
      this.isInitialized = false;
      return true;
    }
    return false;
  }
}

// Exportar una instancia por defecto para facilitar su uso
export const whatsappClient = WhatsAppClient.getInstance();
