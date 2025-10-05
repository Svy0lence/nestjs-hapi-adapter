/**
 * Tipos y configuración para el sistema de vistas
 */

/**
 * Motores de plantillas soportados
 */
export enum ViewEngine {
  HBS = 'hbs',
  HANDLEBARS = 'handlebars',
  EJS = 'ejs',
  PUG = 'pug',
  NUNJUCKS = 'nunjucks',
}

/**
 * Helpers de Handlebars predefinidos
 */
export enum HandlebarsHelper {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  AND = 'and',
  OR = 'or',
}

/**
 * Directorios de vistas
 */
export enum ViewDirectory {
  VIEWS = 'views',
  LAYOUTS = 'layouts',
  PARTIALS = 'partials',
  HELPERS = 'helpers',
}

/**
 * Plugins de Hapi
 */
export enum HapiPlugin {
  VISION = '@hapi/vision',
}

/**
 * Configuración de motor de vistas
 */
export interface ViewEngineConfig {
  /** Nombre del motor */
  engine: string;
  /** Paquete npm */
  package: string;
  /** Extensiones soportadas */
  extensions: string[];
  /** Soporta helpers */
  supportsHelpers: boolean;
}

/**
 * Mapa de configuraciones de motores
 */
export const VIEW_ENGINE_CONFIG_MAP: Record<ViewEngine, ViewEngineConfig> = {
  [ViewEngine.HBS]: {
    engine: 'handlebars',
    package: 'handlebars',
    extensions: ['hbs', 'handlebars'],
    supportsHelpers: true,
  },
  [ViewEngine.HANDLEBARS]: {
    engine: 'handlebars',
    package: 'handlebars',
    extensions: ['hbs', 'handlebars'],
    supportsHelpers: true,
  },
  [ViewEngine.EJS]: {
    engine: 'ejs',
    package: 'ejs',
    extensions: ['ejs'],
    supportsHelpers: false,
  },
  [ViewEngine.PUG]: {
    engine: 'pug',
    package: 'pug',
    extensions: ['pug', 'jade'],
    supportsHelpers: false,
  },
  [ViewEngine.NUNJUCKS]: {
    engine: 'nunjucks',
    package: 'nunjucks',
    extensions: ['njk', 'nunjucks'],
    supportsHelpers: false,
  },
};

/**
 * Opciones para configurar el motor de vistas
 */
export interface ViewEngineOptions {
  /** Ruta personalizada de vistas (absoluta o relativa) */
  viewsPath?: string;
  
  /** Layout por defecto (para motores que lo soporten) */
  layout?: string | false;
  
  /** Ruta de layouts */
  layoutPath?: string;
  
  /** Ruta de partials */
  partialsPath?: string;
  
  /** Ruta de helpers */
  helpersPath?: string;
  
  /** Cache de vistas habilitado */
  isCached?: boolean;
  
  /** Instancia de @hapi/vision (opcional, se carga automáticamente si no se provee) */
  vision?: any;
  
  /** Instancia del motor de vistas (opcional, se carga automáticamente si no se provee) */
  viewEngine?: any;
  
  /** Opciones adicionales del motor */
  engineOptions?: Record<string, any>;
}

/**
 * Mapeo de extensiones de archivo por motor
 */
export const VIEW_ENGINE_EXTENSIONS: Record<string, string> = {
  [ViewEngine.HBS]: 'hbs',
  [ViewEngine.HANDLEBARS]: 'hbs',
  [ViewEngine.EJS]: 'ejs',
  [ViewEngine.PUG]: 'pug',
  [ViewEngine.NUNJUCKS]: 'njk',
};

