import * as Hapi from '@hapi/hapi';
import { RequestMethod } from '@nestjs/common';

/**
 * Tipo unión para métodos HTTP de Hapi
 */
export type HapiHttpMethod = '*' | Hapi.RouteDefMethods | Hapi.RouteDefMethods[] | 'HEAD' | 'head';

/**
 * Mapeo de RequestMethod de NestJS a métodos HTTP de Hapi
 * Nota: HEAD se excluye de RouteDefMethods en Hapi, pero se puede usar en route.method
 */
export const REQUEST_METHOD_MAP: Record<RequestMethod, HapiHttpMethod> = {
  [RequestMethod.ALL]: '*',
  [RequestMethod.GET]: 'get',
  [RequestMethod.POST]: 'post',
  [RequestMethod.PUT]: 'put',
  [RequestMethod.DELETE]: 'delete',
  [RequestMethod.PATCH]: 'patch',
  [RequestMethod.OPTIONS]: 'options',
  [RequestMethod.HEAD]: 'head',
  [RequestMethod.SEARCH]: 'get', // SEARCH se mapea a GET en Hapi
} as const;

/**
 * Convierte un método de string a formato Hapi
 * 
 * @param method - Método HTTP como string
 * @returns Método en formato Hapi
 */
export function mapMethodToHapi(method: string): HapiHttpMethod {
  return method === 'ANY' ? '*' : (method.toLowerCase() as Hapi.RouteDefMethods);
}

