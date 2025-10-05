/**
 * @module nestjs-hapi-adapter
 * Adaptador HTTP para usar Hapi.js como servidor en aplicaciones NestJS
 * 
 * @example
 * ```typescript
 * import { NestFactory } from '@nestjs/core';
 * import { HapiAdapter, NestHapiApplication, ViewEngine } from './adapters';
 * import { join } from 'path';
 * 
 * const app = await NestFactory.create<NestHapiApplication>(
 *   AppModule,
 *   new HapiAdapter()
 * );
 * 
 * // Configurar vistas a través del adapter
 * app.getHttpAdapter().setBaseViewsDir(join(__dirname, '..', 'views'));
 * await app.getHttpAdapter().setViewEngine(ViewEngine.HBS);
 * 
 * await app.listen(3000);
 * ```
 */

// Exportar el adapter principal
export { HapiAdapter } from './hapi.adapter';

// Exportar tipos
export * from './types';

