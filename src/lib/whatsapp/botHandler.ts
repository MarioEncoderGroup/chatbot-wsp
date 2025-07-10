import { Message, MessageMedia } from 'whatsapp-web.js';
import { whatsappClient, whatsappEvents } from './client';
import { BotCommand, CommandCategory, BotResponse, MediaMessage } from '../../types/whatsapp';

// Importaciones para comandos
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

// Clase para manejar la lógica del bot
export class WhatsAppBotHandler {
  private commands: Map<string, BotCommand> = new Map();
  private prefix: string = '!'; // Prefijo para comandos
  private static instance: WhatsAppBotHandler;

  private constructor() {
    this.registerDefaultCommands();
    this.setupEventListeners();
  }

  // Patrón Singleton
  public static getInstance(): WhatsAppBotHandler {
    if (!WhatsAppBotHandler.instance) {
      WhatsAppBotHandler.instance = new WhatsAppBotHandler();
    }
    return WhatsAppBotHandler.instance;
  }

  // Configurar los escuchadores de eventos
  private setupEventListeners() {
    whatsappEvents.on('message', async (message: Message) => {
      await this.handleIncomingMessage(message);
    });
  }

  // Registrar comandos por defecto
  private registerDefaultCommands() {
    // Comando de ayuda
    this.registerCommand({
      name: 'help',
      description: 'Muestra la lista de comandos disponibles',
      category: CommandCategory.GENERAL,
      handler: async (message: Message, args) => {
        let helpText = '*Comandos disponibles:*\n\n';
        
        // Si se especifica una categoría, mostrar solo esos comandos
        const categoryFilter = args && args.length > 0 ? args[0].toLowerCase() : null;
        
        const commandsByCategory = new Map<CommandCategory, BotCommand[]>();
        
        // Agrupar comandos por categoría
        this.commands.forEach((command) => {
          const category = command.category || CommandCategory.GENERAL;
          if (!commandsByCategory.has(category)) {
            commandsByCategory.set(category, []);
          }
          commandsByCategory.get(category)?.push(command);
        });
        
        // Mostrar comandos por categoría
        if (categoryFilter) {
          // Intentar encontrar la categoría que coincida con el filtro
          const matchedCategory = Object.values(CommandCategory).find(
            category => category.toLowerCase() === categoryFilter
          );
          
          if (matchedCategory && commandsByCategory.has(matchedCategory)) {
            helpText = `*Comandos de ${matchedCategory}:*\n\n`;
            commandsByCategory.get(matchedCategory)?.forEach(command => {
              helpText += `*${this.prefix}${command.name}*: ${command.description}\n`;
            });
          } else {
            helpText = `No se encontraron comandos para la categoría '${categoryFilter}'. \nCategorías disponibles: ${Object.values(CommandCategory).join(', ')}`;
          }
        } else {
          // Mostrar todas las categorías
          commandsByCategory.forEach((commands, category) => {
            helpText += `\n*==== ${category} ====*\n`;
            commands.forEach(command => {
              helpText += `*${this.prefix}${command.name}*: ${command.description}\n`;
            });
          });
          
          helpText += `\nPuedes usar *${this.prefix}help [categoría]* para ver comandos específicos.`;
        }
        
        await message.reply(helpText);
        return { success: true, message: 'Ayuda enviada' };
      }
    });

    // Comando de ping
    this.registerCommand({
      name: 'ping',
      description: 'Comprueba si el bot está activo',
      category: CommandCategory.GENERAL,
      handler: async (message: Message) => {
        await message.reply('¡Pong! 🏓');
        return { success: true, message: 'Pong enviado' };
      }
    });

    // Comando para obtener la hora actual
    this.registerCommand({
      name: 'hora',
      description: 'Muestra la hora actual',
      category: CommandCategory.GENERAL,
      handler: async (message: Message) => {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZoneName: 'short'
        };
        const formatter = new Intl.DateTimeFormat('es-ES', options);
        await message.reply(`🕒 *Fecha y hora actual:*\n${formatter.format(now)}`);
        return { success: true, message: 'Hora enviada' };
      }
    });
    
    // Comando para obtener información del sistema
    this.registerCommand({
      name: 'status',
      description: 'Muestra el estado del bot y el sistema',
      category: CommandCategory.SYSTEM,
      handler: async (message: Message) => {
        const uptime = process.uptime();
        const uptimeStr = this.formatUptime(uptime);
        const memoryUsage = process.memoryUsage();
        const memoryUsageMB = Math.round(memoryUsage.rss / 1024 / 1024);
        const osInfo = `${os.type()} ${os.release()} (${os.arch()})`;
        
        const statusText = `*Estado del Bot*\n\n` +
          `🟢 *En línea:* Sí\n` +
          `⏱️ *Uptime:* ${uptimeStr}\n` +
          `🖥️ *Sistema:* ${osInfo}\n` +
          `🧠 *Memoria:* ${memoryUsageMB} MB\n` +
          `📝 *Comandos:* ${this.commands.size}\n`;
        
        await message.reply(statusText);
        return { success: true, message: 'Estado enviado' };
      }
    });
    
