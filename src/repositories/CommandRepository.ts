import { Command, ListItem, QueryFilters } from '../types';
import { ICommandRepository } from '../interfaces/ICommandRepository';
import { Database } from '../lib/database/mysql';

export class CommandRepository implements ICommandRepository {
  private db: Database;

  constructor(database: Database) {
    this.db = database;
  }

  async findAll(filters?: QueryFilters): Promise<Command[]> {
    try {
      let query = `
        SELECT id, command, response, use_prefix, response_type, created_by, created_at, title, intro_text, updated_at
        FROM custom_commands 
      `;
      
      const queryParams: any[] = [];
      
      if (filters?.type) {
        query += 'WHERE response_type = ? ';
        queryParams.push(filters.type);
      }
      
      query += 'ORDER BY command ASC';
      
      if (filters?.limit) {
        query += ' LIMIT ?';
        queryParams.push(filters.limit);
        
        if (filters?.offset) {
          query += ' OFFSET ?';
          queryParams.push(filters.offset);
        }
      }
      
      const commands = await this.db.query<Command[]>(query, queryParams);
      
      // Para comandos de tipo lista, cargar sus elementos
      if (Array.isArray(commands)) {
        for (const command of commands) {
          if (command.response_type === 'list') {
            command.items = await this.getCommandItems(command.id!);
          }
        }
      }
      
      return Array.isArray(commands) ? commands : [];
    } catch (error) {
      console.error('Error al obtener comandos:', error);
      return [];
    }
  }

  async findById(id: number): Promise<Command | null> {
    try {
      const commands = await this.db.query<Command[]>(
        'SELECT id, command, response, use_prefix, response_type, created_by, created_at, title, intro_text, updated_at FROM custom_commands WHERE id = ?',
        [id]
      );
      
      if (Array.isArray(commands) && commands.length > 0) {
        const command = commands[0];
        
        // Si es de tipo lista, cargar sus elementos
        if (command.response_type === 'list') {
          command.items = await this.getCommandItems(id);
        }
        
        return command;
      }
      
      return null;
    } catch (error) {
      console.error('Error al obtener comando por ID:', error);
      return null;
    }
  }

  async findByType(type: 'text' | 'list' | 'buttons'): Promise<Command[]> {
    return this.findAll({ type });
  }

  async findByCommand(command: string): Promise<Command | null> {
    try {
      const commands = await this.db.query<Command[]>(
        'SELECT id, command, response, use_prefix, response_type, created_by, created_at, title, intro_text, updated_at FROM custom_commands WHERE command = ?',
        [command]
      );
      
      if (Array.isArray(commands) && commands.length > 0) {
        const foundCommand = commands[0];
        
        // Si es de tipo lista, cargar sus elementos
        if (foundCommand.response_type === 'list') {
          foundCommand.items = await this.getCommandItems(foundCommand.id!);
        }
        
        return foundCommand;
      }
      
      return null;
    } catch (error) {
      console.error('Error al buscar comando:', error);
      return null;
    }
  }

  async findWithItems(id: number): Promise<Command | null> {
    const command = await this.findById(id);
    if (command && command.response_type === 'list') {
      command.items = await this.getCommandItems(id);
    }
    return command;
  }

