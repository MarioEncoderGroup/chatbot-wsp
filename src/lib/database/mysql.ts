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
    
    // Crear un pool inicial sin especificar la base de datos
    // Esto nos permite conectarnos aunque la base de datos no exista aún
    this.pool = mysql.createPool({
      host: config.host,
      user: config.user,
      password: config.password,
      // No especificamos la base de datos inicialmente
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
      // Obtener una conexión del pool inicial (sin base de datos específica)
      const connection = await this.pool.getConnection();
      
      // Crear la base de datos si no existe
      try {
        console.log(`Intentando crear la base de datos '${this.config.database}' si no existe...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${this.config.database}`);
        console.log(`✅ Base de datos '${this.config.database}' creada o verificada correctamente`);
      } catch (dbError: any) {
        console.error(`Error al crear la base de datos: ${dbError.message}`);
        throw dbError; // Propagamos el error ya que sin base de datos no podemos continuar
      }
      
      // Liberar la conexión inicial
      connection.release();
      
      // Recrear el pool pero ahora sí conectando a la base de datos específica
      try {
        // Cerrar el pool anterior si existe
        await this.pool.end();
        
        // Crear un nuevo pool con la base de datos especificada
        this.pool = mysql.createPool({
          host: this.config.host,
          user: this.config.user,
          password: this.config.password,
          database: this.config.database, // Ahora sí especificamos la base de datos
          port: this.config.port || 3306,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0
        });
        
        // Verificar que la conexión funciona con la base de datos
        const testConnection = await this.pool.getConnection();
        testConnection.release();
        
        this._connected = true;
        console.log(`✅ Conexión establecida correctamente a la base de datos '${this.config.database}'`);
        
        // Crear tablas necesarias
        await this.createTables();
        
        // Inicializar datos básicos si es necesario
        await this.initializeBasicData();
        
        return;
      } catch (poolError) {
        console.error('Error al reconectar con la base de datos específica:', poolError);
        throw poolError;
      }
    } catch (error) {
      console.error('❌ Error al configurar la conexión con MySQL:', error);
      this._connected = false;
      
      // Reintentar después de un tiempo
      setTimeout(() => {
        this.connect().catch(err => console.error('Error al reintentar conexión a MySQL:', err));
      }, 5000);
      
      // No lanzar error para permitir que el bot funcione sin base de datos
      console.warn('El bot continuará funcionando sin persistencia de datos (modo degradado)');
    }
  }

  // Inicializar datos básicos
  private async initializeBasicData(): Promise<void> {
    try {
      // Verificar si ya hay comandos en la tabla
      const existingCommands = await this.query<any[]>('SELECT COUNT(*) as count FROM custom_commands');
      
      // Si no hay comandos, insertar algunos ejemplos predeterminados
      if (existingCommands && existingCommands[0] && existingCommands[0].count === 0) {
        console.log('Inicializando comandos predeterminados...');
        
        // Lista de comandos básicos de ejemplo
        const defaultCommands = [
          {
            command: 'hola',
            response: '👋 ¡Hola! ¿En qué puedo ayudarte hoy?',
            use_prefix: false,
            created_by: 'system'
          },
          {
            command: 'ayuda',
            response: '📌 *Comandos disponibles:*\n- !ayuda - Mostrar esta ayuda\n- !hola - Saludar\n- !info - Información del bot',
            use_prefix: true,
            created_by: 'system'
          },
          {
            command: 'info',
            response: '🤖 *Bot de WhatsApp*\nVersión: 1.0\nDesarrollado por EncoderGroup',
            use_prefix: true,
            created_by: 'system'
          }
        ];
        
        // Insertar comandos uno por uno
        for (const cmd of defaultCommands) {
          await this.query(
            'INSERT INTO custom_commands (command, response, use_prefix, created_by) VALUES (?, ?, ?, ?)',
            [cmd.command, cmd.response, cmd.use_prefix, cmd.created_by]
          );
        }
        
        console.log('✅ Comandos predeterminados inicializados correctamente');
      } else {
        console.log('Los comandos ya existen, no es necesario inicializar datos predeterminados');
      }
    } catch (error) {
      console.error('Error al inicializar datos básicos:', error);
      // No lanzamos el error para permitir que la aplicación funcione aunque esto falle
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
          use_prefix BOOLEAN DEFAULT TRUE,
          created_by VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `);
      
      // Tabla de estados de WhatsApp
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_status (
          id INT AUTO_INCREMENT PRIMARY KEY,
          status_type VARCHAR(50) NOT NULL,
          status_data JSON,
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
