import { NextRequest, NextResponse } from 'next/server';
import { applyMigration, registerMigration } from '../../../../lib/database/apply-migration';

/**
 * POST - Aplicar una migración específica
 */
export async function POST(req: NextRequest) {
  try {
    const { migrationName } = await req.json();
    
    if (!migrationName) {
      return NextResponse.json({
        success: false,
        message: 'Nombre de migración requerido'
      }, { status: 400 });
    }
    
    const success = await applyMigration(migrationName);
    
    // Registrar el resultado de la migración
    await registerMigration(migrationName, success);
    
    return NextResponse.json({
      success,
      message: success ? 
        `Migración "${migrationName}" aplicada con éxito` : 
        `Error al aplicar la migración "${migrationName}"`
    });
  } catch (error) {
    console.error('Error al procesar la solicitud de migración:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al procesar la solicitud de migración',
      error: (error as Error).message
    }, { status: 500 });
  }
}

/**
 * GET - Listar migraciones disponibles
 */
export async function GET(req: NextRequest) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const migrationsPath = path.join(process.cwd(), 'src', 'lib', 'database', 'migrations');
    
    if (!fs.existsSync(migrationsPath)) {
      return NextResponse.json({
        success: false,
        message: 'Directorio de migraciones no encontrado'
      }, { status: 404 });
    }
    
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter((file: string) => file.endsWith('.sql'))
      .map((file: string) => ({
        name: file,
        path: `/api/migrations/apply?name=${encodeURIComponent(file)}`
      }));
    
    return NextResponse.json({
      success: true,
      migrations: migrationFiles
    });
  } catch (error) {
    console.error('Error al listar migraciones:', error);
    return NextResponse.json({
      success: false,
      message: 'Error al listar migraciones',
      error: (error as Error).message
    }, { status: 500 });
  }
}
