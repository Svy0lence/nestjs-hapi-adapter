import { INestApplication } from '@nestjs/common';
import type { HapiAdapter } from '../hapi.adapter';

export interface NestHapiApplication extends INestApplication<HapiAdapter> {
  // TypeScript automáticamente sabe que getHttpAdapter() retorna HapiAdapter
}

