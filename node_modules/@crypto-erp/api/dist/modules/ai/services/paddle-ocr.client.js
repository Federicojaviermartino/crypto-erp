"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PaddleOcrClient", {
    enumerable: true,
    get: function() {
        return PaddleOcrClient;
    }
});
const _common = require("@nestjs/common");
const _config = require("@nestjs/config");
const _formdata = /*#__PURE__*/ _interop_require_default(require("form-data"));
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
let PaddleOcrClient = class PaddleOcrClient {
    /**
   * Check if PaddleOCR service is available
   */ async checkHealth() {
        const now = Date.now();
        // Use cached result if checked recently
        if (this.isAvailable !== null && now - this.lastHealthCheck < this.healthCheckInterval) {
            return this.isAvailable;
        }
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(()=>controller.abort(), 5000);
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            this.isAvailable = response.ok;
            this.lastHealthCheck = now;
            if (this.isAvailable) {
                const data = await response.json();
                this.logger.log(`PaddleOCR health check: ${data.status} (v${data.version})`);
            }
            return this.isAvailable;
        } catch (error) {
            this.isAvailable = false;
            this.lastHealthCheck = now;
            this.logger.warn(`PaddleOCR not available: ${error.message}`);
            return false;
        }
    }
    /**
   * Extract text from image using PaddleOCR
   *
   * @param imageBuffer - Image buffer (JPEG, PNG)
   * @param language - Language code (es, en, fr, de, etc.)
   * @returns Extracted text and line details
   */ async extractText(imageBuffer, language = 'es') {
        try {
            // Check if service is available
            const isHealthy = await this.checkHealth();
            if (!isHealthy) {
                return {
                    success: false,
                    error: 'PaddleOCR service not available'
                };
            }
            // Prepare form data
            const formData = new _formdata.default();
            formData.append('file', imageBuffer, {
                filename: 'invoice.jpg',
                contentType: 'image/jpeg'
            });
            formData.append('lang', language);
            this.logger.debug(`Sending OCR request (lang: ${language}, size: ${imageBuffer.length} bytes)`);
            // Send request
            const controller = new AbortController();
            const timeoutId = setTimeout(()=>controller.abort(), this.timeout);
            const response = await fetch(`${this.baseUrl}/predict`, {
                method: 'POST',
                body: formData,
                headers: formData.getHeaders(),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`PaddleOCR API error: ${response.status} - ${errorText}`);
                return {
                    success: false,
                    error: `PaddleOCR API error: ${response.status}`
                };
            }
            const result = await response.json();
            if (result.success) {
                this.logger.log(`OCR extracted ${result.stats?.total_lines || 0} lines ` + `(avg confidence: ${((result.stats?.avg_confidence || 0) * 100).toFixed(1)}%)`);
            }
            return result;
        } catch (error) {
            if (error.name === 'AbortError') {
                this.logger.error('PaddleOCR request timeout');
                return {
                    success: false,
                    error: 'OCR request timeout'
                };
            }
            this.logger.error(`PaddleOCR extraction failed: ${error.message}`, error.stack);
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
   * Get list of supported languages
   */ async getSupportedLanguages() {
        try {
            const response = await fetch(`${this.baseUrl}/languages`);
            if (!response.ok) {
                return [
                    'es',
                    'en'
                ]; // Fallback
            }
            const data = await response.json();
            return data.languages.map((lang)=>lang.code);
        } catch (error) {
            this.logger.warn('Failed to fetch supported languages', error);
            return [
                'es',
                'en'
            ];
        }
    }
    /**
   * Get current status
   */ getStatus() {
        return {
            enabled: this.isAvailable === true,
            url: this.baseUrl,
            lastCheck: this.lastHealthCheck > 0 ? new Date(this.lastHealthCheck) : null
        };
    }
    constructor(configService){
        this.configService = configService;
        this.logger = new _common.Logger(PaddleOcrClient.name);
        this.timeout = 30000; // 30 seconds
        this.isAvailable = null;
        this.lastHealthCheck = 0;
        this.healthCheckInterval = 60000; // 1 minute
        this.baseUrl = this.configService.get('PADDLE_OCR_URL', 'http://localhost:8866');
        this.logger.log(`PaddleOCR client initialized (URL: ${this.baseUrl})`);
    }
};
PaddleOcrClient = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _config.ConfigService === "undefined" ? Object : _config.ConfigService
    ])
], PaddleOcrClient);

//# sourceMappingURL=paddle-ocr.client.js.map