/**
 * Helper para conversión de paths entre formatos Express/NestJS y Hapi
 */

/**
 * Convierte un path de formato Express (:param) a formato Hapi ({param})
 * También maneja parámetros opcionales y wildcards
 * 
 * @param originalPath - Path en formato Express/NestJS
 * @returns Path en formato Hapi
 * 
 * @example
 * convertPathToHapi('/user/:id') // => '/user/{id}'
 * convertPathToHapi('/user/:id?') // => '/user/{id?}'
 * convertPathToHapi('/files/*') // => '/files/{any*}'
 */
export function convertPathToHapi(originalPath: string): string {
  return originalPath
    // Parámetros opcionales primero para evitar colisiones
    .replace(/:([A-Za-z0-9_]+)\?/g, '{$1?}')
    // Parámetros obligatorios
    .replace(/:([A-Za-z0-9_]+)/g, '{$1}')
    // Wildcards tipo (.*)
    .replace(/\(\.\*\)/g, '{any*}')
    // Wildcards tipo *
    .replace(/\*/g, '{any*}');
}

