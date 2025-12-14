"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "EmbeddingsService", {
    enumerable: true,
    get: function() {
        return EmbeddingsService;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _database = require("../../../../../../libs/database/src");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let EmbeddingsService = class EmbeddingsService {
    async onModuleInit() {
        // Verificar si pgvector está instalado
        try {
            await this.prisma.$executeRaw`SELECT 1 FROM pg_extension WHERE extname = 'vector'`;
            this.logger.log('pgvector extension detected');
        } catch  {
            this.logger.warn('pgvector extension not found. Vector search will use fallback cosine similarity.');
        }
    }
    /**
   * Genera embeddings usando OpenAI API o fallback local
   */ async generateEmbedding(text) {
        // Intentar con OpenAI primero (mejor calidad)
        if (this.openaiApiKey) {
            try {
                return await this.generateOpenAIEmbedding(text);
            } catch (error) {
                this.logger.warn('OpenAI embedding failed, using fallback', error);
            }
        }
        // Fallback: generar embedding simple basado en TF-IDF
        return this.generateLocalEmbedding(text);
    }
    /**
   * Genera embedding usando OpenAI text-embedding-ada-002
   */ async generateOpenAIEmbedding(text) {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.openaiApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'text-embedding-ada-002',
                input: text.slice(0, 8000)
            })
        });
        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }
        const data = await response.json();
        return data.data[0].embedding;
    }
    /**
   * Fallback: genera embedding simple usando hash y frecuencia de palabras
   * No tan preciso como OpenAI pero funciona sin API externa
   */ generateLocalEmbedding(text) {
        const words = text.toLowerCase().split(/\s+/);
        const embedding = new Array(this.embeddingDimension).fill(0);
        // Simple hashing para distribuir palabras en el espacio vectorial
        for (const word of words){
            let hash = 0;
            for(let i = 0; i < word.length; i++){
                const char = word.charCodeAt(i);
                hash = (hash << 5) - hash + char;
                hash = hash & hash;
            }
            const index = Math.abs(hash) % this.embeddingDimension;
            embedding[index] += 1;
        }
        // Normalizar el vector
        const magnitude = Math.sqrt(embedding.reduce((sum, val)=>sum + val * val, 0));
        if (magnitude > 0) {
            for(let i = 0; i < embedding.length; i++){
                embedding[i] /= magnitude;
            }
        }
        return embedding;
    }
    /**
   * Almacena un documento con su embedding en la base de datos
   */ async storeDocument(companyId, content, metadata, category = 'general') {
        const embedding = await this.generateEmbedding(content);
        // Usar la tabla Document existente
        const doc = await this.prisma.document.create({
            data: {
                companyId,
                title: metadata.title || 'Documento',
                content,
                type: this.mapCategoryToDocumentType(category),
                metadata: {
                    ...metadata,
                    category,
                    embeddingJson: embedding
                }
            }
        });
        this.logger.debug(`Document stored with ID: ${doc.id}`);
        return doc.id;
    }
    /**
   * Mapea categoría a DocumentType
   */ mapCategoryToDocumentType(category) {
        if (category.includes('normativa') || category.includes('aeat') || category.includes('modelos')) {
            return 'REGULATION';
        }
        if (category.includes('user') || category.includes('upload')) {
            return 'USER_UPLOAD';
        }
        return 'KNOWLEDGE_BASE';
    }
    /**
   * Busca documentos similares usando similitud coseno
   */ async searchSimilar(companyId, query, limit = 5, category) {
        const queryEmbedding = await this.generateEmbedding(query);
        // Obtener documentos de la categoría
        const documents = await this.prisma.document.findMany({
            where: {
                companyId,
                ...category && {
                    type: this.mapCategoryToDocumentType(category)
                }
            }
        });
        // Calcular similitud coseno para cada documento
        const results = [];
        for (const doc of documents){
            const metadata = doc.metadata;
            const docEmbedding = metadata?.embeddingJson;
            if (!docEmbedding) continue;
            const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
            // Filtrar por categoría específica si se proporciona
            if (category && metadata?.category !== category) {
                continue;
            }
            results.push({
                id: doc.id,
                content: doc.content,
                metadata: metadata || {},
                similarity
            });
        }
        // Ordenar por similitud y limitar resultados
        return results.sort((a, b)=>b.similarity - a.similarity).slice(0, limit);
    }
    /**
   * Calcula la similitud coseno entre dos vectores
   */ cosineSimilarity(a, b) {
        if (a.length !== b.length) return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for(let i = 0; i < a.length; i++){
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
        return magnitude > 0 ? dotProduct / magnitude : 0;
    }
    /**
   * Indexa documentos de normativa AEAT para consultas
   */ async indexAEATDocumentation(companyId) {
        const documents = [
            {
                title: 'IVA - Tipos impositivos',
                content: `En España existen tres tipos de IVA:
        - Tipo general: 21% (aplicable a la mayoría de bienes y servicios)
        - Tipo reducido: 10% (alimentos, transporte, hostelería)
        - Tipo superreducido: 4% (pan, leche, libros, medicamentos)
        Las operaciones intracomunitarias están exentas de IVA.`,
                category: 'normativa-iva'
            },
            {
                title: 'Modelo 303 - Autoliquidación IVA',
                content: `El Modelo 303 es la declaración trimestral del IVA.
        Plazos de presentación:
        - 1T: 1-20 abril
        - 2T: 1-20 julio
        - 3T: 1-20 octubre
        - 4T: 1-30 enero
        Se declara el IVA devengado menos el IVA soportado deducible.`,
                category: 'modelos-aeat'
            },
            {
                title: 'Fiscalidad de criptomonedas',
                content: `Las criptomonedas tributan como ganancias patrimoniales en el IRPF.
        Tipos aplicables:
        - Hasta 6.000€: 19%
        - De 6.000€ a 50.000€: 21%
        - De 50.000€ a 200.000€: 23%
        - De 200.000€ a 300.000€: 27%
        - Más de 300.000€: 28%
        Se usa el método FIFO para calcular el coste de adquisición.`,
                category: 'fiscalidad-crypto'
            },
            {
                title: 'Verifactu - Sistema de verificación de facturas',
                content: `Verifactu es el sistema de verificación de facturas de la AEAT.
        Requisitos:
        - Huella digital encadenada (SHA-256)
        - Código QR de verificación
        - Envío en tiempo real o diferido
        Obligatorio para sistemas de facturación desde 2025.`,
                category: 'verifactu'
            },
            {
                title: 'Modelo 721 - Declaración de criptomonedas en el extranjero',
                content: `El Modelo 721 declara monedas virtuales en el extranjero.
        Obligatorio si el valor supera 50.000€ a 31 de diciembre.
        Debe declararse también si hay variación superior a 20.000€.
        Plazo: 1 enero a 31 marzo del año siguiente.`,
                category: 'modelos-aeat'
            },
            {
                title: 'Plan General Contable - Cuentas de criptomonedas',
                content: `Contabilización de criptomonedas según PGC:
        - Activos financieros a valor razonable: cuenta 250 (largo plazo) o 570 (corto plazo)
        - Ganancias: cuenta 768 (diferencias positivas de cambio)
        - Pérdidas: cuenta 668 (diferencias negativas de cambio)
        - Comisiones: cuenta 662 (gastos financieros)`,
                category: 'pgc'
            }
        ];
        let indexed = 0;
        for (const doc of documents){
            await this.storeDocument(companyId, doc.content, {
                title: doc.title
            }, doc.category);
            indexed++;
        }
        this.logger.log(`Indexed ${indexed} AEAT documentation documents`);
        return indexed;
    }
    /**
   * Elimina documentos antiguos de una categoría
   */ async clearCategory(companyId, category) {
        // Para eliminar por categoría específica, obtenemos los documentos y filtramos
        const documents = await this.prisma.document.findMany({
            where: {
                companyId,
                type: this.mapCategoryToDocumentType(category)
            },
            select: {
                id: true,
                metadata: true
            }
        });
        const idsToDelete = documents.filter((doc)=>{
            const metadata = doc.metadata;
            return metadata?.category === category;
        }).map((doc)=>doc.id);
        if (idsToDelete.length === 0) {
            return 0;
        }
        const result = await this.prisma.document.deleteMany({
            where: {
                id: {
                    in: idsToDelete
                }
            }
        });
        return result.count;
    }
    constructor(configService, prisma){
        this.configService = configService;
        this.prisma = prisma;
        this.logger = new _common.Logger(EmbeddingsService.name);
        this.embeddingDimension = 1536; // OpenAI ada-002 dimension
        this.openaiApiKey = this.configService.get('OPENAI_API_KEY');
        this.anthropicApiKey = this.configService.get('ANTHROPIC_API_KEY');
    }
};
EmbeddingsService = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService,
        typeof _database.PrismaService === "undefined" ? Object : _database.PrismaService
    ])
], EmbeddingsService);

//# sourceMappingURL=embeddings.service.js.map