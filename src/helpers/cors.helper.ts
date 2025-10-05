import * as Hapi from '@hapi/hapi';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * Establece un header en la respuesta de manera segura
 * Maneja diferentes tipos de objetos de respuesta (Hapi response, Node response, etc.)
 * 
 * @param response - Objeto de respuesta
 * @param name - Nombre del header
 * @param value - Valor del header
 */
export function setResponseHeader(response: any, name: string, value: string): void {
  try {
    if (response && typeof response.header === 'function') {
      response.header(name, value);
    } else if (response && typeof response.setHeader === 'function') {
      response.setHeader(name, value);
    } else if (response && response.headers) {
      response.headers[name] = value;
    } else {
      console.warn(`No se pudo establecer header ${name}: ${value}`);
    }
  } catch (error) {
    console.error(`Error al establecer header ${name}:`, error);
  }
}

/**
 * Maneja el header Access-Control-Allow-Origin
 */
function handleOriginHeader(
  response: any,
  origin: CorsOptions['origin'],
  requestOrigin?: string
): void {
  if (typeof origin === 'boolean') {
    if (origin) {
      setResponseHeader(response, 'Access-Control-Allow-Origin', '*');
    }
    return;
  }

  if (typeof origin === 'string') {
    setResponseHeader(response, 'Access-Control-Allow-Origin', origin);
    return;
  }

  if (Array.isArray(origin)) {
    if (requestOrigin && origin.includes(requestOrigin)) {
      setResponseHeader(response, 'Access-Control-Allow-Origin', requestOrigin);
    }
    return;
  }

  if (typeof origin === 'function') {
    origin(requestOrigin as string, (err, allowed) => {
      if (!err && allowed) {
        setResponseHeader(response, 'Access-Control-Allow-Origin', requestOrigin || '*');
      }
    });
    return;
  }

  // Default: permitir todo
  setResponseHeader(response, 'Access-Control-Allow-Origin', '*');
}

/**
 * Aplica headers CORS a una respuesta
 * 
 * @param response - Objeto de respuesta (Hapi o Node)
 * @param options - Opciones CORS
 * @param req - Request de Hapi
 */
export function applyCorsHeaders(
  response: any,
  options: CorsOptions,
  req: Hapi.Request
): void {
  const requestOrigin = req.headers.origin;

  // Access-Control-Allow-Origin
  handleOriginHeader(response, options.origin, requestOrigin);

  // Access-Control-Allow-Methods
  if (options.methods) {
    const methods = Array.isArray(options.methods) 
      ? options.methods.join(',') 
      : options.methods;
    setResponseHeader(response, 'Access-Control-Allow-Methods', methods);
  }

  // Access-Control-Allow-Headers
  if (options.allowedHeaders) {
    const headers = Array.isArray(options.allowedHeaders)
      ? options.allowedHeaders.join(',')
      : options.allowedHeaders;
    setResponseHeader(response, 'Access-Control-Allow-Headers', headers);
  }

  // Access-Control-Allow-Credentials
  if (options.credentials) {
    setResponseHeader(response, 'Access-Control-Allow-Credentials', 'true');
  }

  // Access-Control-Expose-Headers
  if (options.exposedHeaders) {
    const exposeHeaders = Array.isArray(options.exposedHeaders)
      ? options.exposedHeaders.join(',')
      : options.exposedHeaders;
    setResponseHeader(response, 'Access-Control-Expose-Headers', exposeHeaders);
  }

  // Access-Control-Max-Age
  if (options.maxAge) {
    setResponseHeader(response, 'Access-Control-Max-Age', options.maxAge.toString());
  }

  // Vary header
  if (options.origin && typeof options.origin !== 'boolean') {
    setResponseHeader(response, 'Vary', 'Origin');
  }
}

