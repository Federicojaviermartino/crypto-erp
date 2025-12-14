"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AiService", {
    enumerable: true,
    get: function() {
        return AiService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _sdk = /*#__PURE__*/ _interop_require_default(require("@anthropic-ai/sdk"));
const _aiproviderservice = require("./ai-provider.service.js");
const _ragservice = require("./rag.service.js");
const _embeddingsservice = require("./embeddings.service.js");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
function _ts_param(paramIndex, decorator) {
    return function(target, key) {
        decorator(target, key, paramIndex);
    };
}
let AiService = class AiService {
    getSystemPrompt(context) {
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
            const contextHeader = language === 'es' ? '\n\nContexto actual del usuario:' : '\n\nCurrent user context:';
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
    async chat(messages, context) {
        // Enriquecer la última pregunta con RAG si está disponible
        let enhancedMessages = [
            ...messages
        ];
        if (context?.useRAG && context?.companyId && this.ragService && messages.length > 0) {
            try {
                const lastMessage = messages[messages.length - 1];
                if (lastMessage.role === 'user') {
                    const ragContext = await this.ragService.smartQuery(context.companyId, lastMessage.content, undefined, context.language);
                    if (ragContext.relevantDocuments.length > 0) {
                        enhancedMessages[enhancedMessages.length - 1] = {
                            role: 'user',
                            content: ragContext.enhancedPrompt
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
                    messages: enhancedMessages.map((m)=>({
                            role: m.role,
                            content: m.content
                        }))
                });
                const textBlock = response.content.find((block)=>block.type === 'text');
                return textBlock?.text || 'No se pudo generar una respuesta.';
            } catch (error) {
                this.logger.warn('Anthropic SDK failed, trying provider fallback', error);
            }
        }
        // Fallback a provider service con múltiples proveedores
        if (this.providerService) {
            try {
                const providerMessages = enhancedMessages.map((m)=>({
                        role: m.role,
                        content: m.content
                    }));
                const response = await this.providerService.chat(providerMessages, {
                    systemPrompt: this.getSystemPrompt(context)
                });
                this.logger.log(`Response from ${response.provider} (${response.latencyMs}ms)`);
                return response.content;
            } catch (error) {
                this.logger.error('All AI providers failed', error);
            }
        }
        return 'El servicio de IA no está disponible. Por favor, configura al menos un proveedor de IA.';
    }
    async analyzeTransaction(description) {
        if (!this.client) {
            return {
                suggestedAccounts: {
                    debit: '',
                    credit: ''
                },
                explanation: 'Servicio de IA no disponible'
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
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });
            const textBlock = response.content.find((block)=>block.type === 'text');
            if (textBlock) {
                const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            }
            return {
                suggestedAccounts: {
                    debit: '',
                    credit: ''
                },
                explanation: 'No se pudo analizar la transacción'
            };
        } catch (error) {
            this.logger.error('Error analyzing transaction', error);
            return {
                suggestedAccounts: {
                    debit: '',
                    credit: ''
                },
                explanation: 'Error al analizar la transacción'
            };
        }
    }
    async generateReport(reportType, data) {
        if (!this.client) {
            return 'Servicio de IA no disponible';
        }
        const prompts = {
            summary: `Genera un resumen ejecutivo de la siguiente información financiera en español:\n${JSON.stringify(data, null, 2)}`,
            recommendations: `Analiza los siguientes datos financieros y proporciona recomendaciones de mejora:\n${JSON.stringify(data, null, 2)}`,
            'tax-planning': `Basándote en los siguientes datos, sugiere estrategias de planificación fiscal para una empresa española:\n${JSON.stringify(data, null, 2)}`
        };
        const prompt = prompts[reportType];
        if (!prompt) {
            return 'Tipo de informe no válido';
        }
        try {
            const response = await this.client.messages.create({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2048,
                system: this.getSystemPrompt(),
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });
            const textBlock = response.content.find((block)=>block.type === 'text');
            return textBlock?.text || 'No se pudo generar el informe.';
        } catch (error) {
            this.logger.error('Error generating report', error);
            throw new Error('Error al generar el informe');
        }
    }
    async explainCryptoTax(transactions) {
        if (!this.client) {
            return 'Servicio de IA no disponible';
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
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            });
            const textBlock = response.content.find((block)=>block.type === 'text');
            return textBlock?.text || 'No se pudo generar la explicación.';
        } catch (error) {
            this.logger.error('Error explaining crypto tax', error);
            throw new Error('Error al explicar la fiscalidad');
        }
    }
    /**
   * Inicializa la base de conocimientos con documentación AEAT
   */ async initializeKnowledgeBase(companyId) {
        if (!this.embeddingsService) {
            this.logger.warn('Embeddings service not available');
            return 0;
        }
        return this.embeddingsService.indexAEATDocumentation(companyId);
    }
    /**
   * Añade documento a la base de conocimientos
   */ async addToKnowledgeBase(companyId, content, metadata, category) {
        if (!this.embeddingsService) {
            this.logger.warn('Embeddings service not available');
            return null;
        }
        return this.embeddingsService.storeDocument(companyId, content, metadata, category);
    }
    /**
   * Busca en la base de conocimientos
   */ async searchKnowledge(companyId, query, limit, category) {
        if (!this.embeddingsService) {
            return [];
        }
        const results = await this.embeddingsService.searchSimilar(companyId, query, limit, category);
        return results.map((r)=>({
                id: r.id,
                content: r.content,
                similarity: r.similarity
            }));
    }
    /**
   * Obtiene el estado de los proveedores de IA
   */ getProvidersStatus() {
        if (!this.providerService) {
            return [
                {
                    name: 'anthropic',
                    enabled: !!this.client
                }
            ];
        }
        return this.providerService.getProvidersStatus();
    }
    constructor(configService, providerService, ragService, embeddingsService){
        this.configService = configService;
        this.providerService = providerService;
        this.ragService = ragService;
        this.embeddingsService = embeddingsService;
        this.logger = new _common.Logger(AiService.name);
        this.client = null;
        const apiKey = this.configService.get('ANTHROPIC_API_KEY');
        if (apiKey) {
            this.client = new _sdk.default({
                apiKey
            });
        } else {
            this.logger.warn('ANTHROPIC_API_KEY not configured - using provider fallback');
        }
    }
};
AiService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_param(1, (0, _common.Optional)()),
    _ts_param(2, (0, _common.Optional)()),
    _ts_param(3, (0, _common.Optional)()),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService,
        typeof _aiproviderservice.AIProviderService === "undefined" ? Object : _aiproviderservice.AIProviderService,
        typeof _ragservice.RAGService === "undefined" ? Object : _ragservice.RAGService,
        typeof _embeddingsservice.EmbeddingsService === "undefined" ? Object : _embeddingsservice.EmbeddingsService
    ])
], AiService);

//# sourceMappingURL=ai.service.js.map