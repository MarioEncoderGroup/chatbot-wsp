'use client';

import React, { useState, useEffect } from 'react';
import Header from '../components/Header';

// Tipos para comandos de lista y secciones
interface ListItem {
  row_id: string;
  title: string;
  description: string;
  response: string;
}

interface ListSection {
  title: string;
  items: ListItem[];
}

interface ListCommand {
  id: number;
  command: string;
  response: string;
  response_type: string;
  use_prefix: boolean;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  sections: ListSection[];
}

export default function ListsPage() {
  // Estados para listas
  const [listCommands, setListCommands] = useState<ListCommand[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para el formulario de nueva lista
  const [showNewListForm, setShowNewListForm] = useState<boolean>(false);
  const [newCommand, setNewCommand] = useState<string>('');
  const [newIntroText, setNewIntroText] = useState<string>('');
  const [usePrefix, setUsePrefix] = useState<boolean>(true);
  const [sections, setSections] = useState<ListSection[]>([{ title: '', items: [{ row_id: '', title: '', description: '', response: '' }] }]);
  
  // Estados para mensajes
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estados para edición
  const [editingCommandId, setEditingCommandId] = useState<number | null>(null);
  const [editCommand, setEditCommand] = useState<string>('');
  const [editIntroText, setEditIntroText] = useState<string>('');
  const [editUsePrefix, setEditUsePrefix] = useState<boolean>(true);
  const [editSections, setEditSections] = useState<ListSection[]>([]);
  
  // Cargar comandos de tipo lista
  const fetchListCommands = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/whatsapp/commands');
      
      if (!response.ok) {
        throw new Error(`Error al cargar comandos: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Filtrar solo los comandos de tipo lista
        const lists = data.commands.filter((cmd: any) => cmd.response_type === 'list');
        setListCommands(lists);
      } else {
        // Traducir mensajes de error comunes al español
        if (data.message === "The string did not match the expected pattern.") {
          setError('El texto no cumple con el formato esperado. Verifica los campos.');
        } else if (data.message?.includes("pattern")) {
          setError('Uno de los campos no tiene el formato correcto. Revisa y corrige la información.');
        } else {
          setError(data.message || 'Error al cargar listas');
        }
      }
    } catch (err) {
      const errorMsg = (err as Error).message || '';
      if (errorMsg.includes("pattern") || errorMsg.includes("match")) {
        setError('El formato de algún campo es incorrecto. Revisa los datos ingresados.');
      } else {
        setError(errorMsg);
      }
      console.error('Error al cargar listas:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchListCommands();
  }, []);

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Generar ID único para elementos de lista
  const generateItemId = () => {
    return Math.random().toString(36).substring(2, 10);
  };
  
  // Funciones para gestionar secciones y elementos
  const addSection = () => {
    setSections([...sections, { 
      title: '', 
      items: [{ row_id: generateItemId(), title: '', description: '', response: '' }] 
    }]);
  };
  
  const updateSectionTitle = (index: number, title: string) => {
    const updatedSections = [...sections];
    updatedSections[index].title = title;
    setSections(updatedSections);
  };
  
  const removeSection = (index: number) => {
    if (sections.length === 1) {
      setSubmitError('Debe haber al menos una sección');
      return;
    }
    
    const updatedSections = [...sections];
    updatedSections.splice(index, 1);
    setSections(updatedSections);
  };
  
  const addItem = (sectionIndex: number) => {
    const updatedSections = [...sections];
    updatedSections[sectionIndex].items.push({
      row_id: generateItemId(),
      title: '',
      description: '',
      response: ''
    });
    setSections(updatedSections);
  };
  
  const updateItem = (sectionIndex: number, itemIndex: number, field: string, value: string) => {
    const updatedSections = [...sections];
    const item = updatedSections[sectionIndex].items[itemIndex] as any;
    item[field] = value;
    setSections(updatedSections);
  };
  
  const removeItem = (sectionIndex: number, itemIndex: number) => {
    if (sections[sectionIndex].items.length === 1) {
      setSubmitError('Debe haber al menos un elemento en cada sección');
      return;
    }
    
    const updatedSections = [...sections];
    updatedSections[sectionIndex].items.splice(itemIndex, 1);
    setSections(updatedSections);
  };

  // Funciones para edición de listas
  const addEditSection = () => {
    setEditSections([...editSections, { 
      title: '', 
      items: [{ row_id: generateItemId(), title: '', description: '', response: '' }] 
    }]);
  };
  
  const updateEditSectionTitle = (index: number, title: string) => {
    const updated = [...editSections];
    updated[index].title = title;
    setEditSections(updated);
  };
  
  const removeEditSection = (index: number) => {
    if (editSections.length === 1) {
      setSubmitError('Debe haber al menos una sección');
      return;
    }
    
    const updated = [...editSections];
    updated.splice(index, 1);
    setEditSections(updated);
  };
  
  const addEditItem = (sectionIndex: number) => {
    const updated = [...editSections];
    updated[sectionIndex].items.push({
      row_id: generateItemId(),
      title: '',
      description: '',
      response: ''
    });
    setEditSections(updated);
  };
  
  const updateEditItem = (sectionIndex: number, itemIndex: number, field: string, value: string) => {
    const updated = [...editSections];
    const item = updated[sectionIndex].items[itemIndex] as any;
    item[field] = value;
    setEditSections(updated);
  };
  
  const removeEditItem = (sectionIndex: number, itemIndex: number) => {
    if (editSections[sectionIndex].items.length === 1) {
      setSubmitError('Debe haber al menos un elemento en cada sección');
      return;
    }
    
    const updated = [...editSections];
    updated[sectionIndex].items.splice(itemIndex, 1);
    setEditSections(updated);
  };
  
  // Contar total de elementos en todas las secciones
  const countTotalItems = (sectionsToCount: ListSection[]) => {
    return sectionsToCount.reduce((total, section) => {
      return total + section.items.length;
    }, 0);
  };
  
  // Iniciar edición de una lista
  const startEditing = (id: number) => {
    const command = listCommands.find(cmd => cmd.id === id);
    if (!command) return;
    
    setEditingCommandId(id);
    setEditCommand(command.command);
    setEditIntroText(command.response);
    setEditUsePrefix(command.use_prefix);
    
    // Inicializar secciones de edición
    if (command.sections && command.sections.length > 0) {
      setEditSections(command.sections.map(section => ({
        ...section,
        items: section.items.map(item => ({
          ...item,
          row_id: generateItemId() // Generar nuevos IDs para edición
        }))
      })));
    } else {
      // Si no tiene secciones, crear una vacía
      setEditSections([{ title: '', items: [{ row_id: generateItemId(), title: '', description: '', response: '' }] }]);
    }
    
    setSubmitError(null); // Limpiar cualquier error anterior
  };
  
  // Eliminar una lista
  const handleDeleteList = async (id: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta lista? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/whatsapp/commands?id=${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Lista eliminada con éxito');
        fetchListCommands(); // Recargar la lista de comandos
        
        // Ocultar mensaje después de 3 segundos
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        // Traducir mensajes de error comunes al español
        if (data.message === "Command not found") {
          setError('Comando no encontrado. La lista puede haber sido eliminada previamente.');
        } else if (data.message === "The string did not match the expected pattern.") {
          setError('El texto no cumple con el formato esperado.');
        } else if (data.message?.includes("pattern")) {
          setError('Uno de los campos no tiene el formato correcto.');
        } else {
          setError(data.message || 'Error al eliminar la lista');
        }
      }
    } catch (err) {
      const errorMsg = (err as Error).message || '';
      if (errorMsg.includes("pattern") || errorMsg.includes("match")) {
        setError('El formato de algún campo es incorrecto.');
      } else if (errorMsg.includes("not found") || errorMsg.includes("404")) {
        setError('Lista no encontrada. Es posible que ya haya sido eliminada.');
      } else {
        setError(errorMsg || 'Error al eliminar la lista');
      }
      console.error('Error al eliminar lista:', err);
    } finally {
      setLoading(false);
    }
  };

  // Guardar nueva lista
  const handleSubmitNewList = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (!newCommand.trim()) {
      setSubmitError('El nombre del comando es obligatorio');
      return;
    }
    
    if (!newIntroText.trim()) {
      setSubmitError('El texto de introducción es obligatorio');
      return;
    }
    
    // Validar que todas las secciones y elementos tienen títulos
    let isValid = true;
    sections.forEach((section, sectionIndex) => {
      if (!section.title.trim()) {
        setSubmitError(`La sección ${sectionIndex + 1} debe tener un título`);
        isValid = false;
        return;
      }
      
      section.items.forEach((item, itemIndex) => {
        if (!item.title.trim()) {
          setSubmitError(`El elemento ${itemIndex + 1} de la sección ${sectionIndex + 1} debe tener un título`);
          isValid = false;
          return;
        }
        
        if (!item.response.trim()) {
          setSubmitError(`El elemento ${itemIndex + 1} de la sección ${sectionIndex + 1} debe tener una respuesta`);
          isValid = false;
          return;
        }
      });
    });
    
    if (!isValid) return;
    
    // Preparar datos para enviar
    const newList = {
      command: newCommand,
      response: newIntroText,
      responseType: 'list',   // En camelCase para que coincida con lo que espera el backend
      usePrefix: usePrefix,   // También cambiar a camelCase
      sections: sections
    };
    
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      
      const response = await fetch('/api/whatsapp/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newList),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Lista creada con éxito');
        
        // Limpiar formulario
        setNewCommand('');
        setNewIntroText('');
        setSections([{ title: '', items: [{ row_id: generateItemId(), title: '', description: '', response: '' }] }]);
        setShowNewListForm(false);
        
        // Recargar listas
        fetchListCommands();
        
        // Ocultar mensaje después de 3 segundos
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        // Traducir mensajes de error comunes al español
        if (data.message === "The string did not match the expected pattern.") {
          setSubmitError('El texto no cumple con el formato esperado. Verifica los campos.');
        } else if (data.message?.includes("pattern")) {
          setSubmitError('Uno de los campos no tiene el formato correcto. Revisa y corrige la información.');
        } else if (data.message === "El comando ya existe") {
          setSubmitError('Ya existe un comando con ese nombre. Por favor, usa otro nombre.');
        } else if (data.message?.includes("Duplicate entry") || data.message?.includes("ER_DUP_ENTRY")) {
          setSubmitError('Ya existe un comando con ese nombre. Por favor, usa otro nombre.');
        } else {
          setSubmitError(data.message || 'Error al añadir la lista');
        }
      }
    } catch (err) {
      const errorMsg = (err as Error).message || '';
      if (errorMsg.includes("pattern") || errorMsg.includes("match")) {
        setSubmitError('El formato de algún campo es incorrecto. Revisa los datos ingresados.');
      } else if (errorMsg.includes("Duplicate entry") || errorMsg.includes("ER_DUP_ENTRY")) {
        setSubmitError('Ya existe un comando con ese nombre. Por favor, usa otro nombre.');
      } else {
        setSubmitError(errorMsg);
      }
      console.error('Error al añadir lista:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Guardar lista editada
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación básica
    if (!editCommand.trim()) {
      setSubmitError('El nombre del comando es obligatorio');
      return;
    }
    
    if (!editIntroText.trim()) {
      setSubmitError('El texto de introducción es obligatorio');
      return;
    }
    
    // Validar que todas las secciones y elementos tienen títulos
    let isValid = true;
    editSections.forEach((section, sectionIndex) => {
      if (!section.title.trim()) {
        setSubmitError(`La sección ${sectionIndex + 1} debe tener un título`);
        isValid = false;
        return;
      }
      
      section.items.forEach((item, itemIndex) => {
        if (!item.title.trim()) {
          setSubmitError(`El elemento ${itemIndex + 1} de la sección ${sectionIndex + 1} debe tener un título`);
          isValid = false;
          return;
        }
        
        if (!item.response.trim()) {
          setSubmitError(`El elemento ${itemIndex + 1} de la sección ${sectionIndex + 1} debe tener una respuesta`);
          isValid = false;
          return;
        }
      });
    });
    
    if (!isValid) return;
    
    // Preparar datos para enviar
    const updatedList = {
      id: editingCommandId,  // Añadir el ID del comando para la edición
      command: editCommand,
      response: editIntroText,
      responseType: 'list',
      usePrefix: editUsePrefix,
      sections: editSections
    };
    
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      
      const response = await fetch('/api/whatsapp/commands', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedList),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Lista actualizada con éxito');
        setEditingCommandId(null); // Salir del modo edición
        
        // Recargar listas
        fetchListCommands();
        
        // Ocultar mensaje después de 3 segundos
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        // Traducir mensajes de error comunes al español
        if (data.message === "The string did not match the expected pattern.") {
          setSubmitError('El texto no cumple con el formato esperado. Verifica los campos.');
        } else if (data.message?.includes("pattern")) {
          setSubmitError('Uno de los campos no tiene el formato correcto. Revisa y corrige la información.');
        } else if (data.message?.includes("Duplicate entry") || data.message?.includes("ER_DUP_ENTRY")) {
          setSubmitError('Ya existe un comando con ese nombre. Por favor, usa otro nombre.');
        } else {
          setSubmitError(data.message || 'Error al actualizar la lista');
        }
      }
    } catch (err) {
      const errorMsg = (err as Error).message || '';
      if (errorMsg.includes("pattern") || errorMsg.includes("match")) {
        setSubmitError('El formato de algún campo es incorrecto. Revisa los datos ingresados.');
      } else if (errorMsg.includes("Duplicate entry") || errorMsg.includes("ER_DUP_ENTRY")) {
        setSubmitError('Ya existe un comando con ese nombre. Por favor, usa otro nombre.');
      } else {
        setSubmitError(errorMsg);
      }
      console.error('Error al actualizar lista:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Renderizar formulario para nueva lista
  const renderNewListForm = () => {
    const totalItems = countTotalItems(sections);
    const hasExcessItems = totalItems > 10;
    
    return (
      <div className="bg-white shadow-md rounded-lg mb-6 overflow-hidden">
        <div className="p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Nueva Lista Interactiva</h2>
          
          {submitError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 flex-shrink-0">
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
                  value={newCommand}
                  onChange={(e) => setNewCommand(e.target.value)}
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
                    Usar prefijo (!) <span className="text-gray-500 text-xs">Ejemplo: !{newCommand || 'comando'}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Texto introductorio */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Texto introductorio
              </label>
              <textarea
                value={newIntroText}
                onChange={(e) => setNewIntroText(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                placeholder="Este texto se mostrará antes de las opciones de la lista..."
              />
            </div>

            {/* Secciones y elementos */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secciones y elementos
              </label>
              
              {hasExcessItems && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-yellow-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        WhatsApp solo permite mostrar los primeros 10 elementos en total entre todas las secciones.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-700">Sección {sectionIndex + 1}</h3>
                    {sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSection(sectionIndex)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título de la sección
                    </label>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                      placeholder="Título de la sección"
                    />
                  </div>

                  {/* Items de la sección */}
                  <div className="space-y-4 mb-4">
                    {section.items.map((item, itemIndex) => (
                      <div key={item.row_id} className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-medium text-gray-700">Elemento {itemIndex + 1}</h4>
                          {section.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(sectionIndex, itemIndex)}
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
                              onChange={(e) => updateItem(sectionIndex, itemIndex, 'title', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                              placeholder="Título visible en el botón"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Descripción
                            </label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItem(sectionIndex, itemIndex, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                              placeholder="Descripción corta"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Respuesta
                            </label>
                            <input
                              type="text"
                              value={item.response}
                              onChange={(e) => updateItem(sectionIndex, itemIndex, 'response', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                              placeholder="Respuesta cuando se seleccione este elemento"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => addItem(sectionIndex)}
                    className="w-full py-2 px-3 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 focus:outline-none flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Añadir elemento
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addSection}
                className="w-full py-2 px-3 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 focus:outline-none flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Añadir sección
              </button>
            </div>
            
            {/* Botón para enviar formulario */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
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
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setShowNewListForm(false)}
              className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Ocultar Formulario
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // Renderizar formulario de edición
  const renderEditForm = () => {
    const totalItems = countTotalItems(editSections);
    const hasExcessItems = totalItems > 10;
    
    return (
      <div className="bg-white shadow-md rounded-lg mb-6 overflow-hidden">
        <div className="p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Editar Lista Interactiva</h2>
          
          {submitError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <span>{submitError}</span>
            </div>
          )}
          
          <form onSubmit={handleSaveEdit} className="space-y-6">
            {/* Nombre del comando y preferencias */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comando
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={editCommand}
                  onChange={(e) => setEditCommand(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                  placeholder="Nombre del comando (sin prefijo)"
                />
              </div>
              
              <div className="mt-2">
                <div className="flex items-center">
                  <input
                    id="editUsePrefix"
                    type="checkbox"
                    checked={editUsePrefix}
                    onChange={(e) => setEditUsePrefix(e.target.checked)}
                    className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="editUsePrefix" className="ml-2 block text-sm text-gray-700">
                    Usar prefijo (!) <span className="text-gray-500 text-xs">Ejemplo: !{editCommand || 'comando'}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Texto introductorio */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Texto introductorio
              </label>
              <textarea
                value={editIntroText}
                onChange={(e) => setEditIntroText(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                placeholder="Este texto se mostrará antes de las opciones de la lista..."
              />
            </div>

            {/* Secciones y elementos */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Secciones y elementos
              </label>
              
              {hasExcessItems && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-yellow-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        WhatsApp solo permite mostrar los primeros 10 elementos en total entre todas las secciones.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {editSections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-700">Sección {sectionIndex + 1}</h3>
                    {editSections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEditSection(sectionIndex)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título de la sección
                    </label>
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateEditSectionTitle(sectionIndex, e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                      placeholder="Título de la sección"
                    />
                  </div>

                  {/* Items de la sección */}
                  <div className="space-y-4 mb-4">
                    {section.items.map((item, itemIndex) => (
                      <div key={item.row_id} className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xs font-medium text-gray-700">Elemento {itemIndex + 1}</h4>
                          {section.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEditItem(sectionIndex, itemIndex)}
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
                              onChange={(e) => updateEditItem(sectionIndex, itemIndex, 'title', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                              placeholder="Título visible en el botón"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Descripción
                            </label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateEditItem(sectionIndex, itemIndex, 'description', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                              placeholder="Descripción corta"
                            />
                          </div>
                          
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Respuesta
                            </label>
                            <input
                              type="text"
                              value={item.response}
                              onChange={(e) => updateEditItem(sectionIndex, itemIndex, 'response', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                              placeholder="Respuesta cuando se seleccione este elemento"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => addEditItem(sectionIndex)}
                    className="w-full py-2 px-3 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 focus:outline-none flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Añadir elemento
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addEditSection}
                className="w-full py-2 px-3 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50 focus:outline-none flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Añadir sección
              </button>
            </div>
            
            {/* Botones para guardar o cancelar */}
            <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </span>
                ) : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={() => setEditingCommandId(null)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all flex-1"
              >
                Cancelar edición
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Gestión de Listas Interactivas</h1>
        
        {/* Mensajes de éxito o error */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 text-green-800 rounded-md flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        {/* Botón para mostrar/ocultar el formulario de nueva lista */}
        {!showNewListForm && !editingCommandId && (
          <button
            onClick={() => setShowNewListForm(true)}
            className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva Lista
          </button>
        )}
        
        {/* Formulario para nueva lista o edición */}
        {showNewListForm && renderNewListForm()}
        {editingCommandId && renderEditForm()}
        
        {/* Tabla de listas existentes */}
        {!editingCommandId && (
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
                          {cmd.use_prefix ? `!${cmd.command}` : cmd.command}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {cmd.sections && cmd.sections.length > 0 ? (
                            <div>
                              <span className="font-medium">{cmd.sections.length} secciones</span>
                              <ul className="mt-1 text-xs text-gray-400">
                                {cmd.sections.slice(0, 2).map((section, idx) => (
                                  <li key={idx}>• {section.title} ({section.items.length} elementos)</li>
                                ))}
                                {cmd.sections.length > 2 && (
                                  <li>• ... {cmd.sections.length - 2} secciones más</li>
                                )}
                              </ul>
                            </div>
                          ) : 'Sin secciones'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(cmd.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => startEditing(cmd.id)} 
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
