# nestjs-hapi-adapter

[![npm version](https://img.shields.io/npm/v/nestjs-hapi-adapter.svg)](https://www.npmjs.com/package/nestjs-hapi-adapter)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Adaptador HTTP profesional para usar **Hapi.js** como servidor en aplicaciones **NestJS**, con la misma facilidad que los adaptadores oficiales de Express o Fastify.

## ✨ Características

- ✅ **Integración completa con NestJS** - Todos los decoradores, pipes, guards, interceptors funcionan perfectamente
- 🚀 **Soporte para Swagger/OpenAPI** - Documentación automática con UI incluida y autenticación básica opcional
- 🌐 **CORS avanzado** - Configuración flexible con múltiples orígenes y headers personalizados
- 🎨 **Motor de vistas** - Soporte para Handlebars (HBS), EJS y Pug
- 📦 **Manejo de archivos** - Multipart/form-data y uploads
- 🔒 **Producción ready** - Sistema de autenticación básica para Swagger y control por ambientes
- ⚡ **TypeScript nativo** - Tipado completo y soporte para todos los tipos de NestJS

## 📦 Instalación

```bash
npm install nestjs-hapi-adapter @hapi/hapi
```

### Dependencias opcionales

Según las características que necesites:

```bash
# Para usar vistas (cualquiera de estos)
npm install @hapi/vision handlebars  # Para Handlebars
npm install @hapi/vision ejs          # Para EJS
npm install @hapi/vision pug          # Para Pug

# Para usar Swagger
npm install @nestjs/swagger
```

## 🚀 Uso básico

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HapiAdapter, NestHapiApplication } from 'nestjs-hapi-adapter';

async function bootstrap() {
  const app = await NestFactory.create<NestHapiApplication>(
    AppModule,
    new HapiAdapter()
  );
  
  await app.listen(3000);
  console.log('🚀 Aplicación corriendo en http://localhost:3000');
}
bootstrap();
```

## 📚 Ejemplos completos

### 1. Con CORS

```typescript
import { NestFactory } from '@nestjs/core';
import { HapiAdapter, NestHapiApplication } from 'nestjs-hapi-adapter';
import { AppModule } from './app.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

async function bootstrap() {
  const app = await NestFactory.create<NestHapiApplication>(
    AppModule,
    new HapiAdapter()
  );
  
  // Configuración de CORS
  const corsOptions: CorsOptions = {
    origin: ['http://localhost:3000', 'http://localhost:4200'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'x-api-key',
      'x-request-id'
    ],
    credentials: true,
    optionsSuccessStatus: 204
  };

  app.enableCors(corsOptions);
  
  await app.listen(3000);
}
bootstrap();
```

### 2. Con Swagger

```typescript
import { NestFactory } from '@nestjs/core';
import { HapiAdapter, NestHapiApplication } from 'nestjs-hapi-adapter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestHapiApplication>(
    AppModule,
    new HapiAdapter()
  );
  
  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Mi API')
    .setDescription('Documentación de la API')
    .setVersion('1.0')
    .addTag('users', 'Operaciones de usuarios')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);

  // Registrar Swagger desde el adapter
  (app.getHttpAdapter() as any).registerSwagger(document, {
    mountPath: '/api/docs',           // URL de la UI
    jsonPath: '/api/docs-json',       // URL del JSON
    allowedEnvironments: ['development', 'staging'],
    basicAuth: {
      username: process.env.SWAGGER_USER || 'admin',
      password: process.env.SWAGGER_PASS || 'secret'
    }
  });
  
  await app.listen(3000);
  console.log('📚 Swagger UI: http://localhost:3000/api/docs');
  console.log('📄 Swagger JSON: http://localhost:3000/api/docs-json');
}
bootstrap();
```

### 3. Con vistas (Handlebars, EJS o Pug)

```typescript
import { NestFactory } from '@nestjs/core';
import { HapiAdapter, NestHapiApplication, ViewEngine } from 'nestjs-hapi-adapter';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestHapiApplication>(
    AppModule,
    new HapiAdapter()
  );
  
  // Configurar directorio de vistas
  app.getHttpAdapter().setBaseViewsDir(join(__dirname, '..', 'views'));
  
  // Configurar motor de plantillas
  await app.getHttpAdapter().setViewEngine(ViewEngine.HBS);  // Handlebars
  // await app.getHttpAdapter().setViewEngine(ViewEngine.EJS);  // EJS
  // await app.getHttpAdapter().setViewEngine(ViewEngine.PUG);  // Pug
  
  await app.listen(3000);
}
bootstrap();
```

**En tu controlador:**

```typescript
import { Controller, Get, Render } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('home')
  @Render('index')  // Renderiza views/index.hbs
  getHome() {
    return { 
      title: 'Mi aplicación',
      message: 'Hola desde Hapi + NestJS'
    };
  }
}
```

### 4. Ejemplo completo (CORS + Swagger + Vistas)

```typescript
import { NestFactory } from '@nestjs/core';
import { HapiAdapter, NestHapiApplication, ViewEngine } from 'nestjs-hapi-adapter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestHapiApplication>(
    AppModule,
    new HapiAdapter()
  );
  
  // 1. Configurar vistas
  app.getHttpAdapter().setBaseViewsDir(join(__dirname, '..', 'views'));
  await app.getHttpAdapter().setViewEngine(ViewEngine.HBS);
  
  // 2. Configurar prefijo global
  app.setGlobalPrefix('api/v1');

  // 3. Configuración de CORS
  const corsOptions: CorsOptions = {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'x-api-key',
      'x-request-id',
      'x-correlation-id'
    ],
    credentials: true,
    optionsSuccessStatus: 204
  };

  app.enableCors(corsOptions);
  
  // 4. Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Mi API con Hapi')
    .setDescription('API construida con NestJS + Hapi.js')
    .setVersion('1.0')
    .addTag('users', 'Gestión de usuarios')
    .addTag('views', 'Renderizado de vistas')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);

  (app.getHttpAdapter() as any).registerSwagger(document, {
    mountPath: '/api/docs',
    jsonPath: '/api/docs-json',
    allowedEnvironments: ['development', 'staging'],
    basicAuth: process.env.SWAGGER_USER && process.env.SWAGGER_PASS
      ? {
          username: process.env.SWAGGER_USER,
          password: process.env.SWAGGER_PASS,
        }
      : undefined,
  });
  
  await app.listen(3001);
  console.log('🚀 Aplicación corriendo en http://localhost:3001');
  console.log('📄 Vistas disponibles en http://localhost:3001/views');
  console.log('📋 API disponible en http://localhost:3001/api/v1');
  console.log('📚 Swagger UI en http://localhost:3001/api/docs');
  console.log('📄 Swagger JSON en http://localhost:3001/api/docs-json');
}
bootstrap();
```

## 🎨 Motores de vistas disponibles

El adaptador soporta los siguientes motores de plantillas:

```typescript
import { ViewEngine } from 'nestjs-hapi-adapter';

