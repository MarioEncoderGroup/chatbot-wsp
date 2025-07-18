import { Command, ListItem, ApiResponse } from '../types';
import { ICommandRepository } from '../interfaces/ICommandRepository';
import { CommandRepository } from '../repositories/CommandRepository';
import { getDatabase } from '../lib/database/mysql';

export class CommandService {
  private commandRepository: ICommandRepository;

  constructor(commandRepository?: ICommandRepository) {
    // Si no se proporciona un repositorio, crear uno por defecto
    this.commandRepository = commandRepository || new CommandRepository(getDatabase() as any);
  }

  async getAllCommands(type?: string): Promise<ApiResponse<Command[]>> {
    try {
      const commands = await this.commandRepository.findAll(type ? { type } : undefined);
      
      return {
        success: true,
        data: commands,
        message: 'Comandos obtenidos correctamente'
      };
    } catch (error) {
      console.error('Error en CommandService.getAllCommands:', error);
      return {
        success: false,
        error: 'Error al obtener comandos',
        data: []
      };
    }
  }

  async getCommandById(id: number): Promise<ApiResponse<Command>> {
    try {
      const command = await this.commandRepository.findById(id);
      
      if (!command) {
        return {
          success: false,
          error: 'Comando no encontrado'
        };
      }
      
      return {
        success: true,
        data: command,
        message: 'Comando obtenido correctamente'
      };
    } catch (error) {
      console.error('Error en CommandService.getCommandById:', error);
      return {
        success: false,
        error: 'Error al obtener comando'
      };
    }
  }

  async createCommand(commandData: {
    command: string;
    response: string;
    title?: string;
    intro_text?: string;
    usePrefix?: boolean;
    responseType?: string;
    createdBy?: string;
    items?: ListItem[];
  }): Promise<ApiResponse<Command>> {
    try {
      // Validaciones
      if (!commandData.command || !commandData.response) {
        return {
          success: false,
          error: 'Comando y respuesta son obligatorios'
        };
      }

      // Determinar valores por defecto
      const usePrefix = commandData.usePrefix !== undefined ? commandData.usePrefix : true;
      const responseType = commandData.responseType || 'text';
      const createdBy = commandData.createdBy || 'admin';

      // Validar título para comandos de lista
      if (responseType === 'list' && !commandData.title) {
        return {
          success: false,
          error: 'El título es obligatorio para comandos de tipo lista'
        };
      }

      // Verificar si el comando ya existe
      const normalizedCommand = this.normalizeCommand(commandData.command, usePrefix);
      const exists = await this.commandRepository.commandExists(normalizedCommand);
      
      if (exists) {
        return {
          success: false,
          error: 'El comando ya existe'
        };
      }

      // Preparar datos del comando
      const newCommand: Omit<Command, 'id'> = {
        command: normalizedCommand,
        response: commandData.response,
        use_prefix: usePrefix,
        response_type: responseType as 'text' | 'list' | 'buttons',
        created_by: createdBy,
        title: responseType === 'list' ? commandData.title : undefined,
        intro_text: responseType === 'list' ? commandData.intro_text : undefined
      };

      // Crear comando
      let createdCommand: Command;
      
      if (responseType === 'list' && commandData.items && commandData.items.length > 0) {
        createdCommand = await this.commandRepository.createWithItems(newCommand, commandData.items);
      } else {
        createdCommand = await this.commandRepository.create(newCommand);
      }

      return {
        success: true,
        data: createdCommand,
        message: 'Comando añadido correctamente'
      };
    } catch (error) {
      console.error('Error en CommandService.createCommand:', error);
      return {
        success: false,
        error: 'Error al añadir comando'
      };
    }
  }

  async updateCommand(id: number, commandData: {
    command?: string;
    response?: string;
    title?: string;
    intro_text?: string;
    usePrefix?: boolean;
    responseType?: string;
    items?: ListItem[];
  }): Promise<ApiResponse<Command>> {
    try {
      // Verificar que el comando existe
      const existingCommand = await this.commandRepository.findById(id);
      if (!existingCommand) {
        return {
          success: false,
          error: 'Comando no encontrado'
        };
      }

      // Preparar datos de actualización
      const updateData: Partial<Command> = {};
      
      if (commandData.command !== undefined) {
        const usePrefix = commandData.usePrefix !== undefined ? commandData.usePrefix : existingCommand.use_prefix;
        updateData.command = this.normalizeCommand(commandData.command, usePrefix);
      }
      
      if (commandData.response !== undefined) {
        updateData.response = commandData.response;
      }
      
      if (commandData.usePrefix !== undefined) {
        updateData.use_prefix = commandData.usePrefix;
      }
      
      if (commandData.responseType !== undefined) {
        updateData.response_type = commandData.responseType as 'text' | 'list' | 'buttons';
      }
      
      if (commandData.responseType === 'list') {
        if (commandData.title !== undefined) {
          updateData.title = commandData.title;
        }
        
        if (commandData.intro_text !== undefined) {
          updateData.intro_text = commandData.intro_text;
        }
      }

      // Actualizar comando
      let updatedCommand: Command | null;
      
      if (commandData.responseType === 'list' && commandData.items) {
        updatedCommand = await this.commandRepository.updateWithItems(id, updateData, commandData.items);
      } else {
        updatedCommand = await this.commandRepository.update(id, updateData);
      }

      if (!updatedCommand) {
        return {
          success: false,
          error: 'Error al actualizar comando'
        };
      }

      return {
        success: true,
        data: updatedCommand,
        message: 'Comando actualizado correctamente'
      };
    } catch (error) {
      console.error('Error en CommandService.updateCommand:', error);
      return {
        success: false,
        error: 'Error al actualizar comando'
      };
    }
  }

  async deleteCommand(id: number): Promise<ApiResponse<void>> {
    try {
      // Verificar que el comando existe
      const existingCommand = await this.commandRepository.findById(id);
      if (!existingCommand) {
        return {
          success: false,
          error: 'Comando no encontrado'
        };
      }

      const deleted = await this.commandRepository.delete(id);
      
      if (!deleted) {
        return {
          success: false,
          error: 'Error al eliminar comando'
        };
      }

      return {
        success: true,
        message: 'Comando eliminado correctamente'
      };
    } catch (error) {
      console.error('Error en CommandService.deleteCommand:', error);
      return {
        success: false,
        error: 'Error al eliminar comando'
      };
    }
  }

  async getCommandsByType(type: 'text' | 'list' | 'buttons'): Promise<ApiResponse<Command[]>> {
    try {
      const commands = await this.commandRepository.findByType(type);
      
      return {
        success: true,
        data: commands,
        message: `Comandos de tipo ${type} obtenidos correctamente`
      };
    } catch (error) {
      console.error('Error en CommandService.getCommandsByType:', error);
      return {
        success: false,
        error: `Error al obtener comandos de tipo ${type}`,
        data: []
      };
    }
  }

  private normalizeCommand(command: string, usePrefix: boolean): string {
    let normalized = command.trim().toLowerCase();
    
    // Limpiar cualquier prefijo existente
    if (normalized.startsWith('!')) {
      normalized = normalized.substring(1);
    }
    
    // Aplicar prefijo si es necesario
    if (usePrefix) {
      normalized = `!${normalized}`;
    }
    
    return normalized;
  }
}
