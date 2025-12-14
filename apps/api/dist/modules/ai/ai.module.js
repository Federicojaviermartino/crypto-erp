"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AiModule", {
    enumerable: true,
    get: function() {
        return AiModule;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _database = require("../../../../../libs/database/src");
const _aiservice = require("./services/ai.service.js");
const _aicontroller = require("./controllers/ai.controller.js");
const _embeddingsservice = require("./services/embeddings.service.js");
const _ragservice = require("./services/rag.service.js");
const _aiproviderservice = require("./services/ai-provider.service.js");
const _ocrservice = require("./services/ocr.service.js");
const _paddleocrclient = require("./services/paddle-ocr.client.js");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let AiModule = class AiModule {
};
AiModule = _ts_decorate([
    (0, _common.Module)({
        imports: [
            _config.ConfigModule
        ],
        controllers: [
            _aicontroller.AiController
        ],
        providers: [
            _database.PrismaService,
            _aiservice.AiService,
            _embeddingsservice.EmbeddingsService,
            _ragservice.RAGService,
            _aiproviderservice.AIProviderService,
            _ocrservice.OcrService,
            _paddleocrclient.PaddleOcrClient
        ],
        exports: [
            _aiservice.AiService,
            _embeddingsservice.EmbeddingsService,
            _ragservice.RAGService,
            _aiproviderservice.AIProviderService,
            _ocrservice.OcrService,
            _paddleocrclient.PaddleOcrClient
        ]
    })
], AiModule);

//# sourceMappingURL=ai.module.js.map