// Handlebars
await app.getHttpAdapter().setViewEngine(ViewEngine.HBS);

// EJS
await app.getHttpAdapter().setViewEngine(ViewEngine.EJS);

// Pug
await app.getHttpAdapter().setViewEngine(ViewEngine.PUG);
```

## 📖 API del adaptador

### Tipos exportados

```typescript
import { 
  HapiAdapter,           // El adaptador principal
  NestHapiApplication,   // Tipo para la aplicación
  ViewEngine,            // Enum de motores de vistas
} from 'nestjs-hapi-adapter';
```

### Métodos del adaptador

```typescript
// Configurar vistas
app.getHttpAdapter().setBaseViewsDir(path: string)
app.getHttpAdapter().setViewEngine(engine: ViewEngine)

// Registrar Swagger (método custom del adaptador)
app.getHttpAdapter().registerSwagger(document: any, options?: SwaggerOptions)
```

### Opciones de Swagger

```typescript
interface SwaggerOptions {
  mountPath?: string;              // Ruta de la UI (default: '/api/docs')
  jsonPath?: string;               // Ruta del JSON (default: '/api/docs-json')
  allowedEnvironments?: string[];  // Ambientes permitidos (default: ['development'])
  basicAuth?: {                    // Autenticación básica opcional
    username: string;
    password: string;
  };
}
```

## 🔧 Configuración avanzada

### Variables de entorno recomendadas

```env
# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:4200

# Swagger
SWAGGER_USER=admin
SWAGGER_PASS=secret123
NODE_ENV=development
```

### TypeScript

Asegúrate de tener estas opciones en tu `tsconfig.json`:

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## 🤝 Compatibilidad

- **NestJS**: >= 10.0.0
- **Hapi.js**: >= 21.0.0
- **Node.js**: >= 16.0.0
- **TypeScript**: >= 5.0.0

## 📝 Licencia

MIT

## 🐛 Reportar problemas

Si encuentras algún bug o tienes una sugerencia, por favor crea un issue en:
https://github.com/your-username/nestjs-hapi-adapter/issues

## 🤝 Contribuir

Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## ⭐ ¿Te gusta el proyecto?

Si este proyecto te resulta útil, considera darle una estrella ⭐ en GitHub!

---

Hecho con ❤️ para la comunidad de NestJS
