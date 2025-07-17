import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/mysql';

export async function POST(request: Request) {
  try {
    const db = await getDatabase();
    const { commands } = await request.json();

    if (!commands || !Array.isArray(commands) || commands.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Debe proporcionar un array de IDs de comandos para eliminar' 
      }, { status: 400 });
    }

    // Generar placeholders para la consulta SQL
    const placeholders = commands.map(() => '?').join(',');
    
    // Eliminar elementos de listas seleccionadas
    await db.query(`
      DELETE FROM list_items 
      WHERE command_id IN (${placeholders});
    `, commands);

    // Eliminar comandos seleccionados
    const result = await db.query(`
      DELETE FROM custom_commands 
      WHERE id IN (${placeholders});
    `, commands);

    return NextResponse.json({ 
      success: true, 
      message: 'Las listas seleccionadas han sido eliminadas correctamente' 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error al eliminar las listas:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Error al eliminar las listas: ${error.message}` 
    }, { status: 500 });
  }
}