  async create(commandData: Omit<Command, 'id'>): Promise<Command> {
    try {
      // Normalizar el comando
      const normalizedCommand = this.normalizeCommand(commandData.command, commandData.use_prefix);
      
      const result = await this.db.query<any>(
        `INSERT INTO custom_commands 
        (command, response, use_prefix, response_type, created_by, title, intro_text, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          normalizedCommand,
          commandData.response,
          commandData.use_prefix ? 1 : 0,
          commandData.response_type,
          commandData.created_by || 'admin',
          commandData.response_type === 'list' ? commandData.title : null,
          commandData.response_type === 'list' ? commandData.intro_text : null
        ]
      );
      
      const insertId = Array.isArray(result) ? result[0]?.insertId : result.insertId;
      
      const createdCommand: Command = {
        id: insertId,
        ...commandData,
        command: normalizedCommand,
        created_at: new Date().toISOString()
      };
      
      return createdCommand;
    } catch (error) {
      console.error('Error al crear comando:', error);
      throw error;
    }
  }

  async createWithItems(commandData: Omit<Command, 'id'>, items: ListItem[]): Promise<Command> {
    return this.executeInTransaction(async () => {
      const command = await this.create(commandData);
      
      if (items.length > 0) {
        await this.addItemsToCommand(command.id!, items);
        command.items = items;
      }
      
      return command;
    });
  }

  async update(id: number, commandData: Partial<Command>): Promise<Command | null> {
    try {
      const updateFields: string[] = [];
      const params: any[] = [];
      
      if (commandData.command !== undefined) {
        const normalizedCommand = this.normalizeCommand(commandData.command, commandData.use_prefix ?? true);
        updateFields.push('command = ?');
        params.push(normalizedCommand);
      }
      
      if (commandData.response !== undefined) {
        updateFields.push('response = ?');
        params.push(commandData.response);
      }
      
      if (commandData.use_prefix !== undefined) {
        updateFields.push('use_prefix = ?');
        params.push(commandData.use_prefix ? 1 : 0);
      }
      
      if (commandData.response_type !== undefined) {
        updateFields.push('response_type = ?');
        params.push(commandData.response_type);
      }
      
      if (commandData.response_type === 'list') {
        if (commandData.title !== undefined) {
          updateFields.push('title = ?');
          params.push(commandData.title);
        }
        
        if (commandData.intro_text !== undefined) {
          updateFields.push('intro_text = ?');
          params.push(commandData.intro_text);
        }
      }
      
      updateFields.push('updated_at = NOW()');
      params.push(id);
      
      if (updateFields.length > 1) { // > 1 porque siempre tenemos updated_at
        await this.db.query(
          `UPDATE custom_commands SET ${updateFields.join(', ')} WHERE id = ?`,
          params
        );
      }
      
      return this.findById(id);
    } catch (error) {
      console.error('Error al actualizar comando:', error);
      return null;
    }
  }

  async updateWithItems(id: number, commandData: Partial<Command>, items?: ListItem[]): Promise<Command | null> {
    return this.executeInTransaction(async () => {
      const updatedCommand = await this.update(id, commandData);
      
      if (items && commandData.response_type === 'list') {
        await this.removeItemsFromCommand(id);
        await this.addItemsToCommand(id, items);
        if (updatedCommand) {
          updatedCommand.items = items;
        }
      }
      
      return updatedCommand;
    });
  }

  async delete(id: number): Promise<boolean> {
    return this.executeInTransaction(async () => {
      try {
        // Verificar si el comando existe y es de tipo lista
        const command = await this.findById(id);
        if (!command) {
          return false;
        }
        
        // Si es de tipo lista, eliminar elementos relacionados
        if (command.response_type === 'list') {
          await this.removeItemsFromCommand(id);
        }
        
        // Eliminar el comando
        await this.db.query('DELETE FROM custom_commands WHERE id = ?', [id]);
        
        return true;
      } catch (error) {
        console.error('Error al eliminar comando:', error);
        return false;
      }
    });
  }

  async addItemsToCommand(commandId: number, items: ListItem[]): Promise<void> {
    try {
      // Crear una sección para los elementos
      const sectionResult = await this.db.query<any>(
        'INSERT INTO list_sections (command_id, title) VALUES (?, ?)',
        [commandId, 'Default Section']
      );
      
      const sectionId = Array.isArray(sectionResult) ? sectionResult[0]?.insertId : sectionResult.insertId;
      
      // Insertar los elementos
      for (const item of items) {
        await this.db.query(
          'INSERT INTO list_items (section_id, row_id, title, description, response) VALUES (?, ?, ?, ?, ?)',
          [sectionId, item.row_id, item.title, item.description || null, item.response]
        );
      }
    } catch (error) {
      console.error('Error al agregar elementos al comando:', error);
      throw error;
    }
  }

  async removeItemsFromCommand(commandId: number): Promise<void> {
    try {
      // Obtener secciones del comando
      const sections = await this.db.query<any[]>(
        'SELECT id FROM list_sections WHERE command_id = ?',
        [commandId]
      );
      
      if (Array.isArray(sections)) {
        // Eliminar elementos de cada sección
        for (const section of sections) {
          await this.db.query(
            'DELETE FROM list_items WHERE section_id = ?',
            [section.id]
          );
        }
      }
      
      // Eliminar las secciones
      await this.db.query(
        'DELETE FROM list_sections WHERE command_id = ?',
        [commandId]
      );
    } catch (error) {
      console.error('Error al eliminar elementos del comando:', error);
      throw error;
    }
  }

  async commandExists(command: string, excludeId?: number): Promise<boolean> {
    try {
      let query = 'SELECT COUNT(*) as count FROM custom_commands WHERE command = ?';
      const params: any[] = [command];
      
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      
      const result = await this.db.query<any[]>(query, params);
      
      if (Array.isArray(result) && result.length > 0) {
        return result[0].count > 0;
      }
      
      return false;
    } catch (error) {
      console.error('Error al verificar existencia de comando:', error);
      return false;
    }
  }

  async executeInTransaction<T>(operation: () => Promise<T>): Promise<T> {
    const connection = await (this.db as any).pool.getConnection();
    await connection.beginTransaction();
    
    try {
      const result = await operation();
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private async getCommandItems(commandId: number): Promise<ListItem[]> {
    try {
      // Obtener secciones del comando
      const sections = await this.db.query<any[]>(
        'SELECT id FROM list_sections WHERE command_id = ? ORDER BY id ASC',
        [commandId]
      );
      
      const items: ListItem[] = [];
      
      if (Array.isArray(sections)) {
        // Para cada sección, obtener sus elementos
        for (const section of sections) {
          const sectionItems = await this.db.query<ListItem[]>(
            'SELECT id, row_id, title, description, response FROM list_items WHERE section_id = ? ORDER BY id ASC',
            [section.id]
          );
          
          if (Array.isArray(sectionItems)) {
            items.push(...sectionItems);
          }
        }
      }
      
      return items;
    } catch (error) {
      console.error('Error al obtener elementos del comando:', error);
      return [];
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
