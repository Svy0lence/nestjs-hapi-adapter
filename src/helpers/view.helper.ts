import * as Hapi from '@hapi/hapi';
import * as path from 'path';
import * as fs from 'fs';
import {
  ViewEngineOptions,
  ViewEngine,
  VIEW_ENGINE_CONFIG_MAP,
  ViewDirectory,
  HapiPlugin,
  HandlebarsHelper,
} from '../types/view.type';

/**
 * Configuración interna de vistas
 */
let viewConfig: {
  engine?: string;
  viewsPath?: string;
  defaultExtension?: string;
  engineConfig?: any;
  options?: ViewEngineOptions;
  isConfigured?: boolean;
} = {};

/**
 * Referencia al servidor Hapi para configurar vistas
 */
let hapiServerRef: Hapi.Server | null = null;

/**
 * Establece la referencia al servidor Hapi
 * @param server - Instancia del servidor Hapi
 */
export function setHapiServerReference(server: Hapi.Server): void {
  hapiServerRef = server;
}

/**
 * Establece el directorio base de vistas
 * @param viewsPath - Path absoluto o relativo al directorio de vistas
 */
export function setBaseViewsDir(viewsPath: string): void {
  viewConfig.viewsPath = viewsPath;
}

/**
 * Obtiene el directorio de vistas configurado
 */
export function getBaseViewsDir(): string | undefined {
  return viewConfig.viewsPath;
}

/**
 * Registra los helpers predefinidos de Handlebars
 * @param viewEngine - Instancia del motor Handlebars
 */
function registerHandlebarsHelpers(viewEngine: any): void {
  if (!viewEngine || typeof viewEngine.registerHelper !== 'function') {
    return;
  }

  // Helper: Mayor que (>)
  viewEngine.registerHelper(HandlebarsHelper.GREATER_THAN, function (a: any, b: any) {
    return a > b;
  });

  // Helper: Menor que (<)
  viewEngine.registerHelper(HandlebarsHelper.LESS_THAN, function (a: any, b: any) {
    return a < b;
  });

  // Helper: Igual (===)
  viewEngine.registerHelper(HandlebarsHelper.EQUALS, function (a: any, b: any) {
    return a === b;
  });

  // Helper: No igual (!==)
  viewEngine.registerHelper(HandlebarsHelper.NOT_EQUALS, function (a: any, b: any) {
    return a !== b;
  });

  // Helper: AND lógico
  viewEngine.registerHelper(HandlebarsHelper.AND, function (a: any, b: any) {
    return a && b;
  });

  // Helper: OR lógico
  viewEngine.registerHelper(HandlebarsHelper.OR, function (a: any, b: any) {
    return a || b;
  });
}

/**
 * Configura el motor de plantillas de forma lazy (no valida hasta que se use)
 * @param engine - Nombre del motor (hbs, ejs, pug, etc.) o ViewEngine enum
 * @param options - Opciones adicionales del motor
 */
export async function configureViewEngine(
  engine: ViewEngine | string,
  options?: ViewEngineOptions
): Promise<void> {
  if (!hapiServerRef) {
    throw new Error(
      '❌ Servidor Hapi no inicializado.\n' +
        '💡 No se puede configurar el motor de vistas.'
    );
  }

  const engineKey = engine as ViewEngine;
  const engineConfig = VIEW_ENGINE_CONFIG_MAP[engineKey];

  if (!engineConfig) {
    throw new Error(
      `❌ Motor de vistas '${engine}' no soportado.\n` +
        `📋 Motores soportados: ${Object.values(ViewEngine).join(', ')}`
    );
  }

  // Guardar configuración para inicialización lazy
  viewConfig.engine = engineConfig.engine;
  viewConfig.viewsPath = options?.viewsPath || ViewDirectory.VIEWS;
  viewConfig.engineConfig = engineConfig;
  viewConfig.options = options;
  viewConfig.defaultExtension = engineConfig.extensions[0];
  viewConfig.isConfigured = false;

  console.log(
    `⚙️  Motor de vistas '${engineConfig.engine}' configurado.\n` +
      `📁 Directorio: ${viewConfig.viewsPath}\n` +
      `💡 Se inicializará al renderizar la primera vista.`
  );
}

