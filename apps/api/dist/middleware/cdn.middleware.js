"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "CdnMiddleware", {
    enumerable: true,
    get: function() {
        return CdnMiddleware;
    }
});
const _common = require("@nestjs/common");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
let CdnMiddleware = class CdnMiddleware {
    use(req, res, next) {
        const path = req.path;
        // Static assets - aggressive caching (1 year)
        if (this.isStaticAsset(path)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('CDN-Cache-Control', 'public, max-age=31536000');
        } else if (path.startsWith('/api-docs') || path.startsWith('/docs')) {
            res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
            res.setHeader('CDN-Cache-Control', 'public, max-age=3600');
        } else if (path.startsWith('/health')) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
            res.setHeader('CDN-Cache-Control', 'public, max-age=30');
        } else {
            res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
            res.setHeader('CDN-Cache-Control', 'private, no-cache');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        // Security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        // CORS headers for CDN
        if (process.env['NODE_ENV'] === 'production') {
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Vary', 'Origin, CloudFront-Viewer-Country');
        }
        next();
    }
    /**
   * Check if the path is a static asset.
   */ isStaticAsset(path) {
        const staticExtensions = [
            '.js',
            '.css',
            '.png',
            '.jpg',
            '.jpeg',
            '.gif',
            '.svg',
            '.ico',
            '.woff',
            '.woff2',
            '.ttf',
            '.eot',
            '.otf',
            '.mp4',
            '.webm',
            '.webp'
        ];
        return staticExtensions.some((ext)=>path.endsWith(ext)) || path.startsWith('/static/');
    }
};
CdnMiddleware = _ts_decorate([
    (0, _common.Injectable)()
], CdnMiddleware);

//# sourceMappingURL=cdn.middleware.js.map