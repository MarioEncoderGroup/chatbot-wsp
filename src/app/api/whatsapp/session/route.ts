import { NextRequest, NextResponse } from 'next/server';
import { whatsappClient } from '@/lib/whatsapp/client';

/**
 * API para obtener información de la sesión actual
 */
export async function GET(req: NextRequest) {
  try {
    // Obtener información de la sesión
    const sessionInfo = await whatsappClient.getSessionInfo();
    
    return NextResponse.json({
      success: true,
      session: sessionInfo,
      lastChecked: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error al obtener información de la sesión:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error al obtener información de la sesión',
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * API para cerrar la sesión actual
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { action } = data;
    
    if (action === 'logout') {
      // Cerrar la sesión
      const result = await whatsappClient.logout();
      
      return NextResponse.json({
        success: true,
        message: 'Sesión cerrada exitosamente',
        result
      });
    } else if (action === 'delete') {
      // Eliminar completamente los datos de la sesión
      const result = await whatsappClient.deleteSession();
      
      return NextResponse.json({
        success: true,
        message: 'Datos de sesión eliminados exitosamente',
        result
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Acción no válida. Use "logout" o "delete"'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error en la gestión de la sesión:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error al gestionar la sesión',
      error: (error as Error).message
    }, { status: 500 });
  }
}
