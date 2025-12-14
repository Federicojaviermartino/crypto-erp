# AI Architecture Documentation

## Overview

This document describes the AI/ML architecture, including LLM integration, RAG implementation, and intelligent features.

---

## Implementation Status

| Feature | Status | Location |
|---------|--------|----------|
| **Provider Abstraction** | ✅ Implemented | `ai-provider.service.ts` |
| **Anthropic Provider** | ✅ Implemented | Built-in |
| **OpenAI Provider** | ✅ Implemented | Built-in |
| **Ollama Provider** | ✅ Implemented | Built-in |
| **Chatbot Service** | ✅ Implemented | `ai.service.ts` |
| **Embeddings (pgvector)** | ✅ Implemented | `embeddings.service.ts` |
| **RAG Search** | ✅ Implemented | `rag.service.ts` |
| **OCR (Invoice)** | ✅ Implemented | `ocr.service.ts` |

---

## AI Capabilities

| Feature | Description | Primary Model | Fallback |
|---------|-------------|---------------|----------|
| **Accounting Chatbot** | Answer accounting/tax questions | Claude 3.5 Sonnet | GPT-4o |
| **Transaction Categorization** | Classify crypto transactions | Claude Haiku | Llama 3.1 8B |
| **Invoice OCR** | Extract data from invoice images | Google Vision API | AI extraction |
| **Tax Prediction** | Real-time tax impact simulation | Claude 3.5 Sonnet | GPT-4o |
| **Report Generation** | Generate narrative analysis | Claude 3.5 Sonnet | GPT-4o |
| **RAG Search** | Search regulatory knowledge base | text-embedding-3-small | Ollama |

---

## File Structure

```
apps/api/src/modules/ai/
├── ai.module.ts              # Module configuration
├── controllers/
│   └── ai.controller.ts      # REST endpoints
├── dto/
│   ├── chat.dto.ts           # Chat DTOs
│   ├── ocr.dto.ts            # OCR DTOs
│   └── index.ts
└── services/
    ├── ai.service.ts         # Main chatbot service
    ├── ai-provider.service.ts # Provider abstraction & fallback
    ├── embeddings.service.ts  # pgvector embeddings
    ├── rag.service.ts         # RAG retrieval & context
    ├── ocr.service.ts         # Invoice OCR extraction
    └── index.ts
```

---

## Provider Architecture

### Abstract Provider Interface

```typescript
// ai-provider.service.ts

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
  latencyMs: number;
}

export interface LlmOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}
```

### Provider Manager with Fallback

The `AiProviderService` implements automatic fallback between providers:

```typescript
@Injectable()
export class AiProviderService {
  private fallbackChain: Record<string, string[]> = {
    chat: ['anthropic', 'openai', 'ollama'],
    categorization: ['anthropic', 'ollama'],
    reports: ['anthropic', 'openai'],
  };

  async chat(
    messages: LlmMessage[],
    taskType: string = 'chat',
    options?: LlmOptions
  ): Promise<LlmResponse> {
    const chain = this.fallbackChain[taskType];

    for (const providerName of chain) {
      try {
        if (await this.isProviderAvailable(providerName)) {
          return await this.callProvider(providerName, messages, options);
        }
      } catch (error) {
        this.logger.warn(`Provider ${providerName} failed, trying next`);
        continue;
      }
    }

    throw new Error('All LLM providers failed');
  }
}
```

### Supported Providers

#### Anthropic (Primary)
```typescript
const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
];
```

#### OpenAI (Fallback)
```typescript
const OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-4-turbo',
];
```

#### Ollama (Self-hosted)
```typescript
const OLLAMA_MODELS = [
  'llama3.1:8b',
  'llama3.1:70b',
  'mistral:7b',
];
```

---

## RAG (Retrieval Augmented Generation)

### Embedding Generation

```typescript
// embeddings.service.ts

@Injectable()
export class EmbeddingsService {
  private model = 'text-embedding-3-small';
  private dimensions = 1536;

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: this.model,
      input: text,
      dimensions: this.dimensions,
    });

    return response.data[0].embedding;
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await this.openai.embeddings.create({
      model: this.model,
      input: texts,
      dimensions: this.dimensions,
    });

    return response.data.map(d => d.embedding);
  }
}
```

