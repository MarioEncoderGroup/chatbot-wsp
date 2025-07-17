"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function QRPage() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();

  // Inicializar el cliente y obtener el QR inmediatamente al cargar la página
  useEffect(() => {
    let isMounted = true;
    let checkInterval: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const initializeClient = async () => {
      if (!isMounted) return;
      
      setInitializing(true);
      setError(null);

      try {
        // Primero inicializamos el cliente
        const initResponse = await fetch("/api/whatsapp/init", {
          method: "POST",
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          }
        });

        if (!isMounted) return;
        
        const initData = await initResponse.json();

        if (!initData.success) {
          setError(initData.message || "Error al inicializar el cliente");
          setInitializing(false);
          return;
        }

        // Comenzamos a verificar el estado y obtener el QR
        checkInterval = setInterval(async () => {
          if (!isMounted) return;
          
          try {
            const statusResponse = await fetch("/api/whatsapp/init", {
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache',
              }
            });
            
            if (!isMounted) return;
            
            const statusData = await statusResponse.json();

            if (statusData.success) {
              if (statusData.isReady) {
                // Si el cliente está listo, redirigimos a la página principal
                setIsReady(true);
                if (checkInterval) clearInterval(checkInterval);
                setTimeout(() => {
                  if (isMounted) router.push("/");
                }, 3000);
              } else if (statusData.qrCode) {
                // Si hay un código QR disponible, lo mostramos
                setQrCode(statusData.qrCode);
                setInitializing(false);
              }
            } else {
              setError(statusData.message || "Error al verificar el estado del cliente");
              setInitializing(false);
              if (checkInterval) clearInterval(checkInterval);
            }
          } catch (err) {
            console.error("Error al verificar el estado:", err);
            if (isMounted) {
              setError("Error de conexión con el servidor");
              setInitializing(false);
              if (checkInterval) clearInterval(checkInterval);
            }
          }
        }, 1500); // Verificamos cada 1.5 segundos

        // Limpiamos el intervalo después de 2 minutos si no hay conexión
        timeoutId = setTimeout(() => {
          if (isMounted && !isReady) {
            setError("Tiempo de espera agotado. Intente nuevamente.");
            if (checkInterval) clearInterval(checkInterval);
          }
        }, 120000);

      } catch (err) {
        console.error("Error al inicializar:", err);
        if (isMounted) {
          setError("Error de conexión con el servidor");
          setInitializing(false);
        }
      }
    };

    initializeClient();
    
    // Limpieza al desmontar el componente
    return () => {
      isMounted = false;
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router, isReady]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Conecta WhatsApp</h1>

        {initializing && (
          <div className="mb-6">
            <div className="animate-pulse flex flex-col items-center">
              <div className="h-32 w-32 bg-gray-200 rounded-lg mb-4"></div>
              <p className="text-gray-600">Inicializando cliente de WhatsApp...</p>
              <p className="text-sm text-gray-500 mt-2">Esto puede tardar unos momentos</p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        )}

        {qrCode && !isReady && !initializing && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Escanea este código QR con tu teléfono</h2>
            <div className="flex justify-center mb-4">
              <div className="border-4 border-green-500 inline-block p-2 bg-white rounded-lg">
                {qrCode ? (
                  <img 
                    src={qrCode} 
                    alt="Código QR para WhatsApp" 
                    width={256} 
                    height={256} 
                    className="max-w-full h-auto"
                  />
                ) : (
                  <div className="w-64 h-64 bg-gray-200 flex items-center justify-center">
                    <p className="text-gray-500">Cargando QR...</p>
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              <p className="mb-2">📱 Abre WhatsApp en tu teléfono</p>
              <p className="mb-2">⚙️ Ve a Configuración &gt; Dispositivos vinculados</p>
              <p className="mb-2">🔗 Selecciona "Vincular un dispositivo"</p>
              <p>📷 Escanea este código QR</p>
            </div>
          </div>
        )}

        {isReady && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg border border-green-200">
            <p className="font-medium">¡Conexión exitosa!</p>
            <p className="text-sm">WhatsApp conectado correctamente</p>
            <p className="text-xs mt-2">Redirigiendo a la página principal...</p>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-8">
          <p>WhatsApp Bot</p>
        </div>
      </div>
    </div>
  );
}
