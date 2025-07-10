import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/services/whatsappService';
import { whatsappClient } from '@/lib/whatsapp/client';

// API para inicializar el cliente de WhatsApp
export async function POST(req: NextRequest) {
  try {
    // Verificar si ya está inicializado para evitar inicializaciones innecesarias
    if (whatsappClient.isReady()) {
      return NextResponse.json({
        success: true,
        message: 'Cliente de WhatsApp ya estaba inicializado',
        isReady: true
      });
    }
    
    // Resetear el cliente para una nueva inicialización limpia
    console.log('Iniciando cliente de WhatsApp desde la API...');
    const initialized = await whatsappService.initialize();
    
    if (initialized) {
      return NextResponse.json({
        success: true,
        message: 'Cliente de WhatsApp inicializado correctamente',
        isReady: whatsappClient.isReady()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Error al inicializar el cliente de WhatsApp. Verifique los logs del servidor.'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error al inicializar WhatsApp:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: (error as Error).message
    }, { status: 500 });
  }
}

// API para verificar el estado del cliente
export async function GET(req: NextRequest) {
  try {
    // Verificar estado del cliente
    const isReady = whatsappService.isReady();
    let qrCode = null;
    const sessionData: {
      authenticated: boolean;
      clientInfo: any;
    } = {
      authenticated: false,
      clientInfo: null
    };
    
    // Si el cliente no está listo, obtener el código QR como imagen base64
    if (!isReady) {
      qrCode = await whatsappService.getQR(true);
      
      // Si no hay código QR y el cliente no está listo, posiblemente necesitamos inicializar
      if (!qrCode) {
        console.log('No hay código QR disponible, verificando estado de autenticación...');
        // Esto es informativo solamente, no inicializamos aquí para evitar bloqueos
      }
    } else {
      // Si el cliente está listo, obtener información del cliente
      try {
        const client = whatsappClient.getClient();
        const clientInfo = await client.getState();
        sessionData.authenticated = true;
        sessionData.clientInfo = clientInfo;
      } catch (clientError) {
        console.warn('Error al obtener información del cliente:', clientError);
      }
    }
    
    return NextResponse.json({
      success: true,
      isReady,
      qrCode,
      lastUpdated: new Date().toISOString(),
      sessionInfo: sessionData
    });
  } catch (error) {
    console.error('Error al obtener estado de WhatsApp:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor',
      error: (error as Error).message
    }, { status: 500 });
  }
}
