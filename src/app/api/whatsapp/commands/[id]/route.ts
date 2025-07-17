import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database/mysql';

type RouteParams = { params: { id: string } };

/**
 * PUT - Actualizar un comando por ID
 */
export async function PUT(
  req: NextRequest,
  context: RouteParams
) {
  // Obtener conexión para transacción
  let connection;
  
  try {
    const id = context.params.id;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID del comando es obligatorio'
      }, { status: 400 });
    }
    
    // Extraer los datos de la solicitud
    const body = await req.json();
    const { 
      command, 
      response, 
      title, 
      intro_text, 
      items = [],
      // Manejar ambas variantes del tipo de respuesta (camelCase y snake_case)
      responseType,
      response_type,
      // Manejar ambas variantes de usePrefix (camelCase y snake_case)
      usePrefix,
      use_prefix
    } = body;
    
    // Determinar el tipo de respuesta (preferir camelCase, pero aceptar snake_case como fallback)
    const finalResponseType = responseType || response_type;
    
    // Determinar si debe usar prefijo (preferir camelCase, pero aceptar snake_case como fallback)
    const finalUsePrefix = usePrefix !== undefined ? usePrefix : (use_prefix !== undefined ? use_prefix : undefined);
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID del comando es obligatorio'
      }, { status: 400 });
    }

    // Validaciones básicas - el título solo es obligatorio para comandos de tipo lista
    if (finalResponseType === 'list' && !title) {
      return NextResponse.json({
        success: false,
        message: 'El título es obligatorio para comandos de tipo lista'
      }, { status: 400 });
    }
    
    const db = await getDatabase();
    
    // Iniciar transacción para actualizar todo de forma atómica
    connection = await (db as any).pool.getConnection();
    await connection.beginTransaction();
    
    // Construir la lista de campos y valores a actualizar
    const updateFields = [];
    const params = [];
    
    // Normalizar el comando si es necesario
    if (command !== undefined) {
      // Primero, limpiar cualquier prefijo existente para evitar duplicados
      let normalizedCommand = command.trim().toLowerCase();
      if (normalizedCommand.startsWith('!')) {
        normalizedCommand = normalizedCommand.substring(1);
      }
      
      // Ahora aplicar la lógica de prefijos basada en la configuración
      if (finalUsePrefix) {
        normalizedCommand = `!${normalizedCommand}`;
      }
      
      updateFields.push('command = ?');
      params.push(normalizedCommand);
    }
    
    if (response !== undefined) {
      updateFields.push('response = ?');
      params.push(response);
    }
    
    if (finalUsePrefix !== undefined) {
      updateFields.push('use_prefix = ?');
      params.push(finalUsePrefix ? 1 : 0);
    }
    
    if (finalResponseType !== undefined) {
      updateFields.push('response_type = ?');
      params.push(finalResponseType);
    }
    
    // Actualizar campos específicos de listas
    if (finalResponseType === 'list') {
      if (title !== undefined) {
        updateFields.push('title = ?');
        params.push(title);
      }
      
      if (intro_text !== undefined) {
        updateFields.push('intro_text = ?');
        params.push(intro_text);
      }
    }
    
    // Añadir el ID al final del array de parámetros para la cláusula WHERE
    params.push(id);
    
    // Ejecutar la actualización del comando
    if (updateFields.length > 0) {
      await connection.query(
        `UPDATE custom_commands SET ${updateFields.join(', ')} WHERE id = ?`,
        params
      );
    }
    
    // Si es un comando de tipo lista, actualizar las secciones e items
    if (finalResponseType === 'list' && items && items.length > 0) {
      // 1. Eliminar todos los items existentes
      const [sections] = await connection.query(
        'SELECT id FROM list_sections WHERE command_id = ?',
        [id]
      );
      
      // Eliminar los items de cada sección
      for (const section of sections) {
        await connection.query(
          'DELETE FROM list_items WHERE section_id = ?',
          [section.id]
        );
      }
      
      // Eliminar las secciones
      await connection.query(
        'DELETE FROM list_sections WHERE command_id = ?',
        [id]
      );
      
      // 2. Crear una nueva sección para la lista (en este momento solo soportamos una sección)
      const [sectionResult] = await connection.query(
        'INSERT INTO list_sections (command_id, title) VALUES (?, ?)',
        [id, 'Default Section'] // Usamos una sección por defecto
      );
      
      const sectionId = sectionResult.insertId;
      
      // 3. Insertar los nuevos items
      for (const item of items) {
        await connection.query(
          'INSERT INTO list_items (section_id, row_id, title, response) VALUES (?, ?, ?, ?)',
          [sectionId, item.row_id || Date.now(), item.title, item.response]
        );
      }
    }
    
    // Confirmar la transacción
    await connection.commit();
    
    return NextResponse.json({
      success: true,
      message: 'Comando actualizado correctamente'
    });
    
  } catch (error) {
    console.error('Error al actualizar comando:', error);
    
    // Revertir la transacción en caso de error
    if (connection) {
      await connection.rollback();
    }
    
    return NextResponse.json({
      success: false,
      message: 'Error al actualizar comando',
      error: (error as Error).message
    }, { status: 500 });
  } finally {
    // Liberar la conexión
    if (connection) {
      connection.release();
    }
  }
}

/**
 * DELETE - Eliminar un comando por ID
 */
export async function DELETE(
  req: NextRequest,
  context: RouteParams
) {
  // Obtener conexión para transacción
  let connection;
  
  try {
    const id = context.params.id;
    
    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'ID del comando es obligatorio'
      }, { status: 400 });
    }
    
    const db = await getDatabase();
    
    // Iniciar transacción para asegurar que todas las eliminaciones se completen o ninguna
    connection = await (db as any).pool.getConnection();
    await connection.beginTransaction();
    
    // 1. Verificar si es una lista y obtener secciones relacionadas
    const [commandData] = await connection.query(
      'SELECT response_type FROM custom_commands WHERE id = ?',
      [id]
    );
    
    if (!commandData || commandData.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Comando no encontrado'
      }, { status: 404 });
    }
    
    const isListCommand = commandData[0].response_type === 'list';
    
    if (isListCommand) {
      // 2. Obtener las secciones relacionadas
      const [sections] = await connection.query(
        'SELECT id FROM list_sections WHERE command_id = ?',
        [id]
      );
      
      // 3. Para cada sección, eliminar primero sus elementos
      for (const section of sections) {
        await connection.query(
          'DELETE FROM list_items WHERE section_id = ?',
          [section.id]
        );
      }
      
      // 4. Eliminar las secciones
      await connection.query(
        'DELETE FROM list_sections WHERE command_id = ?',
        [id]
      );
    }
    
    // 5. Finalmente, eliminar el comando
    await connection.query(
      'DELETE FROM custom_commands WHERE id = ?', 
      [id]
    );
    
    // Confirmar transacción
    await connection.commit();
    
    return NextResponse.json({
      success: true,
      message: 'Comando eliminado correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar comando:', error);
    
    // Revertir transacción en caso de error
    if (connection) {
      await connection.rollback();
    }
    
    return NextResponse.json({
      success: false,
      message: 'Error al eliminar comando',
      error: (error as Error).message
    }, { status: 500 });
  } finally {
    // Liberar conexión
    if (connection) {
      connection.release();
    }
  }
}
