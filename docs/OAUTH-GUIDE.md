# OAuth 2.0 API Integration Guide

This guide explains how to integrate with the Crypto ERP API using OAuth 2.0 authentication.

---

## Overview

The Crypto ERP API uses **OAuth 2.0 Authorization Code Flow** for third-party integrations. This allows external applications to access user data with explicit consent.

### Key Concepts

- **OAuth App**: A registered third-party application that can access the API
- **Client ID**: Public identifier for your OAuth app
- **Client Secret**: Secret key for your OAuth app (never share this!)
- **Scopes**: Permissions that define what your app can access
- **Access Token**: Short-lived token used to authenticate API requests (1 hour)
- **Refresh Token**: Long-lived token used to obtain new access tokens (30 days)

---

## Getting Started

### Step 1: Create an OAuth App

First, create an OAuth app to get your `client_id` and `client_secret`:

```bash
POST /oauth/apps
Headers:
  Authorization: Bearer <YOUR_JWT_TOKEN>
  X-Company-Id: <YOUR_COMPANY_ID>

Body:
{
  "name": "My Integration App",
  "description": "Integrates with accounting software",
  "website": "https://myapp.com",
  "redirectUris": [
    "https://myapp.com/oauth/callback"
  ],
  "scopes": [
    "invoices:read",
    "invoices:write",
    "contacts:read"
  ],
  "rateLimit": 1000,
  "dailyQuota": 10000
}
```

Response:
```json
{
  "id": "app-uuid",
  "name": "My Integration App",
  "clientId": "abc123_xyz",
  "clientSecret": "SECRET_KEY_SHOWN_ONCE",
  "redirectUris": ["https://myapp.com/oauth/callback"],
  "scopes": ["invoices:read", "invoices:write", "contacts:read"],
  "rateLimit": 1000,
  "dailyQuota": 10000,
  "createdAt": "2025-12-20T10:00:00Z"
}
```

**Important**: Save the `clientSecret` immediately - it's only shown once!

---

## OAuth 2.0 Flow

### Step 2: Redirect User to Authorization URL

Redirect the user to the authorization endpoint to request permission:

```
GET https://api.crypto-erp.com/oauth/authorize?
  client_id=abc123_xyz&
  redirect_uri=https://myapp.com/oauth/callback&
  response_type=code&
  scope=invoices:read invoices:write contacts:read&
  state=random_csrf_token
```

Parameters:
- `client_id`: Your OAuth app's client ID
- `redirect_uri`: Must match one of your registered redirect URIs
- `response_type`: Always `code` (authorization code flow)
- `scope`: Space-separated list of requested scopes
- `state`: Random string for CSRF protection (recommended)

### Step 3: User Authorizes App

The user will see a consent screen showing:
- Your app name and description
- Requested permissions (scopes)
- Company they're granting access to

If they approve, they'll be redirected to:
```
https://myapp.com/oauth/callback?code=AUTH_CODE&state=random_csrf_token
```

If they deny, they'll be redirected to:
```
https://myapp.com/oauth/callback?error=access_denied&state=random_csrf_token
```

### Step 4: Exchange Authorization Code for Access Token

Exchange the authorization code for an access token:

```bash
POST /oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE",
  "client_id": "abc123_xyz",
  "client_secret": "SECRET_KEY",
  "redirect_uri": "https://myapp.com/oauth/callback"
}
```

Response:
```json
{
  "access_token": "ACCESS_TOKEN",
  "refresh_token": "REFRESH_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "invoices:read invoices:write contacts:read"
}
```

**Note**: Authorization codes expire in 10 minutes. Exchange them immediately!

### Step 5: Use Access Token to Call API

Use the access token in the `Authorization` header:

```bash
GET /invoices
Headers:
  Authorization: Bearer ACCESS_TOKEN
```

The API will automatically:
- Verify the token is valid and not expired
- Extract the user and company from the token
- Check if the token has required scopes
- Set `X-Company-Id` header internally

**Example: List Invoices**

```bash
curl -X GET https://api.crypto-erp.com/invoices \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

**Example: Create Invoice**

```bash
curl -X POST https://api.crypto-erp.com/invoices \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contactId": "contact-uuid",
    "issueDate": "2025-12-20",
    "lines": [
      {
        "description": "Web Development",
        "quantity": 10,
        "unitPrice": 100,
        "taxRate": 21
      }
    ]
  }'
