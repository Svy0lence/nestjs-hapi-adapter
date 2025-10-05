/**
 * Tipos y configuración para Swagger
 */

/**
 * Credenciales para autenticación básica de Swagger
 */
export interface SwaggerBasicAuth {
  username: string;
  password: string;
}

/**
 * Opciones de configuración para Swagger
 */
export interface SwaggerOptions {
  /** Path donde se montará la UI (por defecto: /api/docs) */
  mountPath?: string;
  
  /** Path donde se servirá el JSON (por defecto: /api/docs-json) */
  jsonPath?: string;
  
  /** Habilitar/deshabilitar Swagger (por defecto: true) */
  enable?: boolean;
  
  /** Autenticación básica opcional */
  basicAuth?: SwaggerBasicAuth;
}

/**
 * Valores por defecto para Swagger
 */
export const SWAGGER_DEFAULTS = {
  MOUNT_PATH: '/api/docs',
  JSON_PATH: '/api/docs-json',
  SWAGGER_UI_VERSION: '5',
  SWAGGER_UI_CSS: 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css',
  SWAGGER_UI_BUNDLE: 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js',
} as const;

