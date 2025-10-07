import { INestApplication } from '@nestjs/common';
import type { HapiAdapter } from '../hapi.adapter';

/**
 * Aplicación NestJS configurada con HapiAdapter
 * HapiAdapter implementa explícitamente HttpServer, por lo que es totalmente compatible
 */
export interface NestHapiApplication extends INestApplication<HapiAdapter> {
  /**
   * Obtiene el adaptador HTTP de Hapi
   * @returns El HapiAdapter que implementa HttpServer
   */
  getHttpAdapter(): HapiAdapter;
}

