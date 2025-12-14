import { ApiProperty } from '@nestjs/swagger';

export class OcrResponseLineItemDto {
  @ApiProperty({ description: 'Line item description' })
  description: string;

  @ApiProperty({ description: 'Quantity', nullable: true })
  quantity: number | null;

  @ApiProperty({ description: 'Unit price', nullable: true })
  unitPrice: number | null;

  @ApiProperty({ description: 'Line amount', nullable: true })
  amount: number | null;
}

export class OcrExtractedDataDto {
  @ApiProperty({ description: 'Issuer name', nullable: true })
  issuerName: string | null;

  @ApiProperty({ description: 'Issuer tax ID (NIF/CIF)', nullable: true })
  issuerTaxId: string | null;

  @ApiProperty({ description: 'Issuer address', nullable: true })
  issuerAddress: string | null;

  @ApiProperty({ description: 'Recipient name', nullable: true })
  recipientName: string | null;

  @ApiProperty({ description: 'Recipient tax ID', nullable: true })
  recipientTaxId: string | null;

  @ApiProperty({ description: 'Recipient address', nullable: true })
  recipientAddress: string | null;

  @ApiProperty({ description: 'Invoice number', nullable: true })
  invoiceNumber: string | null;

  @ApiProperty({ description: 'Invoice date (YYYY-MM-DD)', nullable: true })
  invoiceDate: string | null;

  @ApiProperty({ description: 'Due date (YYYY-MM-DD)', nullable: true })
  dueDate: string | null;

  @ApiProperty({ description: 'Subtotal amount', nullable: true })
  subtotal: number | null;

  @ApiProperty({ description: 'Tax rate percentage', nullable: true })
  taxRate: number | null;

  @ApiProperty({ description: 'Tax amount', nullable: true })
  taxAmount: number | null;

  @ApiProperty({ description: 'Total amount', nullable: true })
  total: number | null;

  @ApiProperty({ description: 'Currency code', default: 'EUR' })
  currency: string;

  @ApiProperty({ type: [OcrResponseLineItemDto], description: 'Invoice line items' })
  lineItems: OcrResponseLineItemDto[];

  @ApiProperty({ description: 'Extraction confidence (0-1)' })
  confidence: number;

  @ApiProperty({ description: 'OCR provider used', enum: ['google-vision', 'paddleocr', 'ai-extraction'] })
  provider: 'google-vision' | 'paddleocr' | 'ai-extraction';

  @ApiProperty({ description: 'Processing time in milliseconds' })
  processingTimeMs: number;
}

export class OcrResponseDto {
  @ApiProperty({ description: 'Whether extraction was successful' })
  success: boolean;

  @ApiProperty({ type: OcrExtractedDataDto, nullable: true, description: 'Extracted invoice data' })
  data: OcrExtractedDataDto | null;

  @ApiProperty({ description: 'Error message if extraction failed', nullable: true })
  error?: string;
}

export class OcrStatusResponseDto {
  @ApiProperty({ description: 'Whether Google Vision API is enabled' })
  googleVisionEnabled: boolean;

  @ApiProperty({ description: 'Whether PaddleOCR is enabled' })
  paddleOcrEnabled: boolean;

  @ApiProperty({ description: 'PaddleOCR service URL', nullable: true })
  paddleOcrUrl?: string;

  @ApiProperty({ description: 'Whether AI-based extraction is available' })
  aiExtractionEnabled: boolean;
}