### Vector Search with pgvector

```typescript
// rag.service.ts

@Injectable()
export class RagService {
  async search(
    query: string,
    companyId: string,
    options?: { limit?: number; threshold?: number }
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.embeddings.generateEmbedding(query);
    const limit = options?.limit || 5;
    const threshold = options?.threshold || 0.7;

    // pgvector similarity search
    const results = await this.prisma.$queryRaw<SearchResult[]>`
      SELECT
        id,
        title,
        content,
        type,
        1 - (embedding <=> ${queryEmbedding}::vector) as similarity
      FROM documents
      WHERE company_id = ${companyId}
        AND 1 - (embedding <=> ${queryEmbedding}::vector) > ${threshold}
      ORDER BY embedding <=> ${queryEmbedding}::vector
      LIMIT ${limit}
    `;

    return results;
  }

  async buildContext(query: string, companyId: string): Promise<string> {
    const relevantDocs = await this.search(query, companyId, {
      limit: 5,
      threshold: 0.65,
    });

    if (relevantDocs.length === 0) {
      return '';
    }

    return relevantDocs
      .map((doc, i) => `[Document ${i + 1}: ${doc.title}]\n${doc.content}`)
      .join('\n\n---\n\n');
  }
}
```

---

## Chatbot Service

### Main Chat Implementation

```typescript
// ai.service.ts

@Injectable()
export class AiService {
  async chat(
    companyId: string,
    userId: string,
    conversationId: string | null,
    userMessage: string,
  ): Promise<ChatResponse> {
    // Get or create conversation
    let conversation = conversationId
      ? await this.getConversation(conversationId)
      : await this.createConversation(companyId, userId);

    // Build context from RAG
    const ragContext = await this.rag.buildContext(userMessage, companyId);

    // Build company context
    const companyContext = await this.buildCompanyContext(companyId);

    // Build messages array
    const systemPrompt = this.getSystemPrompt();
    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: `${systemPrompt}\n\n${companyContext}\n\n${ragContext}`,
      },
      ...this.getConversationHistory(conversation),
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // Call LLM with fallback
    const response = await this.provider.chat(messages, 'chat');

    // Save messages to database
    await this.saveMessages(conversation.id, userMessage, response);

    return {
      conversationId: conversation.id,
      message: response.content,
      tokensUsed: response.inputTokens + response.outputTokens,
    };
  }
}
```

---

## System Prompts

### Accounting Chatbot

```markdown
You are an expert Spanish accountant AI assistant integrated into a crypto-accounting
ERP system. Your role is to help users understand and manage their accounting,
especially for cryptocurrency operations.

## Your Expertise

1. **Spanish Accounting (PGC)**: Complete knowledge of Plan General Contable 2007
2. **Crypto Accounting**: How to properly record crypto transactions under Spanish regulations
3. **Tax Compliance**: IRPF, IVA, Modelo 721, and other tax obligations
4. **Verifactu**: Electronic invoicing requirements

## Context You Have Access To

- The user's company information
- Their chart of accounts
- Recent journal entries
- Crypto wallet balances and transactions
- Relevant regulatory documentation (via RAG)

## Response Guidelines

1. **Be specific**: Reference actual account codes (e.g., "Account 305001 - Bitcoin")
2. **Be practical**: Provide actionable advice with examples
3. **Be cautious**: For complex tax situations, recommend consulting a tax advisor
4. **Be bilingual**: Respond in the same language the user writes in

## Important Rules

- Never make up tax rates or regulations - use only verified information
- Always clarify if something is your interpretation vs. official regulation
- For crypto valuations, always use FIFO method (mandatory in Spain)
- Recommend professional consultation for amounts over 50,000 EUR
```

---

## API Endpoints

### Chat Endpoint

