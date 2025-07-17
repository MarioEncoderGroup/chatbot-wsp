import React, { useState } from 'react';

interface ListItem {
  row_id: string;
  title: string;
  response: string;
}

interface EditListFormProps {
  editId: number;
  editCommand: string;
  editTitle: string;
  editIntroText: string;
  editUsePrefix: boolean;
  editItems: ListItem[];
  setEditCommand: (command: string) => void;
  setEditTitle: (title: string) => void;
  setEditIntroText: (text: string) => void;
  setEditUsePrefix: (usePrefix: boolean) => void;
  setEditItems: (items: ListItem[]) => void;
  handleEditSubmit: (e: React.FormEvent) => Promise<void>;
  submitError: string | null;
  loading: boolean;
  cancelEdit: () => void;
  addEditItem: () => void;
  updateEditItem: (index: number, field: 'title' | 'response', value: string) => void;
  removeEditItem: (index: number) => void;
}

export default function EditListForm({
  editId,
  editCommand,
  editTitle,
  editIntroText,
  editUsePrefix,
  editItems,
  setEditCommand,
  setEditTitle,
  setEditIntroText,
  setEditUsePrefix,
  setEditItems,
  handleEditSubmit,
  submitError,
  loading,
  cancelEdit,
  addEditItem,
  updateEditItem,
  removeEditItem,
}: EditListFormProps) {
  // Contar total de elementos
  const countItems = (items: ListItem[]) => {
    return items.length;
  };
  
  const totalItems = countItems(editItems);
  const hasExcessItems = totalItems > 10;

  return (
    <div className="bg-white shadow-md rounded-lg mb-6 overflow-hidden">
      <div className="p-4">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Editar Lista Interactiva</h2>

        {submitError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span>{submitError}</span>
          </div>
        )}
        
        <form onSubmit={handleEditSubmit} className="space-y-6">
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

          {/* Título de la lista */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título de la lista
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
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
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-yellow-400">
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
            
            {editItems.map((item, itemIndex) => (
              <div key={item.row_id} className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Elemento {itemIndex + 1}</h3>
                  {editItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEditItem(itemIndex)}
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
                      onChange={(e) => updateEditItem(itemIndex, 'title', e.target.value)}
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
                      onChange={(e) => updateEditItem(itemIndex, 'response', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
                      placeholder="Respuesta cuando se selecciona este elemento"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addEditItem}
              className="w-full p-3 border border-gray-300 border-dashed rounded-lg text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Añadir elemento
            </button>
          </div>
          
          {/* Botones de acción */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </span>
              ) : 'Guardar cambios'}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all"
            >
              Cancelar edición
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
