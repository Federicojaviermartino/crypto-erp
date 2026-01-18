import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';

export interface PaddleOcrLine {
  text: string;
  bbox: number[][];
  confidence: number;
}

export interface PaddleOcrResponse {
  success: boolean;
  text?: string;
  lines?: PaddleOcrLine[];
  provider?: string;
  stats?: {
    total_lines: number;
    avg_confidence: number;
  };
  error?: string;
}

/**
 * Client for PaddleOCR self-hosted service
 *
 * PaddleOCR is an open-source OCR toolkit supporting 80+ languages.
 * This client connects to the PaddleOCR Flask API running in Docker.
 *
 * Usage:
 * - Start PaddleOCR: docker-compose --profile ocr up -d paddleocr
 * - Set PADDLE_OCR_URL in .env (default: http://paddleocr:8866)
 *
 * Features:
 * - Multi-language support (Spanish, English, French, etc.)
 * - Bounding box detection for layout analysis
 * - Confidence scores per line
 * - Optimized for invoice processing
 *
 * @see docker/paddleocr/app.py
 */
@Injectable()
export class PaddleOcrClient {
  private readonly logger = new Logger(PaddleOcrClient.name);
  private readonly baseUrl: string;
  private readonly timeout: number = 30000; // 30 seconds
  private isAvailable: boolean | null = null;
  private lastHealthCheck: number = 0;
  private readonly healthCheckInterval = 60000; // 1 minute

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'PADDLE_OCR_URL',
      'http://localhost:8866',
    );

    this.logger.log(`PaddleOCR client initialized (URL: ${this.baseUrl})`);
  }

  /**
   * Check if PaddleOCR service is available
   */
  async checkHealth(): Promise<boolean> {
    const now = Date.now();

    // Use cached result if checked recently
    if (this.isAvailable !== null && now - this.lastHealthCheck < this.healthCheckInterval) {
      return this.isAvailable;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      this.isAvailable = response.ok;
      this.lastHealthCheck = now;

      if (this.isAvailable) {
        const data = await response.json() as { status: string; version: string };
        this.logger.log(`PaddleOCR health check: ${data.status} (v${data.version})`);
      }

      return this.isAvailable;
    } catch (error) {
      this.isAvailable = false;
      this.lastHealthCheck = now;
      this.logger.warn(`PaddleOCR not available: ${error.message}`);
      return false;
    }
  }

  /**
   * Extract text from image using PaddleOCR
   *
   * @param imageBuffer - Image buffer (JPEG, PNG)
   * @param language - Language code (es, en, fr, de, etc.)
   * @returns Extracted text and line details
   */
  async extractText(
    imageBuffer: Buffer,
    language: string = 'es',
  ): Promise<PaddleOcrResponse> {
    try {
      // Check if service is available
      const isHealthy = await this.checkHealth();
      if (!isHealthy) {
        return {
          success: false,
          error: 'PaddleOCR service not available',
        };
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('file', imageBuffer, {
        filename: 'invoice.jpg',
        contentType: 'image/jpeg',
      });
      formData.append('lang', language);

      this.logger.debug(`Sending OCR request (lang: ${language}, size: ${imageBuffer.length} bytes)`);

      // Send request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/predict`, {
        method: 'POST',
        body: formData as any,
        headers: formData.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`PaddleOCR API error: ${response.status} - ${errorText}`);
        return {
          success: false,
          error: `PaddleOCR API error: ${response.status}`,
        };
      }

      const result = await response.json() as PaddleOcrResponse;

      if (result.success) {
        this.logger.log(
          `OCR extracted ${result.stats?.total_lines || 0} lines ` +
          `(avg confidence: ${((result.stats?.avg_confidence || 0) * 100).toFixed(1)}%)`,
        );
      }

      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.error('PaddleOCR request timeout');
        return {
          success: false,
          error: 'OCR request timeout',
        };
      }

      this.logger.error(`PaddleOCR extraction failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get list of supported languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/languages`);
      if (!response.ok) {
        return ['es', 'en']; // Fallback
      }

      const data = await response.json() as { languages: Array<{ code: string }> };
      return data.languages.map((lang) => lang.code);
    } catch (error) {
      this.logger.warn('Failed to fetch supported languages', error);
      return ['es', 'en'];
    }
  }

  /**
   * Get current status
   */
  getStatus(): { enabled: boolean; url: string; lastCheck: Date | null } {
    return {
      enabled: this.isAvailable === true,
      url: this.baseUrl,
      lastCheck: this.lastHealthCheck > 0 ? new Date(this.lastHealthCheck) : null,
    };
  }
}