```typescript
@Controller('ai')
export class AiController {
  @Post('chat')
  @UseGuards(JwtAuthGuard, CompanyGuard)
  async chat(
    @Body() dto: ChatDto,
    @CurrentUser() user: User,
    @CurrentCompany() company: Company,
  ): Promise<ChatResponseDto> {
    return this.aiService.chat(
      company.id,
      user.id,
      dto.conversationId,
      dto.message,
    );
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard, CompanyGuard)
  async getConversations(
    @CurrentCompany() company: Company,
    @CurrentUser() user: User,
  ): Promise<ConversationDto[]> {
    return this.aiService.getConversations(company.id, user.id);
  }

  @Get('conversations/:id')
  @UseGuards(JwtAuthGuard, CompanyGuard)
  async getConversation(
    @Param('id') id: string,
  ): Promise<ConversationWithMessagesDto> {
    return this.aiService.getConversationWithMessages(id);
  }
}
```

---

## Token Usage & Cost Tracking

### Usage Logging

```typescript
interface LlmUsageLog {
  id: string;
  companyId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  cost: number;
  createdAt: Date;
}

// Cost calculation (approximate per 1K tokens)
const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-5-haiku-20241022': { input: 0.00025, output: 0.00125 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'llama3.1:8b': { input: 0, output: 0 },  // Self-hosted
};
```

---

## Configuration

### Environment Variables

```bash
# Anthropic (Primary)
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (Fallback + Embeddings)
OPENAI_API_KEY=sk-...

# Ollama (Self-hosted, optional)
OLLAMA_BASE_URL=http://localhost:11434
```

### Docker (Ollama)

```yaml
# docker-compose.yml
ollama:
  image: ollama/ollama:latest
  container_name: crypto-erp-ollama
  ports:
    - "11434:11434"
  volumes:
    - ollama_data:/root/.ollama
```

---

## OCR Service

### Overview

The OCR service extracts structured data from invoice images and PDFs using a dual-provider approach:

1. **Google Cloud Vision API** (primary) - High accuracy text detection
2. **AI-based extraction** (fallback) - Uses LLM to parse invoice data

### API Endpoints

#### Extract Invoice Data

```
POST /api/v1/ai/ocr/extract-invoice
Content-Type: multipart/form-data

file: <invoice image or PDF>
```

**Supported formats:** JPEG, PNG, WebP, PDF (up to 10MB)

**Response:**
```json
{
  "success": true,
  "data": {
    "issuerName": "Empresa S.L.",
    "issuerTaxId": "B12345678",
    "issuerAddress": "Calle Principal 1, Madrid",
    "recipientName": "Cliente S.A.",
    "recipientTaxId": "A87654321",
    "invoiceNumber": "F2024-00001",
    "invoiceDate": "2024-01-15",
    "dueDate": "2024-02-15",
    "subtotal": 1000.00,
    "taxRate": 21,
    "taxAmount": 210.00,
    "total": 1210.00,
    "currency": "EUR",
    "lineItems": [
      {
        "description": "Servicios profesionales",
        "quantity": 10,
        "unitPrice": 100.00,
        "amount": 1000.00
      }
    ],
    "confidence": 0.85,
    "provider": "google-vision",
    "processingTimeMs": 1234
  }
}
```

#### Check OCR Status

```
GET /api/v1/ai/ocr/status
```

### Configuration

```bash
# Google Cloud Vision API (optional but recommended)
GOOGLE_CLOUD_API_KEY=your-api-key

# Without Google Vision, AI-based extraction is used automatically
```

### Extracted Fields

| Field | Description | Example |
|-------|-------------|---------|
| `issuerName` | Issuer company name | "Empresa S.L." |
| `issuerTaxId` | NIF/CIF of issuer | "B12345678" |
| `invoiceNumber` | Invoice number with series | "F2024-00001" |
| `invoiceDate` | Issue date (YYYY-MM-DD) | "2024-01-15" |
| `subtotal` | Base amount before tax | 1000.00 |
| `taxRate` | VAT percentage | 21 |
| `total` | Total amount | 1210.00 |
| `lineItems` | Array of line items | [...] |
| `confidence` | Extraction confidence (0-1) | 0.85 |

---

## Future Enhancements

- **Real-time tax prediction**: Simulate tax impact before transactions
- **Batch categorization**: Process multiple transactions via workers
- **Knowledge base expansion**: More AEAT/BOICAC documentation
- **Multi-language support**: English documentation for international users
- **PaddleOCR integration**: Self-hosted OCR option via Docker