/**
 * Inicializa el motor de vistas de forma lazy (solo cuando se necesita)
 */
async function ensureViewEngineInitialized(): Promise<void> {
  // Si ya está configurado, no hacer nada
  if (viewConfig.isConfigured) {
    return;
  }

  if (!hapiServerRef) {
    throw new Error('❌ Servidor Hapi no inicializado.');
  }

  if (!viewConfig.engineConfig) {
    throw new Error(
      '❌ Motor de vistas no configurado.\n' +
        '💡 Llama a app.setViewEngine() antes de renderizar vistas.'
    );
  }

  const engineConfig = viewConfig.engineConfig;
  const options = viewConfig.options;

  try {
    // Opción 1: El usuario pasa Vision y el motor como parámetros
    let Vision: any = options?.vision;
    let viewEngineInstance: any = options?.viewEngine;

    // Opción 2: Cargar dinámicamente si no se pasan (fallback)
    if (!Vision) {
      try {
        Vision = require(HapiPlugin.VISION);
      } catch {
        throw new Error(
          `❌ ${HapiPlugin.VISION} no está instalado.\n\n` +
            `📦 Opción 1 - Instalar la dependencia:\n` +
            `   npm install ${HapiPlugin.VISION}\n\n` +
            `📦 Opción 2 - Pasarlo como parámetro:\n` +
            `   const Vision = require("${HapiPlugin.VISION}");\n` +
            `   const ${engineConfig.engine} = require("${engineConfig.package}");\n` +
            `   await app.setViewEngine("${viewConfig.engine}", { \n` +
            `     vision: Vision,\n` +
            `     viewEngine: ${engineConfig.engine}\n` +
            `   });`
        );
      }
    }

    if (!viewEngineInstance) {
      try {
        viewEngineInstance = require(engineConfig.package);
      } catch {
        throw new Error(
          `❌ Motor de vistas '${engineConfig.package}' no está instalado.\n\n` +
            `📦 Opción 1 - Instalar la dependencia:\n` +
            `   npm install ${engineConfig.package}\n\n` +
            `📦 Opción 2 - Pasarlo como parámetro:\n` +
            `   const ${engineConfig.engine} = require("${engineConfig.package}");\n` +
            `   await app.setViewEngine("${viewConfig.engine}", { \n` +
            `     viewEngine: ${engineConfig.engine}\n` +
            `   });`
        );
      }
    }

    // Registrar el plugin @hapi/vision
    await hapiServerRef.register(Vision);

    // Registrar helpers personalizados si es Handlebars
    if (engineConfig.supportsHelpers && viewEngineInstance.registerHelper) {
      registerHandlebarsHelpers(viewEngineInstance);
    }

    // Resolver ruta de vistas (absoluta o relativa)
    const viewsDir = path.isAbsolute(viewConfig.viewsPath!)
      ? viewConfig.viewsPath!
      : path.join(process.cwd(), viewConfig.viewsPath!);

    // Configurar las extensiones soportadas
    const enginesConfig: Record<string, any> = {};
    engineConfig.extensions.forEach((ext: string) => {
      enginesConfig[ext] = viewEngineInstance;
    });

    // Verificar qué directorios existen
    const layoutsDir = path.join(
      viewsDir,
      options?.layoutPath || ViewDirectory.LAYOUTS
    );
    const partialsDir = path.join(
      viewsDir,
      options?.partialsPath || ViewDirectory.PARTIALS
    );
    const helpersDir = path.join(
      viewsDir,
      options?.helpersPath || ViewDirectory.HELPERS
    );

    const visionConfig: any = {
      engines: enginesConfig,
      relativeTo: viewsDir,
      path: '.',
      layout: options?.layout !== undefined ? options.layout : false,
      isCached: options?.isCached !== undefined ? options.isCached : false,
    };

    // Solo agregar rutas si los directorios existen
    if (fs.existsSync(layoutsDir)) {
      visionConfig.layoutPath = options?.layoutPath || ViewDirectory.LAYOUTS;
    }
    if (fs.existsSync(partialsDir)) {
      visionConfig.partialsPath = options?.partialsPath || ViewDirectory.PARTIALS;
    }
    if (fs.existsSync(helpersDir)) {
      visionConfig.helpersPath = options?.helpersPath || ViewDirectory.HELPERS;
    }

    // Configurar el motor en Hapi
    (hapiServerRef as any).views(visionConfig);

    // Marcar como configurado
    viewConfig.isConfigured = true;

    console.log(
      `✅ Motor de vistas '${engineConfig.engine}' inicializado exitosamente.\n` +
        `📁 Directorio: ${viewsDir}`
    );
  } catch (error: any) {
    throw error;
  }
}

