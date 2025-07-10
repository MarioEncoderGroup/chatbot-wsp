import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/services/whatsappService';

// API para gestionar comandos personalizados
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { command, response, createdBy } = body;
    
    // Validación básica
    if (!command || !response) {
      return NextResponse.json({
        success: false,
        message: 'Los campos "command" y "response" son requeridos'
      }, { status: 400 });
    }
    
    // Registrar comando personalizado
    const result = await whatsappService.registerCustomCommand(
      command,
      response,
      createdBy || 'system'
    );
    
    if (result) {
      return NextResponse.json({
        success: true,
        message: `Comando personalizado "${command}" registrado correctamente`
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Error al registrar comando personalizado'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error al gestionar comando:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: (error as Error).message
    }, { status: 500 });
  }
}

// API para cargar comandos personalizados desde la base de datos
export async function GET(req: NextRequest) {
  try {
    const count = await whatsappService.loadCustomCommands();
    
    return NextResponse.json({
      success: true,
      message: `${count} comandos personalizados cargados correctamente`
    });
  } catch (error) {
    console.error('Error al cargar comandos:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error al cargar comandos personalizados',
      error: (error as Error).message
    }, { status: 500 });
  }
}
