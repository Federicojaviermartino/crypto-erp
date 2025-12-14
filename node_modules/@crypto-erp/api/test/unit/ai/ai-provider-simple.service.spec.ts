import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIProviderService } from '../../../src/modules/ai/services/ai-provider.service.js';

/**
 * SIMPLIFIED TESTS: AI Provider Service
 * Tests básicos para validar estructura y configuración
 */

describe('AIProviderService - Basic Tests', () => {
  let service: AIProviderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIProviderService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'OLLAMA_URL') return 'http://localhost:11434';
              return undefined; // No real API keys in test
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AIProviderService>(AIProviderService);
    await service.onModuleInit();
  });

  describe('Provider Initialization', () => {
    it('should initialize with correct number of providers', () => {
      const status = service.getProvidersStatus();
      expect(status).toHaveLength(3);
    });

    it('should have providers in priority order', () => {
      const status = service.getProvidersStatus();
      expect(status[0].name).toBe('anthropic');
      expect(status[0].priority).toBe(1);
      expect(status[1].name).toBe('openai');
      expect(status[1].priority).toBe(2);
      expect(status[2].name).toBe('ollama');
      expect(status[2].priority).toBe(3);
    });

    it('should always enable Ollama as fallback', () => {
      const status = service.getProvidersStatus();
      const ollama = status.find(p => p.name === 'ollama');
      expect(ollama).toBeDefined();
      expect(ollama!.enabled).toBe(true);
    });

    it('should have correct models configured', () => {
      const status = service.getProvidersStatus();
      expect(status[0].model).toBe('claude-3-haiku-20240307');
      expect(status[1].model).toBe('gpt-4o-mini');
      expect(status[2].model).toBe('llama3.2:3b');
    });
  });

  describe('Provider Status', () => {
    it('should return status for all providers', () => {
      const status = service.getProvidersStatus();

      status.forEach(provider => {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('enabled');
        expect(provider).toHaveProperty('priority');
        expect(provider).toHaveProperty('model');
        expect(typeof provider.enabled).toBe('boolean');
        expect(typeof provider.priority).toBe('number');
      });
    });
  });

  describe('Health Checks', () => {
    it('should return false for non-existent provider', async () => {
      const health = await service.checkProviderHealth('nonexistent');
      expect(health).toBe(false);
    });

    it('should handle health check for disabled provider', async () => {
      // Since we don't have real API keys, Anthropic should be disabled
      const status = service.getProvidersStatus();
      const anthropic = status.find(p => p.name === 'anthropic');

      if (!anthropic?.enabled) {
        const health = await service.checkProviderHealth('anthropic');
        expect(health).toBe(false);
      }
    });
  });

  describe('Configuration', () => {
    it('should initialize without errors', () => {
      expect(service).toBeDefined();
      expect(service.getProvidersStatus).toBeDefined();
      expect(service.checkProviderHealth).toBeDefined();
    });
  });
});
