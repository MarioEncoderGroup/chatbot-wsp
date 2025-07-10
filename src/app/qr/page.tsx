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
    const initializeClient = async () => {
      setInitializing(true);
      setError(null);

      try {
        // Primero inicializamos el cliente
        const initResponse = await fetch("/api/whatsapp/init", {
          method: "POST",
        });

        const initData = await initResponse.json();

        if (!initData.success) {
          setError(initData.message || "Error al inicializar el cliente");
          setInitializing(false);
          return;
        }

        // Comenzamos a verificar el estado y obtener el QR
        const checkInterval = setInterval(async () => {
          try {
            const statusResponse = await fetch("/api/whatsapp/init");
            const statusData = await statusResponse.json();

            if (statusData.success) {
              if (statusData.isReady) {
                // Si el cliente está listo, redirigimos a la página principal
                setIsReady(true);
                clearInterval(checkInterval);
                setTimeout(() => {
                  router.push("/");
                }, 3000);
              } else if (statusData.qrCode) {
                // Si hay un código QR disponible, lo mostramos
                setQrCode(statusData.qrCode);
                setInitializing(false);
              }
            } else {
              setError(statusData.message || "Error al verificar el estado del cliente");
              setInitializing(false);
              clearInterval(checkInterval);
            }
          } catch (err) {
            console.error("Error al verificar el estado:", err);
            setError("Error de conexión con el servidor");
            setInitializing(false);
            clearInterval(checkInterval);
          }
        }, 1500); // Verificamos cada 1.5 segundos

        // Limpiamos el intervalo después de 2 minutos si no hay conexión
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!isReady) {
            setError("Tiempo de espera agotado. Intente nuevamente.");
          }
        }, 120000);

        return () => clearInterval(checkInterval);
      } catch (err) {
        console.error("Error al inicializar:", err);
        setError("Error de conexión con el servidor");
        setInitializing(false);
      }
    };

    initializeClient();
  }, []);

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
                <img 
                  src={qrCode} 
                  alt="Código QR para WhatsApp" 
                  width={256} 
                  height={256} 
                  className="max-w-full h-auto"
                />
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
          <p>WhatsApp Bot con Next.js & whatsapp-web.js</p>
        </div>
      </div>
    </div>
  );
}
