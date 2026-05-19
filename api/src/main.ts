import 'reflect-metadata';

// BigInt → string in every JSON response. Without this, any endpoint returning
// money minor units (payroll, expenses, advances, loans, asset purchase cost)
// throws "Do not know how to serialize a BigInt". The FE consumes these as
// strings already (see the `amount: string` / `*Minor: string` types).
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { TypedConfigService } from './config/typed-config.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  const config = app.get(TypedConfigService);
  const prefix = config.get('API_PREFIX');
  const version = config.get('API_VERSION');

  app.setGlobalPrefix(`${prefix}/${version}`);

  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: config.get('CORS_ORIGINS'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.enableShutdownHooks();

  // Swagger / OpenAPI — disabled in production by default.
  if (!config.isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('cg-payroll API')
      .setDescription('ConnectHR / cg-payroll backend API')
      .setVersion(version)
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();
    const doc = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${prefix}/docs`, app, doc, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get('PORT');
  await app.listen(port);

  const url = await app.getUrl();
  // eslint-disable-next-line no-console
  console.log(`API listening on ${url}/${prefix}/${version}`);
  if (!config.isProd) {
    // eslint-disable-next-line no-console
    console.log(`Swagger docs at ${url}/${prefix}/docs`);
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
