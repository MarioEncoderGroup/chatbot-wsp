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
// Interfaz para almacenar las últimas opciones enviadas a un usuario
interface UserOptionsState {
  commandId: number;         // ID del comando enviado
  options: Array<{          // Opciones disponibles
    number: number;         // Número de la opción (1, 2, 3...)
    title: string;          // Título de la opción
    description?: string;   // Descripción opcional
    sectionId: number;      // ID de la sección a la que pertenece
    itemId: string;         // ID del item dentro de la sección
  }>;
  timestamp: number;        // Timestamp para expirar las opciones antiguas (milisegundos)
}

export class WhatsAppClient {
  private client: Client;
  private static instance: WhatsAppClient;
  private isInitialized = false;
  // Mapa para almacenar las últimas opciones enviadas a cada usuario
  private userOptionsMap = new Map<string, UserOptionsState>();
  // Tiempo de expiración de las opciones (10 minutos en milisegundos)
  private readonly OPTIONS_EXPIRY_TIME = 10 * 60 * 1000;
  
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
      
      // Procesar el mensaje para detectar respuestas numéricas o comandos
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
      
      // Variables para controlar el estado de la eliminación
      let deletedAny = false;
      let allDeleted = true;
      
      // Lista de directorios relacionados con WhatsApp Web.js que deben ser eliminados
      const dirsToDelete = [
        SESSION_DIR,
        path.join(os.homedir(), '.wwebjs_auth'),
        path.join(os.homedir(), '.wwebjs_cache')
      ];
      
      // Intentar eliminar cada directorio
      for (const dir of dirsToDelete) {
        if (fs.existsSync(dir)) {
          try {
            console.log(`Eliminando directorio: ${dir}`);
            const rimraf = promisify(require('rimraf'));
            await rimraf(dir);
            console.log(`Directorio eliminado: ${dir}`);
            deletedAny = true;
          } catch (error) {
            console.error(`Error al eliminar el directorio ${dir}:`, error);
            allDeleted = false;
          }
        } else {
          console.log(`El directorio ${dir} no existe, no es necesario eliminarlo`);
        }
      }
      
