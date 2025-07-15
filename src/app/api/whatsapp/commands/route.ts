import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/mysql';

// API para gestionar los comandos del bot de WhatsApp

// Interfaces para tipado
interface ListItem {
  id?: number;
  row_id: string;
  title: string;
  description?: string;
  response: string;
}

interface ListSection {
  id?: number;
  title: string;
  items: ListItem[];
}

interface Command {
  id?: number;
  command: string;
  response: string;
  usePrefix: boolean;
  responseType: 'text' | 'list' | 'buttons';
  sections?: ListSection[];
}

/**
 * GET - Obtener todos los comandos
 */
export async function GET(req: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Consultar todos los comandos
    const commands = await db.query(`
      SELECT id, command, response, use_prefix, response_type, created_by, created_at 
      FROM custom_commands 
      ORDER BY command ASC
    `);
    
    // Para cada comando de tipo 'list', cargar sus secciones y elementos
    if (Array.isArray(commands)) {
      for (const command of commands) {
        if (command.response_type === 'list') {
          // Obtener secciones
          const sections = await db.query(
            'SELECT id, title FROM list_sections WHERE command_id = ? ORDER BY id ASC',
            [command.id]
          );
          
          // Para cada sección, obtener sus elementos
          if (Array.isArray(sections)) {
            for (const section of sections) {
              const items = await db.query(
                'SELECT id, row_id, title, description, response FROM list_items WHERE section_id = ? ORDER BY id ASC',
                [section.id]
              );
              section.items = items;
            }
            
            command.sections = sections;
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      commands
    });
  } catch (error) {
    console.error('Error al obtener comandos:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al obtener comandos',
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * POST - Añadir un nuevo comando
 */
export async function POST(req: NextRequest) {
  try {
    const { 
      command, 
      response, 
      usePrefix = true, 
      createdBy = 'admin', 
      responseType = 'text',
      sections = []
    } = await req.json();
    
    if (!command || !response) {
      return NextResponse.json({
        success: false,
        message: 'Comando y respuesta son obligatorios'
      }, { status: 400 });
    }
    
    // Normalizar el comando
    let normalizedCommand = command.trim().toLowerCase();
    
    // Si no tiene prefijo y usePrefix es verdadero, añadirlo
    if (usePrefix && !normalizedCommand.startsWith('!')) {
      normalizedCommand = `!${normalizedCommand}`;
    }
    
    // Si tiene prefijo y usePrefix es falso, quitarlo
    if (!usePrefix && normalizedCommand.startsWith('!')) {
      normalizedCommand = normalizedCommand.substring(1);
    }
    
    const db = await getDatabase();
    
    // Verificar si el comando ya existe
    const existingCommands = await db.query(
      'SELECT id FROM custom_commands WHERE command = ?',
      [normalizedCommand]
    );
    
    if (Array.isArray(existingCommands) && existingCommands.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'El comando ya existe'
      }, { status: 409 });
    }
    
    // Iniciar transacción para asegurar que todos los datos se guardan correctamente
    const connection = await (db as any).pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Insertar el nuevo comando
      const [result] = await connection.query(
        `INSERT INTO custom_commands 
        (command, response, use_prefix, response_type, created_by, created_at) 
        VALUES (?, ?, ?, ?, ?, NOW())`,
        [normalizedCommand, response, usePrefix ? 1 : 0, responseType, createdBy]
      );
      
      const commandId = result.insertId;
      
      // Si es de tipo lista, procesar las secciones y elementos
      if (responseType === 'list' && Array.isArray(sections) && sections.length > 0) {
        for (const section of sections) {
          // Insertar sección
          const [sectionResult] = await connection.query(
            'INSERT INTO list_sections (command_id, title) VALUES (?, ?)',
            [commandId, section.title]
          );
          
          const sectionId = sectionResult.insertId;
          
          // Insertar elementos de la sección
          if (Array.isArray(section.items) && section.items.length > 0) {
            for (const item of section.items) {
              await connection.query(
                'INSERT INTO list_items (section_id, row_id, title, description, response) VALUES (?, ?, ?, ?, ?)',
                [sectionId, item.row_id, item.title, item.description || '', item.response]
              );
            }
          }
        }
      }
      
      await connection.commit();
      
      return NextResponse.json({
        success: true,
        message: 'Comando añadido correctamente',
        command: {
          id: commandId,
          command: normalizedCommand,
          response,
          usePrefix,
          responseType,
          sections: responseType === 'list' ? sections : undefined,
          createdBy
        }
      });
    } catch (transactionError) {
      // Si hay error, hacer rollback
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al añadir comando:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al añadir comando',
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * PUT - Actualizar un comando existente
 */
export async function PUT(req: NextRequest) {
  try {
    const { id, command, response, usePrefix, responseType, sections } = await req.json();
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID del comando es obligatorio'
      }, { status: 400 });
    }
    
    const db = await getDatabase();
    
    // Obtener el comando actual para verificar su tipo
    const existingCommand = await db.query(
      'SELECT response_type FROM custom_commands WHERE id = ?',
      [id]
    );
    
    if (!Array.isArray(existingCommand) || existingCommand.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Comando no encontrado'
      }, { status: 404 });
    }
    
    const currentResponseType = existingCommand[0].response_type || 'text';
    const isChangingToList = responseType === 'list' && currentResponseType !== 'list';
    const isChangingFromList = currentResponseType === 'list' && responseType !== 'list';
    
    // Normalizar el comando si se está actualizando
    let updateFields = [];
    const params: any[] = [];
    
    if (command !== undefined) {
      let normalizedCommand = command.trim().toLowerCase();
      
      // Si no tiene prefijo y usePrefix es verdadero, añadirlo
      if (usePrefix && !normalizedCommand.startsWith('!')) {
        normalizedCommand = `!${normalizedCommand}`;
      }
      
      // Si tiene prefijo y usePrefix es falso, quitarlo
      if (usePrefix === false && normalizedCommand.startsWith('!')) {
        normalizedCommand = normalizedCommand.substring(1);
      }
      
      updateFields.push('command = ?');
      params.push(normalizedCommand);
    }
    
    if (response !== undefined) {
      updateFields.push('response = ?');
      params.push(response);
    }
    
    if (usePrefix !== undefined) {
      updateFields.push('use_prefix = ?');
      params.push(usePrefix ? 1 : 0);
    }
    
    if (responseType !== undefined) {
      updateFields.push('response_type = ?');
      params.push(responseType);
    }
    
    if (updateFields.length === 0 && !isChangingToList && !isChangingFromList && !sections) {
      return NextResponse.json({
        success: false,
        message: 'No se proporcionaron campos para actualizar'
      }, { status: 400 });
    }
    
    // Iniciar transacción
    const connection = await (db as any).pool.getConnection();
    await connection.beginTransaction();
    
    try {
      if (updateFields.length > 0) {
        // Añadir ID al final de los parámetros
        params.push(id);
        
        // Actualizar el comando
        await connection.query(
          `UPDATE custom_commands SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
          params
        );
      }
      
      // Si es una lista o cambia a/desde tipo lista, gestionar secciones
      if (responseType === 'list' || currentResponseType === 'list') {
        if (isChangingFromList) {
          // Si cambia de lista a otro tipo, eliminar secciones y elementos
          await connection.query('DELETE FROM list_sections WHERE command_id = ?', [id]);
        } else if (sections && Array.isArray(sections)) {
          // Si es actualización de lista o cambia a lista
          
          if (isChangingToList) {
            // Si cambia a lista, asegurarse de que no haya datos antiguos
            await connection.query('DELETE FROM list_sections WHERE command_id = ?', [id]);
          }
          
          // Procesar las secciones actualizadas
          for (const section of sections) {
            let sectionId;
            
            if (section.id) {
              // Actualizar sección existente
              await connection.query(
                'UPDATE list_sections SET title = ? WHERE id = ? AND command_id = ?',
                [section.title, section.id, id]
              );
              sectionId = section.id;
            } else {
              // Crear nueva sección
              const [sectionResult] = await connection.query(
                'INSERT INTO list_sections (command_id, title) VALUES (?, ?)',
                [id, section.title]
              );
              sectionId = sectionResult.insertId;
            }
            
            // Gestionar elementos de la sección
            if (Array.isArray(section.items)) {
              // Eliminar elementos antiguos que no estén en la nueva lista
              const itemIds = section.items.filter((item: {id?: number}) => item.id).map((item: {id?: number}) => item.id);
              
              if (itemIds.length > 0) {
                await connection.query(
                  `DELETE FROM list_items WHERE section_id = ? AND id NOT IN (${itemIds.map(() => '?').join(',')})`,
                  [sectionId, ...itemIds]
                );
              } else {
                await connection.query('DELETE FROM list_items WHERE section_id = ?', [sectionId]);
              }
              
              // Actualizar o insertar elementos
              for (const item of section.items) {
                if (item.id) {
                  // Actualizar elemento existente
                  await connection.query(
                    'UPDATE list_items SET row_id = ?, title = ?, description = ?, response = ? WHERE id = ? AND section_id = ?',
                    [item.row_id, item.title, item.description || '', item.response, item.id, sectionId]
                  );
                } else {
                  // Insertar nuevo elemento
                  await connection.query(
                    'INSERT INTO list_items (section_id, row_id, title, description, response) VALUES (?, ?, ?, ?, ?)',
                    [sectionId, item.row_id, item.title, item.description || '', item.response]
                  );
                }
              }
            }
          }
          
          // Eliminar secciones que no estén en la actualización
          const sectionIds = sections.filter(section => section.id).map(section => section.id);
          
          if (sectionIds.length > 0) {
            await connection.query(
              `DELETE FROM list_sections WHERE command_id = ? AND id NOT IN (${sectionIds.map(() => '?').join(',')})`,
              [id, ...sectionIds]
            );
          }
        }
      }
      
      await connection.commit();
      
      return NextResponse.json({
        success: true,
        message: 'Comando actualizado correctamente'
      });
    } catch (transactionError) {
      await connection.rollback();
      throw transactionError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error al actualizar comando:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al actualizar comando',
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * DELETE - Eliminar un comando
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID del comando es obligatorio'
      }, { status: 400 });
    }
    
    const db = await getDatabase();
    
    // Eliminar el comando
    await db.query('DELETE FROM custom_commands WHERE id = ?', [id]);
    
    return NextResponse.json({
      success: true,
      message: 'Comando eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar comando:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al eliminar comando',
      error: (error as Error).message
    }, { status: 500 });
  }
}
