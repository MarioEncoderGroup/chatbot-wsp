import { NextResponse } from 'next/server';
import { whatsappClient } from '@/lib/whatsapp/client';
import * as puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import * as os from 'os';

export async function GET() {
  try {
    // Información del sistema
    const systemInfo = {
      os: os.platform(),
      osVersion: os.release(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + 'GB',
      nodeVersion: process.version
    };

    // Información de rutas
    const sessionDir = './whatsapp-session';
    const sessionDirExists = fs.existsSync(sessionDir);
    const sessionDirContents = sessionDirExists 
      ? fs.readdirSync(sessionDir).slice(0, 10) // Limitar a 10 elementos para evitar respuestas muy grandes
      : [];

    // Información de dependencias
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    
    // Intenta obtener la versión de Puppeteer
    let puppeteerVersion = 'Desconocida';
    let puppeteerInfo;
    try {
      // Obtenemos la versión desde el package.json en lugar de la API
      const puppeteerPackageVersion = packageJson.dependencies['puppeteer'] || packageJson.devDependencies['puppeteer'] || 'Desconocida';
      puppeteerVersion = puppeteerPackageVersion;
      
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox'] 
      });
      
      // Usamos la función getBrowserInfo para obtener la información en lugar de acceder directamente
      const browserVersion = await browser.version();
      
      puppeteerInfo = {
        version: puppeteerVersion,
        browserVersion: browserVersion,
        userAgent: await browser.userAgent()
      };
      
      await browser.close();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      puppeteerInfo = {
        error: 'Error al inicializar Puppeteer: ' + errorMessage
      };
    }

    // Estado del cliente de WhatsApp
    const clientStatus = whatsappClient.isReady();
    
    // Información específica de Chrome
    const chromePaths = {
      darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
      win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
      linux: '/usr/bin/google-chrome' // Linux
    };
    
    const platform = os.platform() as 'darwin' | 'win32' | 'linux';
    const defaultChromePath = chromePaths[platform];
    const chromeExists = fs.existsSync(defaultChromePath);

    return NextResponse.json({
      status: 'success',
      system: systemInfo,
      sessionDir: {
        path: path.resolve(sessionDir),
        exists: sessionDirExists,
        contents: sessionDirContents
      },
      dependencies: {
        whatsappWebJs: packageJson.dependencies['whatsapp-web.js'],
        puppeteer: packageJson.dependencies['puppeteer'],
        puppeteerCore: packageJson.dependencies['puppeteer-core'],
      },
      puppeteer: puppeteerInfo,
      chrome: {
        defaultPath: defaultChromePath,
        exists: chromeExists
      },
      whatsappClient: {
        initialized: clientStatus
      }
    }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return NextResponse.json({
      status: 'error',
      message: 'Error al obtener información de diagnóstico',
      error: errorMessage
    }, { status: 500 });
  }
}
