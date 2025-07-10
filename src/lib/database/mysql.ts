import mysql from 'mysql2/promise';

// Configuración de la base de datos
interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port?: number;
}

// Clase para manejar la conexión a la base de datos
export class Database {
  private static instance: Database;
  private pool: mysql.Pool;
  private _connected: boolean = false; // Renombrado para evitar conflicto con el método

  private config: DatabaseConfig;
  
  private constructor(config: DatabaseConfig) {
    this.config = config;
    this.pool = mysql.createPool({
      host: config.host,
      user: config.user,
      password: config.password,
      database: config.database,
      port: config.port || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  // Patrón Singleton para la conexión a la base de datos
  public static async getInstance(config?: DatabaseConfig): Promise<Database> {
    if (!Database.instance) {
      if (!config) {
        config = {
          host: process.env.MYSQL_HOST || 'localhost',
          user: process.env.MYSQL_USER || 'root',
          password: process.env.MYSQL_PASSWORD || '',
          database: process.env.MYSQL_DATABASE || 'whatsapp_bot',
          port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306
        };
      }
      Database.instance = new Database(config);
      await Database.instance.connect();
    }
    return Database.instance;
  }

  // Conectar a MySQL
  public async connect(): Promise<void> {
    try {
      const connection = await this.pool.getConnection();
      
      // Intentar crear la base de datos si no existe
      try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${this.config.database}`);
        console.log(`✅ Base de datos '${this.config.database}' creada o ya existente`);
      } catch (dbError: any) {
        console.warn(`No se pudo crear la base de datos: ${dbError.message}`);
      }
      
      // Intentar usar la base de datos
      try {
        await connection.query(`USE ${this.config.database}`);
      } catch (useError: any) {
        console.warn(`No se pudo seleccionar la base de datos: ${useError.message}`);
      }
      
      connection.release();
      
      this._connected = true;
      console.log('✅ Conexión a MySQL establecida correctamente');
      
      // Crear tablas necesarias si no existen
      await this.createTables();
      
    } catch (error) {
      console.error('❌ Error al conectar con MySQL:', error);
      this._connected = false;
      
      // Reintentar después de un tiempo
      setTimeout(() => {
        this.connect().catch(err => console.error('Error al reconectar a MySQL:', err));
      }, 5000);
      
      // No lanzar error para permitir que el bot funcione sin base de datos
      console.warn('El bot continuará funcionando sin persistencia de datos');
    }
  }

  // Crear las tablas necesarias
  private async createTables(): Promise<void> {
    try {
      // Tabla de usuarios
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          phone VARCHAR(20) NOT NULL UNIQUE,
          name VARCHAR(100),
          is_blocked BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      // Tabla de mensajes
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT,
          direction ENUM('incoming', 'outgoing') NOT NULL,
          message_type VARCHAR(20) DEFAULT 'text',
          content TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
      
      // Tabla de comandos personalizados
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS custom_commands (
          id INT AUTO_INCREMENT PRIMARY KEY,
          command VARCHAR(50) NOT NULL UNIQUE,
          response TEXT NOT NULL,
          created_by VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ Tablas creadas correctamente');
    } catch (error) {
      console.error('❌ Error al crear tablas:', error);
    }
  }

  // Ejecutar una consulta SQL
  public async query<T>(sql: string, params: any[] = []): Promise<T> {
    if (!this._connected) {
      try {
        await this.connect();
      } catch (connError) {
        console.warn('No se pudo conectar a la base de datos, operación de base de datos ignorada');
        return [] as unknown as T; // Devolver arreglo vacío como fallback
      }
    }

    try {
      const [results] = await this.pool.execute(sql, params);
      return results as T;
    } catch (error) {
      console.error('Error al ejecutar consulta SQL:', error);
      // No propagar el error, devolver un resultado vacío
      return [] as unknown as T;
    }
  }

  // Verificar si la conexión está establecida
  public isConnected(): boolean {
    return this._connected;
  }

  // Cerrar la conexión
  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this._connected = false;
    }
  }
}

// Exportar la función para obtener la instancia de la base de datos
export const getDatabase = Database.getInstance;
