/**
 * Helper para manejo de responses compatibles con NestJS
 */

/**
 * Opciones para configurar cookies
 */
export interface CookieOptions {
  path?: string;
  domain?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  maxAge?: number;
  expires?: Date | string;
}

/**
 * Crea el shim del método send() en el response nativo
 * para que sea compatible con NestJS
 * 
 * @param nodeRes - Response nativo de Node
 */
export function createSendMethod(nodeRes: any): void {
  if (typeof nodeRes.send === 'function') {
    return; // Ya existe
  }

  nodeRes.send = (payload: any) => {
    if (payload === undefined || payload === null) {
      return nodeRes.end();
    }

    if (Buffer.isBuffer(payload)) {
      return nodeRes.end(payload);
    }

    if (typeof payload === 'string') {
      if (!nodeRes.getHeader?.('content-type')) {
        nodeRes.setHeader?.('content-type', 'text/plain; charset=utf-8');
      }
      return nodeRes.end(payload);
    }

    // Objeto/Array - serializar a JSON
    try {
      if (!nodeRes.getHeader?.('content-type')) {
        nodeRes.setHeader?.('content-type', 'application/json; charset=utf-8');
      }
      return nodeRes.end(JSON.stringify(payload));
    } catch {
      return nodeRes.end(String(payload));
    }
  };
}

/**
 * Crea el shim del método header() en el response nativo
 * 
 * @param nodeRes - Response nativo de Node
 */
export function createHeaderMethod(nodeRes: any): void {
  if (typeof nodeRes.header === 'function') {
    return;
  }

  nodeRes.header = (name: string, value: string) => {
    nodeRes.setHeader?.(name, value);
    return nodeRes;
  };
}

/**
 * Serializa una cookie en formato HTTP Set-Cookie
 * 
 * @param name - Nombre de la cookie
 * @param value - Valor de la cookie
 * @param options - Opciones de la cookie
 * @returns String de cookie en formato HTTP
 */
function serializeCookie(name: string, value: any, options?: CookieOptions): string {
  const encode = (v: any) => encodeURIComponent(String(v));
  let cookie = `${name}=${encode(value)}`;

  if (options?.path) {
    cookie += `; Path=${options.path}`;
  } else {
    cookie += `; Path=/`;
  }

  if (options?.domain) {
    cookie += `; Domain=${options.domain}`;
  }

  if (options?.httpOnly ?? true) {
    cookie += `; HttpOnly`;
  }

  if (options?.secure) {
    cookie += `; Secure`;
  }

  if (options?.sameSite) {
    cookie += `; SameSite=${options.sameSite}`;
  }

  if (options?.maxAge) {
    cookie += `; Max-Age=${options.maxAge}`;
  }

  if (options?.expires) {
    const expiresDate = options.expires instanceof Date 
      ? options.expires 
      : new Date(options.expires);
    cookie += `; Expires=${expiresDate.toUTCString()}`;
  }

  return cookie;
}

/**
 * Crea el shim del método state() para manejo de cookies
 * 
 * @param nodeRes - Response nativo de Node
 */
export function createStateMethod(nodeRes: any): void {
  if (typeof nodeRes.state === 'function') {
    return;
  }

  nodeRes.state = (name: string, value: any, options?: CookieOptions) => {
    const cookie = serializeCookie(name, value, options);
    const existingCookies = nodeRes.getHeader?.('set-cookie');

    if (!existingCookies) {
      nodeRes.setHeader?.('set-cookie', cookie);
    } else if (Array.isArray(existingCookies)) {
      nodeRes.setHeader?.('set-cookie', [...existingCookies, cookie]);
    } else {
      nodeRes.setHeader?.('set-cookie', [String(existingCookies), cookie]);
    }

    return nodeRes;
  };
}

/**
 * Crea el shim del método render() para renderizar vistas
 * 
 * @param nodeRes - Response nativo de Node
 * @param renderFn - Función de renderizado del adapter
 */
export function createRenderMethod(nodeRes: any, renderFn: Function): void {
  if (typeof nodeRes.render === 'function') {
    return;
  }

  nodeRes.render = async (view: string, options?: any) => {
    return await renderFn(nodeRes, view, options);
  };
}

/**
 * Objeto de respuesta que emula el comportamiento de Hapi
 */
class HapiResponseWrapper {
  private _payload: any;
  private _statusCode: number = 200;
  private _headers: Record<string, string> = {};
  private nodeRes: any;

  constructor(payload: any, nodeRes: any) {
    this._payload = payload;
    this.nodeRes = nodeRes;
  }

  /**
   * Establece el código de estado HTTP
   */
  code(statusCode: number): this {
    this._statusCode = statusCode;
    return this;
  }

  /**
   * Establece un header
   */
  header(name: string, value: string): this {
    this._headers[name] = value;
    return this;
  }

  /**
   * Aplica la respuesta al nodeRes
   */
  private _apply(): void {
    // Aplicar status code
    this.nodeRes.statusCode = this._statusCode;

    // Aplicar headers
    Object.entries(this._headers).forEach(([name, value]) => {
      this.nodeRes.setHeader(name, value);
    });

    // Enviar payload
    if (this._payload !== undefined && this._payload !== null) {
      if (Buffer.isBuffer(this._payload)) {
        this.nodeRes.end(this._payload);
      } else if (typeof this._payload === 'string') {
        if (!this.nodeRes.getHeader('content-type')) {
          this.nodeRes.setHeader('content-type', 'text/plain; charset=utf-8');
        }
        this.nodeRes.end(this._payload);
      } else {
        if (!this.nodeRes.getHeader('content-type')) {
          this.nodeRes.setHeader('content-type', 'application/json; charset=utf-8');
        }
        this.nodeRes.end(JSON.stringify(this._payload));
      }
    } else {
      this.nodeRes.end();
    }
  }

  /**
   * Método para compatibilidad - se llama automáticamente si se devuelve
   */
  toString(): string {
    this._apply();
    return '';
  }
}

/**
 * Crea el método response() al estilo de Hapi
 * 
 * @param nodeRes - Response nativo de Node
 */
export function createResponseMethod(nodeRes: any): void {
  if (typeof nodeRes.response === 'function') {
    return;
  }

  nodeRes.response = (payload?: any) => {
    const wrapper = new HapiResponseWrapper(payload, nodeRes);
    
    // Aplicar inmediatamente si no se encadena
    setTimeout(() => {
      if (wrapper) {
        wrapper.toString();
      }
    }, 0);
    
    return wrapper;
  };
}

/**
 * Enriquece el response nativo de Node con métodos compatibles con NestJS
 * 
 * @param nodeRes - Response nativo de Node
 * @param renderFn - Función de renderizado del adapter (opcional)
 */
export function enrichNodeResponse(nodeRes: any, renderFn?: Function): void {
  createSendMethod(nodeRes);
  createHeaderMethod(nodeRes);
  createStateMethod(nodeRes);
  createResponseMethod(nodeRes); // Agregar método response() al estilo Hapi
  
  // Agregar método render si se proporciona la función
  if (renderFn) {
    createRenderMethod(nodeRes, renderFn);
  }
}

