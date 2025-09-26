import { AbstractHttpAdapter } from '@nestjs/core/adapters';
import {
  CorsOptions,
  CorsOptionsDelegate,
} from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestApplicationOptions } from '@nestjs/common';
import { RequestMethod, VersioningOptions } from '@nestjs/common';
import { VersionValue } from '@nestjs/common/interfaces';
import * as Hapi from '@hapi/hapi';

export class HapiAdapter extends AbstractHttpAdapter<Hapi.Server, Hapi.Request, Hapi.ResponseToolkit> {
  constructor(instance?: Hapi.Server) {
    super(
      instance ||
        new Hapi.Server({
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
        })
    );
    this.httpServer = this.instance;
  }

  // Inicializar server de Hapi
  initHttpServer(options: NestApplicationOptions) {
    this.httpServer =
      this.instance ||
      new Hapi.Server({
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
      });
  }

  // Middlewares (similar a use en express/fastify)
  use(path: string, fn: any): any;
  use(fn: any): any;
  use(...args: any[]): any {
    const fn = typeof args[0] === 'function' ? args[0] : args[1];
    this.httpServer.ext('onRequest', async (request, h) => {
      await fn(request as Hapi.Request, h as Hapi.ResponseToolkit, () => {});
      return h.continue;
    });
  }

