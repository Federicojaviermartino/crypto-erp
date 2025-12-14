"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AIProviderService", {
    enumerable: true,
    get: function() {
        return AIProviderService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let AIProviderService = class AIProviderService {
    async onModuleInit() {
        this.initializeProviders();
        this.logger.log(`AI providers initialized: ${this.providers.filter((p)=>p.enabled).map((p)=>p.name).join(', ')}`);
    }
    initializeProviders() {
        const anthropicKey = this.configService.get('ANTHROPIC_API_KEY');
        const openaiKey = this.configService.get('OPENAI_API_KEY');
        const ollamaUrl = this.configService.get('OLLAMA_URL') || 'http://localhost:11434';
        this.providers = [
            {
                name: 'anthropic',
                priority: 1,
                enabled: !!anthropicKey,
                apiKey: anthropicKey,
                model: 'claude-3-haiku-20240307',
                maxTokens: 4096
            },
            {
                name: 'openai',
                priority: 2,
                enabled: !!openaiKey,
                apiKey: openaiKey,
                model: 'gpt-4o-mini',
                maxTokens: 4096
            },
            {
                name: 'ollama',
                priority: 3,
                enabled: true,
                baseUrl: ollamaUrl,
                model: 'llama3.2:3b',
                maxTokens: 2048
            }
        ].sort((a, b)=>a.priority - b.priority);
    }
    /**
   * Envía un mensaje al LLM con fallback automático
   */ async chat(messages, options = {}) {
        const enabledProviders = this.providers.filter((p)=>p.enabled);
        // Si hay preferencia, mover ese provider al principio
        if (options.preferredProvider) {
            const preferred = enabledProviders.find((p)=>p.name === options.preferredProvider);
            if (preferred) {
                const others = enabledProviders.filter((p)=>p.name !== options.preferredProvider);
                enabledProviders.splice(0, enabledProviders.length, preferred, ...others);
            }
        }
        let lastError = null;
        for (const provider of enabledProviders){
            try {
                const startTime = Date.now();
                const response = await this.callProvider(provider, messages, options);
                const latencyMs = Date.now() - startTime;
                return {
                    ...response,
                    provider: provider.name,
                    model: provider.model,
                    latencyMs
                };
            } catch (error) {
                lastError = error;
                this.logger.warn(`Provider ${provider.name} failed: ${lastError.message}`);
            }
        }
        throw new Error(`All AI providers failed. Last error: ${lastError?.message || 'Unknown'}`);
    }
    async callProvider(provider, messages, options) {
        switch(provider.name){
            case 'anthropic':
                return this.callAnthropic(provider, messages, options);
            case 'openai':
                return this.callOpenAI(provider, messages, options);
            case 'ollama':
                return this.callOllama(provider, messages, options);
            default:
                throw new Error(`Unknown provider: ${provider.name}`);
        }
    }
    async callAnthropic(provider, messages, options) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': provider.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: provider.model,
                max_tokens: options.maxTokens || provider.maxTokens,
                system: options.systemPrompt || this.getDefaultSystemPrompt(),
                messages: messages.map((m)=>({
                        role: m.role === 'system' ? 'user' : m.role,
                        content: m.content
                    })),
                temperature: options.temperature || 0.7
            })
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Anthropic API error: ${response.status} - ${error}`);
        }
        const data = await response.json();
        return {
            content: data.content[0]?.text || '',
            tokensUsed: data.usage ? data.usage.input_tokens + data.usage.output_tokens : undefined
        };
    }
    async callOpenAI(provider, messages, options) {
        const allMessages = [];
        if (options.systemPrompt) {
            allMessages.push({
                role: 'system',
                content: options.systemPrompt
            });
        } else {
            allMessages.push({
                role: 'system',
                content: this.getDefaultSystemPrompt()
            });
        }
        allMessages.push(...messages.map((m)=>({
                role: m.role,
                content: m.content
            })));
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${provider.apiKey}`
            },
            body: JSON.stringify({
                model: provider.model,
                messages: allMessages,
                max_tokens: options.maxTokens || provider.maxTokens,
                temperature: options.temperature || 0.7
            })
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI API error: ${response.status} - ${error}`);
        }
        const data = await response.json();
        return {
            content: data.choices[0]?.message?.content || '',
            tokensUsed: data.usage?.total_tokens
        };
    }
    async callOllama(provider, messages, options) {
        const allMessages = [];
        if (options.systemPrompt) {
            allMessages.push({
                role: 'system',
                content: options.systemPrompt
            });
        } else {
            allMessages.push({
                role: 'system',
                content: this.getDefaultSystemPrompt()
            });
        }
        allMessages.push(...messages.map((m)=>({
                role: m.role,
                content: m.content
            })));
        try {
            const response = await fetch(`${provider.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: provider.model,
                    messages: allMessages,
                    stream: false,
                    options: {
                        num_predict: options.maxTokens || provider.maxTokens,
                        temperature: options.temperature || 0.7
                    }
                })
            });
            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }
            const data = await response.json();
            return {
                content: data.message?.content || '',
                tokensUsed: data.eval_count ? data.eval_count + (data.prompt_eval_count || 0) : undefined
            };
        } catch (error) {
            // Ollama puede no estar corriendo
            throw new Error(`Ollama not available at ${provider.baseUrl}: ${error.message}`);
        }
    }
    getDefaultSystemPrompt() {
        return `Eres un asistente experto en contabilidad, fiscalidad española y criptomonedas.
Especializaciones:
- Normativa fiscal española (AEAT, IVA, IRPF)
- Contabilidad según Plan General Contable (PGC)
- Fiscalidad de criptomonedas (FIFO, Modelo 721)
- Sistema Verifactu de facturación electrónica

Responde de forma concisa y profesional en español.
Si no estás seguro de algo, indícalo claramente.`;
    }
    /**
   * Obtiene el estado de los proveedores
   */ getProvidersStatus() {
        return this.providers.map((p)=>({
                name: p.name,
                enabled: p.enabled,
                priority: p.priority,
                model: p.model
            }));
    }
    /**
   * Verifica la disponibilidad de un provider
   */ async checkProviderHealth(providerName) {
        const provider = this.providers.find((p)=>p.name === providerName);
        if (!provider || !provider.enabled) {
            return false;
        }
        try {
            await this.callProvider(provider, [
                {
                    role: 'user',
                    content: 'ping'
                }
            ], {
                maxTokens: 10
            });
            return true;
        } catch  {
            return false;
        }
    }
    constructor(configService){
        this.configService = configService;
        this.logger = new _common.Logger(AIProviderService.name);
        this.providers = [];
    }
};
AIProviderService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], AIProviderService);

//# sourceMappingURL=ai-provider.service.js.map