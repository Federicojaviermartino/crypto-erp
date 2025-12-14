"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RAGService", {
    enumerable: true,
    get: function() {
        return RAGService;
    }
});
const _common = require("@nestjs/common");
const _embeddingsservice = require("./embeddings.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
const DEFAULT_CONFIG = {
    maxDocuments: 5,
    minSimilarity: 0.7,
    maxContextTokens: 2000,
    includeMetadata: true
};
let RAGService = class RAGService {
    /**
   * Busca contexto relevante para una consulta
   */ async retrieveContext(companyId, query, category, config = {}) {
        const finalConfig = {
            ...DEFAULT_CONFIG,
            ...config
        };
        // Buscar documentos similares
        const documents = await this.embeddingsService.searchSimilar(companyId, query, finalConfig.maxDocuments, category);
        // Filtrar por similitud mínima
        const relevantDocs = documents.filter((doc)=>doc.similarity >= finalConfig.minSimilarity);
        // Construir contexto
        const context = this.buildContext(relevantDocs, finalConfig);
        // Generar prompt mejorado
        const enhancedPrompt = this.buildEnhancedPrompt(query, context);
        this.logger.debug(`RAG context: ${relevantDocs.length} docs, ~${context.tokens} tokens`);
        return {
            query,
            relevantDocuments: relevantDocs,
            enhancedPrompt,
            tokensUsed: context.tokens
        };
    }
    /**
   * Construye el contexto a partir de los documentos relevantes
   */ buildContext(documents, config) {
        let contextText = '';
        let estimatedTokens = 0;
        const tokensPerChar = 0.25; // Aproximación: 1 token ≈ 4 caracteres
        for (const doc of documents){
            const docText = config.includeMetadata ? `[${doc.metadata?.title || 'Documento'}]\n${doc.content}\n\n` : `${doc.content}\n\n`;
            const docTokens = Math.ceil(docText.length * tokensPerChar);
            if (estimatedTokens + docTokens > config.maxContextTokens) {
                // Truncar si excede el límite
                const remainingTokens = config.maxContextTokens - estimatedTokens;
                const remainingChars = Math.floor(remainingTokens / tokensPerChar);
                contextText += docText.slice(0, remainingChars) + '...';
                estimatedTokens = config.maxContextTokens;
                break;
            }
            contextText += docText;
            estimatedTokens += docTokens;
        }
        return {
            text: contextText.trim(),
            tokens: estimatedTokens
        };
    }
    /**
   * Construye el prompt mejorado con contexto
   */ buildEnhancedPrompt(query, context) {
        if (!context.text) {
            return query;
        }
        return `Contexto relevante de la base de conocimientos:
---
${context.text}
---

Basándote en el contexto anterior cuando sea relevante, responde a la siguiente pregunta:
${query}`;
    }
    /**
   * Procesa una consulta con RAG y devuelve el prompt optimizado
   * para diferentes categorías de conocimiento
   */ async processQuery(companyId, query, options = {}) {
        const categories = options.categories || [
            'normativa-iva',
            'modelos-aeat',
            'fiscalidad-crypto',
            'verifactu',
            'pgc',
            'modelo-303',
            'modelo-200',
            'boicac',
            'pgc-detallado'
        ];
        // Buscar en todas las categorías relevantes
        const allDocuments = [];
        for (const category of categories){
            const docs = await this.embeddingsService.searchSimilar(companyId, query, options.config?.maxDocuments || 3, category);
            allDocuments.push(...docs);
        }
        // Ordenar por similitud y tomar los mejores
        const sortedDocs = allDocuments.sort((a, b)=>b.similarity - a.similarity).slice(0, options.config?.maxDocuments || DEFAULT_CONFIG.maxDocuments);
        const config = {
            ...DEFAULT_CONFIG,
            ...options.config
        };
        const relevantDocs = sortedDocs.filter((doc)=>doc.similarity >= config.minSimilarity);
        const context = this.buildContext(relevantDocs, config);
        const enhancedPrompt = this.buildEnhancedPrompt(query, context);
        return {
            query,
            relevantDocuments: relevantDocs,
            enhancedPrompt,
            tokensUsed: context.tokens
        };
    }
    /**
   * Detecta la intención de la consulta para mejorar la búsqueda
   */ detectQueryIntent(query) {
        const lowerQuery = query.toLowerCase();
        const categories = [];
        const keywords = [];
        // Detectar categorías relevantes
        if (lowerQuery.includes('iva') || lowerQuery.includes('impuesto') || lowerQuery.includes('tipo')) {
            categories.push('normativa-iva');
            keywords.push('IVA', 'impuesto');
        }
        if (lowerQuery.includes('modelo') || lowerQuery.includes('declaración') || lowerQuery.includes('303') || lowerQuery.includes('721') || lowerQuery.includes('720')) {
            categories.push('modelos-aeat');
            keywords.push('modelo', 'declaración');
        }
        if (lowerQuery.includes('crypto') || lowerQuery.includes('bitcoin') || lowerQuery.includes('cripto') || lowerQuery.includes('fifo')) {
            categories.push('fiscalidad-crypto');
            keywords.push('crypto', 'criptomonedas');
        }
        if (lowerQuery.includes('verifactu') || lowerQuery.includes('huella') || lowerQuery.includes('qr')) {
            categories.push('verifactu');
            keywords.push('verifactu', 'huella');
        }
        if (lowerQuery.includes('cuenta') || lowerQuery.includes('pgc') || lowerQuery.includes('contabil')) {
            categories.push('pgc');
            categories.push('pgc-detallado');
            keywords.push('contabilidad', 'PGC');
        }
        if (lowerQuery.includes('303') || lowerQuery.includes('trimestral')) {
            categories.push('modelo-303');
            keywords.push('Modelo 303', 'IVA trimestral');
        }
        if (lowerQuery.includes('200') || lowerQuery.includes('sociedades') || lowerQuery.includes('is ')) {
            categories.push('modelo-200');
            keywords.push('Modelo 200', 'Impuesto Sociedades');
        }
        if (lowerQuery.includes('boicac') || lowerQuery.includes('icac') || lowerQuery.includes('amortiza')) {
            categories.push('boicac');
            keywords.push('BOICAC', 'contabilización');
        }
        // Si no se detecta ninguna categoría, usar todas
        if (categories.length === 0) {
            categories.push('normativa-iva', 'modelos-aeat', 'fiscalidad-crypto', 'verifactu', 'pgc', 'modelo-303', 'modelo-200', 'boicac', 'pgc-detallado');
        }
        // Detectar si es pregunta
        const isQuestion = lowerQuery.includes('?') || lowerQuery.startsWith('qué') || lowerQuery.startsWith('cómo') || lowerQuery.startsWith('cuál') || lowerQuery.startsWith('cuándo') || lowerQuery.startsWith('dónde') || lowerQuery.startsWith('por qué');
        return {
            categories,
            isQuestion,
            keywords
        };
    }
    /**
   * Consulta inteligente que detecta intención y busca contexto
   */ async smartQuery(companyId, query, config, language) {
        const intent = this.detectQueryIntent(query);
        // Añadir sufijo de idioma a las categorías si es inglés
        const categories = language === 'en' ? intent.categories.map((cat)=>`${cat}-en`) : intent.categories;
        return this.processQuery(companyId, query, {
            categories,
            config: {
                ...config,
                // Ajustar similitud mínima según tipo de consulta
                minSimilarity: intent.isQuestion ? 0.65 : 0.75
            }
        });
    }
    constructor(embeddingsService){
        this.embeddingsService = embeddingsService;
        this.logger = new _common.Logger(RAGService.name);
    }
};
RAGService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _embeddingsservice.EmbeddingsService === "undefined" ? Object : _embeddingsservice.EmbeddingsService
    ])
], RAGService);

//# sourceMappingURL=rag.service.js.map