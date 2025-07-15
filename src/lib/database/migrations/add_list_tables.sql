-- Añadir tipo de respuesta a la tabla custom_commands
ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS response_type VARCHAR(20) DEFAULT 'text';

-- Tabla para secciones de listas
CREATE TABLE IF NOT EXISTS list_sections (
  id INT PRIMARY KEY AUTO_INCREMENT,
  command_id INT,
  title VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (command_id) REFERENCES custom_commands(id) ON DELETE CASCADE
);

-- Tabla para elementos dentro de cada sección
CREATE TABLE IF NOT EXISTS list_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  section_id INT,
  row_id VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  response TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (section_id) REFERENCES list_sections(id) ON DELETE CASCADE
);
