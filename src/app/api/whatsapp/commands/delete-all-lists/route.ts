import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/mysql';

export async function DELETE() {
  try {
    const db = await getDatabase();

    // Eliminar elementos de listas
    await db.query(`
      DELETE FROM list_items 
      WHERE command_id IN (
        SELECT id FROM custom_commands WHERE type = 'list'
      );
    `);

    // Eliminar comandos de tipo lista
    const result = await db.query(`
      DELETE FROM custom_commands 
      WHERE type = 'list';
    `);

    return NextResponse.json({ 
      success: true, 
      message: 'Todas las listas han sido eliminadas correctamente' 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error al eliminar las listas:', error);
    return NextResponse.json({ 
      success: false, 
      message: `Error al eliminar las listas: ${error.message}` 
    }, { status: 500 });
  }
}
