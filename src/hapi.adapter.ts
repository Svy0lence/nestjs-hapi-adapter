import { AbstractHttpAdapter } from '@nestjs/core/adapters';
import {
  CorsOptions,
  CorsOptionsDelegate,
} from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestApplicationOptions } from '@nestjs/common';
import { RequestMethod, VersioningOptions } from '@nestjs/common';
import { VersionValue } from '@nestjs/common/interfaces';
import { HttpServer } from '@nestjs/common/interfaces';
import * as Hapi from '@hapi/hapi';

// Helpers internos
import {
  convertPathToHapi,
  enrichNodeRequest,
  enrichNodeResponse,
  applyCorsHeaders,
  isSwaggerEnabled,
  checkBasicAuth,
  generateSwaggerUI,
  sendDisabledResponse,
  sendSwaggerJson,
  sendSwaggerUI,
  setHapiServerReference,
  setBaseViewsDir as setViewsDirectory,
  configureViewEngine,
  renderView,
} from './helpers';

// Types
import { mapMethodToHapi, REQUEST_METHOD_MAP, ViewEngine } from './types';
import { SwaggerOptions, SWAGGER_DEFAULTS } from './types/swagger.type';

/**
 * Configuración por defecto para el servidor Hapi
 */
const DEFAULT_HAPI_CONFIG: Hapi.ServerOptions = {
  port: 3000,
  routes: {
    state: { parse: true },
    payload: {
      parse: true,
      output: 'data',
      multipart: { output: 'stream' },
      allow: [
        'application/json',
        'application/*+json',
        'application/octet-stream',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/*',
      ],
    },
  },
};

export class HapiAdapter 
  extends AbstractHttpAdapter<Hapi.Server, Hapi.Request, Hapi.ResponseToolkit> 
  implements HttpServer<Hapi.Request, Hapi.ResponseToolkit, Hapi.Server> 
{
  constructor(instance?: Hapi.Server) {
    super(instance || new Hapi.Server(DEFAULT_HAPI_CONFIG));
    this.httpServer = this.instance;
    // Establecer referencia del servidor para el sistema de vistas
    setHapiServerReference(this.httpServer);
  }

  // ==================== INICIALIZACIÓN ====================

  initHttpServer(options: NestApplicationOptions) {
    this.httpServer = this.instance || new Hapi.Server(DEFAULT_HAPI_CONFIG);
    // Actualizar referencia del servidor
    setHapiServerReference(this.httpServer);
  }

  /**
   * Hook del ciclo de vida de NestJS
   * Se llama después de que la aplicación se inicializa
   */
  async init(): Promise<void> {
    // Hook de inicialización (llamado por NestJS automáticamente)
  }

  // ==================== MIDDLEWARES ====================

  use(path: string, fn: any): any;
  use(fn: any): any;
  use(...args: any[]): any {
    const fn = typeof args[0] === 'function' ? args[0] : args[1];
    this.httpServer.ext('onRequest', async (request, h) => {
      await fn(request as Hapi.Request, h as Hapi.ResponseToolkit, () => {});
      return h.continue;
    });
  }

  // ==================== REGISTRO DE RUTAS ====================

  /**
   * Crea el handler que procesa los requests de Hapi y los adapta para NestJS
   */
  private createRouteHandler(nestHandler: any) {
    return (req: Hapi.Request, h: Hapi.ResponseToolkit) => {
      try {
        const nodeReq: any = req.raw.req;
        const nodeRes: any = req.raw.res;

        // Enriquecer request con datos de Hapi
        enrichNodeRequest(req);

        // Enriquecer response con métodos compatibles con NestJS
        // Pasar la función render del adapter para que esté disponible en res.render()
        enrichNodeResponse(nodeRes, this.render.bind(this));

        // Delegar a NestJS con req/res nativos
        nestHandler(nodeReq, nodeRes, () => {});
      } finally {
        // Indicar a Hapi que la respuesta la gestionará Node (NestJS)
        return h.abandon;
      }
    };
  }

  /**
   * Registra una ruta en el servidor Hapi
   */
  private registerRoute(method: string, path: string, handler: any): void {
    const mappedMethod = mapMethodToHapi(method);
    const hapiPath = convertPathToHapi(path);

    this.httpServer.route({
      method: mappedMethod as any,
      path: hapiPath,
      handler: this.createRouteHandler(handler),
    });
  }

  // ==================== MÉTODOS HTTP ====================

  get(handler: any): any;
  get(path: any, handler: any): any;
  get(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') {
      return this.registerRoute('GET', '/', pathOrHandler);
    }
    this.registerRoute('GET', pathOrHandler, maybeHandler);
  }

  post(handler: any): any;
  post(path: any, handler: any): any;
  post(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') {
      return this.registerRoute('POST', '/', pathOrHandler);
    }
    this.registerRoute('POST', pathOrHandler, maybeHandler);
  }

  put(handler: any): any;
  put(path: any, handler: any): any;
  put(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') {
      return this.registerRoute('PUT', '/', pathOrHandler);
    }
    this.registerRoute('PUT', pathOrHandler, maybeHandler);
  }

  delete(handler: any): any;
  delete(path: any, handler: any): any;
  delete(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') {
      return this.registerRoute('DELETE', '/', pathOrHandler);
    }
    this.registerRoute('DELETE', pathOrHandler, maybeHandler);
  }

  patch(handler: any): any;
  patch(path: any, handler: any): any;
  patch(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') {
      return this.registerRoute('PATCH', '/', pathOrHandler);
    }
    this.registerRoute('PATCH', pathOrHandler, maybeHandler);
  }

  all(handler: any): any;
  all(path: any, handler: any): any;
  all(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') {
      return this.registerRoute('ANY', '/', pathOrHandler);
    }
    this.registerRoute('ANY', pathOrHandler, maybeHandler);
  }

  head(handler: any): any;
  head(path: any, handler: any): any;
  head(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') {
      return this.registerRoute('HEAD', '/', pathOrHandler);
    }
    this.registerRoute('HEAD', pathOrHandler, maybeHandler);
  }

  options(handler: any): any;
  options(path: any, handler: any): any;
  options(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') {
      return this.registerRoute('OPTIONS', '/', pathOrHandler);
    }
    this.registerRoute('OPTIONS', pathOrHandler, maybeHandler);
  }

  // ==================== MANEJO DE RESPUESTAS ====================

  status(response: any, statusCode: number) {
    if (response && typeof response.statusCode === 'number') {
      response.statusCode = statusCode;
    } else if (response && typeof response.code === 'function') {
      return response.response(null).code(statusCode);
    }
    return response;
  }

  reply(response: any, body: any, statusCode?: number) {
    const res: any = response;
    
    if (typeof statusCode === 'number') {
      res.statusCode = statusCode;
    }

    if (body === undefined || body === null) {
      res.end();
      return res;
    }

    if (Buffer.isBuffer(body)) {
      res.end(body);
      return res;
    }

    if (typeof body === 'string') {
      if (!res.getHeader?.('content-type')) {
        res.setHeader?.('content-type', 'text/plain; charset=utf-8');
      }
      res.end(body);
      return res;
    }

    // Objeto/Array - serializar a JSON
    try {
      if (!res.getHeader?.('content-type')) {
        res.setHeader?.('content-type', 'application/json; charset=utf-8');
      }
      res.end(JSON.stringify(body));
    } catch {
      res.end(String(body));
    }

    return res;
  }

  end(response: any, message?: string) {
    response.end(message ?? '');
    return response;
  }

  redirect(response: any, statusCode: number, url: string) {
    response.statusCode = statusCode;
    response.setHeader?.('location', url);
    response.end();
    return response;
  }

  async render(response: any, view: string, options: any) {
    try {
      const html = await renderView(view, options);
      
      // Establecer content-type y enviar
      if (response?.setHeader) {
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
      }
      
      if (response?.end) {
        response.end(html);
      }
      
      return response;
    } catch (error: any) {
      throw error;
    }
  }

  // ==================== MANEJO DE HEADERS ====================

  getHeader(response: any, name: string) {
    return response?.getHeader?.(name);
  }

  setHeader(response: any, name: string, value: string) {
    response?.setHeader?.(name, value);
  }

  appendHeader(response: any, name: string, value: string) {
    if (!response?.getHeader || !response?.setHeader) {
      return;
    }

    const current = response.getHeader(name);
    
    if (!current) {
      return response.setHeader(name, value);
    }

    if (Array.isArray(current)) {
      return response.setHeader(name, [...current, value]);
    }

    response.setHeader(name, `${current}, ${value}`);
  }

  isHeadersSent(response: any) {
    return !!(response?.headersSent);
  }

  // ==================== CORS ====================

  /**
   * Aplica CORS en onPreResponse para respuestas normales de Hapi
   */
  private enableCorsOnPreResponse(
    options: CorsOptions | CorsOptionsDelegate<Hapi.Request>
  ): void {
    this.httpServer.ext('onPreResponse', (req, h) => {
      const response = req.response as any;

      if (typeof options === 'function') {
        options(req, (err, corsOptions) => {
          if (!err && corsOptions) {
            applyCorsHeaders(response, corsOptions, req);
          }
        });
      } else if (options) {
        applyCorsHeaders(response, options, req);
      }

      return h.continue;
    });
  }

  /**
   * Aplica CORS en onRequest para preflight y respuestas manejadas por Node
   */
  private enableCorsOnRequest(
    options: CorsOptions | CorsOptionsDelegate<Hapi.Request>
  ): void {
    this.httpServer.ext('onRequest', (req, h) => {
      try {
        const rawRes: any = req.raw?.res;

        // Aplicar CORS headers al response nativo
        if (rawRes && options) {
          if (typeof options === 'function') {
            options(req, (err, corsOptions) => {
              if (!err && corsOptions) {
                applyCorsHeaders(rawRes, corsOptions, req);
              }
            });
          } else {
            applyCorsHeaders(rawRes, options, req);
          }
        }

        // Manejar preflight OPTIONS
        if (req.method === 'options') {
          const response = h.response().code(204);
          
          if (typeof options === 'function') {
            options(req, (err, corsOptions) => {
              if (!err && corsOptions) {
                applyCorsHeaders(response, corsOptions, req);
              }
            });
          } else if (options) {
            applyCorsHeaders(response, options, req);
          }
          
          return response.takeover();
        }
      } catch {
        // Continuar en caso de error
      }

      return h.continue;
    });
  }

  enableCors(
    options: CorsOptions | CorsOptionsDelegate<Hapi.Request>,
    prefix?: string
  ): void {
    this.enableCorsOnPreResponse(options);
    this.enableCorsOnRequest(options);
  }

  // ==================== REQUEST HELPERS ====================

  getRequestMethod(request: any) {
    return request?.method?.toUpperCase() || 'GET';
  }

  getRequestUrl(request: any) {
    return request?.path || request?.url || request?.originalUrl || '/';
  }

  getRequestHostname(request: any) {
    if (request?.info?.host) {
      return request.info.host;
    }
    if (request?.headers?.host) {
      return request.headers.host;
    }
    return 'localhost';
  }

  // ==================== SERVIDOR ====================

  listen(port: number | string, callback?: () => void): any;
  listen(port: number | string, hostname: string, callback?: () => void): any;
  async listen(port: number | string, a?: any, b?: any) {
    const hostname: string | undefined = typeof a === 'string' ? a : undefined;
    const callback: (() => void) | undefined = typeof a === 'function' ? a : b;

    this.httpServer.settings.port = +port;
    
    if (hostname) {
      this.httpServer.settings.host = hostname;
    }

    await this.httpServer.start();
    
    if (callback) {
      callback();
    }
  }

  async close() {
    await this.httpServer.stop();
  }

  getType(): string {
    return 'hapi';
  }

  getHttpServer() {
    const server = this.httpServer as any;
    return server?.listener || server;
  }

  // ==================== VERSIONING ====================

  applyVersionFilter(
    handler: Function,
    version: VersionValue,
    versioningOptions: VersioningOptions
  ) {
    return (req: Hapi.Request, res: Hapi.ResponseToolkit, next: () => void) => {
      // Implementación básica; extender para versioning por header, media type, etc.
      return handler(req, res, next);
    };
  }

  // ==================== VISTAS ====================

  /**
   * Establece el directorio base de vistas
   * @param path - Path absoluto al directorio de vistas
   */
  setBaseViewsDir(path: string): this {
    setViewsDirectory(path);
    return this;
  }

  /**
   * Configura el motor de plantillas
   * @param engineOrOptions - Motor a usar (hbs, ejs, pug, etc.) o un objeto con opciones
   * @param options - Opciones adicionales del motor (opcional)
   * 
   * @example
   * // Uso síncrono (compatible con interfaz HttpServer de NestJS)
   * app.getHttpAdapter().setViewEngine('hbs');
   * 
   * @example
   * // Uso asíncrono (espera a que la configuración termine)
   * await app.getHttpAdapter().setViewEngine('hbs');
   * 
   * @note Este método retorna 'this' inmediatamente para cumplir con HttpServer,
   * pero la configuración del motor ocurre de forma asíncrona en segundo plano.
   * Si necesitas esperar a que termine, puedes usar await.
   */
  setViewEngine(engineOrOptions: any, options?: any): this {
    const engine = typeof engineOrOptions === 'string' || typeof engineOrOptions === 'number' 
      ? engineOrOptions 
      : engineOrOptions;
    const opts = typeof engineOrOptions === 'string' || typeof engineOrOptions === 'number' 
      ? options 
      : undefined;
    
    // Configurar de forma asíncrona en segundo plano
    // Guardar la promesa por si el usuario quiere await
    const promise = configureViewEngine(engine, opts);
    
    // Agregar la promesa como propiedad oculta para que pueda ser awaited si se desea
    (this as any)._viewEnginePromise = promise;
    
    return this;
  }

  // ==================== NO-OPS ====================

  useStaticAssets(..._args: any[]) {
    return this as any;
  }

  registerParserMiddleware(_prefix?: string, _rawBody?: boolean) {
    return this as any;
  }

  setErrorHandler(_handler: Function, _prefix?: string) {
    return this as any;
  }

  setNotFoundHandler(_handler: Function, _prefix?: string) {
    return this as any;
  }

  // ==================== MIDDLEWARE FACTORY ====================

  createMiddlewareFactory(requestMethod: RequestMethod) {
    const method = REQUEST_METHOD_MAP[requestMethod] ?? '*';

    return (path: string, callback: Function) => {
      const hapiPath = convertPathToHapi(path);
      
      this.httpServer.route({
        method: method as any,
        path: hapiPath,
        handler: (req: Hapi.Request, h: Hapi.ResponseToolkit) => {
          callback(req.raw.req, req.raw.res, () => {});
          return h.continue;
        },
      });
    };
  }

  // ==================== SWAGGER ====================

  registerSwagger(document: any, options?: SwaggerOptions): void {
    const mountPath = options?.mountPath || SWAGGER_DEFAULTS.MOUNT_PATH;
    const jsonPath = options?.jsonPath || SWAGGER_DEFAULTS.JSON_PATH;
    const enabled = isSwaggerEnabled(options);

    if (!enabled) {
      this.registerDisabledSwaggerRoutes(jsonPath, mountPath);
      return;
    }

    this.registerSwaggerJsonRoute(jsonPath, document, options?.basicAuth);
    this.registerSwaggerUIRoute(mountPath, jsonPath, options?.basicAuth);
  }

  /**
   * Registra rutas deshabilitadas para Swagger
   */
  private registerDisabledSwaggerRoutes(jsonPath: string, mountPath: string): void {
    this.get(jsonPath, (_req: any, res: any) => {
      sendDisabledResponse(res, 'Swagger JSON disabled');
    });

    this.get(mountPath, (_req: any, res: any) => {
      sendDisabledResponse(res, 'Swagger UI disabled');
    });
  }

  /**
   * Registra la ruta del JSON de OpenAPI
   */
  private registerSwaggerJsonRoute(
    jsonPath: string,
    document: any,
    basicAuth?: SwaggerOptions['basicAuth']
  ): void {
    this.get(jsonPath, (req: any, res: any) => {
      if (!checkBasicAuth(req, res, basicAuth)) {
        return;
      }
      sendSwaggerJson(res, document);
    });
  }

  /**
   * Registra la ruta de la UI de Swagger
   */
  private registerSwaggerUIRoute(
    mountPath: string,
    jsonPath: string,
    basicAuth?: SwaggerOptions['basicAuth']
  ): void {
    this.get(mountPath, (req: any, res: any) => {
      if (!checkBasicAuth(req, res, basicAuth)) {
        return;
      }
      const html = generateSwaggerUI(jsonPath);
      sendSwaggerUI(res, html);
    });
  }
}
