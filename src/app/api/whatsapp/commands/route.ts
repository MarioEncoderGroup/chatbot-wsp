import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '../../../../lib/database/mysql';

// API para gestionar los comandos del bot de WhatsApp

// Interfaces para tipado
interface ListItem {
  id?: number;
  row_id: string;
  title: string;
  description?: string;
  response: string;
}

interface Command {
  id?: number;
  command: string;
  title?: string;
  intro_text?: string;
  response: string;
  usePrefix: boolean;
  responseType: 'text' | 'list' | 'buttons';
  items?: ListItem[];
}

/**
 * GET - Obtener todos los comandos
 * Puede filtrar por tipo de respuesta usando el parámetro 'type'
 */
export async function GET(req: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Extraer parámetros de consulta
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // Puede ser 'text' o 'list'
    
    // Consultar todos los comandos
    let query = `
      SELECT id, command, response, use_prefix, response_type, created_by, created_at, title, intro_text
      FROM custom_commands 
    `;
    
    // Si se especifica un tipo, filtrar por él
    const queryParams = [];
    if (type) {
      query += 'WHERE response_type = ? ';
      queryParams.push(type);
    }
    
    // Ordenar resultados
    query += 'ORDER BY command ASC';
    
    const commands = await db.query(query, queryParams);
    
    // Para cada comando de tipo 'list', cargar sus elementos a través de las secciones
    if (Array.isArray(commands)) {
      for (const command of commands) {
        if (command.response_type === 'list') {
          // Primero obtenemos las secciones del comando
          const sections = await db.query(
            'SELECT id, title FROM list_sections WHERE command_id = ? ORDER BY id ASC',
            [command.id]
          );
          
          // Inicializamos array de items
          command.items = [];
          
          // Para cada sección, obtenemos sus elementos
          if (Array.isArray(sections)) {
            for (const section of sections) {
              const items = await db.query(
                'SELECT id, row_id, title, description, response FROM list_items WHERE section_id = ? ORDER BY id ASC',
                [section.id]
              );
              
              // Agregamos los items a la lista del comando
              if (Array.isArray(items)) {
                // Para estructura plana, agregamos todos los items directamente
                command.items.push(...items);
              }
            }
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
    // Extraer los datos de la solicitud
    const body = await req.json();
    const { 
      command, 
      response, 
      title = '',
      intro_text = '',
      createdBy = 'admin',
      items = [],
      // Manejar ambas variantes del tipo de respuesta (camelCase y snake_case)
      responseType, 
      response_type,
      // Manejar ambas variantes de usePrefix (camelCase y snake_case)
      usePrefix,
      use_prefix
    } = body;
    
    // Determinar si debe usar prefijo (preferir camelCase, pero aceptar snake_case como fallback)
    const finalUsePrefix = usePrefix !== undefined ? usePrefix : (use_prefix !== undefined ? use_prefix : true);
    
    // Determinar el tipo de respuesta (preferir camelCase, pero aceptar snake_case como fallback)
    const finalResponseType = responseType || response_type || 'text';
    
    if (!command || !response) {
      return NextResponse.json({
        success: false,
        message: 'Comando y respuesta son obligatorios'
      }, { status: 400 });
    }
    
    // Normalizar el comando
    let normalizedCommand = command.trim().toLowerCase();
    
    // Primero, limpiar cualquier prefijo existente para evitar duplicados
    if (normalizedCommand.startsWith('!')) {
      normalizedCommand = normalizedCommand.substring(1);
    }
    
    // Ahora aplicar la lógica de prefijos basada en la configuración
    if (finalUsePrefix) {
      normalizedCommand = `!${normalizedCommand}`;
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
    
    // Iniciar transacción para integridad de datos
    const connection = await (db as any).pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Insertar el nuevo comando
      const [result] = await connection.query(
        `INSERT INTO custom_commands 
        (command, response, use_prefix, response_type, created_by, title, intro_text, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [normalizedCommand, response, finalUsePrefix ? 1 : 0, finalResponseType, createdBy, 
         // Para comandos tipo lista, incluimos title e intro_text
         finalResponseType === 'list' ? title : null, 
         finalResponseType === 'list' ? intro_text : null]
      );
      
      const commandId = result.insertId;
      
      // Si es de tipo lista, procesar los elementos siguiendo la estructura correcta
      if (finalResponseType === 'list') {
        // Crear una sección principal para esta lista (usando el mismo título del comando)
        const [sectionResult] = await connection.query(
          'INSERT INTO list_sections (command_id, title) VALUES (?, ?)',
          [commandId, title]
        );
        
        const sectionId = sectionResult.insertId;
        
        // Insertar los elementos vinculados a la sección
        if (Array.isArray(items) && items.length > 0) {
          for (const item of items) {
            await connection.query(
              'INSERT INTO list_items (section_id, row_id, title, response) VALUES (?, ?, ?, ?)',
              [sectionId, item.row_id, item.title, item.response]
            );
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
          title,
          intro_text,
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

