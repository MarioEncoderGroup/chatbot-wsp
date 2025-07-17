-- Script para eliminar todas las listas y sus elementos asociados
-- Solo elimina comandos de tipo 'list' y sus items asociados

-- Primero eliminar los elementos de las listas
DELETE FROM list_items 
WHERE command_id IN (
    SELECT id FROM custom_commands WHERE type = 'list'
);

-- Luego eliminar los comandos de tipo lista
DELETE FROM custom_commands 
WHERE type = 'list';
