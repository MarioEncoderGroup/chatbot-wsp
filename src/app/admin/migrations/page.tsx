'use client';

import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';

interface Migration {
  name: string;
  path: string;
  status?: 'pending' | 'success' | 'error';
  message?: string;
}

export default function MigrationsPage() {
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMigration, setSelectedMigration] = useState<string | null>(null);

  // Cargar migraciones disponibles
  const fetchMigrations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/migrations/apply');
      
      if (!response.ok) {
        throw new Error(`Error al cargar migraciones: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMigrations(data.migrations);
      } else {
        setError(data.message || 'Error al cargar migraciones');
      }
    } catch (error) {
      console.error('Error al cargar migraciones:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar la migración seleccionada
  const applyMigration = async (migrationName: string) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setSelectedMigration(migrationName);
      
      const response = await fetch('/api/migrations/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ migrationName })
      });
      
      const data = await response.json();
      
      // Actualizar el estado de la migración en la lista
      setMigrations(prevMigrations => 
        prevMigrations.map(migration => 
          migration.name === migrationName 
            ? { 
                ...migration, 
                status: data.success ? 'success' : 'error',
                message: data.message
              } 
            : migration
        )
      );
      
      if (data.success) {
        setSuccess(`Migración "${migrationName}" aplicada con éxito`);
      } else {
        setError(data.message || `Error al aplicar la migración "${migrationName}"`);
      }
    } catch (error) {
      console.error('Error al aplicar migración:', error);
      setError((error as Error).message);
      
      // Actualizar el estado de la migración en caso de error
      setMigrations(prevMigrations => 
        prevMigrations.map(migration => 
          migration.name === migrationName 
            ? { 
                ...migration, 
                status: 'error',
                message: (error as Error).message
              } 
            : migration
        )
      );
    } finally {
      setLoading(false);
      setSelectedMigration(null);
    }
  };

  // Cargar migraciones al montar el componente
  useEffect(() => {
    fetchMigrations();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900">Administrador de Migraciones</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Gestiona y aplica migraciones de la base de datos para mantener el esquema actualizado.
              </p>
              
              {error && (
                <div className="mt-4 bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">
                        {error}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {success && (
                <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700">
                        {success}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200">
              {loading && !selectedMigration ? (
                <div className="flex justify-center items-center py-8">
                  <svg className="animate-spin h-8 w-8 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : migrations.length === 0 ? (
                <div className="py-6 text-center text-gray-500">
                  No hay migraciones disponibles.
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {migrations.map((migration) => (
                      <tr key={migration.name}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {migration.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {migration.status === 'success' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Aplicada con éxito
                            </span>
                          )}
                          {migration.status === 'error' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Error
                            </span>
                          )}
                          {!migration.status && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Pendiente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            onClick={() => applyMigration(migration.name)}
                            disabled={loading}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {selectedMigration === migration.name ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Aplicando...
                              </span>
                            ) : (
                              'Aplicar migración'
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
              <button
                type="button"
                onClick={fetchMigrations}
                disabled={loading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Actualizar lista
              </button>
              <button
                type="button"
                onClick={() => applyMigration('update_list_structure.sql')}
                disabled={loading}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aplicar migración de listas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
