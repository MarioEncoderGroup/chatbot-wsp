import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/services/whatsappService';

// API para enviar mensaje a un número específico
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, message } = body;
    
    // Validación básica
    if (!to || !message) {
      return NextResponse.json({
        success: false,
        message: 'Los campos "to" y "message" son requeridos'
      }, { status: 400 });
    }
    
    // Verificar si el cliente está listo
    if (!whatsappService.isReady()) {
      return NextResponse.json({
        success: false,
        message: 'El cliente WhatsApp no está inicializado. Por favor escanee el código QR primero.'
      }, { status: 400 });
    }
    
    // Enviar el mensaje
    const result = await whatsappService.sendMessage(to, message);
    
    return NextResponse.json({
      success: true,
      message: 'Mensaje enviado correctamente',
      data: result
    });
  } catch (error) {
    console.error('Error al enviar mensaje:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error al enviar mensaje',
      error: (error as Error).message
    }, { status: 500 });
  }
}
