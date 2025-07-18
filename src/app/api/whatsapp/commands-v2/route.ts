import { NextRequest, NextResponse } from 'next/server';
import { CommandService } from '../../../../services/CommandService';
import { CommandRepository } from '../../../../repositories/CommandRepository';
import { getDatabase } from '../../../../lib/database/mysql';

// Nuevo endpoint usando patrón Repository
// Este endpoint coexiste con el anterior para pruebas

/**
 * GET - Obtener todos los comandos usando Repository Pattern
 * Puede filtrar por tipo de respuesta usando el parámetro 'type'
 */
export async function GET(req: NextRequest) {
  try {
    // Extraer parámetros de consulta
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    
    // Crear instancia del servicio
    const db = await getDatabase();
    const commandRepository = new CommandRepository(db);
    const commandService = new CommandService(commandRepository);
    
    // Obtener comandos
    const result = await commandService.getAllCommands(type || undefined);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        commands: result.data
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error en GET /api/whatsapp/commands-v2:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al obtener comandos',
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * POST - Añadir un nuevo comando usando Repository Pattern
 */
export async function POST(req: NextRequest) {
  try {
    // Extraer los datos de la solicitud
    const body = await req.json();
    const { 
      command, 
      response, 
      title,
      intro_text,
      createdBy,
      items = [],
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
    
    // Preparar datos del comando
    const commandData = {
      command,
      response,
      title,
      intro_text,
      createdBy,
      items,
      responseType: responseType || response_type || 'text',
      usePrefix: usePrefix !== undefined ? usePrefix : (use_prefix !== undefined ? use_prefix : true)
    };
    
    // Crear comando
    const result = await commandService.createCommand(commandData);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        command: result.data
      });
    } else {
      const statusCode = result.error?.includes('ya existe') ? 409 : 400;
      return NextResponse.json({
        success: false,
        message: result.error
      }, { status: statusCode });
    }
  } catch (error) {
    console.error('Error en POST /api/whatsapp/commands-v2:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al añadir comando',
      error: (error as Error).message
    }, { status: 500 });
  }
}