/**
 * Renderiza una vista usando Hapi y devuelve el HTML como string
 * @param view - Nombre de la vista (sin extensión)
 * @param context - Datos para la vista
 * @returns HTML renderizado como string
 */
export async function renderView(
  view: string,
  context?: Record<string, any>
): Promise<string> {
  if (!hapiServerRef) {
    throw new Error(
      '❌ Servidor Hapi no inicializado.\n' +
        '💡 Asegúrate de que la aplicación esté correctamente iniciada.'
    );
  }

  // Inicializar el motor de forma lazy (solo la primera vez)
  await ensureViewEngineInitialized();

  // Verificar que el método render existe (agregado por @hapi/vision)
  if (typeof (hapiServerRef as any).render !== 'function') {
    const engineName = viewConfig.engine || 'handlebars';
    throw new Error(
      `❌ El método server.render() no está disponible.\n\n` +
        `📋 Pasos para configurar vistas:\n` +
        `1. Configurar el directorio de vistas:\n` +
        `   app.setBaseViewsDir(join(__dirname, "..", "views"));\n\n` +
        `2. Configurar el motor de plantillas:\n` +
        `   await app.setViewEngine("${engineName}");\n\n` +
        `💡 Llama a setViewEngine() antes de renderizar vistas.`
    );
  }

  try {
    // Agregar extensión si no la tiene
    let viewPath = view;
    if (!view.includes('.') && viewConfig.defaultExtension) {
      viewPath = `${view}.${viewConfig.defaultExtension}`;
    }

    // Renderizar con Hapi
    const rendered = await (hapiServerRef as any).render(viewPath, context || {});
    return rendered;
  } catch (error: any) {
    throw new Error(
      `❌ Error al renderizar vista '${view}':\n` +
        `   ${error.message}\n\n` +
        `💡 Verifica que:\n` +
        `   - La vista existe en: ${viewConfig.viewsPath || 'views'}\n` +
        `   - El nombre del archivo sea: ${view}.${viewConfig.defaultExtension || 'hbs'}\n` +
        `   - El contexto sea válido`
    );
  }
}

/**
 * Registra un helper personalizado de Handlebars
 * @param name - Nombre del helper
 * @param fn - Función del helper
 */
export function registerHelper(name: string, fn: Function): void {
  try {
    const handlebars = require('handlebars');
    handlebars.registerHelper(name, fn);
    console.log(`✅ Helper '${name}' registrado exitosamente.`);
  } catch (error: any) {
    console.warn(
      `⚠️  No se pudo registrar el helper '${name}'.\n` +
        `   ${error.message}\n` +
        `💡 Asegúrate de que handlebars esté instalado: npm install handlebars`
    );
  }
}

/**
 * Registra un partial de Handlebars
 * @param name - Nombre del partial
 * @param template - Template del partial
 */
export function registerPartial(name: string, template: string): void {
  try {
    const handlebars = require('handlebars');
    handlebars.registerPartial(name, template);
    console.log(`✅ Partial '${name}' registrado exitosamente.`);
  } catch (error: any) {
    console.warn(
      `⚠️  No se pudo registrar el partial '${name}'.\n` +
        `   ${error.message}\n` +
        `💡 Asegúrate de que handlebars esté instalado: npm install handlebars`
    );
  }
}

/**
 * Limpia la configuración de vistas
 */
export function clearViewConfig(): void {
  viewConfig = {};
  hapiServerRef = null;
}

