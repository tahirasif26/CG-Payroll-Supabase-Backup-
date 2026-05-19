/**
 * Phase 10: dump the OpenAPI document to disk so the FE can codegen a typed
 * client. Run via `npm run openapi:dump`. The output lands at
 * `api/openapi.json` — the FE can then run e.g. `openapi-typescript` against
 * it.
 */
import 'reflect-metadata';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const config = new DocumentBuilder()
    .setTitle('cg-payroll API')
    .setDescription('Generated OpenAPI document')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  const outPath = path.resolve(process.cwd(), 'openapi.json');
  fs.writeFileSync(outPath, JSON.stringify(doc, null, 2));
  // eslint-disable-next-line no-console
  console.log(`OpenAPI document written to ${outPath}`);
  await app.close();
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
