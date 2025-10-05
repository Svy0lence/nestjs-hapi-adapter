import { SwaggerOptions, SwaggerBasicAuth, SWAGGER_DEFAULTS } from '../types/swagger.type';

/**
 * Verifica si Swagger debe estar habilitado
 * 
 * @param options - Opciones de Swagger
 * @returns true si debe estar habilitado (por defecto true)
 */
export function isSwaggerEnabled(options?: SwaggerOptions): boolean {
  // Si no se especifica, está habilitado por defecto
  // Es responsabilidad del usuario deshabilitar en producción
  return options?.enable !== false;
}

/**
 * Verifica la autenticación básica en un request
 * 
 * @param req - Request object
 * @param res - Response object
 * @param auth - Credenciales de autenticación
 * @returns true si está autorizado, false si se envió respuesta de error
 */
export function checkBasicAuth(req: any, res: any, auth?: SwaggerBasicAuth): boolean {
  if (!auth) {
    return true; // Sin autenticación requerida
  }

  try {
    const authHeader = req.headers?.['authorization'] || '';
    
    if (!authHeader.startsWith('Basic ')) {
      throw new Error('No basic header');
    }

    const base64 = authHeader.replace('Basic ', '');
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    const [username, password] = decoded.split(':');

    const isValid = username === auth.username && password === auth.password;
    
    if (!isValid) {
      throw new Error('Bad credentials');
    }

    return true;
  } catch {
    res.setHeader?.('WWW-Authenticate', 'Basic realm="docs"');
    res.statusCode = 401;
    res.end('Unauthorized');
    return false;
  }
}

/**
 * Genera el HTML para la UI de Swagger
 * 
 * @param jsonPath - Path al JSON de OpenAPI
 * @returns HTML string
 */
export function generateSwaggerUI(jsonPath: string): string {
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Swagger</title>
    <link rel="stylesheet" href="${SWAGGER_DEFAULTS.SWAGGER_UI_CSS}" />
    <style>body { margin: 0; background: #fafafa; }</style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${SWAGGER_DEFAULTS.SWAGGER_UI_BUNDLE}"></script>
    <script>
      window.addEventListener('load', function () {
        window.ui = SwaggerUIBundle({
          url: '${jsonPath}',
          dom_id: '#swagger-ui',
          presets: [SwaggerUIBundle.presets.apis],
          layout: 'BaseLayout'
        });
      });
    </script>
  </body>
</html>`;
}

/**
 * Envía una respuesta deshabilitada para Swagger
 * 
 * @param res - Response object
 * @param message - Mensaje a enviar
 */
export function sendDisabledResponse(res: any, message: string): void {
  res.statusCode = 404;
  res.end(message);
}

/**
 * Envía el documento JSON de OpenAPI
 * 
 * @param res - Response object
 * @param document - Documento OpenAPI
 */
export function sendSwaggerJson(res: any, document: any): void {
  res.statusCode = 200;
  
  if (!res.getHeader?.('content-type')) {
    res.setHeader?.('content-type', 'application/json; charset=utf-8');
  }
  
  res.end(JSON.stringify(document));
}

/**
 * Envía el HTML de la UI de Swagger
 * 
 * @param res - Response object
 * @param html - HTML string
 */
export function sendSwaggerUI(res: any, html: string): void {
  res.statusCode = 200;
  
  if (!res.getHeader?.('content-type')) {
    res.setHeader?.('content-type', 'text/html; charset=utf-8');
  }
  
  res.end(html);
}