      // Buscar procesos de Chrome o Chromium que puedan estar relacionados con WhatsApp Web
      try {
        const { execSync } = require('child_process');
        
        console.log('Intentando finalizar procesos de Chrome/Chromium relacionados...');
        
        // Diferente enfoque según el sistema operativo
        if (process.platform === 'win32') {
          try {
            // En Windows, intentamos cerrar procesos que puedan estar relacionados
            execSync('taskkill /f /im chrome.exe');
          } catch (e) {
            console.log('No se encontraron procesos de Chrome ejecutándose');
          }
        } else if (process.platform === 'darwin') {
          // MacOS
          try {
            execSync('pkill -f "Google Chrome"');
          } catch (e) {
            console.log('No se encontraron procesos de Chrome ejecutándose');
          }
        } else {
          // Linux y otros sistemas
          try {
            execSync('pkill chrome');
            execSync('pkill chromium');
          } catch (e) {
            console.log('No se encontraron procesos de Chrome/Chromium ejecutándose');
          }
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
private async processMessageCommands(message: Message): Promise<void> {
  try {
    const text = message.body.trim();
    
    if (!text) return; // Ignorar mensajes vacíos
    
    // Verificar si es una respuesta numérica (1, 2, 3...)
    const numericMatch = text.match(/^([0-9]+)$/); 
    if (numericMatch) {
      const selectedNumber = parseInt(numericMatch[1], 10);
      console.log(`Detectada posible respuesta numérica: ${selectedNumber}`);
      
      // Intentar procesar como respuesta a opciones previas
      const processed = await this.processNumericResponse(message, selectedNumber);
      if (processed) {
        console.log(`Mensaje procesado como respuesta numérica: ${selectedNumber}`);
        return; // El mensaje ya fue procesado como respuesta numérica
      }
      // Si no se procesó como respuesta numérica, continuar con el procesamiento normal
    }
    
    const db = await (await import('../database/mysql')).getDatabase();
      
    // Buscar comandos con prefijo
    if (text.startsWith('!')) {
      const command = text.toLowerCase();
      
      // Buscar en la base de datos el comando con prefijo
      const results = await db.query(
        'SELECT id, command, response, response_type FROM custom_commands WHERE command = ? AND use_prefix = 1',
        [command]
      );
      
      if (Array.isArray(results) && results.length > 0) {
        const { id, response, response_type } = results[0];
        
        // Comprobar el tipo de respuesta
        if (response_type === 'list' || response_type === 'buttons') {
          // Procesar como comando de tipo lista usando botones interactivos
          await this.processListCommand(message, id, response);
        } else {
          // Respuesta de texto simple
          await message.reply(response);
        }
        return;
      }
    }
    
    // Buscar comandos sin prefijo (coincidencia exacta con el texto completo)
    const results = await db.query(
      'SELECT id, command, response, response_type FROM custom_commands WHERE command = ? AND use_prefix = 0',
      [text.toLowerCase()]
    );
    
    if (Array.isArray(results) && results.length > 0) {
      const { id, response, response_type } = results[0];
      
      // Comprobar el tipo de respuesta
      if (response_type === 'list' || response_type === 'buttons') {
        // Procesar como comando de tipo lista usando botones interactivos
        await this.processListCommand(message, id, response);
      } else {
        // Respuesta de texto simple
        await message.reply(response);
      }
      return;
    }
    
    // También buscar si el texto contiene un comando sin prefijo
    const partialResults = await db.query(
      'SELECT id, command, response, response_type FROM custom_commands WHERE use_prefix = 0 AND ? LIKE CONCAT("%", command, "%")',
      [text.toLowerCase()]
    );
    
    if (Array.isArray(partialResults) && partialResults.length > 0) {
      const { id, response, response_type } = partialResults[0]; // Tomar la primera coincidencia
      
      // Comprobar el tipo de respuesta
      if (response_type === 'list' || response_type === 'buttons') {
        // Procesar como comando de tipo lista usando botones interactivos
        await this.processListCommand(message, id, response);
      } else {
        // Respuesta de texto simple
        await message.reply(response);
      }
    }
    
  } catch (error) {
    console.error('Error al procesar comandos:', error);
  }
}
  
  /**
   * Procesa comandos de tipo lista y envía mensajes con botones interactivos
   * @param message Mensaje recibido
   * @param commandId ID del comando en la base de datos
   * @param introText Texto introductorio para mostrar en el mensaje
   */
  /**
   * Enviar un mensaje con botones interactivos (método recomendado en lugar de listas)
   * Este método convierte las secciones e items en botones individuales
   * Implementado según la documentación oficial de whatsapp-web.js
   */
  async sendButtonMessage(to: string, body: string, sections: any[], title: string = '', footer: string = '') {
    try {
      console.log(`Intentando enviar botones interactivos a: ${to}`);
      console.log(`Texto principal: "${body}"`);
      console.log('Estructura de secciones recibida:', JSON.stringify(sections, null, 2));
      
      // Validar que la estructura de las secciones es correcta
      if (!Array.isArray(sections) || sections.length === 0) {
        throw new Error('No hay secciones para mostrar en los botones');
      }
      
      // Estructura de botones según especificación de whatsapp-web.js
      // https://docs.wwebjs.dev/global.html#ButtonSpec
      const buttons = [];
      let buttonCount = 0;
      const maxButtons = 3; // WhatsApp limita a 3 botones por mensaje
      
      // Convertir los items de la lista en botones individuales
      for (const section of sections) {
        console.log('Procesando sección:', section.title || 'Sin título');
        
        // Verificar si la sección tiene la estructura correcta
        if (!section.rows || !Array.isArray(section.rows)) {
          console.warn('Sección sin estructura de rows válida:', section);
          continue;
        }
        
        if (section.rows.length === 0) {
          console.warn('Sección sin elementos en rows');
          continue;
        }
        
        console.log(`La sección tiene ${section.rows.length} elementos`);
        
        for (const row of section.rows) {
          if (buttonCount >= maxButtons) {
            console.log('Alcanzado límite de 3 botones. Ignorando elementos restantes.');
            break;
          }
          
          // Crear ID único para cada botón si no existe
          // IMPORTANTE: el ID debe ser corto y único según la documentación
          const randomId = Math.random().toString(36).substring(2, 8);
          const buttonId = String(row.id || randomId);
          
          // El título del botón es obligatorio y no puede estar vacío
          const buttonText = row.title || `Opción ${buttonCount + 1}`;
          
          console.log(`Creando botón: ID=${buttonId}, Texto=${buttonText}`);
          
          // Estructura exacta según ButtonSpec
          buttons.push({
            id: buttonId,
            body: buttonText
          });
          
          buttonCount++;
        }
        
        if (buttonCount >= maxButtons) break;
      }
      
      if (buttons.length === 0) {
        throw new Error('No se pudo crear ningún botón a partir de los elementos de la lista');
      }
      
      console.log(`Creando ${buttons.length} botones interactivos:`, JSON.stringify(buttons, null, 2));
      
      // Incluir el título de la primera sección en el footer si no hay footer personalizado
      let finalFooter = footer || '';
      if (!finalFooter && sections[0] && sections[0].title) {
        finalFooter = sections[0].title;
      }
      
      // Crear el objeto Buttons y enviarlo
      try {
        const { Buttons } = await import('whatsapp-web.js');
        
        // Asegurar que el body nunca sea vacío (requisito de WhatsApp)
        const finalBody = body || 'Selecciona una opción:';
        
        // Crear objeto Buttons según la especificación exacta
        const buttonsMessage = new Buttons(
          finalBody,           // body: texto principal del mensaje
          buttons,            // buttons: array de botones con formato {id, body}
          title || '',        // title: título opcional (puede ser vacío)
          finalFooter         // footer: pie de mensaje opcional
        );
        
        console.log('Objeto de botones creado:', JSON.stringify({
          body: finalBody, 
          buttonsCount: buttons.length,
          title: title || '[sin título]',
          footer: finalFooter
        }, null, 2));
        
        // Enviar el mensaje con botones
        console.log('Enviando mensaje con botones interactivos...');
        const result = await this.client.sendMessage(to, buttonsMessage);
        console.log('Botones interactivos enviados exitosamente.');
        return result;
      } catch (error) {
        const buttonError = error as Error; // Cast del error para acceder a propiedades
        console.error('Error al enviar botones interactivos:', buttonError);
        console.error('Detalles del error:', buttonError.message || 'Error desconocido');
        if (buttonError.stack) console.error('Stack trace:', buttonError.stack);
        
        throw buttonError; // Re-lanzar para que sea capturado por el try/catch exterior
      }
    } catch (error) {
      console.error('Error detallado al enviar mensaje con botones:', error);
      
      // Si hay más de 3 secciones o elementos, enviamos un mensaje de texto alternativo
      try {
        let textMessage = `${body}\n\n`;
        let optionCount = 1;
        
        for (const section of sections) {
          if (section.title) {
            textMessage += `*${section.title}*\n`;
          }
          
          if (Array.isArray(section.rows)) {
            for (const row of section.rows) {
              textMessage += `${optionCount}. ${row.title || 'Opción'}${row.description ? `: ${row.description}` : ''}\n`;
              optionCount++;
            }
          }
          textMessage += '\n';
        }
        
        textMessage += '\n⚠️ No se pudieron mostrar los botones interactivos. Responde con el número de la opción que deseas seleccionar.';
        
        await this.client.sendMessage(to, textMessage);
        console.log('Mensaje de texto alternativo enviado correctamente.');
        return { text: textMessage };
      } catch (fallbackError) {
        console.error('No se pudo enviar el mensaje alternativo:', fallbackError);
        return null;
      }
    }
  }
  
  private async processListCommand(message: Message, commandId: number, introText: string) {
    try {
      console.log(`Procesando comando de tipo lista (ID: ${commandId})`);
      console.log(`Comando: ${message.body}`);
      console.log(`Texto introductorio: "${introText}"`);      
      
      const db = await (await import('../database/mysql')).getDatabase();
      
      // Obtener las secciones del comando
      const sections = await db.query(
        'SELECT id, title FROM list_sections WHERE command_id = ? ORDER BY id ASC', 
        [commandId]
      );
      
      console.log(`Query result para secciones:`, JSON.stringify(sections, null, 2));
      
      if (!Array.isArray(sections) || sections.length === 0) {
        console.log('El comando no tiene secciones definidas');
        await message.reply(`${introText}\n\n⚠️ Este comando está configurado como lista pero no tiene opciones definidas.`);
        return true;
      }
      
      console.log(`Encontradas ${sections.length} secciones para el comando`);
      
      // Formatear las secciones con sus elementos
      const formattedSections = [];
      let totalItems = 0;
      
      for (const section of sections) {
        console.log(`Procesando sección ID: ${section.id}, Título: "${section.title}"`);
        
        const items = await db.query(
          'SELECT row_id, title, description FROM list_items WHERE section_id = ? ORDER BY id ASC',
          [section.id]
        );
        
        console.log(`Query result para items de la sección ${section.id}:`, JSON.stringify(items, null, 2));
        
        if (Array.isArray(items) && items.length > 0) {
          console.log(`Se encontraron ${items.length} elementos en la sección ${section.id}`);
          totalItems += items.length;
          
          // Verificar y corregir la estructura de cada elemento
          const formattedRows = items.map((item, index) => {
            // Generar un ID único si no existe
            const rowId = item.row_id || `item_${section.id}_${index}`;
            
            // Asegurarse de que el título no esté vacío
            const rowTitle = item.title || `Opción ${index + 1}`;
            
            return {
              id: rowId,
              title: rowTitle,
              description: item.description || ''
            };
          });
          
          formattedSections.push({
            title: section.title || `Sección ${formattedSections.length + 1}`,
            rows: formattedRows
          });
        } else {
          console.log(`No se encontraron elementos en la sección ${section.id}`);
        }
      }
      
      console.log(`Total de secciones formateadas: ${formattedSections.length}`);
      console.log(`Total de elementos encontrados: ${totalItems}`);
      
      if (formattedSections.length === 0) {
        console.log('No se encontraron elementos en las secciones');
        await message.reply(`${introText}\n\n⚠️ Este comando está configurado como lista pero no tiene elementos definidos.`);
        return true;
      }
      
      // Imprimir la estructura completa de las secciones formateadas para debug
      console.log('Estructura final de secciones formateadas:', JSON.stringify(formattedSections, null, 2));
      
      // NOTA: Botones interactivos han sido deprecados por WhatsApp (julio 2024)
      // Por lo tanto, usamos directamente el formato de texto como solución principal
      console.log('Enviando opciones como mensaje de texto (los botones están deprecados)');
      let textMessage = `${introText}\n\n`;
      let optionCount = 1;
      
      // Almacenar las opciones para este usuario
      const userOptions: UserOptionsState = {
        commandId: commandId,
        options: [],
        timestamp: Date.now()
      };
      
      for (const section of formattedSections) {
        if (section.title) {
          textMessage += `*${section.title}*\n`;
        }
        
        if (Array.isArray(section.rows)) {
          for (const row of section.rows) {
            // Agregar opción al mensaje
            textMessage += `${optionCount}. ${row.title}${row.description ? `: ${row.description}` : ''}\n`;
            
            // Almacenar esta opción en el mapa de opciones del usuario
            userOptions.options.push({
              number: optionCount,
              title: row.title,
              description: row.description || '',
              sectionId: 0,  // Valor por defecto, deberíamos tener un ID más específico
              itemId: row.id || String(optionCount)
            });
            
            optionCount++;
          }
        }
        textMessage += '\n';
      }
      
      textMessage += '\n📝 Responde con el número de la opción que deseas seleccionar.';
      
      try {
        // Guardar las opciones en el mapa antes de enviar el mensaje
        this.userOptionsMap.set(message.from, userOptions);
        console.log(`Opciones guardadas para el usuario ${message.from}:`, JSON.stringify(userOptions, null, 2));
        
        await message.reply(textMessage);
        console.log('Mensaje de texto con opciones enviado exitosamente');
        return true;
      } catch (textError) {
        console.error('Error al enviar mensaje de texto con opciones:', textError);
        await message.reply('Lo siento, ha ocurrido un error al procesar este comando. Por favor, inténtalo más tarde.');
        return false;
      }
    } catch (error) {
      console.error('Error al procesar comando de lista:', error);
      await message.reply('Lo siento, ha ocurrido un error al mostrar las opciones. Por favor, intenta más tarde.');
      return false;
    }
  }
  
  // Procesar respuestas numéricas a opciones previamente enviadas
  private async processNumericResponse(message: Message, number: number): Promise<boolean> {
    try {
      const userPhone = message.from;
      
      // Verificar si tenemos opciones guardadas para este usuario
      if (!this.userOptionsMap.has(userPhone)) {
        console.log(`No hay opciones recientes guardadas para ${userPhone}`);
        return false;
      }
      
      const userState = this.userOptionsMap.get(userPhone)!;
      
      // Verificar si las opciones no han expirado
      if (Date.now() - userState.timestamp > this.OPTIONS_EXPIRY_TIME) {
        console.log(`Las opciones para ${userPhone} han expirado, eliminando...`);
        this.userOptionsMap.delete(userPhone);
        return false;
      }
      
      // Buscar la opción seleccionada
      const selectedOption = userState.options.find(opt => opt.number === number);
      
      // Si no se encuentra la opción, informar al usuario
      if (!selectedOption) {
        console.log(`Opción ${number} no válida para ${userPhone}. Opciones disponibles:`, 
          userState.options.map(o => o.number));
        await message.reply(`⚠️ El número ${number} no es una opción válida.`);
        return true; // Consideramos que fue procesado aunque la opción no sea válida
      }
      
      console.log(`Usuario ${userPhone} seleccionó la opción ${number}: ${selectedOption.title}`);
      
      // Obtener la base de datos
      const db = await (await import('../database/mysql')).getDatabase();
      
      // Buscar si hay respuesta asociada a esta opción
      const listItemResponse = await db.query(
        'SELECT response FROM list_items WHERE section_id = ? AND row_id = ?',
        [selectedOption.sectionId, selectedOption.itemId]
      );
      
      // Enviar la respuesta si existe o un mensaje genérico
      if (Array.isArray(listItemResponse) && listItemResponse.length > 0 && listItemResponse[0].response) {
        await message.reply(listItemResponse[0].response);
      } else {
        await message.reply(`Has seleccionado: *${selectedOption.title}*${selectedOption.description ? ` - ${selectedOption.description}` : ''}`);
      }
      
      // Eliminar las opciones guardadas para evitar respuestas duplicadas
      this.userOptionsMap.delete(userPhone);
      return true;
    } catch (error) {
      console.error('Error al procesar respuesta numérica:', error);
      return false;
    }
  }
  

}

// Exportar una instancia por defecto para facilitar su uso
export const whatsappClient = WhatsAppClient.getInstance();
