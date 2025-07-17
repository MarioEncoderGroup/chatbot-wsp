-- Actualización de la estructura de la base de datos para usar elementos planos sin secciones
-- Primero, modificar la tabla custom_commands para añadir campos necesarios para listas
ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS title VARCHAR(100) DEFAULT NULL;
ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS intro_text TEXT DEFAULT NULL;

-- Modificar la estructura de list_items para conectar directamente con custom_commands
ALTER TABLE list_items ADD COLUMN IF NOT EXISTS command_id INT DEFAULT NULL;

-- Crear índice en command_id
CREATE INDEX IF NOT EXISTS idx_list_items_command_id ON list_items(command_id);

-- Actualizar los list_items existentes con el command_id correspondiente
UPDATE list_items li
JOIN list_sections ls ON li.section_id = ls.id
SET li.command_id = ls.command_id
WHERE li.section_id IS NOT NULL;

-- Añadir restricción de clave foránea
ALTER TABLE list_items 
ADD CONSTRAINT fk_list_items_command_id 
FOREIGN KEY (command_id) REFERENCES custom_commands(id) ON DELETE CASCADE;

-- Después de la migración, eliminar la columna section_id
-- Pero primero debemos asegurarnos de que todos los datos se han migrado correctamente
-- Ejecutar esto solo después de verificar que la migración fue exitosa:
-- ALTER TABLE list_items DROP FOREIGN KEY list_items_ibfk_1;
-- ALTER TABLE list_items DROP COLUMN section_id;

-- Mantener la tabla list_sections por ahora como referencia histórica
-- pero puedes eliminarla después si ya no es necesaria:
-- DROP TABLE list_sections;
