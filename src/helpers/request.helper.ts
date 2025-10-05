import * as Hapi from '@hapi/hapi';

/**
 * Interfaz para archivos detectados en multipart/form-data
 */
export interface ParsedFile {
  pipe: Function;
  hapi: any;
  [key: string]: any;
}

/**
 * Resultado del parseo de multipart
 */
export interface MultipartParseResult {
  files: ParsedFile[];
  fields: Record<string, any>;
}

/**
 * Verifica si un valor es un archivo (stream de Hapi)
 */
function isFile(value: any): value is ParsedFile {
  return value && typeof value.pipe === 'function' && value.hapi;
}

/**
 * Parsea el payload de multipart/form-data separando archivos de campos
 * 
 * @param payload - Payload del request de Hapi
 * @returns Objeto con archivos y campos separados
 */
export function parseMultipartPayload(payload: any): MultipartParseResult {
  const files: ParsedFile[] = [];
  const fields: Record<string, any> = {};

  if (!payload || typeof payload !== 'object') {
    return { files, fields };
  }

  Object.entries(payload).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      const fileValues = value.filter(isFile);
      if (fileValues.length > 0) {
        files.push(...fileValues);
      } else {
        fields[key] = value;
      }
    } else if (isFile(value)) {
      files.push(value);
    } else {
      fields[key] = value;
    }
  });

  return { files, fields };
}

/**
 * Enriquece el request nativo de Node con datos del request de Hapi
 * para que sea compatible con decoradores de NestJS (@Query, @Param, @Body, etc.)
 * 
 * @param req - Request de Hapi
 */
export function enrichNodeRequest(req: Hapi.Request): void {
  const nodeReq: any = req.raw.req;
  const contentType = req.headers['content-type'] || '';
  const payload: any = (req as any).payload;

  // Query params y route params
  nodeReq.query = req.query;
  nodeReq.params = req.params;
  nodeReq.state = (req as any).state;
  nodeReq.path = req.path;

  // Body según content-type
  if (contentType.includes('multipart/form-data')) {
    const { files, fields } = parseMultipartPayload(payload);
    
    if (files.length === 1) {
      nodeReq.file = files[0];
    }
    if (files.length > 0) {
      nodeReq.files = files;
    }
    nodeReq.body = fields;
  } else {
    // JSON, urlencoded, etc. - Hapi ya parsea con output: 'data'
    nodeReq.body = payload;
  }
}

