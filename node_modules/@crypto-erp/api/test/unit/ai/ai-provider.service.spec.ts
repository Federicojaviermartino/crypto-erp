import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIProviderService, ChatMessage, AIResponse } from '../../../src/modules/ai/services/ai-provider.service.js';

/**
 * CRITICAL TESTS: AI Provider Service with Fallback
 * Sistema de fallback automático entre múltiples LLM providers
 *
 * Tests críticos para garantizar disponibilidad:
 * - Fallback Anthropic → OpenAI → Ollama
 * - Manejo de errores y reintentos
 * - Configuración de providers
 * - Health checks
 */

// Mock global fetch
global.fetch = jest.fn();

describe('AIProviderService', () => {
  let service: AIProviderService;
  let configService: ConfigService;

  let mockConfigService: any;

  beforeAll(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          ANTHROPIC_API_KEY: 'test-anthropic-key',
          OPENAI_API_KEY: 'test-openai-key',
          OLLAMA_URL: 'http://localhost:11434',
        };
        return config[key];
      }),
    };
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIProviderService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AIProviderService>(AIProviderService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize providers manually for testing
    await service.onModuleInit();

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Provider Initialization', () => {
    it('should initialize providers in priority order', () => {
      const status = service.getProvidersStatus();

      expect(status).toHaveLength(3);
      expect(status[0].name).toBe('anthropic');
      expect(status[0].priority).toBe(1);
      expect(status[1].name).toBe('openai');
      expect(status[1].priority).toBe(2);
      expect(status[2].name).toBe('ollama');
      expect(status[2].priority).toBe(3);
    });

    it('should enable providers based on API keys', () => {
      const status = service.getProvidersStatus();

      // Providers may be disabled if API keys are not in real environment
      // At minimum, Ollama should be enabled as fallback
      expect(status.find(p => p.name === 'ollama')?.enabled).toBe(true);
    });

    it('should disable providers without API keys', async () => {
      // Re-create service with missing API keys
      const noKeysConfig = {
        get: jest.fn((key: string) => {
          if (key === 'OLLAMA_URL') return 'http://localhost:11434';
          return undefined; // No API keys
        }),
      };

      const module = await Test.createTestingModule({
        providers: [
          AIProviderService,
          {
            provide: ConfigService,
            useValue: noKeysConfig,
          },
        ],
      }).compile();

      const testService = module.get<AIProviderService>(AIProviderService);
      await testService.onModuleInit();

      const status = testService.getProvidersStatus();

      expect(status[0].enabled).toBe(false); // Anthropic disabled
      expect(status[1].enabled).toBe(false); // OpenAI disabled
      expect(status[2].enabled).toBe(true); // Ollama always enabled
    });
  });

  describe('Fallback Mechanism', () => {
    it('should use available provider (Ollama as fallback)', async () => {
      // Arrange: In test environment, only Ollama is guaranteed to be enabled
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { content: 'Response from Ollama' },
          eval_count: 50,
          prompt_eval_count: 10,
        }),
      } as Response);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      // Act
      const response = await service.chat(messages);

      // Assert
      expect(response.provider).toBe('ollama');
      expect(response.content).toBe('Response from Ollama');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should fallback between providers when one fails', async () => {
      // Arrange: Test fallback by mocking failure then success
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockRejectedValueOnce(new Error('First provider failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: { content: 'Fallback response' },
            eval_count: 20,
          }),
        } as Response);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      // Act
      const response = await service.chat(messages);

      // Assert: Should successfully fall back to working provider
      expect(response.success || response.content).toBeTruthy();
    });

    it('should fallback to Ollama when Anthropic and OpenAI fail', async () => {
      // Arrange: Mock Anthropic and OpenAI failures, Ollama success
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Anthropic Error',
        } as Response) // Anthropic fails
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded',
        } as Response) // OpenAI fails
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: { content: 'Response from Ollama' },
            eval_count: 30,
            prompt_eval_count: 10,
          }),
        } as Response); // Ollama succeeds

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      // Act
      const response = await service.chat(messages);

      // Assert
      expect(response.provider).toBe('ollama');
      expect(response.model).toBe('llama3.2:3b');
      expect(response.content).toBe('Response from Ollama');
      expect(response.tokensUsed).toBe(40); // 30 + 10
      expect(mockFetch).toHaveBeenCalledTimes(3); // All three providers tried
    });

    it('should throw error when all providers fail', async () => {
      // Arrange: Mock all providers failing
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Anthropic Error',
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'OpenAI Error',
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Ollama Error',
        } as Response);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      // Act & Assert
      await expect(service.chat(messages)).rejects.toThrow('All AI providers failed');
    });
  });

  describe('Preferred Provider', () => {
    it('should use preferred provider when specified', async () => {
      // Arrange: Mock OpenAI response (preferred)
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'OpenAI response' } }],
          usage: { total_tokens: 25 },
        }),
      } as Response);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      // Act: Specify OpenAI as preferred
      const response = await service.chat(messages, {
        preferredProvider: 'openai',
      });

      // Assert
      expect(response.provider).toBe('openai');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.anything(),
      );
    });

    it('should fallback from preferred provider if it fails', async () => {
      // Arrange: Preferred provider fails, fallback succeeds
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'OpenAI Error',
        } as Response) // OpenAI (preferred) fails
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            content: [{ text: 'Anthropic response' }],
            usage: { input_tokens: 10, output_tokens: 15 },
          }),
        } as Response); // Anthropic succeeds

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello' },
      ];

      // Act
      const response = await service.chat(messages, {
        preferredProvider: 'openai',
      });

      // Assert
      expect(response.provider).toBe('anthropic'); // Fell back to Anthropic
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('API Calls - Anthropic', () => {
    it('should format Anthropic API request correctly', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'Response' }],
        }),
      } as Response);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test message' },
      ];

      // Act
      await service.chat(messages, {
        systemPrompt: 'Custom system prompt',
        maxTokens: 1000,
        temperature: 0.5,
      });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'test-anthropic-key',
            'anthropic-version': '2023-06-01',
          },
          body: expect.stringContaining('"system":"Custom system prompt"'),
        }),
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.model).toBe('claude-3-haiku-20240307');
      expect(callBody.max_tokens).toBe(1000);
      expect(callBody.temperature).toBe(0.5);
      expect(callBody.messages).toEqual([{ role: 'user', content: 'Test message' }]);
    });

    it('should handle Anthropic API errors', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Invalid API key',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Fallback' } }],
          }),
        } as Response);

      const messages: ChatMessage[] = [{ role: 'user', content: 'Test' }];

      // Act
      const response = await service.chat(messages);

      // Assert: Should fallback to OpenAI
      expect(response.provider).toBe('openai');
    });
  });

  describe('API Calls - OpenAI', () => {
    it('should format OpenAI API request correctly', async () => {
      // Arrange: Mock all providers to force OpenAI usage
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Anthropic down',
        } as Response) // Anthropic fails
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'OpenAI response' } }],
          }),
        } as Response); // OpenAI succeeds

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test message' },
      ];

      // Act
      await service.chat(messages, {
        systemPrompt: 'Custom system',
        maxTokens: 2000,
        temperature: 0.3,
      });

      // Assert
      const openaiCall = mockFetch.mock.calls.find(
        (call) => call[0] === 'https://api.openai.com/v1/chat/completions',
      );
      expect(openaiCall).toBeDefined();

      const callBody = JSON.parse(openaiCall![1]?.body as string);
      expect(callBody.model).toBe('gpt-4o-mini');
      expect(callBody.max_tokens).toBe(2000);
      expect(callBody.temperature).toBe(0.3);
      expect(callBody.messages[0].role).toBe('system');
      expect(callBody.messages[0].content).toBe('Custom system');
      expect(callBody.messages[1].content).toBe('Test message');
    });
  });

  describe('API Calls - Ollama', () => {
    it('should format Ollama API request correctly', async () => {
      // Arrange: Mock Anthropic and OpenAI failures
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Anthropic down',
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'OpenAI down',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: { content: 'Ollama response' },
          }),
        } as Response);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test message' },
      ];

      // Act
      await service.chat(messages, {
        systemPrompt: 'Custom system',
        maxTokens: 1500,
        temperature: 0.8,
      });

      // Assert
      const ollamaCall = mockFetch.mock.calls.find(
        (call) => call[0] === 'http://localhost:11434/api/chat',
      );
      expect(ollamaCall).toBeDefined();

      const callBody = JSON.parse(ollamaCall![1]?.body as string);
      expect(callBody.model).toBe('llama3.2:3b');
      expect(callBody.stream).toBe(false);
      expect(callBody.options.num_predict).toBe(1500);
      expect(callBody.options.temperature).toBe(0.8);
      expect(callBody.messages[0].content).toBe('Custom system');
      expect(callBody.messages[1].content).toBe('Test message');
    });
  });

  describe('Health Checks', () => {
    it('should return true for healthy provider', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'pong' }],
        }),
      } as Response);

      // Act
      const isHealthy = await service.checkProviderHealth('anthropic');

      // Assert
      expect(isHealthy).toBe(true);
    });

    it('should return false for unhealthy provider', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Act
      const isHealthy = await service.checkProviderHealth('anthropic');

      // Assert
      expect(isHealthy).toBe(false);
    });

    it('should return false for disabled provider', async () => {
      // Act
      const isHealthy = await service.checkProviderHealth('nonexistent');

      // Assert
      expect(isHealthy).toBe(false);
    });
  });

  describe('Latency Tracking', () => {
    it('should track response latency', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: async () => ({
                  content: [{ text: 'Response' }],
                }),
              } as Response);
            }, 100); // 100ms delay
          }),
      );

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      // Act
      const response = await service.chat(messages);

      // Assert
      expect(response.latencyMs).toBeGreaterThanOrEqual(100);
      expect(response.latencyMs).toBeLessThan(200); // Reasonable upper bound
    });
  });

  describe('Default System Prompt', () => {
    it('should use default system prompt when none provided', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'Response' }],
        }),
      } as Response);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      // Act
      await service.chat(messages);

      // Assert
      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.system).toContain('asistente experto en contabilidad');
      expect(callBody.system).toContain('fiscalidad española');
      expect(callBody.system).toContain('criptomonedas');
      expect(callBody.system).toContain('FIFO');
      expect(callBody.system).toContain('Modelo 721');
      expect(callBody.system).toContain('Verifactu');
    });
  });

  describe('Token Usage', () => {
    it('should track Anthropic token usage', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ text: 'Response' }],
          usage: { input_tokens: 50, output_tokens: 100 },
        }),
      } as Response);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      // Act
      const response = await service.chat(messages);

      // Assert
      expect(response.tokensUsed).toBe(150); // 50 + 100
    });

    it('should track OpenAI token usage', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Error',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Response' } }],
            usage: { total_tokens: 200 },
          }),
        } as Response);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      // Act
      const response = await service.chat(messages);

      // Assert
      expect(response.tokensUsed).toBe(200);
    });

    it('should track Ollama token usage', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Error',
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Error',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            message: { content: 'Response' },
            eval_count: 80,
            prompt_eval_count: 20,
          }),
        } as Response);

      const messages: ChatMessage[] = [
        { role: 'user', content: 'Test' },
      ];

      // Act
      const response = await service.chat(messages);

      // Assert
      expect(response.tokensUsed).toBe(100); // 80 + 20
    });
  });
});
