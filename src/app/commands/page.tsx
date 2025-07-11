'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';

// Tipos para los comandos
interface Command {
  id: number;
  command: string;
  response: string;
  use_prefix: boolean;
  created_by: string;
  created_at: string;
}

export default function CommandsPage() {
  const [commands, setCommands] = useState<Command[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para el formulario de nuevo comando
  const [newCommand, setNewCommand] = useState<string>('');
  const [newResponse, setNewResponse] = useState<string>('');
  const [usePrefix, setUsePrefix] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estados para edición
  const [editingCommandId, setEditingCommandId] = useState<number | null>(null);
  const [editCommand, setEditCommand] = useState<string>('');
  const [editResponse, setEditResponse] = useState<string>('');
  const [editUsePrefix, setEditUsePrefix] = useState<boolean>(true);
  
  const router = useRouter();
  
  // Cargar comandos
  const fetchCommands = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/whatsapp/commands');
      
      if (!response.ok) {
        throw new Error(`Error al cargar comandos: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCommands(data.commands);
      } else {
        throw new Error(data.message || 'Error al cargar comandos');
      }
    } catch (err) {
      setError((err as Error).message);
      console.error('Error al cargar comandos:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCommands();
  }, []);
  
  // Añadir nuevo comando
  const handleAddCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCommand.trim() || !newResponse.trim()) {
      setSubmitError('El comando y la respuesta son obligatorios');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      
      const response = await fetch('/api/whatsapp/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: newCommand,
          response: newResponse,
          usePrefix: usePrefix,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNewCommand('');
        setNewResponse('');
        setSuccessMessage('Comando añadido correctamente');
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchCommands();
      } else {
        setSubmitError(data.message || 'Error al añadir el comando');
      }
    } catch (err) {
      setSubmitError((err as Error).message);
      console.error('Error al añadir comando:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Eliminar comando
  const handleDeleteCommand = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este comando?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/whatsapp/commands?id=${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Comando eliminado correctamente');
        setTimeout(() => setSuccessMessage(null), 3000);
        fetchCommands();
      } else {
        setError(data.message || 'Error al eliminar el comando');
      }
    } catch (err) {
      setError((err as Error).message);
      console.error('Error al eliminar comando:', err);
    }
  };
  
  // Iniciar edición
  const startEditing = (command: Command) => {
    setEditingCommandId(command.id);
    setEditCommand(command.command);
    setEditResponse(command.response);
    setEditUsePrefix(Boolean(command.use_prefix));
  };
  
  // Guardar edición
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editCommand.trim() || !editResponse.trim()) {
      setSubmitError('El comando y la respuesta son obligatorios');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setSubmitError(null);
      
      const response = await fetch(`/api/whatsapp/commands?id=${editingCommandId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: editCommand,
          response: editResponse,
          usePrefix: editUsePrefix,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccessMessage('Comando actualizado correctamente');
        setTimeout(() => setSuccessMessage(null), 3000);
        setEditingCommandId(null);
        fetchCommands();
      } else {
        setSubmitError(data.message || 'Error al actualizar el comando');
      }
    } catch (err) {
      setSubmitError((err as Error).message);
      console.error('Error al actualizar comando:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Cancelar edición
  const cancelEditing = () => {
    setEditingCommandId(null);
    setSubmitError(null);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Añadimos la barra de navegación */}
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-green-500 to-green-700 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Gestión de Comandos de WhatsApp</h1>
            <p className="text-green-100 mt-1">
              Añade, edita y gestiona los comandos personalizados para tu bot
            </p>
          </div>
          
          {/* Sección de añadir comando */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Añadir nuevo comando</h2>
            
            {/* Mensajes de éxito o error */}
            {submitError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                </div>
              </div>
            )}
            
            {successMessage && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleAddCommand} className="space-y-4">
              <div>
                <label htmlFor="command" className="block text-sm font-medium text-gray-700 mb-1">
                  Comando
                </label>
                <input
                  type="text"
                  id="command"
                  value={newCommand}
                  onChange={(e) => setNewCommand(e.target.value)}
                  placeholder="ejemplo (se añadirá ! automáticamente)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                />
              </div>
              
              <div>
                <label htmlFor="response" className="block text-sm font-medium text-gray-700 mb-1">
                  Respuesta
                </label>
                <textarea
                  id="response"
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  placeholder="Respuesta al comando"
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="usePrefix"
                  checked={usePrefix}
                  onChange={(e) => setUsePrefix(e.target.checked)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="usePrefix" className="ml-2 block text-sm text-gray-700">
                  Usar prefijo "!" (ejemplo: !comando)
                </label>
              </div>
              
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Añadiendo...' : 'Añadir Comando'}
                </button>
              </div>
            </form>
          </div>
          
          {/* Sección de comandos existentes */}
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Comandos existentes</h2>
            
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-pulse flex space-x-4">
                  <div className="h-12 w-12 bg-green-200 rounded-full"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-green-200 rounded"></div>
                    <div className="h-4 bg-green-200 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            ) : commands.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay comandos disponibles.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        COMANDO
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        RESPUESTA
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        USA PREFIJO
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CREADO POR
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        FECHA
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ACCIONES
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {commands.map((command) => (
                      <tr key={command.id}>
                        {editingCommandId === command.id ? (
                          // Formulario de edición
                          <td colSpan={6} className="px-6 py-4">
                            {submitError && (
                              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                                <p className="text-sm text-red-700">{submitError}</p>
                              </div>
                            )}
                            
                            <form onSubmit={handleSaveEdit} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Comando
                                  </label>
                                  <input
                                    type="text"
                                    value={editCommand}
                                    onChange={(e) => setEditCommand(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md"
                                  />
                                </div>
                                
                                <div className="flex items-center">
                                  <input
                                    type="checkbox"
                                    id={`edit-usePrefix-${command.id}`}
                                    checked={editUsePrefix}
                                    onChange={(e) => setEditUsePrefix(e.target.checked)}
                                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                                  />
                                  <label htmlFor={`edit-usePrefix-${command.id}`} className="ml-2 block text-sm text-gray-700">
                                    Usar prefijo "!" (ejemplo: !comando)
                                  </label>
                                </div>
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Respuesta
                                </label>
                                <textarea
                                  value={editResponse}
                                  onChange={(e) => setEditResponse(e.target.value)}
                                  rows={4}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                                />
                              </div>
                              
                              <div className="flex space-x-2">
                                <button
                                  type="submit"
                                  disabled={isSubmitting}
                                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                  {isSubmitting ? 'Guardando...' : 'Guardar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditing}
                                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </form>
                          </td>
                        ) : (
                          // Vista normal
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {command.use_prefix ? `!${command.command}` : command.command}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                              {command.response}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${command.use_prefix ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {command.use_prefix ? 'Sí' : 'No'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {command.created_by}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(command.created_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => startEditing(command)}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteCommand(command.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Eliminar
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}