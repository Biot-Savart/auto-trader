/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import { AppModule } from './app/app.module';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(new ValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('Crypto Trader API')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth() // optional, if you use JWT auth
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(globalPrefix, app, document);

  app.enableCors({
    origin: 'http://localhost:4200', // allow your Nuxt frontend
    credentials: true, // if using cookies/auth headers
  });

  const port = process.env.PORT || 3002;
  await app.listen(port);
  Logger.log(
    `🚀 Crypto Trader is running on: http://localhost:${port}/${globalPrefix}`
  );
}

bootstrap();
