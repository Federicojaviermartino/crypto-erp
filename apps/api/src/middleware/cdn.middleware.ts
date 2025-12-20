import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * CDN Middleware for setting cache headers and edge caching.
 * Optimizes content delivery through CloudFront or Cloudflare.
 */
@Injectable()
export class CdnMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path;

    // Static assets - aggressive caching (1 year)
    if (this.isStaticAsset(path)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('CDN-Cache-Control', 'public, max-age=31536000');
    }
    // API documentation - moderate caching (1 hour)
    else if (path.startsWith('/api-docs') || path.startsWith('/docs')) {
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      res.setHeader('CDN-Cache-Control', 'public, max-age=3600');
    }
    // Health checks - short caching (30 seconds)
    else if (path.startsWith('/health')) {
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');
      res.setHeader('CDN-Cache-Control', 'public, max-age=30');
    }
    // Dynamic API endpoints - no caching
    else {
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
   */
  private isStaticAsset(path: string): boolean {
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
      '.webp',
    ];

    return (
      staticExtensions.some((ext) => path.endsWith(ext)) ||
      path.startsWith('/static/')
    );
  }
}
