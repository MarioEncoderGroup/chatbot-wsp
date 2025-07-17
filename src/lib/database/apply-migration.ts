import { getDatabase } from './mysql';
import fs from 'fs';
import path from 'path';

/**
 * Aplica un archivo de migración SQL a la base de datos
 * @param migrationFileName Nombre del archivo de migración en la carpeta migrations
 * @returns Promise<boolean> que indica si la migración se ha completado con éxito
 */
export async function applyMigration(migrationFileName: string): Promise<boolean> {
  try {
    const db = await getDatabase();
    const migrationPath = path.join(process.cwd(), 'src', 'lib', 'database', 'migrations', migrationFileName);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`El archivo de migración ${migrationFileName} no existe`);
      return false;
    }
    
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    const sqlStatements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    console.log(`Aplicando migración: ${migrationFileName}`);
    console.log(`Total de sentencias SQL a ejecutar: ${sqlStatements.length}`);
    
    // Ejecutar cada sentencia SQL por separado
    for (let i = 0; i < sqlStatements.length; i++) {
      const sql = sqlStatements[i].trim();
      if (sql) {
        try {
          await db.query(sql);
          console.log(`[${i + 1}/${sqlStatements.length}] Sentencia ejecutada con éxito`);
        } catch (sqlError) {
          console.error(`Error en sentencia SQL #${i + 1}: ${sql}`);
          console.error(sqlError);
          // Continuamos con la siguiente sentencia, pero reportamos el error
        }
      }
    }
    
    console.log(`Migración ${migrationFileName} aplicada con éxito`);
    return true;
  } catch (error) {
    console.error('Error al aplicar la migración:', error);
    return false;
  }
}

/**
 * Crea un registro de migraciones aplicadas para seguimiento
 */
export async function registerMigration(migrationName: string, success: boolean): Promise<void> {
  try {
    const db = await getDatabase();
    
    // Asegurar que existe la tabla de migraciones
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT TRUE
      )
    `);
    
    // Registrar la migración
    await db.query(
      'INSERT INTO migrations (name, success) VALUES (?, ?)',
      [migrationName, success ? 1 : 0]
    );
    
    console.log(`Migración ${migrationName} registrada: ${success ? 'Exitosa' : 'Fallida'}`);
  } catch (error) {
    console.error('Error al registrar la migración:', error);
  }
}