    // Comando para generar un sticker a partir de una imagen
    this.registerCommand({
      name: 'sticker',
      description: 'Convierte una imagen en sticker. Envía una imagen con el comando como pie de foto',
      category: CommandCategory.MEDIA,
      handler: async (message: Message) => {
        if (message.hasMedia) {
          try {
            const media = await message.downloadMedia();
            await message.reply(media, message.from, { sendMediaAsSticker: true });
            return { success: true, message: 'Sticker creado' };
          } catch (error) {
            console.error('Error al crear sticker:', error);
            await message.reply('Lo siento, hubo un error al crear el sticker.');
            return { success: false, message: 'Error al crear sticker' };
          }
        } else {
          await message.reply('Por favor, adjunta una imagen para convertirla en sticker.');
          return { success: false, message: 'No se proporcionó una imagen' };
        }
      }
    });
    
    // Comando para ver todos los comandos
    this.registerCommand({
      name: 'comandos',
      description: 'Alias de !help',
      category: CommandCategory.GENERAL,
      handler: async (message: Message, args) => {
        return await this.commands.get('help')?.handler(message, args) || { success: false };
      }
    });
  }
  
  // Dar formato al tiempo de uptime
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0 || days > 0) result += `${hours}h `;
    if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
    result += `${secs}s`;
    
    return result;
  }

  // Registrar un nuevo comando
  public registerCommand(command: BotCommand) {
    this.commands.set(command.name.toLowerCase(), command);
    console.log(`Comando registrado: ${command.name}`);
    return command;
  }
  
  // Verificar si un comando existe
  public hasCommand(commandName: string): boolean {
    return this.commands.has(commandName.toLowerCase());
  }
  
  // Eliminar un comando
  public removeCommand(commandName: string): boolean {
    return this.commands.delete(commandName.toLowerCase());
  }

  // Manejar mensajes entrantes
  private async handleIncomingMessage(message: Message): Promise<void> {
    // Ignorar mensajes de grupos si es necesario
    // if (message.from.includes('@g.us')) return;
    
    const content = message.body.trim();
    
    // Verificar si el mensaje es un comando
    if (content.startsWith(this.prefix)) {
      await this.processCommand(message);
    } else {
      // Procesar mensajes normales (no comandos)
      await this.processNormalMessage(message);
    }
  }

  // Procesar comandos
  private async processCommand(message: Message): Promise<BotResponse> {
    const body = message.body.trim();
    
    // Extraer nombre del comando y argumentos
    const commandBody = body.slice(this.prefix.length).trim();
    const args = commandBody.split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    
    if (!commandName) return { success: false, message: 'Comando vacío' };
    
    console.log(`Procesando comando: ${commandName} con args: [${args.join(', ')}]`);
    
    // Buscar el comando
    const command = this.commands.get(commandName);
    
    if (command) {
      console.log(`Ejecutando comando: ${commandName}`);
      try {
        const result = await command.handler(message, args);
        console.log(`Resultado del comando ${commandName}:`, result);
        return result;
      } catch (error: any) {
        console.error(`Error al ejecutar el comando ${commandName}:`, error);
        await message.reply(`❌ Ocurrió un error al ejecutar el comando: ${error.message}`);
        return { 
          success: false, 
          message: `Error al ejecutar el comando ${commandName}`, 
          error: error
        };
      }
    } else {
      // Comando no encontrado, buscar similares para sugerir
      const similarCommands = this.findSimilarCommands(commandName);
      if (similarCommands.length > 0) {
        const suggestions = similarCommands.map(cmd => `*${this.prefix}${cmd}*`).join(', ');
        await message.reply(`⚠️ Comando no encontrado: *${commandName}*\n\n¿Quisiste decir alguno de estos?\n${suggestions}`);
        return { success: false, message: 'Comando no encontrado, sugerencias enviadas' };
      } else {
        await message.reply(`⚠️ Comando no reconocido. Usa *${this.prefix}help* para ver los comandos disponibles.`);
        return { success: false, message: 'Comando no reconocido' };
      }
    }
  }
  
  // Encontrar comandos similares (para sugerencias)
  private findSimilarCommands(input: string, maxResults = 3): string[] {
    const commandNames = Array.from(this.commands.keys());
    
    // Filtrar comandos que comparten al menos 2 caracteres al principio
    return commandNames
      .filter(cmd => {
        // Si contiene la entrada como substring
        if (cmd.includes(input) || input.includes(cmd)) return true;
        
        // Si comparten al menos 2 caracteres al principio
        const minLength = Math.min(cmd.length, input.length);
        if (minLength >= 2) {
          const similarity = this.calculateSimilarity(cmd, input);
          return similarity > 0.4; // Umbral de similitud
        }
        
        return false;
      })
      .sort((a, b) => this.calculateSimilarity(b, input) - this.calculateSimilarity(a, input))
      .slice(0, maxResults);
  }
  
  // Calcular similitud entre dos strings (0-1)
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length >= str2.length ? str1 : str2;
    const shorter = str1.length >= str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }
  
  // Implementación de la distancia de Levenshtein para medir similitud
  private levenshteinDistance(str1: string, str2: string): number {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
    
    const costs = [];
    for (let i = 0; i <= str1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= str2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
            newValue = Math.min(newValue, lastValue, costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[str2.length] = lastValue;
    }
    
    return costs[str2.length];
  }

  // Procesar mensajes normales (no comandos)
  private async processNormalMessage(message: Message): Promise<BotResponse> {
    // Guardar el mensaje para futura referencia o análisis
    console.log(`Mensaje normal recibido: ${message.body} de ${message.from}`);
    
    // Si es un mensaje multimedia, registrar el tipo
    if (message.hasMedia) {
      try {
        const media = await message.downloadMedia();
        console.log(`Mensaje contiene multimedia de tipo: ${media.mimetype}`);
      } catch (error) {
        console.error('Error al procesar multimedia:', error);
        return { success: false, message: 'Error al procesar multimedia', error: error as Error };
      }
    }
    
    // Respuestas basadas en el contenido del mensaje
    const content = message.body.toLowerCase();
    
    // Matriz de respuestas a palabras clave
    const keywordResponses = [
      { keywords: ['hola', 'buenas', 'saludos'], response: '¡Hola! 👋 ¿En qué puedo ayudarte hoy?' },
      { keywords: ['gracias', 'agradec'], response: '¡De nada! Estoy aquí para ayudar 😊' },
      { keywords: ['ayuda', 'help', 'comandos'], response: `Para ver la lista de comandos disponibles, envía *${this.prefix}help*` },
      { keywords: ['cómo estás', 'como estas'], response: 'Estoy funcionando perfectamente, gracias por preguntar! 🤖' },
      { keywords: ['chiste', 'broma'], response: () => {
        const chistes = [
          '¿Por qué los programadores prefieren el frío? Porque odian los bugs (bichos)',
          '¿Qué le dice un bit a otro bit? Nos vemos en el bus',
          'Solo hay 10 tipos de personas en el mundo: las que entienden binario y las que no',
          'Si no puedes convencerlos, confúndelos con tu código',
          'La única "persona" que escucha mis comandos sin cuestionar es mi WhatsApp Bot'
        ];
        return chistes[Math.floor(Math.random() * chistes.length)];
      }}
    ];
    
    // Buscar coincidencias y responder
    for (const kr of keywordResponses) {
      if (kr.keywords.some(keyword => content.includes(keyword))) {
        const response = typeof kr.response === 'function' ? kr.response() : kr.response;
        await message.reply(response);
        return { success: true, message: 'Respuesta enviada' }; // Para evitar múltiples respuestas
      }
    }
    
    // Si el mensaje contiene una imagen y palabras relacionadas con sticker
    if (message.hasMedia && 
        (content.includes('sticker') || content.includes('pegatina'))) {
      try {
        const media = await message.downloadMedia();
        await message.reply(media, message.from, { sendMediaAsSticker: true });
        await message.reply('¡Aquí tienes tu sticker! Para próximas veces puedes usar el comando *!sticker*');
        return { success: true, message: 'Sticker creado desde mensaje normal' };
      } catch (error) {
        console.error('Error al crear sticker desde mensaje normal:', error);
        return { success: false, message: 'Error al crear sticker', error: error as Error };
      }
    }
    
    // Si llegamos aquí, no se procesó el mensaje con ninguna regla específica
    return { success: true, message: 'Mensaje recibido' };
  }

  // Cambiar el prefijo de comandos
  public setPrefix(newPrefix: string) {
    this.prefix = newPrefix;
    console.log(`Prefijo de comandos actualizado a: ${newPrefix}`);
  }

  // Obtener la lista de comandos registrados
  public getCommands(): Map<string, BotCommand> {
    return this.commands;
  }
  
  // Obtener la categoría por defecto para comandos
  public getDefaultCategory(): CommandCategory {
    return CommandCategory.GENERAL;
  }
}

// Exportar una instancia por defecto para facilitar su uso
export const botHandler = WhatsAppBotHandler.getInstance();