```

### Step 6: Refresh Access Token

When the access token expires (after 1 hour), use the refresh token to get a new one:

```bash
POST /oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "REFRESH_TOKEN",
  "client_id": "abc123_xyz",
  "client_secret": "SECRET_KEY"
}
```

Response:
```json
{
  "access_token": "NEW_ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "invoices:read invoices:write contacts:read"
}
```

**Note**: The refresh token remains valid for 30 days. Store it securely!

---

## Available Scopes

### Invoice Scopes
- `invoices:read` - Read invoices and their details
- `invoices:write` - Create and update invoices
- `invoices:delete` - Delete invoices

### Contact Scopes
- `contacts:read` - Read customer and supplier contacts
- `contacts:write` - Create and update contacts
- `contacts:delete` - Delete contacts

### Crypto Scopes
- `crypto:read` - Read cryptocurrency wallets and transactions
- `crypto:write` - Create and update crypto transactions

### Accounting Scopes
- `accounting:read` - Read accounting data (journal entries, accounts)
- `accounting:write` - Create and update journal entries

### Analytics Scopes
- `analytics:read` - Read analytics and reports

### Company Scopes
- `company:read` - Read company information and settings
- `company:write` - Update company information and settings

### User Scopes
- `users:read` - Read user information
- `users:write` - Manage users and permissions

### Webhook Scopes
- `webhooks:read` - Read webhook subscriptions
- `webhooks:write` - Create and manage webhook subscriptions

### Full Access (Requires Explicit Consent)
- `*` - Full access to all resources

---

## Protecting Endpoints with OAuth

### For API Developers: How to Require OAuth Scopes

Add OAuth protection to any endpoint using the `@UseGuards(OAuthGuard)` decorator and `@RequireScopes()`:

```typescript
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { OAuthGuard, RequireScopes } from '../oauth/guards/oauth.guard.js';
import { OAUTH_SCOPES } from '../oauth/scopes.js';

@Controller('invoices')
export class InvoicesController {

  // Require read scope
  @Get()
  @UseGuards(OAuthGuard)
  @RequireScopes(OAUTH_SCOPES.INVOICES_READ)
  async listInvoices() {
    // OAuth guard automatically sets X-Company-Id from token
    // Access user/company from request.oauth
    return [];
  }

  // Require write scope
  @Post()
  @UseGuards(OAuthGuard)
  @RequireScopes(OAUTH_SCOPES.INVOICES_WRITE)
  async createInvoice() {
    return {};
  }

  // Require multiple scopes (all must be granted)
  @Post(':id/send')
  @UseGuards(OAuthGuard)
  @RequireScopes(OAUTH_SCOPES.INVOICES_READ, OAUTH_SCOPES.INVOICES_WRITE)
  async sendInvoice() {
    return {};
  }
}
```

### Accessing OAuth Context in Controllers

The OAuth guard adds token data to `request.oauth`:

```typescript
@Get()
@UseGuards(OAuthGuard)
@RequireScopes(OAUTH_SCOPES.INVOICES_READ)
async listInvoices(@Req() req: Request) {
  const { userId, companyId, scopes, app } = req.oauth;

  console.log('User ID:', userId);
  console.log('Company ID:', companyId);
  console.log('Granted scopes:', scopes);
  console.log('App name:', app.name);

  // X-Company-Id is automatically set from the token
  const companyId2 = req.headers['x-company-id'];

  return [];
}
```

---

## Token Management

### Revoke a Token

Revoke an access or refresh token (e.g., when user logs out):

```bash
POST /oauth/revoke
Content-Type: application/json

{
  "token": "ACCESS_TOKEN_OR_REFRESH_TOKEN",
  "token_type_hint": "access_token"
}
```

Response:
```json
{
  "success": true
}
```

### Token Introspection (Debugging)

Check if a token is valid and get its metadata:

```bash
POST /oauth/introspect
Content-Type: application/json

{
  "token": "ACCESS_TOKEN"
}
```

Response (valid token):
```json
{
  "active": true,
  "scope": "invoices:read invoices:write",
  "clientId": "abc123_xyz",
  "userId": "user-uuid",
  "companyId": "company-uuid"
}
```

Response (invalid token):
```json
{
  "active": false
}
```

---

## Rate Limiting

OAuth apps have rate limits to prevent abuse:

- **Rate Limit**: Requests per hour (default: 1000)
- **Daily Quota**: Total requests per day (default: 10,000)

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1640000000
```

If you exceed the rate limit, you'll receive:

```
HTTP 429 Too Many Requests
{
  "statusCode": 429,
  "message": "Rate limit exceeded",
  "error": "Too Many Requests"
}
```

