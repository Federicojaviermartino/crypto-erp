# OAuth 2.0 Module

This module implements OAuth 2.0 Authorization Code Flow for third-party API access.

---

## Features

- ✅ OAuth 2.0 Authorization Code Flow
- ✅ Scope-based permissions
- ✅ Access token + Refresh token
- ✅ Token introspection
- ✅ Token revocation
- ✅ Per-app rate limiting (hourly + daily)
- ✅ API usage tracking and analytics
- ✅ Automatic usage metrics collection

---

## Architecture

```
oauth/
├── dto/                     # Data Transfer Objects
│   ├── create-oauth-app.dto.ts
│   └── authorize.dto.ts
├── guards/                  # Authentication & Authorization Guards
│   ├── oauth.guard.ts       # Validates OAuth tokens and scopes
│   └── rate-limit.guard.ts  # Enforces rate limits per app
├── interceptors/            # Request/Response Interceptors
│   └── api-usage.interceptor.ts  # Tracks API usage
├── oauth.controller.ts      # OAuth endpoints
├── oauth.service.ts         # OAuth business logic
├── api-usage.service.ts     # API usage tracking
├── oauth.module.ts          # Module definition
└── scopes.ts                # Scope definitions
```

---

## Usage

### 1. Create an OAuth App

```typescript
POST /oauth/apps
Headers:
  Authorization: Bearer <JWT_TOKEN>
  X-Company-Id: <COMPANY_ID>

Body:
{
  "name": "My App",
  "redirectUris": ["https://myapp.com/callback"],
  "scopes": ["invoices:read", "invoices:write"]
}

Response:
{
  "clientId": "abc123",
  "clientSecret": "SECRET" // Save this!
}
```

### 2. Authorization Flow

See [OAUTH-GUIDE.md](../../../../../../docs/OAUTH-GUIDE.md) for complete flow.

### 3. Protect Endpoints with OAuth

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { OAuthGuard, RequireScopes } from '../oauth/guards/oauth.guard.js';
import { OAUTH_SCOPES } from '../oauth/scopes.js';

@Controller('invoices')
export class InvoicesController {

  @Get()
  @UseGuards(OAuthGuard)
  @RequireScopes(OAUTH_SCOPES.INVOICES_READ)
  async list(@Req() req) {
    // req.oauth contains: userId, companyId, scopes, app
    return [];
  }
}
```

---

## Available Scopes

See [scopes.ts](./scopes.ts) for all available scopes.

Common scopes:
- `invoices:read` - Read invoices
- `invoices:write` - Create/update invoices
- `contacts:read` - Read contacts
- `accounting:read` - Read accounting data
- `analytics:read` - Read analytics
- `*` - Full access (requires explicit consent)

---

## Rate Limiting

Each OAuth app has:
- **Hourly Rate Limit**: 1000 requests/hour (default)
- **Daily Quota**: 10,000 requests/day (default)

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1640000000
X-DailyQuota-Limit: 10000
X-DailyQuota-Remaining: 9500
X-DailyQuota-Reset: 1640086400
```

---

## API Usage Tracking

All OAuth requests are automatically tracked:
- Request endpoint and method
- Response status code
- Response time
- IP address and user agent

Access usage stats:
```typescript
GET /oauth/apps/:id/usage
```

---

## Security

### Token Storage
- All tokens (access, refresh, authorization codes) are hashed with bcrypt
- Client secrets are hashed with bcrypt
- Never store plain tokens in database

### Token Expiration
- Authorization codes: 10 minutes
- Access tokens: 1 hour
- Refresh tokens: 30 days

### Scope Validation
- Apps can only request scopes they're registered for
- Users must explicitly grant scopes
- API endpoints enforce required scopes

---

## Database Schema

### OAuth Apps
```prisma
model OAuthApp {
  id           String
  companyId    String
  clientId     String   @unique
  clientSecret String   // Hashed
  redirectUris String[]
  scopes       String[]
  rateLimit    Int      @default(1000)
  dailyQuota   Int      @default(10000)
  isActive     Boolean  @default(true)
}
```

### OAuth Tokens
```prisma
model OAuthToken {
  id               String
  appId            String
  userId           String
  accessToken      String   @unique // Hashed
  refreshToken     String?  @unique // Hashed
  scopes           String[]
  expiresAt        DateTime
  authorizationCode String? @unique // Hashed
}
```

### API Usage
```prisma
model ApiUsage {
  id           String
  appId        String
  endpoint     String
  method       String
  statusCode   Int
  responseTime Int
  timestamp    DateTime
}
```

---

## Testing

### Create Test OAuth App

```bash
curl -X POST http://localhost:3000/oauth/apps \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "X-Company-Id: YOUR_COMPANY_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test App",
    "redirectUris": ["http://localhost:3001/callback"],
    "scopes": ["invoices:read"]
  }'
```

### Test Authorization Flow

```bash
# 1. Get authorization code
curl "http://localhost:3000/oauth/authorize?client_id=CLIENT_ID&redirect_uri=http://localhost:3001/callback&response_type=code&scope=invoices:read" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "X-Company-Id: YOUR_COMPANY_ID"

# 2. Exchange code for token
curl -X POST http://localhost:3000/oauth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTH_CODE",
    "client_id": "CLIENT_ID",
    "client_secret": "CLIENT_SECRET",
    "redirect_uri": "http://localhost:3001/callback"
  }'

# 3. Use access token
curl http://localhost:3000/invoices \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

---

## Maintenance

### Cleanup Old Usage Data

Run periodically to delete usage data older than 90 days:

```typescript
await apiUsageService.cleanupOldData();
```

### Revoke Inactive Apps

Apps that haven't been used in 90 days can be automatically deactivated.

---

## Migration

Apply the OAuth migration:

```bash
psql -U crypto_erp_user -d crypto_erp -f libs/database/prisma/migrations/20251220_oauth_marketplace.sql
```

---

## Monitoring

### Track OAuth Usage

```sql
-- Most active OAuth apps
SELECT
  app_id,
  COUNT(*) as request_count,
  AVG(response_time) as avg_response_time
FROM api_usage
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY app_id
ORDER BY request_count DESC
LIMIT 10;

-- Request distribution by endpoint
SELECT
  endpoint,
  method,
  COUNT(*) as count
FROM api_usage
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY endpoint, method
ORDER BY count DESC
LIMIT 20;
```

---

**Phase**: 4B - API Marketplace
**Status**: Active
**Last Updated**: December 20, 2025
