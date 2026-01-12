import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AIProviderService, ChatMessage as ProviderMessage } from './ai-provider.service.js';
import { RAGService } from './rag.service.js';
import { EmbeddingsService } from './embeddings.service.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiContext {
  companyId?: string;
  companyName?: string;
  fiscalYear?: string;
  recentTransactions?: string;
  accountBalances?: string;
  useRAG?: boolean;
  language?: 'es' | 'en';
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: Anthropic | null = null;

  constructor(
    private configService: ConfigService,
    @Optional() private readonly providerService?: AIProviderService,
    @Optional() private readonly ragService?: RAGService,
    @Optional() private readonly embeddingsService?: EmbeddingsService,
  ) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    } else {
      this.logger.warn('ANTHROPIC_API_KEY not configured - using provider fallback');
    }
  }

  private getSystemPrompt(context?: AiContext): string {
    const language = context?.language || 'es';

    const prompts = {
      es: `Eres un asistente contable experto especializado en:
- Plan General Contable (PGC) español
- Facturación electrónica y Verifactu
- Contabilidad de criptomonedas (FIFO, cost basis)
- Normativa fiscal española (IVA, IRPF, Impuesto de Sociedades)

Tu rol es ayudar a los usuarios con:
1. Dudas contables y fiscales
2. Cómo registrar asientos contables
3. Explicar conceptos de criptomonedas y su fiscalidad
4. Generar informes y análisis
5. Sugerir mejoras en la gestión financiera

Responde siempre en español, de forma clara y profesional.
Si no estás seguro de algo, indícalo claramente.
Cuando sea relevante, cita la normativa aplicable.`,

      en: `You are an expert accounting assistant specialized in:
- Spanish General Accounting Plan (PGC - Plan General Contable)
- Electronic invoicing and Verifactu
- Cryptocurrency accounting (FIFO, cost basis)
- Spanish tax regulations (VAT/IVA, Personal Income Tax/IRPF, Corporate Tax/IS)

Your role is to help users with:
1. Accounting and tax questions
2. How to record accounting entries
3. Explaining cryptocurrency concepts and their taxation in Spain
4. Generating reports and analysis
5. Suggesting improvements in financial management

Always respond in English, clearly and professionally.
If you're unsure about something, state it clearly.
When relevant, cite applicable Spanish regulations (AEAT, BOE, BOICAC).`
    };

    let systemPrompt = prompts[language];

    if (context) {
      const contextHeader = language === 'es'
        ? '\n\nContexto actual del usuario:'
        : '\n\nCurrent user context:';

      systemPrompt += contextHeader;

      if (context.companyName) {
        const label = language === 'es' ? '- Empresa:' : '- Company:';
        systemPrompt += `\n${label} ${context.companyName}`;
      }
      if (context.fiscalYear) {
        const label = language === 'es' ? '- Ejercicio fiscal:' : '- Fiscal year:';
        systemPrompt += `\n${label} ${context.fiscalYear}`;
      }
      if (context.accountBalances) {
        const label = language === 'es' ? '- Saldos principales:' : '- Main balances:';
        systemPrompt += `\n${label} ${context.accountBalances}`;
      }
      if (context.recentTransactions) {
        const label = language === 'es' ? '- Transacciones recientes:' : '- Recent transactions:';
        systemPrompt += `\n${label} ${context.recentTransactions}`;
      }
    }

    return systemPrompt;
  }

  async chat(
    messages: ChatMessage[],
    context?: AiContext,
  ): Promise<string> {
    // Enriquecer la última pregunta con RAG si está disponible
    let enhancedMessages = [...messages];
    if (context?.useRAG && context?.companyId && this.ragService && messages.length > 0) {
      try {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'user') {
          const ragContext = await this.ragService.smartQuery(
            context.companyId,
            lastMessage.content,
            undefined,
            context.language,
          );

          if (ragContext.relevantDocuments.length > 0) {
            enhancedMessages[enhancedMessages.length - 1] = {
              role: 'user',
              content: ragContext.enhancedPrompt,
            };
            this.logger.debug(`RAG: Added ${ragContext.relevantDocuments.length} docs (lang: ${context.language || 'es'})`);
          }
        }
      } catch (error) {
        this.logger.warn('RAG enhancement failed, continuing without', error);
      }
    }

    // Intentar con Anthropic SDK primero
    if (this.client) {
      try {
        const response = await this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: this.getSystemPrompt(context),
          messages: enhancedMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        });

        const textBlock = response.content.find(block => block.type === 'text') as { type: 'text'; text: string } | undefined;
        return textBlock?.text || 'Could not generate a response.';
      } catch (error) {
        this.logger.warn('Anthropic SDK failed, trying provider fallback', error);
      }
    }

    // Fallback a provider service con múltiples proveedores
    if (this.providerService) {
      try {
        const providerMessages: ProviderMessage[] = enhancedMessages.map(m => ({
          role: m.role,
          content: m.content,
        }));

        const response = await this.providerService.chat(providerMessages, {
          systemPrompt: this.getSystemPrompt(context),
        });

        this.logger.log(`Response from ${response.provider} (${response.latencyMs}ms)`);
        return response.content;
      } catch (error) {
        this.logger.error('All AI providers failed', error);
      }
    }

    return 'AI service is not available. Please configure at least one AI provider.';
  }

  async analyzeTransaction(description: string): Promise<{
    suggestedAccounts: { debit: string; credit: string };
    explanation: string;
  }> {
    if (!this.client) {
      return {
        suggestedAccounts: { debit: '', credit: '' },
        explanation: 'AI service is not available',
      };
    }

    const prompt = `Analiza la siguiente transacción y sugiere las cuentas del PGC español para el asiento contable:

"${description}"

Responde en formato JSON con esta estructura:
{
  "suggestedAccounts": {
    "debit": "código y nombre de cuenta al debe",
    "credit": "código y nombre de cuenta al haber"
  },
  "explanation": "breve explicación del asiento"
}`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find(block => block.type === 'text') as { type: 'text'; text: string } | undefined;
      if (textBlock) {
        const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }

      return {
        suggestedAccounts: { debit: '', credit: '' },
        explanation: 'Could not analyze the transaction',
      };
    } catch (error) {
      this.logger.error('Error analyzing transaction', error);
      return {
        suggestedAccounts: { debit: '', credit: '' },
        explanation: 'Error analyzing the transaction',
      };
    }
  }

  async generateReport(
    reportType: 'summary' | 'recommendations' | 'tax-planning',
    data: Record<string, unknown>,
  ): Promise<string> {
    if (!this.client) {
      return 'AI service is not available';
    }

    const prompts: Record<string, string> = {
      summary: `Generate an executive summary of the following financial information:\n${JSON.stringify(data, null, 2)}`,
      recommendations: `Analyze the following financial data and provide improvement recommendations:\n${JSON.stringify(data, null, 2)}`,
      'tax-planning': `Based on the following data, suggest tax planning strategies for a Spanish company:\n${JSON.stringify(data, null, 2)}`,
    };

    const prompt = prompts[reportType];
    if (!prompt) {
      return 'Invalid report type';
    }

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: this.getSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find(block => block.type === 'text') as { type: 'text'; text: string } | undefined;
      return textBlock?.text || 'Could not generate the report.';
    } catch (error) {
      this.logger.error('Error generating report', error);
      throw new Error('Error generating the report');
    }
  }

  async explainCryptoTax(
    transactions: Array<{ type: string; amount: number; gainLoss?: number }>,
  ): Promise<string> {
    if (!this.client) {
      return 'AI service is not available';
    }

    const prompt = `Explica las implicaciones fiscales en España de las siguientes transacciones de criptomonedas:

${JSON.stringify(transactions, null, 2)}

Incluye:
1. Cómo se calculan las ganancias/pérdidas patrimoniales
2. En qué casilla de la declaración de la renta se declaran
3. Tipos impositivos aplicables
4. Posibles deducciones o compensaciones`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: this.getSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = response.content.find(block => block.type === 'text') as { type: 'text'; text: string } | undefined;
      return textBlock?.text || 'Could not generate the explanation.';
    } catch (error) {
      this.logger.error('Error explaining crypto tax', error);
      throw new Error('Error explaining the tax implications');
    }
  }

  /**
   * Inicializa la base de conocimientos con documentación AEAT
   */
  async initializeKnowledgeBase(companyId: string): Promise<number> {
    if (!this.embeddingsService) {
      this.logger.warn('Embeddings service not available');
      return 0;
    }

    return this.embeddingsService.indexAEATDocumentation(companyId);
  }

  /**
   * Añade documento a la base de conocimientos
   */
  async addToKnowledgeBase(
    companyId: string,
    content: string,
    metadata: Record<string, unknown>,
    category?: string,
  ): Promise<string | null> {
    if (!this.embeddingsService) {
      this.logger.warn('Embeddings service not available');
      return null;
    }

    return this.embeddingsService.storeDocument(companyId, content, metadata, category);
  }

  /**
   * Busca en la base de conocimientos
   */
  async searchKnowledge(
    companyId: string,
    query: string,
    limit?: number,
    category?: string,
  ): Promise<Array<{ id: string; content: string; similarity: number }>> {
    if (!this.embeddingsService) {
      return [];
    }

    const results = await this.embeddingsService.searchSimilar(
      companyId,
      query,
      limit,
      category,
    );

    return results.map((r) => ({
      id: r.id,
      content: r.content,
      similarity: r.similarity,
    }));
  }

  /**
   * Obtiene el estado de los proveedores de IA
   */
  getProvidersStatus(): Array<{ name: string; enabled: boolean }> {
    if (!this.providerService) {
      return [
        {
          name: 'anthropic',
          enabled: !!this.client,
        },
      ];
    }

    return this.providerService.getProvidersStatus();
  }
}
