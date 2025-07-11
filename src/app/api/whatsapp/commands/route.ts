import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/mysql';

// API para gestionar los comandos del bot de WhatsApp

/**
 * GET - Obtener todos los comandos
 */
export async function GET(req: NextRequest) {
  try {
    const db = await getDatabase();
    
    // Consultar todos los comandos
    const commands = await db.query(`
      SELECT id, command, response, use_prefix, created_by, created_at 
      FROM custom_commands 
      ORDER BY command ASC
    `);
    
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
    const { command, response, usePrefix = true, createdBy = 'admin' } = await req.json();
    
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
    
    // Insertar el nuevo comando
    await db.query(
      `INSERT INTO custom_commands 
      (command, response, use_prefix, created_by, created_at) 
      VALUES (?, ?, ?, ?, NOW())`,
      [normalizedCommand, response, usePrefix ? 1 : 0, createdBy]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Comando añadido correctamente',
      command: {
        command: normalizedCommand,
        response,
        usePrefix,
        createdBy
      }
    });
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
    const { id, command, response, usePrefix } = await req.json();
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID del comando es obligatorio'
      }, { status: 400 });
    }
    
    const db = await getDatabase();
    
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
    
    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No se proporcionaron campos para actualizar'
      }, { status: 400 });
    }
    
    // Añadir ID al final de los parámetros
    params.push(id);
    
    // Actualizar el comando
    await db.query(
      `UPDATE custom_commands SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params
    );
    
    return NextResponse.json({
      success: true,
      message: 'Comando actualizado correctamente'
    });
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
