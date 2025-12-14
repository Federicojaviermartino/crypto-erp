import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@crypto-erp/database';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { Prisma } from '@prisma/client';

const QUEUE_NAME = 'ai-categorize';

interface CategorizeJobData {
  transactionIds: string[];
  companyId: string;
}

interface CategorizationResult {
  type: string;
  subtype?: string;
  confidence: number;
  reasoning: string;
}

interface JobResult {
  success: boolean;
  processedCount: number;
  successCount: number;
  failedIds: string[];
  error?: string;
}

@Processor(QUEUE_NAME, {
  concurrency: 3, // Process 3 jobs in parallel
})
export class AiCategorizeProcessor extends WorkerHost {
  private readonly logger = new Logger(AiCategorizeProcessor.name);
  private anthropic?: Anthropic;
  private openai?: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super();

    const anthropicKey = this.config.get<string>('ANTHROPIC_API_KEY');
    const openaiKey = this.config.get<string>('OPENAI_API_KEY');

    if (anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
    }

    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }
  }

  async process(job: Job<CategorizeJobData>): Promise<JobResult> {
    const { transactionIds, companyId } = job.data;

    this.logger.log(
      `Starting AI categorization for ${transactionIds.length} transactions (company: ${companyId})`
    );

    if (!this.anthropic && !this.openai) {
      this.logger.error('No AI provider configured');
      return {
        success: false,
        processedCount: 0,
        successCount: 0,
        failedIds: transactionIds,
        error: 'No AI provider configured (ANTHROPIC_API_KEY or OPENAI_API_KEY required)',
      };
    }

    let successCount = 0;
    const failedIds: string[] = [];

    // Update job progress
    await job.updateProgress(0);

    for (let i = 0; i < transactionIds.length; i++) {
      const txId = transactionIds[i];

      try {
        // Fetch transaction
        const tx = await this.prisma.cryptoTransaction.findUnique({
          where: { id: txId },
          include: {
            wallet: {
              select: { chain: true, address: true },
            },
          },
        });

        if (!tx) {
          this.logger.warn(`Transaction ${txId} not found`);
          failedIds.push(txId);
          continue;
        }

        // Skip if already manually categorized
        if (tx.manualType) {
          this.logger.debug(`Transaction ${txId} already manually categorized - skipping`);
          successCount++;
          continue;
        }

        // Categorize with AI
        const categorization = await this.categorizeTransaction(tx);

        // Update transaction
        await this.prisma.cryptoTransaction.update({
          where: { id: txId },
          data: {
            aiCategorized: true,
            type: categorization.type as any,
            subtype: categorization.subtype,
            aiConfidence: new Prisma.Decimal(categorization.confidence),
            aiReasoning: categorization.reasoning,
            status: categorization.confidence >= 0.8 ? 'COMPLETED' : 'NEEDS_REVIEW',
          },
        });

        successCount++;
        this.logger.debug(
          `Categorized ${txId} as ${categorization.type} (confidence: ${categorization.confidence})`
        );
      } catch (error) {
        this.logger.error(`Failed to categorize transaction ${txId}:`, error);
        failedIds.push(txId);
      }

      // Update progress
      const progress = Math.round(((i + 1) / transactionIds.length) * 100);
      await job.updateProgress(progress);
    }

    const result: JobResult = {
      success: failedIds.length === 0,
      processedCount: transactionIds.length,
      successCount,
      failedIds,
    };

    this.logger.log(
      `AI categorization completed: ${successCount}/${transactionIds.length} successful`
    );

    return result;
  }

  private async categorizeTransaction(tx: any): Promise<CategorizationResult> {
    const context = this.buildContext(tx);

    // Try Anthropic first (Claude Haiku - fast and cheap)
    if (this.anthropic) {
      try {
        return await this.categorizeWithAnthropic(context);
      } catch (error) {
        this.logger.warn('Anthropic categorization failed, trying OpenAI', error);
      }
    }

    // Fallback to OpenAI (GPT-4o-mini)
    if (this.openai) {
      try {
        return await this.categorizeWithOpenAI(context);
      } catch (error) {
        this.logger.error('OpenAI categorization failed', error);
        throw error;
      }
    }

    throw new Error('No AI provider available');
  }

  private buildContext(tx: any): string {
    return `Analyze this crypto transaction and categorize it:

Chain: ${tx.wallet.chain}
Transaction Hash: ${tx.txHash}
Type (auto-detected): ${tx.type}
Subtype: ${tx.subtype || 'N/A'}

Asset In: ${tx.assetIn || 'N/A'}
Amount In: ${tx.amountIn || 'N/A'}
Price In EUR: ${tx.priceInEur || 'N/A'}

Asset Out: ${tx.assetOut || 'N/A'}
Amount Out: ${tx.amountOut || 'N/A'}
Price Out EUR: ${tx.priceOutEur || 'N/A'}

Fee Asset: ${tx.feeAsset || 'N/A'}
Fee Amount: ${tx.feeAmount || 'N/A'}

Block Timestamp: ${tx.blockTimestamp}

Valid types:
- TRANSFER_IN: Receiving crypto (deposit, transfer received)
- TRANSFER_OUT: Sending crypto (withdrawal, transfer sent)
- SWAP: Exchange one crypto for another (DEX/CEX trade)
- CLAIM_REWARD: Claiming staking/farming rewards
- STAKE: Locking crypto for staking
- UNSTAKE: Unlocking staked crypto
- AIRDROP: Free token distribution

Return ONLY valid JSON in this format (no markdown, no code blocks):
{
  "type": "one of the valid types above",
  "subtype": "optional detailed classification like 'UNISWAP_SWAP', 'LIDO_STAKE', etc",
  "confidence": 0.0 to 1.0,
  "reasoning": "brief explanation of why you chose this classification"
}`;
  }

  private async categorizeWithAnthropic(context: string): Promise<CategorizationResult> {
    const response = await this.anthropic!.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: context,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    return this.parseCategorizationResponse(content.text);
  }

  private async categorizeWithOpenAI(context: string): Promise<CategorizationResult> {
    const response = await this.openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: context,
        },
      ],
      max_tokens: 500,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return this.parseCategorizationResponse(content);
  }

  private parseCategorizationResponse(response: string): CategorizationResult {
    try {
      // Remove markdown code blocks if present
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
      }

      const result = JSON.parse(cleaned);

      // Validate required fields
      if (!result.type || typeof result.confidence !== 'number') {
        throw new Error('Invalid categorization response format');
      }

      // Clamp confidence to [0, 1]
      result.confidence = Math.max(0, Math.min(1, result.confidence));

      return result;
    } catch (error) {
      this.logger.error('Failed to parse AI response:', response, error);
      throw new Error('Invalid AI response format');
    }
  }
}
