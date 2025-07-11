"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";

interface SessionInfo {
  state: string;
  connected: boolean;
  ready: boolean;
  authenticated: boolean;
  phoneNumber: string | null;
  sessionId?: string;
  error?: string;
}

export default function SettingsPage() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const router = useRouter();

  // Cargar la información de la sesión
  const fetchSessionInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("/api/whatsapp/session");
      const data = await response.json();
      
      if (data.success) {
        setSessionInfo(data.session);
      } else {
        setError(data.message || "Error al obtener información de la sesión");
      }
    } catch (err) {
      setError("Error de conexión con el servidor");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Cerrar sesión
  const handleLogout = async () => {
    if (!confirm("¿Estás seguro que deseas cerrar la sesión actual de WhatsApp?")) {
      return;
    }
    
    try {
      setActionLoading(true);
      setError(null);
      setActionSuccess(null);
      
      const response = await fetch("/api/whatsapp/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "logout",
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setActionSuccess("Sesión cerrada exitosamente");
        // Actualizar la información de sesión
        fetchSessionInfo();
        
        // Redirigir después de un momento
        setTimeout(() => {
          router.push("/qr");
        }, 2000);
      } else {
        setError(data.message || "Error al cerrar sesión");
      }
    } catch (err) {
      setError("Error de conexión con el servidor");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Eliminar completamente los datos de sesión
  const handleDeleteSession = async () => {
    if (!confirm("¿Estás seguro que deseas eliminar TODOS los datos de sesión? Esto eliminará la autenticación y requerirá un nuevo escaneo del código QR.")) {
      return;
    }
    
    try {
      setActionLoading(true);
      setError(null);
      setActionSuccess(null);
      
      const response = await fetch("/api/whatsapp/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setActionSuccess("Datos de sesión eliminados exitosamente");
        // Actualizar la información de sesión
        fetchSessionInfo();
        
        // Redirigir después de un momento
        setTimeout(() => {
          router.push("/qr");
        }, 2000);
      } else {
        setError(data.message || "Error al eliminar datos de sesión");
      }
    } catch (err) {
      setError("Error de conexión con el servidor");
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Cargar la información de la sesión al montar el componente
  useEffect(() => {
    fetchSessionInfo();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchSessionInfo, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Configuración de WhatsApp</h1>
          
          {/* Información de la sesión */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Estado de la Sesión</h2>
            
            {loading ? (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="p-4 bg-red-50 text-red-700 rounded-md">
                <p>{error}</p>
                <button 
                  onClick={fetchSessionInfo}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Reintentar
                </button>
              </div>
            ) : sessionInfo ? (
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50 w-1/3">
                        Estado
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          sessionInfo.connected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {sessionInfo.state || (sessionInfo.connected ? "CONECTADO" : "DESCONECTADO")}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                        Autenticado
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sessionInfo.authenticated ? (
                          <span className="text-green-600">Sí</span>
                        ) : (
                          <span className="text-red-600">No</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                        Cliente Listo
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sessionInfo.ready ? (
                          <span className="text-green-600">Sí</span>
                        ) : (
                          <span className="text-red-600">No</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                        Número Telefónico
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {sessionInfo.phoneNumber || "No disponible"}
                      </td>
                    </tr>
                    {sessionInfo.sessionId && (
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-gray-50">
                          ID de Sesión
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sessionInfo.sessionId}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600">No hay información de sesión disponible.</p>
            )}
          </div>
          
          {/* Acciones de la sesión */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Acciones de la Sesión</h2>
            
            {actionSuccess && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md border border-green-200">
                {actionSuccess}
              </div>
            )}
            
            <div className="flex flex-col md:flex-row gap-4">
              <button
                onClick={handleLogout}
                disabled={actionLoading || !sessionInfo?.authenticated}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Procesando..." : "Cerrar Sesión"}
              </button>
              
              <button
                onClick={handleDeleteSession}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {actionLoading ? "Procesando..." : "Eliminar Datos de Sesión"}
              </button>
              
              <button
                onClick={() => router.push("/qr")}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Escanear Nuevo Código QR
              </button>
            </div>
            
            <p className="mt-4 text-sm text-gray-500">
              <strong>Nota:</strong> Cerrar sesión mantendrá los datos locales pero cerrará la sesión actual. 
              Eliminar los datos borrará toda la información de sesión almacenada localmente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