  // Métodos HTTP básicos
  private convertPathToHapi(originalPath: string): string {
    let converted = originalPath;
    // Opcional primero para no colisionar con la regla sin '?'
    converted = converted.replace(/:([A-Za-z0-9_]+)\?/g, '{$1?}');
    converted = converted.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
    // comodines tipo * o (.*)
    converted = converted.replace(/\(\.\*\)/g, '{any*}');
    converted = converted.replace(/\*/g, '{any*}');
    return converted;
  }
  private registerRoute(method: string, path: string, handler: any) {
    const mappedMethod: '*' | Hapi.RouteDefMethods | Hapi.RouteDefMethods[] =
      method === 'ANY' ? '*' : (method.toLowerCase() as Hapi.RouteDefMethods);
    const hapiPath = this.convertPathToHapi(path);
    this.httpServer.route({
      method: mappedMethod,
      path: hapiPath,
      handler: (req: Hapi.Request, h: Hapi.ResponseToolkit) => {
        try {
          //console.log('req__', req);
          // Exponer datos al req nativo para decoradores como @Query/@Param/@Body
          const nodeReq: any = req.raw.req as any;
          nodeReq.query = req.query;
          nodeReq.params = req.params;
          nodeReq.state = (req as any).state;
          const contentType = (req.headers as any)?.['content-type'] || '';
          const payload: any = (req as any).payload;
          if (typeof contentType === 'string' && contentType.includes('multipart/form-data')) {
            // Detectar archivos en cualquier clave del payload
            const filesArray: any[] = [];
            const fields: Record<string, any> = {};
            const pushIfFile = (val: any) => {
              if (val && typeof (val as any).pipe === 'function' && (val as any).hapi) {
                filesArray.push(val);
                return true;
              }
              return false;
            };
            if (payload && typeof payload === 'object') {
              for (const [key, value] of Object.entries(payload)) {
                if (Array.isArray(value)) {
                  let anyFile = false;
                  for (const v of value) anyFile = pushIfFile(v) || anyFile;
                  if (!anyFile) (fields as any)[key] = value;
                } else if (!pushIfFile(value)) {
                  (fields as any)[key] = value as any;
                }
              }
            }
            if (filesArray.length === 1) (nodeReq as any).file = filesArray[0];
            if (filesArray.length > 0) (nodeReq as any).files = filesArray;
            nodeReq.body = fields;
          } else {
            // Para JSON / urlencoded con output: 'data' Hapi ya parsea a objeto/string
            nodeReq.body = payload;
          }
          nodeReq.path = req.path;

          // Shims de respuesta para @Res()
          const nodeRes: any = req.raw.res as any;
          if (typeof nodeRes.send !== 'function') {
            nodeRes.send = (payload: any) => {
              if (payload === undefined || payload === null) return nodeRes.end();
              if (Buffer.isBuffer(payload)) return nodeRes.end(payload);
              if (typeof payload === 'string') {
                if (!nodeRes.getHeader || !nodeRes.getHeader('content-type')) {
                  nodeRes.setHeader && nodeRes.setHeader('content-type', 'text/plain; charset=utf-8');
                }
                return nodeRes.end(payload);
              }
              try {
                if (nodeRes.setHeader && (!nodeRes.getHeader || !nodeRes.getHeader('content-type'))) {
                  nodeRes.setHeader('content-type', 'application/json; charset=utf-8');
                }
                return nodeRes.end(JSON.stringify(payload));
              } catch {
                return nodeRes.end(String(payload));
              }
            };
          }
          if (typeof nodeRes.header !== 'function') {
            nodeRes.header = (name: string, value: string) => {
              nodeRes.setHeader && nodeRes.setHeader(name, value);
              return nodeRes;
            };
          }
          if (typeof nodeRes.state !== 'function') {
            nodeRes.state = (name: string, value: any, options?: any) => {
              const encode = (v: any) => encodeURIComponent(String(v));
              let cookie = `${name}=${encode(value)}`;
              if (options?.path) cookie += `; Path=${options.path}`; else cookie += `; Path=/`;
              if (options?.domain) cookie += `; Domain=${options.domain}`;
              if (options?.httpOnly ?? true) cookie += `; HttpOnly`;
              if (options?.secure) cookie += `; Secure`;
              if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`;
              if (options?.maxAge) cookie += `; Max-Age=${options.maxAge}`;
              if (options?.expires) cookie += `; Expires=${new Date(options.expires).toUTCString()}`;
              const prev = nodeRes.getHeader && nodeRes.getHeader('set-cookie');
              if (!prev) nodeRes.setHeader && nodeRes.setHeader('set-cookie', cookie);
              else if (Array.isArray(prev)) nodeRes.setHeader && nodeRes.setHeader('set-cookie', [...prev, cookie]);
              else nodeRes.setHeader && nodeRes.setHeader('set-cookie', [String(prev), cookie]);
              return nodeRes;
            };
          }
          // Delegar a Nest con req/res nativos
          handler(nodeReq, req.raw.res, () => {});
        } finally {
          // Indicamos a Hapi que la respuesta la gestionará completamente Node (Nest)
          return h.abandon;
        }
      },
    });
  }

  get(handler: any): any;
  get(path: any, handler: any): any;
  get(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') return this.registerRoute('GET', '/', pathOrHandler);
    this.registerRoute('GET', pathOrHandler, maybeHandler);
  }
  post(handler: any): any;
  post(path: any, handler: any): any;
  post(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') return this.registerRoute('POST', '/', pathOrHandler);
    this.registerRoute('POST', pathOrHandler, maybeHandler);
  }
  put(handler: any): any;
  put(path: any, handler: any): any;
  put(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') return this.registerRoute('PUT', '/', pathOrHandler);
    this.registerRoute('PUT', pathOrHandler, maybeHandler);
  }
  delete(handler: any): any;
  delete(path: any, handler: any): any;
  delete(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') return this.registerRoute('DELETE', '/', pathOrHandler);
    this.registerRoute('DELETE', pathOrHandler, maybeHandler);
  }
  patch(handler: any): any;
  patch(path: any, handler: any): any;
  patch(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') return this.registerRoute('PATCH', '/', pathOrHandler);
    this.registerRoute('PATCH', pathOrHandler, maybeHandler);
  }
  all(handler: any): any;
  all(path: any, handler: any): any;
  all(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') return this.registerRoute('ANY', '/', pathOrHandler);
    this.registerRoute('ANY', pathOrHandler, maybeHandler);
  }

  // Métodos adicionales
  head(handler: any): any;
  head(path: any, handler: any): any;
  head(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') return this.registerRoute('HEAD', '/', pathOrHandler);
    this.registerRoute('HEAD', pathOrHandler, maybeHandler);
  }
  options(handler: any): any;
  options(path: any, handler: any): any;
  options(pathOrHandler: any, maybeHandler?: any) {
    if (typeof pathOrHandler === 'function') return this.registerRoute('OPTIONS', '/', pathOrHandler);
    this.registerRoute('OPTIONS', pathOrHandler, maybeHandler);
  }

  // Respuestas
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
      if (!res.getHeader || !res.getHeader('content-type')) {
        res.setHeader && res.setHeader('content-type', 'text/plain; charset=utf-8');
      }
      res.end(body);
      return res;
    }
    // objeto/array
    try {
      if (res.setHeader && (!res.getHeader || !res.getHeader('content-type'))) {
        res.setHeader('content-type', 'application/json; charset=utf-8');
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
    response.setHeader && response.setHeader('location', url);
    response.end();
    return response;
  }

  render(response: any, _view: string, _options: any) {
    return response;
  }

  // Headers
  getHeader(response: any, name: string) {
    return response && typeof response.getHeader === 'function' ? response.getHeader(name) : undefined;
  }

  setHeader(response: any, name: string, value: string) {
    if (response && typeof response.setHeader === 'function') {
      response.setHeader(name, value);
    }
  }

  appendHeader(response: any, name: string, value: string) {
    if (response && typeof response.getHeader === 'function' && typeof response.setHeader === 'function') {
      const current = response.getHeader(name);
      if (!current) return response.setHeader(name, value);
      if (Array.isArray(current)) return response.setHeader(name, [...current, value]);
      response.setHeader(name, `${current}, ${value}`);
    }
  }

  isHeadersSent(response: any) {
    return !!(response && response.headersSent);
  }

  // CORS
  enableCors(options: CorsOptions | CorsOptionsDelegate<Hapi.Request>, prefix?: string) {
    this.httpServer.ext('onPreResponse', (req, h) => {
      if (options) {
        const res = req.response as any;
        res.header('Access-Control-Allow-Origin', '*');
      }
      return h.continue;
    });
  }

  // Helpers de request
  getRequestMethod(request: any) {
    if (request && typeof request.method === 'string') return request.method.toUpperCase();
    return 'GET';
  }

  getRequestUrl(request: any) {
    return request && (request.path || request.url || request.originalUrl) || '/';
  }

  getRequestHostname(request: any) {
    if (request && request.info && request.info.host) return request.info.host;
    if (request && request.headers && request.headers.host) return request.headers.host;
    return 'localhost';
  }

  // Arrancar servidor
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
    if (callback) callback();
  }

  async close() {
    await this.httpServer.stop();
  }

  getType(): string {
    return 'hapi';
  }

  // Nest necesita el servidor HTTP nativo para adjuntar eventos como 'once'
  getHttpServer() {
    const server = this.httpServer as any;
    return server && server.listener ? server.listener : server;
  }

  applyVersionFilter(handler: Function, version: VersionValue, versioningOptions: VersioningOptions) {
    return (req: Hapi.Request, res: Hapi.ResponseToolkit, next: () => void) => {
      // Implementación básica; se puede extender para versioning por header, media type, etc.
      return handler(req, res, next);
    };
  }

  // Estos pueden quedarse como no-op si no los necesitas todavía
  useStaticAssets(..._args: any[]) { return this as any; }
  setViewEngine(_engine: string) { return this as any; }
  registerParserMiddleware(_prefix?: string, _rawBody?: boolean) { return this as any; }
  setErrorHandler(_handler: Function, _prefix?: string) { return this as any; }
  setNotFoundHandler(_handler: Function, _prefix?: string) { return this as any; }

  createMiddlewareFactory(requestMethod: RequestMethod) {
    const methodMap: Record<number, '*' | Hapi.RouteDefMethods> = {
      [RequestMethod.ALL]: '*',
      [RequestMethod.GET]: 'get',
      [RequestMethod.POST]: 'post',
      [RequestMethod.PUT]: 'put',
      [RequestMethod.DELETE]: 'delete',
      [RequestMethod.PATCH]: 'patch',
      [RequestMethod.OPTIONS]: 'options',
      [RequestMethod.HEAD]: 'head',
    } as any;

    const method = (methodMap[requestMethod] ?? '*') as '*' | Hapi.RouteDefMethods;
    return (path: string, callback: Function) => {
      const hapiPath = this.convertPathToHapi(path);
      this.httpServer.route({
        method,
        path: hapiPath,
        handler: (req: Hapi.Request, h: Hapi.ResponseToolkit) => {
          callback(req.raw.req, req.raw.res, () => {});
          return h.continue;
        },
      });
    };
  }
}
