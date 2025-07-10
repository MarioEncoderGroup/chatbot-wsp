"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Header from "./components/Header";

export default function Home() {
  // Estados para manejar la interfaz de usuario
  const [isInitializing, setIsInitializing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [commandName, setCommandName] = useState("");
  const [commandResponse, setCommandResponse] = useState("");
  const [addingCommand, setAddingCommand] = useState(false);

  const router = useRouter();

  // Verificar el estado del cliente WhatsApp
  const checkWhatsAppStatus = async () => {
    try {
      const response = await fetch("/api/whatsapp/init", {
        method: "GET",
      });

      const data = await response.json();

      if (data.success) {
        setIsReady(data.isReady);
        // Si el cliente no está listo pero hay un código QR, redirigir a la página de QR
        if (!data.isReady && data.qrCode) {
          setQrCode(data.qrCode);
        } else if (data.isReady) {
          // Si el cliente está listo, actualizamos el estado
          setQrCode(null);
        }
      }
    } catch (error) {
      console.error("Error al verificar estado:", error);
      setStatusMessage({
        text: "Error al conectar con el servidor. Intente más tarde.",
        type: "error",
      });
    }
  };

  // Inicializar el cliente WhatsApp
  const initializeWhatsApp = async () => {
    // Redirigir a la página dedicada de QR
    router.push("/qr");
  };

  // Enviar mensaje de WhatsApp
  const sendWhatsAppMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || !message) {
      setStatusMessage({
        text: "El número de teléfono y el mensaje son requeridos",
        type: "error",
      });
      return;
    }

    setSendingMessage(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/whatsapp/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: phoneNumber,
          message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatusMessage({
          text: "Mensaje enviado correctamente",
          type: "success",
        });
        setMessage("");
      } else {
        setStatusMessage({
          text: data.message || "Error al enviar mensaje",
          type: "error",
        });
      }
    } catch (error) {
      setStatusMessage({
        text: "Error al conectar con el servidor",
        type: "error",
      });
      console.error(error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Agregar comando personalizado
  const addCustomCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commandName || !commandResponse) {
      setStatusMessage({
        text: "El nombre del comando y la respuesta son requeridos",
        type: "error",
      });
      return;
    }

    setAddingCommand(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/whatsapp/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command: commandName,
          response: commandResponse,
          createdBy: "web",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatusMessage({
          text: `Comando ${commandName} registrado correctamente`,
          type: "success",
        });
        setCommandName("");
        setCommandResponse("");
      } else {
        setStatusMessage({
          text: data.message || "Error al registrar comando",
          type: "error",
        });
      }
    } catch (error) {
      setStatusMessage({
        text: "Error al conectar con el servidor",
        type: "error",
      });
      console.error(error);
    } finally {
      setAddingCommand(false);
    }
  };

  // Verificar el estado al cargar la página
  useEffect(() => {
    // Verificar el estado inicial
    const checkInitialStatus = async () => {
      try {
        const response = await fetch("/api/whatsapp/init", {
          method: "GET",
        });
  
        const data = await response.json();
  
        if (data.success) {
          setIsReady(data.isReady);
          
          // Si no está listo y hay código QR, ofrecer inicializar
          if (!data.isReady) {
            setStatusMessage({
              text: "El cliente WhatsApp no está conectado. Haga clic en 'Iniciar Bot de WhatsApp' para comenzar.",
              type: "error",
            });
          } else {
            setStatusMessage({
              text: "Cliente WhatsApp conectado y listo para usar.",
              type: "success",
            });
          }
        }
      } catch (error) {
        console.error("Error al verificar estado inicial:", error);
        setStatusMessage({
          text: "Error al conectar con el servidor",
          type: "error",
        });
      }
    };
    
    checkInitialStatus();
    
    // Verificar estado cada 30 segundos
    const interval = setInterval(checkWhatsAppStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="container mx-auto px-4 max-w-5xl py-8">
        <header className="flex flex-col items-center mb-8 p-6 bg-white rounded-lg shadow-sm">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">WhatsApp Bot</h1>
          <p className="text-gray-600 text-center">
            Bot automatizado para WhatsApp utilizando whatsapp-web.js y Next.js
          </p>
        </header>

        {statusMessage && (
          <div
            className={`p-4 mb-6 rounded-md ${
              statusMessage.type === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Panel de inicialización y estado */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Estado del Bot</h2>
            
            <div className="flex items-center mb-4">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  isReady ? "bg-green-500" : "bg-red-500"
                }`}
              ></div>
              <span>
                {isReady ? "Bot conectado y activo" : "Bot desconectado"}
              </span>
            </div>

            {!isReady && (
              <div className="mb-6">
                <p className="text-gray-600 mb-2">El bot de WhatsApp no está conectado. Haga clic en el botón para comenzar.</p>
                <button
                  onClick={initializeWhatsApp}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Conectar con WhatsApp
                </button>
              </div>
            )}
          </div>

          {/* Panel de envío de mensajes */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Enviar Mensaje</h2>
            
            <form onSubmit={sendWhatsAppMessage}>
              <div className="mb-4">
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Número de teléfono (con código de país)
                </label>
                <input
                  type="text"
                  id="phoneNumber"
                  placeholder="+34612345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={!isReady || sendingMessage}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato: +[código país][número] sin espacios ni guiones
                </p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Mensaje
                </label>
                <textarea
                  id="message"
                  placeholder="Escribe tu mensaje aquí..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={!isReady || sendingMessage}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              
              <button
                type="submit"
                disabled={!isReady || !phoneNumber || !message || sendingMessage}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors disabled:bg-green-300"
              >
                {sendingMessage ? "Enviando..." : "Enviar Mensaje"}
              </button>
            </form>
          </div>
        </div>

        {/* Panel de comandos personalizados */}
        <div className="mt-6 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Añadir Comando Personalizado</h2>
          
          <form onSubmit={addCustomCommand}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="commandName" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del comando (sin el prefijo !)
                </label>
                <input
                  type="text"
                  id="commandName"
                  placeholder="saludo"
                  value={commandName}
                  onChange={(e) => setCommandName(e.target.value)}
                  disabled={!isReady || addingCommand}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
              
              <div>
                <label htmlFor="commandResponse" className="block text-sm font-medium text-gray-700 mb-1">
                  Respuesta al comando
                </label>
                <input
                  type="text"
                  id="commandResponse"
                  placeholder="¡Hola! ¿Cómo estás?"
                  value={commandResponse}
                  onChange={(e) => setCommandResponse(e.target.value)}
                  disabled={!isReady || addingCommand}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={!isReady || !commandName || !commandResponse || addingCommand}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors disabled:bg-purple-300"
            >
              {addingCommand ? "Añadiendo comando..." : "Añadir Comando"}
            </button>
          </form>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              Los usuarios podrán usar tu comando enviando <strong>!{commandName || "nombre-comando"}</strong> en WhatsApp.
            </p>
          </div>
        </div>

        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>Desarrollado con Next.js y whatsapp-web.js</p>
          <p className="mt-1">© {new Date().getFullYear()} WhatsApp Bot</p>
        </footer>
      </div>
    </div>
  );
}
