import { NextRequest, NextResponse } from 'next/server';
import { CommandService } from '../../../../../services/CommandService';
import { CommandRepository } from '../../../../../repositories/CommandRepository';
import { getDatabase } from '../../../../../lib/database/mysql';

type RouteParams = { params: { id: string } };

/**
 * GET - Obtener un comando por ID usando Repository Pattern
 */
export async function GET(
  req: NextRequest,
  context: RouteParams
) {
  try {
    const id = parseInt(context.params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        message: 'ID del comando debe ser un número válido'
      }, { status: 400 });
    }
    
    // Crear instancia del servicio
    const db = await getDatabase();
    const commandRepository = new CommandRepository(db);
    const commandService = new CommandService(commandRepository);
    
    // Obtener comando
    const result = await commandService.getCommandById(id);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        command: result.data
      });
    } else {
      const statusCode = result.error?.includes('no encontrado') ? 404 : 500;
      return NextResponse.json({
        success: false,
        message: result.error
      }, { status: statusCode });
    }
  } catch (error) {
    console.error('Error en GET /api/whatsapp/commands-v2/[id]:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al obtener comando',
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * PUT - Actualizar un comando por ID usando Repository Pattern
 */
export async function PUT(
  req: NextRequest,
  context: RouteParams
) {
  try {
    const id = parseInt(context.params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        message: 'ID del comando debe ser un número válido'
      }, { status: 400 });
    }
    
    // Extraer los datos de la solicitud
    const body = await req.json();
    const { 
      command, 
      response, 
      title, 
      intro_text, 
      items,
      // Manejar ambas variantes del tipo de respuesta (camelCase y snake_case)
      responseType,
      response_type,
      // Manejar ambas variantes de usePrefix (camelCase y snake_case)
      usePrefix,
      use_prefix
    } = body;
    
    // Crear instancia del servicio
    const db = await getDatabase();
    const commandRepository = new CommandRepository(db);
    const commandService = new CommandService(commandRepository);
    
    // Preparar datos de actualización
    const updateData: any = {};
    
    if (command !== undefined) updateData.command = command;
    if (response !== undefined) updateData.response = response;
    if (title !== undefined) updateData.title = title;
    if (intro_text !== undefined) updateData.intro_text = intro_text;
    if (items !== undefined) updateData.items = items;
    
    if (responseType !== undefined || response_type !== undefined) {
      updateData.responseType = responseType || response_type;
    }
    
    if (usePrefix !== undefined || use_prefix !== undefined) {
      updateData.usePrefix = usePrefix !== undefined ? usePrefix : use_prefix;
    }
    
    // Actualizar comando
    const result = await commandService.updateCommand(id, updateData);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        command: result.data
      });
    } else {
      const statusCode = result.error?.includes('no encontrado') ? 404 : 500;
      return NextResponse.json({
        success: false,
        message: result.error
      }, { status: statusCode });
    }
  } catch (error) {
    console.error('Error en PUT /api/whatsapp/commands-v2/[id]:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al actualizar comando',
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * DELETE - Eliminar un comando por ID usando Repository Pattern
 */
export async function DELETE(
  req: NextRequest,
  context: RouteParams
) {
  try {
    const id = parseInt(context.params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({
        success: false,
        message: 'ID del comando debe ser un número válido'
      }, { status: 400 });
    }
    
    // Crear instancia del servicio
    const db = await getDatabase();
    const commandRepository = new CommandRepository(db);
    const commandService = new CommandService(commandRepository);
    
    // Eliminar comando
    const result = await commandService.deleteCommand(id);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      });
    } else {
      const statusCode = result.error?.includes('no encontrado') ? 404 : 500;
      return NextResponse.json({
        success: false,
        message: result.error
      }, { status: statusCode });
    }
  } catch (error) {
    console.error('Error en DELETE /api/whatsapp/commands-v2/[id]:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al eliminar comando',
      error: (error as Error).message
    }, { status: 500 });
  }
}
