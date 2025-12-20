# Third-Party Integrations Guide

This guide explains how to connect and sync with third-party services like QuickBooks, Xero, HubSpot, Salesforce, and payment gateways.

---

## Overview

Crypto ERP supports bi-directional sync with popular accounting software, CRM systems, and payment providers:

### Accounting Software
- **QuickBooks Online** - Sync invoices, contacts, and payments
- **Xero** - Full accounting integration with real-time sync

### CRM Systems (Coming Soon)
- **HubSpot** - Sync contacts and deals
- **Salesforce** - Enterprise CRM integration

### Payment Gateways (Coming Soon)
- **PayPal** - Accept and track PayPal payments
- **Square** - Point-of-sale and online payments

---

## How It Works

All integrations use **OAuth 2.0** for secure authentication:

1. User clicks "Connect [Provider]" in Crypto ERP
2. Redirected to provider's authorization page
3. User grants permissions
4. Provider redirects back with authorization code
5. Crypto ERP exchanges code for access token
6. Token is encrypted and stored securely
7. Automatic sync runs based on configured frequency

---

## QuickBooks Online Integration

### Prerequisites

1. QuickBooks Online account
2. QuickBooks Developer Account (for API credentials)
3. App registered at [developer.intuit.com](https://developer.intuit.com)

### Environment Variables

```bash
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
```

### Connecting QuickBooks

**Step 1: Get Authorization URL**

```bash
GET /integrations/quickbooks/connect?redirectUri=https://app.crypto-erp.com/integrations/callback
Headers:
  Authorization: Bearer <YOUR_JWT>
  X-Company-Id: <YOUR_COMPANY_ID>

Response:
{
  "authorizationUrl": "https://appcenter.intuit.com/connect/oauth2?...",
  "state": "company-id:random-token"
}
```

**Step 2: User Authorizes**

Redirect user to `authorizationUrl`. QuickBooks will redirect back to your `redirectUri` with:
```
https://app.crypto-erp.com/integrations/callback?code=AUTH_CODE&state=company-id:random-token&realmId=COMPANY_ID
```

**Step 3: Exchange Code for Token**

```bash
POST /integrations/quickbooks/callback?code=AUTH_CODE&redirectUri=https://app.crypto-erp.com/integrations/callback&state=company-id:random-token
Headers:
  Authorization: Bearer <YOUR_JWT>
  X-Company-Id: <YOUR_COMPANY_ID>

Response:
{
  "success": true,
  "integration": {
    "id": "integration-uuid",
    "provider": "quickbooks",
    "name": "QuickBooks Online",
    "createdAt": "2025-12-20T10:00:00Z"
  }
}
```

### Syncing Data

**Manual Sync**

```bash
POST /integrations/{integration-id}/sync
Headers:
  Authorization: Bearer <YOUR_JWT>
  X-Company-Id: <YOUR_COMPANY_ID>

Response:
{
  "success": true,
  "itemsSynced": 25,
  "errors": []
}
```

**Automatic Sync**

Set sync frequency when connecting:
- `realtime` - Sync immediately when changes occur (webhooks)
- `hourly` - Sync every hour
- `daily` - Sync once per day
- `manual` - Only sync when user triggers it

### What Gets Synced

**From QuickBooks to Crypto ERP:**
- Invoices (last 90 days by default)
- Customers → Contacts
- Payments

**From Crypto ERP to QuickBooks:**
- Invoices
- Customers
- Payments

### QuickBooks Data Mapping

| QuickBooks | Crypto ERP |
|------------|------------|
| Invoice.DocNumber | Invoice.number |
| Invoice.TxnDate | Invoice.issueDate |
| Invoice.DueDate | Invoice.dueDate |
| Invoice.TotalAmt | Invoice.totalAmount |
| Customer | Contact |
| Payment | Payment record |

---

## Xero Integration

### Prerequisites

1. Xero account
2. Xero App registered at [developer.xero.com](https://developer.xero.com)
3. OAuth 2.0 credentials

### Environment Variables

```bash
XERO_CLIENT_ID=your_client_id
XERO_CLIENT_SECRET=your_client_secret
```

### Connecting Xero

Same flow as QuickBooks:

```bash
# 1. Get authorization URL
GET /integrations/xero/connect?redirectUri=...

# 2. User authorizes on Xero

# 3. Exchange code for token
POST /integrations/xero/callback?code=...&redirectUri=...
```

### What Gets Synced

**From Xero to Crypto ERP:**
- Invoices (ACCREC - Accounts Receivable)
- Contacts
- Payments
- Tax rates

**From Crypto ERP to Xero:**
- Invoices
- Contacts
- Payments

### Xero Data Mapping

| Xero | Crypto ERP |
|------|------------|
| Invoice.InvoiceNumber | Invoice.number |
| Invoice.Date | Invoice.issueDate |
| Invoice.DueDate | Invoice.dueDate |
| Invoice.Total | Invoice.totalAmount |
| Contact | Contact |
| Payment | Payment record |

---

## Managing Integrations

### List All Integrations

```bash
GET /integrations
Headers:
  Authorization: Bearer <YOUR_JWT>
  X-Company-Id: <YOUR_COMPANY_ID>

Response:
[
  {
    "id": "integration-uuid",
    "provider": "quickbooks",
    "name": "QuickBooks Online",
    "syncEnabled": true,
    "syncFrequency": "hourly",
    "lastSyncAt": "2025-12-20T10:00:00Z",
    "lastSyncStatus": "success",
    "isActive": true,
    "createdAt": "2025-12-01T10:00:00Z"
  },
  {
    "id": "integration-uuid-2",
    "provider": "xero",
    "name": "Xero Accounting",
    "syncEnabled": true,
    "syncFrequency": "daily",
    "lastSyncAt": "2025-12-20T08:00:00Z",
    "lastSyncStatus": "partial",
    "isActive": true,
    "createdAt": "2025-12-05T10:00:00Z"
  }
]
```

### Disconnect Integration

```bash
DELETE /integrations/{integration-id}
Headers:
  Authorization: Bearer <YOUR_JWT>
  X-Company-Id: <YOUR_COMPANY_ID>

Response:
{
  "success": true,
  "message": "Integration disconnected successfully"
}
```

---

## Security

### Token Encryption

All OAuth tokens are encrypted using AES-256 before being stored in the database:
- Access tokens
- Refresh tokens
- Provider-specific credentials

### Token Refresh

Access tokens are automatically refreshed when they expire:
- QuickBooks: 1 hour expiry
- Xero: 30 minutes expiry

Refresh tokens are valid for:
- QuickBooks: 100 days
- Xero: 60 days

### Permissions

Integrations are scoped to a specific company. Users can only:
- Connect integrations for companies they have access to
- Sync data for their own companies
- Disconnect their own integrations

---

## Troubleshooting

### "Integration has no valid access token"

**Cause**: Access token expired and refresh token is invalid

**Solution**: Reconnect the integration

### "Sync failed: Insufficient permissions"

**Cause**: App doesn't have required permissions in QuickBooks/Xero

**Solution**:
1. Disconnect integration
2. Reconnect and grant all requested permissions

### "Rate limit exceeded"

**Cause**: Too many API calls to provider

**Solution**:
- QuickBooks: 500 requests per minute, 5000 per hour
- Xero: 60 requests per minute

Switch to less frequent sync (e.g., daily instead of hourly)

---

## Database Schema

### Integrations Table

```sql
CREATE TABLE integrations (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    provider VARCHAR(50), -- "quickbooks", "xero", etc.
    name VARCHAR(255), -- User-friendly name

    -- OAuth credentials (encrypted)
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,

    -- Provider-specific
    realm_id VARCHAR(100), -- QuickBooks company ID
    tenant_id VARCHAR(100), -- Xero tenant ID
    metadata JSONB,

    -- Sync configuration
    sync_enabled BOOLEAN DEFAULT true,
    sync_frequency VARCHAR(20) DEFAULT 'hourly',
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(20),
    last_sync_error TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, provider)
);
```

---

## Sync Strategies

### Pull Strategy (Default)

Crypto ERP pulls data from integration provider:
- Scheduled sync based on frequency
- Fetches new/updated records since last sync
- Updates existing records, creates new ones

### Push Strategy

Crypto ERP pushes data to integration provider:
- Triggered when invoice is created/updated in Crypto ERP
- Real-time or queued for batch processing
- Ensures external system is up-to-date

### Bi-Directional Sync

Both pull and push enabled:
- Changes in either system are synced
- Conflict resolution based on last modified timestamp
- User can choose winner in case of conflicts

---

## Future Integrations

### Planned

- **Salesforce** - Enterprise CRM
- **HubSpot** - Marketing and sales CRM
- **Stripe** - Payment processing
- **PayPal** - Online payments
- **Square** - Point-of-sale
- **Shopify** - E-commerce
- **WooCommerce** - WordPress e-commerce
- **Zapier** - Connect 5000+ apps

### Webhooks Support

For real-time sync, integrations can use webhooks:
- QuickBooks: CDC (Change Data Capture)
- Xero: Webhooks API
- Crypto ERP sends webhook to integration when data changes

---

## API Reference

### Get Authorization URL

```
GET /integrations/:provider/connect
```

Parameters:
- `provider` - "quickbooks", "xero", etc.
- `redirectUri` - Where to redirect after authorization

### Handle OAuth Callback

```
POST /integrations/:provider/callback
```

Parameters:
- `code` - Authorization code from provider
- `redirectUri` - Same as in authorization request
- `state` - CSRF token from authorization request

### List Integrations

```
GET /integrations
```

### Sync Integration

```
POST /integrations/:id/sync
```

### Disconnect Integration

```
DELETE /integrations/:id
```

---

**Last Updated**: December 20, 2025
**Phase**: 4B - Advanced Integrations
**Status**: QuickBooks & Xero Active
