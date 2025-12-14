import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '@crypto-erp/database';
import { AiService } from './services/ai.service.js';
import { AiController } from './controllers/ai.controller.js';
import { EmbeddingsService } from './services/embeddings.service.js';
import { RAGService } from './services/rag.service.js';
import { AIProviderService } from './services/ai-provider.service.js';
import { OcrService } from './services/ocr.service.js';
import { PaddleOcrClient } from './services/paddle-ocr.client.js';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [
    PrismaService,
    AiService,
    EmbeddingsService,
    RAGService,
    AIProviderService,
    OcrService,
    PaddleOcrClient,
  ],
  exports: [AiService, EmbeddingsService, RAGService, AIProviderService, OcrService, PaddleOcrClient],
})
export class AiModule {}
