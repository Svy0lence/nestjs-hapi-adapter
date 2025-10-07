import * as Hapi from '@hapi/hapi';
import { Req, RequestMethod } from '@nestjs/common';

/**
 * Tipo unión para métodos HTTP de Hapi
 */
export type HapiHttpMethod = '*' | Hapi.RouteDefMethods | Hapi.RouteDefMethods[] | 'HEAD' | 'head';

/**
 * Crea el mapeo de RequestMethod de NestJS a métodos HTTP de Hapi
 * Compatible con NestJS 10 y 11
 */
function createRequestMethodMap(): Record<number, HapiHttpMethod> {
  const map: Record<number, HapiHttpMethod> = {
    [RequestMethod.ALL]: '*',
    [RequestMethod.GET]: 'get',
    [RequestMethod.POST]: 'post',
    [RequestMethod.PUT]: 'put',
    [RequestMethod.DELETE]: 'delete',
    [RequestMethod.PATCH]: 'patch',
    [RequestMethod.OPTIONS]: 'options',
    [RequestMethod.HEAD]: 'head',
    [RequestMethod.SEARCH]: 'get', // SEARCH se mapea a GET en Hapi
  };

  // Métodos adicionales de NestJS v11 (WebDAV)
  // Solo se agregan si existen en la versión instalada
  const v11Methods: Array<[string, string]> = [
    ['PROPFIND', 'propfind'],
    ['PROPPATCH', 'proppatch'],
    ['MKCOL', 'mkcol'],
    ['COPY', 'copy'],
    ['MOVE', 'move'],
    ['LOCK', 'lock'],
    ['UNLOCK', 'unlock'],
  ];

  v11Methods.forEach(([key, value]) => {
    const methodValue = (RequestMethod as any)[key];
    if (methodValue !== undefined) {
      map[methodValue] = value as HapiHttpMethod;
    }
  });

  return map;
}

/**
 * Mapeo de RequestMethod de NestJS a métodos HTTP de Hapi
 * Compatible con NestJS 10 y 11
 */
export const REQUEST_METHOD_MAP = createRequestMethodMap();

/**
 * Convierte un método de string a formato Hapi
 * 
 * @param method - Método HTTP como string
 * @returns Método en formato Hapi
 */
export function mapMethodToHapi(method: string): HapiHttpMethod {
  return method === 'ANY' ? '*' : (method.toLowerCase() as Hapi.RouteDefMethods);
}

