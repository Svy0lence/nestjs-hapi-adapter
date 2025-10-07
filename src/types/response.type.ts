/**
 * Tipos para el response enriquecido del HapiAdapter
 */

import { ServerResponse } from 'http';

/**
 * Wrapper de respuesta que emula el comportamiento de Hapi
 */
export interface HapiResponseWrapper {
  /**
   * Establece el código de estado HTTP
   */
  code(statusCode: number): this;
  
  /**
   * Establece un header
   */
  header(name: string, value: string): this;
}

/**
 * Response enriquecido que combina Node.js con métodos de Hapi
 * Este es el tipo que recibes cuando usas @Res() en un controller
 */
export interface HapiResponse extends ServerResponse {
  /**
   * Envía una respuesta (compatible con Express/NestJS)
   */
  send(payload: any): void;
  
  /**
   * Establece un header (chainable)
   */
  header(name: string, value: string): this;
  
  /**
   * Establece una cookie (al estilo Hapi)
   */
  state(name: string, value: any, options?: {
    path?: string;
    domain?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    maxAge?: number;
    expires?: Date | string;
  }): this;
  
  /**
   * Renderiza una vista
   */
  render(view: string, options?: any): Promise<this>;
  
  /**
   * Crea un objeto de respuesta chainable (al estilo Hapi)
   * @example
   * return res.response({ message: 'Hello' }).code(200).header('X-Custom', 'value');
   */
  response(payload?: any): HapiResponseWrapper;
}

