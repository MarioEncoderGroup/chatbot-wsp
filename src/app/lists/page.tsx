'use client';

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import EditListForm from '../components/EditListForm';

// Función para generar un ID único para cada elemento de la lista
function generateItemId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Tipos para comandos de lista y elementos
interface ListItem {
  row_id: string;
  title: string; // Título visible para el usuario
  response: string; // Respuesta cuando el usuario selecciona este elemento
}

interface ListCommand {
  id: number;
  command: string;
  title: string;
  intro_text: string;
  use_prefix: boolean;
  items: ListItem[];
  updated_at?: string;
}

export default function ListsPage() {
  // Estados principales
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [listCommands, setListCommands] = useState<ListCommand[]>([]);

  // Estados para listas
  const [command, setCommand] = useState('');
  const [title, setTitle] = useState('');
  const [introText, setIntroText] = useState('');
  const [listItems, setListItems] = useState<ListItem[]>([]);
  const [usePrefix, setUsePrefix] = useState(true);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showNewListForm, setShowNewListForm] = useState<boolean>(false);

  // Estados para edición de listas existentes
  const [editId, setEditId] = useState<number | null>(null);
  const [editCommand, setEditCommand] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editIntroText, setEditIntroText] = useState('');
  const [editUsePrefix, setEditUsePrefix] = useState(true);
  const [editItems, setEditItems] = useState<ListItem[]>([]);

  // Cargar comandos de tipo lista
  const fetchListCommands = async () => {
    try {
      setLoading(true);
      setError(null); // Limpiar errores anteriores
      
      // Prevenir problemas de caché agregando parámetros de caché
      const response = await fetch('/api/whatsapp/commands?type=list', {
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar listas. Por favor intenta de nuevo.');
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.commands)) {
        // Simplificar el mapeo de datos para evitar problemas
        const formattedLists: ListCommand[] = data.commands.map((cmd: any) => ({
          id: cmd.id || 0,
          command: cmd.command || '',
          title: cmd.title || '',
          intro_text: cmd.intro_text || '',
          use_prefix: Boolean(cmd.use_prefix),
          items: Array.isArray(cmd.items) ? cmd.items : [],
          updated_at: cmd.updated_at || ''
        }));
        setListCommands(formattedLists);
      } else {
        // Mensaje de error directo en español
        setError('No se pudieron cargar las listas. Verifica la conexión e inténtalo de nuevo.');
      }
    } catch (err) {
      console.error('Error al cargar listas:', err);
      setError('Error de conexión. No se pudieron cargar las listas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListCommands();
  }, []);

  // Formatear fecha
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // La función generateItemId ya está definida globalmente

  // Funciones para el manejo de elementos de lista
  const handleAddItem = () => {
    setListItems([...listItems, {
      row_id: generateItemId(),
      title: '',
      response: ''
    }]);
  };

  const updateItem = (itemIndex: number, field: 'title' | 'response', value: string) => {
    const updatedItems = [...listItems];
    updatedItems[itemIndex][field] = value;
    setListItems(updatedItems);
  };

  const removeItem = (itemIndex: number) => {
    const updatedItems = [...listItems];
    updatedItems.splice(itemIndex, 1);
    setListItems(updatedItems);
  };

  // Funciones para edición de listas
  const addEditItem = () => {
    setEditItems([
      ...editItems,
      {
        row_id: generateItemId(),
        title: '',
        response: ''
      }
    ]);
  };

  const updateEditItem = (itemIndex: number, field: 'title' | 'response', value: string) => {
    const updated = [...editItems];
    updated[itemIndex][field] = value;
    setEditItems(updated);
  };

  const removeEditItem = (itemIndex: number) => {
    if (editItems.length <= 1) {
      setSubmitError('Debe haber al menos un elemento en la lista');
      return;
    }

    const updated = [...editItems];
    updated.splice(itemIndex, 1);
    setEditItems(updated);
  };

  // Contar total de elementos
  const countItems = (items: ListItem[]) => {
    return items.length;
  };

  // Iniciar edición de una lista
  const startEditing = (list: ListCommand) => {
    setEditId(list.id);
    
    // Limpiar el prefijo '!' del comando si existe y si use_prefix está activado
    // Esto evita la duplicación del prefijo cuando se guarda
    let commandToEdit = list.command || '';
    if (list.use_prefix && commandToEdit.startsWith('!')) {
      commandToEdit = commandToEdit.substring(1);
    }
    
    setEditCommand(commandToEdit);
    setEditTitle(list.title !== undefined && list.title !== null ? list.title : '');
    setEditIntroText(list.intro_text !== undefined && list.intro_text !== null ? list.intro_text : '');
    setEditUsePrefix(list.use_prefix);

    // Convertir los items para edición
    if (list.items && list.items.length > 0) {
      setEditItems(JSON.parse(JSON.stringify(list.items)));
    } else {
      // Si no hay elementos, crear uno por defecto
      setEditItems([{
        row_id: generateItemId(),
        title: '',
        response: ''
      }]);
    }

    window.scrollTo(0, 0);
  };

  // Eliminar una lista
  const handleDeleteList = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta lista? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/whatsapp/commands/${id}`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage('Lista eliminada con éxito');
        fetchListCommands();
        
        // Usamos un timeout seguro con verificación de componente montado
        const timeoutId = setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
        
        // Limpieza del timeout en caso de desmontaje del componente
        return () => clearTimeout(timeoutId);
      } else {
        // Mensajes de error directamente en español
        setError('Error al eliminar la lista: ' + (data.message ? 
          'La lista no existe o ha sido eliminada previamente.' : 
          'No se pudo procesar la solicitud.'));
      }
    } catch (err) {
      console.error('Error al eliminar lista:', err);
      setError('Error de conexión al intentar eliminar la lista. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Guardar nueva lista
  const handleSubmitNewList = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Limpieza de mensajes anteriores
      setSubmitError(null);
      
      // Validación básica con mensajes claros en español
      if (!command || !command.trim()) {
        setSubmitError('El nombre del comando es obligatorio');
        return;
      }

      if (!title || !title.trim()) {
        setSubmitError('El título de la lista es obligatorio');
        return;
      }

      if (!introText || !introText.trim()) {
        setSubmitError('El texto de introducción es obligatorio');
        return;
      }
      
      // Verificar que existan elementos en la lista
      if (!listItems || listItems.length === 0) {
        setSubmitError('Debes añadir al menos un elemento a la lista');
        return;
      }

      // Validar elementos de la lista de forma segura
      for (let i = 0; i < listItems.length; i++) {
        const item = listItems[i];
        if (!item || !item.title || !item.title.trim()) {
          setSubmitError(`El elemento #${i+1} debe tener un título`);
          return;
        }

        if (!item.response || !item.response.trim()) {
          setSubmitError(`El elemento #${i+1} debe tener una respuesta`);
          return;
        }
      }

      // Normalizar el comando eliminando cualquier prefijo existente
      let normalizedCommand = command.trim();
      if (normalizedCommand.startsWith('!')) {
        normalizedCommand = normalizedCommand.substring(1);
      }
      
      const newList = {
        command: normalizedCommand, // El backend añadirá el prefijo si es necesario
        response: introText.trim(), // Campo obligatorio para el backend
        title: title.trim(),
        intro_text: introText.trim(),
        use_prefix: Boolean(usePrefix),
        responseType: 'list',
        items: listItems.map(item => ({
          row_id: item.row_id || generateItemId(),
          title: item.title.trim(),
          response: item.response.trim()
        }))
      };

      setLoading(true);

      const response = await fetch('/api/whatsapp/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(newList),
      });

      if (!response.ok) {
        throw new Error('Error de servidor al guardar la lista');
      }

      const data = await response.json();

      if (data.success) {
        // Éxito: limpiar formulario y mostrar mensaje
        setSuccessMessage('Lista creada con éxito');

        // Limpiar el formulario
        setCommand('');
        setTitle('');
        setIntroText('');
        setListItems([{ row_id: generateItemId(), title: '', response: '' }]);
        setShowNewListForm(false);
        
        // Recargar listas
        fetchListCommands();

        // Usar un timeout con limpieza para evitar errores
        const timeoutId = setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
        
        // Guardamos el ID para limpiarlo si es necesario
        return;
      } else {
        // Mensajes de error directamente en español
        if (data.message?.includes("Duplicate") || data.message?.includes("ER_DUP_ENTRY")) {
          setSubmitError('Ya existe un comando con ese nombre. Por favor, usa otro nombre.');
        } else {
          setSubmitError('No se pudo guardar la lista. Verifica la información e intenta nuevamente.');
        }
      }
    } catch (err) {
      console.error('Error al añadir lista:', err);
      setSubmitError('Error de conexión al intentar guardar la lista. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Guardar lista editada
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Limpiar errores anteriores
      setSubmitError(null);
      
      // Validaciones mejoradas con mensajes claros en español
      if (!editId) {
        setSubmitError('No se pudo identificar la lista a editar');
        return;
      }
      
      if (!editCommand || !editCommand.trim()) {
        setSubmitError('El nombre del comando es obligatorio');
        return;
      }

      if (!editTitle || !editTitle.trim()) {
        setSubmitError('El título de la lista es obligatorio');
        return;
      }

      if (!editIntroText || !editIntroText.trim()) {
        setSubmitError('El texto de introducción es obligatorio');
        return;
      }
      
      // Verificar que existan elementos en la lista
      if (!editItems || editItems.length === 0) {
        setSubmitError('La lista debe tener al menos un elemento');
        return;
      }

      // Validar elementos de la lista de forma segura
      for (let i = 0; i < editItems.length; i++) {
        const item = editItems[i];
        if (!item || !item.title || !item.title.trim()) {
          setSubmitError(`El elemento #${i+1} debe tener un título`);
          return;
        }

        if (!item.response || !item.response.trim()) {
          setSubmitError(`El elemento #${i+1} debe tener una respuesta`);
          return;
        }
      }

      // Validar que no haya más de 10 elementos en total
      if (editItems.length > 10) {
        setSubmitError('No puede haber más de 10 elementos en total');
        return;
      }

      setLoading(true);

      // Normalizar el comando eliminando cualquier prefijo existente
      let normalizedCommand = editCommand.trim();
      if (normalizedCommand.startsWith('!')) {
        normalizedCommand = normalizedCommand.substring(1);
      }
      
      const updatedList = {
        command: normalizedCommand, // El backend añadirá el prefijo si es necesario
        response: editIntroText.trim(), // Campo obligatorio para el backend
        title: editTitle.trim(),
        intro_text: editIntroText.trim(),
        use_prefix: Boolean(editUsePrefix),
        responseType: 'list',
        items: editItems.map(item => ({
          row_id: item.row_id || generateItemId(),
          title: item.title.trim(),
          response: item.response.trim()
        }))
      };
      
      // Agregar encabezados para prevenir problemas de caché
      const response = await fetch(`/api/whatsapp/commands/${editId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(updatedList)
      });

      if (!response.ok) {
        // Manejar errores HTTP
        let errorMessage = 'Error al actualizar la lista';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Si no podemos parsear el error como JSON, usar el mensaje por defecto
        }
        throw new Error(errorMessage);
      }
      
      // Actualizar lista de comandos
      fetchListCommands();
      setSuccessMessage('Lista actualizada exitosamente');

      // Limpiar el formulario con un timeout seguro
      setTimeout(() => {
        setEditId(null);
        setEditCommand('');
        setEditTitle('');
        setEditIntroText('');
        setEditUsePrefix(true);
        setEditItems([]);
        
        // Usar un segundo timeout para el mensaje de éxito
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }, 1000);
    } catch (error) {
      console.error('Error al actualizar la lista:', error);
      setSubmitError(error instanceof Error ? 
        error.message : 'Error desconocido al actualizar la lista');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar formulario para nueva lista
  const renderNewListForm = () => {
    const totalItems = countItems(listItems);
    const hasExcessItems = totalItems > 10;

    return (
      <div className="bg-white shadow-md rounded-lg mb-6 overflow-hidden">
        <div className="p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Nueva Lista Interactiva</h2>

          {submitError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitNewList} className="space-y-6">
            {/* Nombre del comando y preferencias */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comando
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                  placeholder="Nombre del comando (sin prefijo)"
                />
              </div>

              <div className="mt-2">
                <div className="flex items-center">
                  <input
                    id="usePrefix"
                    type="checkbox"
                    checked={usePrefix}
                    onChange={(e) => setUsePrefix(e.target.checked)}
                    className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="usePrefix" className="ml-2 block text-sm text-gray-700">
                    Usar prefijo (!) <span className="text-gray-500 text-xs">Ejemplo: !{command || 'comando'}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Título */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                placeholder="Título de la lista"
              />
            </div>

            {/* Texto introductorio */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Texto introductorio
              </label>
              <textarea
                value={introText}
                onChange={(e) => setIntroText(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                placeholder="Este texto se mostrará antes de las opciones de la lista..."
              />
            </div>

            {/* Elementos */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Elementos
              </label>

              {hasExcessItems && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-yellow-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        WhatsApp solo permite mostrar los primeros 10 elementos en total.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {listItems.map((item, itemIndex) => (
                <div key={item.row_id} className="bg-white p-3 rounded-lg border border-gray-200 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-medium text-gray-700">Elemento {itemIndex + 1}</h4>
                    {listItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(itemIndex)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Título del elemento
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItem(itemIndex, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                        placeholder="Título visible en el botón"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Respuesta
                      </label>
                      <input
                        type="text"
                        value={item.response}
                        onChange={(e) => updateItem(itemIndex, 'response', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                        placeholder="Respuesta cuando se seleccione este elemento"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2 px-3 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 focus:outline-none flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Añadir elemento
              </button>
            </div>

            {/* Botón para enviar formulario */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </span>
              ) : 'Guardar lista interactiva'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  // Renderizar formulario de edición utilizando el componente dedicado
  const renderEditForm = () => {
    return (
      <EditListForm
        editId={editId!}
        editCommand={editCommand}
        editTitle={editTitle}
        editIntroText={editIntroText}
        editUsePrefix={editUsePrefix}
        editItems={editItems}
        setEditCommand={setEditCommand}
        setEditTitle={setEditTitle}
        setEditIntroText={setEditIntroText}
        setEditUsePrefix={setEditUsePrefix}
        setEditItems={setEditItems}
        handleEditSubmit={handleEditSubmit}
        submitError={submitError}
        loading={loading}
        cancelEdit={cancelEdit}
        addEditItem={addEditItem}
        updateEditItem={updateEditItem}
        removeEditItem={removeEditItem}
      />
    );
  };

  // Función para cancelar la edición
  const cancelEdit = () => {
    setEditId(null);
    setEditCommand('');
    setEditTitle('');
    setEditIntroText('');
    setEditUsePrefix(false);
    setEditItems([]);
    setSubmitError(null);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Gestión de Listas Interactivas</h1>
        
        {/* Mensajes de éxito o error */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-md flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        {/* Botón para mostrar/ocultar el formulario de nueva lista */}
        {!showNewListForm && !editId && (
          <button
            onClick={() => setShowNewListForm(true)}
            className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva Lista
          </button>
        )}
        
        {/* Formulario para nueva lista o edición */}
        {showNewListForm && renderNewListForm()}
        {editId && renderEditForm()}
        
        {/* Tabla de listas existentes */}
        {!editId && (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-4">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Listas configuradas</h2>
              
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <svg className="animate-spin h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : listCommands.length === 0 ? (
                <div className="py-6 text-center text-gray-500">
                  No hay listas configuradas. Crea una nueva lista para comenzar.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comando</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detalles</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última actualización</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {listCommands.map((cmd) => (
                      <tr key={cmd.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {cmd.command}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {cmd.items && cmd.items.length > 0 ? (
                            <div>
                              <span className="font-medium">{cmd.items.length} elementos</span>
                              <ul className="mt-1 text-xs text-gray-400">
                                {cmd.items.slice(0, 2).map((item) => (
                                  <li key={item.row_id}>• {item.title}</li>
                                ))}
                                {cmd.items.length > 2 && (
                                  <li>• ... {cmd.items.length - 2} elementos más</li>
                                )}
                              </ul>
                            </div>
                          ) : 'Sin elementos'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(cmd.updated_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => startEditing(cmd)} 
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Editar
                          </button>
                          <button 
                            onClick={() => handleDeleteList(cmd.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
