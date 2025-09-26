# nestjs-hapi-adapter

Un adapter para usar **Hapi.js** como servidor HTTP en **NestJS**, de la misma forma que los adaptadores oficiales (`@nestjs/platform-express`, `@nestjs/platform-fastify`).

👉 Con este paquete podrás levantar tu aplicación NestJS usando **Hapi** como motor en lugar de Express o Fastify.

---

## 🚀 Instalación

```bash
npm install nestjs-hapi-adapter @hapi/hapi


import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HapiAdapter } from 'nestjs-hapi-adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new HapiAdapter());
  await app.listen(3000);
}
bootstrap();


🎯 Características

Integración directa de Hapi.js con NestJS.
Soporte para middlewares, filtros, pipes y demás funcionalidades del core de Nest.
Alternativa ligera a Express y Fastify.