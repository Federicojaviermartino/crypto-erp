import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as path from 'path';

// Multer file type for TypeScript
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../common/guards/index.js';
import { AiService } from '../services/ai.service.js';
import { OcrService } from '../services/ocr.service.js';
import {
  ChatRequestDto,
  AnalyzeTransactionDto,
  GenerateReportDto,
  ExplainCryptoTaxDto,
  OcrResponseDto,
  OcrStatusResponseDto,
} from '../dto/index.js';

// Allowed file extensions for OCR
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const MAX_FILENAME_LENGTH = 255;

@ApiTags('AI Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly aiService: AiService,
    private readonly ocrService: OcrService,
  ) {}

  /**
   * Sanitizes uploaded filename to prevent path traversal and other attacks
   * @param filename Original filename from upload
   * @returns Sanitized filename safe for logging/storage
   */
  private sanitizeFilename(filename: string): string {
    if (!filename) return 'unknown';

    // Get just the base name (no directory)
    let sanitized = path.basename(filename);

    // Remove null bytes and other dangerous characters
    sanitized = sanitized.replace(/[\x00-\x1f\x80-\x9f]/g, '');

    // Remove path traversal attempts
    sanitized = sanitized.replace(/\.\./g, '');

    // Only allow alphanumeric, dots, hyphens, underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_]/g, '_');

    // Limit length
    if (sanitized.length > MAX_FILENAME_LENGTH) {
      const ext = path.extname(sanitized);
      sanitized = sanitized.slice(0, MAX_FILENAME_LENGTH - ext.length) + ext;
    }

    return sanitized || 'unknown';
  }

  /**
   * Validates file extension matches allowed list
   */
  private validateFileExtension(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI assistant' })
  @ApiResponse({ status: 200, description: 'AI response' })
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatRequestDto): Promise<{ response: string }> {
    const response = await this.aiService.chat(dto.messages, dto.context);
    return { response };
  }

  @Post('analyze-transaction')
  @ApiOperation({ summary: 'Analyze a transaction and suggest accounts' })
  @ApiResponse({ status: 200, description: 'Analysis result' })
  @HttpCode(HttpStatus.OK)
  async analyzeTransaction(@Body() dto: AnalyzeTransactionDto) {
    return this.aiService.analyzeTransaction(dto.description);
  }

  @Post('generate-report')
  @ApiOperation({ summary: 'Generate an AI-powered report' })
  @ApiResponse({ status: 200, description: 'Generated report' })
  @HttpCode(HttpStatus.OK)
  async generateReport(@Body() dto: GenerateReportDto): Promise<{ report: string }> {
    const report = await this.aiService.generateReport(dto.reportType, dto.data);
    return { report };
  }

  @Post('explain-crypto-tax')
  @ApiOperation({ summary: 'Explain crypto tax implications' })
  @ApiResponse({ status: 200, description: 'Tax explanation' })
  @HttpCode(HttpStatus.OK)
  async explainCryptoTax(@Body() dto: ExplainCryptoTaxDto): Promise<{ explanation: string }> {
    const explanation = await this.aiService.explainCryptoTax(dto.transactions);
    return { explanation };
  }

  @Post('generate-insights')
  @ApiOperation({ summary: 'Generate AI-powered insights for dashboard' })
  @ApiResponse({ status: 200, description: 'Generated insights' })
  @HttpCode(HttpStatus.OK)
  async generateInsights(): Promise<{ insights: Array<{
    category: 'tax' | 'crypto' | 'accounting' | 'optimization';
    message: string;
    priority: 'high' | 'medium' | 'low';
    actionLabel?: string;
    actionPath?: string;
  }> }> {
    // TODO: Implement actual AI-powered insights based on company data
    // For now, return empty array (shows "No recommendations at this time")
    return { insights: [] };
  }

  // ============================================================================
  // OCR Endpoints
  // ============================================================================

  @Post('ocr/extract-invoice')
  @ApiOperation({
    summary: 'Extract invoice data from image/PDF using OCR',
    description:
      'Upload an invoice image (JPEG, PNG) or PDF to extract structured data using OCR and AI.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Invoice image (JPEG, PNG) or PDF file',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Extracted invoice data',
    type: OcrResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or no file provided' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              `Invalid file type. Allowed: ${allowedMimes.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async extractInvoice(
    @UploadedFile() file: MulterFile,
  ): Promise<OcrResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // SECURITY: Sanitize and validate filename
    const sanitizedFilename = this.sanitizeFilename(file.originalname);

    // Double-check file extension (defense in depth)
    if (!this.validateFileExtension(sanitizedFilename)) {
      this.logger.warn(`Rejected file with invalid extension: ${sanitizedFilename}`);
      throw new BadRequestException(
        `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    // Log sanitized filename for audit purposes
    this.logger.log(`Processing OCR for file: ${sanitizedFilename} (${file.mimetype}, ${file.size} bytes)`);

    const result = await this.ocrService.extractInvoiceData(
      file.buffer,
      file.mimetype,
    );

    return {
      success: result.success,
      data: result.data
        ? {
            ...result.data,
            // Remove rawText from response to reduce payload size
            // rawText is kept internally for debugging
          }
        : null,
      error: result.error,
    };
  }

  @Get('ocr/status')
  @ApiOperation({
    summary: 'Get OCR service status',
    description: 'Check which OCR providers are available and enabled.',
  })
  @ApiResponse({
    status: 200,
    description: 'OCR service status',
    type: OcrStatusResponseDto,
  })
  getOcrStatus(): OcrStatusResponseDto {
    return this.ocrService.getStatus();
  }
}