---

## Error Handling

### Common OAuth Errors

**Invalid Client Credentials**
```json
{
  "statusCode": 401,
  "message": "Invalid client credentials",
  "error": "Unauthorized"
}
```

**Invalid or Expired Token**
```json
{
  "statusCode": 401,
  "message": "Invalid or expired access token",
  "error": "Unauthorized"
}
```

**Insufficient Scopes**
```json
{
  "statusCode": 401,
  "message": "Insufficient scopes. Required: invoices:write",
  "error": "Unauthorized"
}
```

**Invalid Redirect URI**
```json
{
  "statusCode": 400,
  "message": "Invalid redirect URI",
  "error": "Bad Request"
}
```

---

## Security Best Practices

1. **Store Client Secret Securely**: Never commit `client_secret` to version control
2. **Use HTTPS**: Always use HTTPS for OAuth flows
3. **Validate State Parameter**: Prevent CSRF attacks by validating the `state` parameter
4. **Rotate Tokens**: Refresh access tokens regularly
5. **Revoke Tokens on Logout**: Revoke tokens when user logs out
6. **Request Minimal Scopes**: Only request scopes you actually need
7. **Monitor API Usage**: Track API usage to detect anomalies

---

## Code Examples

### Node.js Example

```javascript
const axios = require('axios');

const CLIENT_ID = 'abc123_xyz';
const CLIENT_SECRET = 'your_secret';
const REDIRECT_URI = 'https://myapp.com/oauth/callback';

// Step 1: Generate authorization URL
function getAuthorizationUrl() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'invoices:read invoices:write',
    state: generateRandomState(),
  });

  return `https://api.crypto-erp.com/oauth/authorize?${params}`;
}

// Step 2: Exchange code for token
async function getAccessToken(code) {
  const response = await axios.post('https://api.crypto-erp.com/oauth/token', {
    grant_type: 'authorization_code',
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
  });

  return response.data;
}

// Step 3: Call API
async function listInvoices(accessToken) {
  const response = await axios.get('https://api.crypto-erp.com/invoices', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
}

// Step 4: Refresh token
async function refreshAccessToken(refreshToken) {
  const response = await axios.post('https://api.crypto-erp.com/oauth/token', {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  return response.data;
}

function generateRandomState() {
  return Math.random().toString(36).substring(7);
}
```

### Python Example

```python
import requests
import secrets

CLIENT_ID = 'abc123_xyz'
CLIENT_SECRET = 'your_secret'
REDIRECT_URI = 'https://myapp.com/oauth/callback'
API_BASE = 'https://api.crypto-erp.com'

# Step 1: Generate authorization URL
def get_authorization_url():
    params = {
        'client_id': CLIENT_ID,
        'redirect_uri': REDIRECT_URI,
        'response_type': 'code',
        'scope': 'invoices:read invoices:write',
        'state': secrets.token_urlsafe(16),
    }
    return f"{API_BASE}/oauth/authorize?" + '&'.join(f"{k}={v}" for k, v in params.items())

# Step 2: Exchange code for token
def get_access_token(code):
    response = requests.post(f"{API_BASE}/oauth/token", json={
        'grant_type': 'authorization_code',
        'code': code,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'redirect_uri': REDIRECT_URI,
    })
    return response.json()

# Step 3: Call API
def list_invoices(access_token):
    response = requests.get(f"{API_BASE}/invoices", headers={
        'Authorization': f'Bearer {access_token}',
    })
    return response.json()

# Step 4: Refresh token
def refresh_access_token(refresh_token):
    response = requests.post(f"{API_BASE}/oauth/token", json={
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token,
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
    })
    return response.json()
```

---

## FAQ

**Q: How long do access tokens last?**
A: Access tokens expire after 1 hour. Use refresh tokens to get new access tokens.

**Q: How long do refresh tokens last?**
A: Refresh tokens expire after 30 days of inactivity.

**Q: Can I use the same OAuth app for multiple companies?**
A: Yes! The company context is determined by which company the user authorizes.

**Q: What happens if I request a scope my app doesn't have?**
A: The authorization will fail with an "Invalid scopes" error.

**Q: Can I update my OAuth app's scopes?**
A: Yes, but existing access tokens will keep their original scopes. Users must re-authorize to grant new scopes.

**Q: How do I test OAuth flows locally?**
A: Use `http://localhost:3000/oauth/callback` as a redirect URI during development.

---

**Last Updated**: December 20, 2025
**Phase**: 4B - API Marketplace
**Status**: Active
