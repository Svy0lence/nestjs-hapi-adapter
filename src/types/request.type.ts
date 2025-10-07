/**
 * Tipos para el request enriquecido del HapiAdapter
 */

import { IncomingMessage } from 'http';

/**
 * Request enriquecido que combina Node.js con propiedades de Hapi
 * Este es el tipo que recibes cuando usas @Req() en un controller
 */
export interface HapiRequest extends IncomingMessage {
  /**
   * Query parameters parseados
   */
  query?: Record<string, any>;
  
  /**
   * Route parameters
   */
  params?: Record<string, any>;
  
  /**
   * Body parseado del request
   */
  body?: any;
  
  /**
   * Payload original de Hapi
   */
  payload?: any;
  
  /**
   * Archivo único subido (multipart)
   */
  file?: any;
  
  /**
   * Múltiples archivos subidos (multipart)
   */
  files?: any[];
  
  /**
   * Cookies parseadas (Hapi state)
   */
  state?: Record<string, any>;
  
  /**
   * Path del request
   */
  path?: string;
}

